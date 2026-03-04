import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_SANDBOX_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY) {
      console.error('Missing ASAAS_SANDBOX_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { user_id, crianca_id, cpf, nome, email } = await req.json();

    console.log('Generating Carreira PIX for user:', user_id, 'crianca:', crianca_id);

    // Validate inputs
    if (!user_id || !crianca_id || !cpf || !nome || !email) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios não informados (user_id, crianca_id, cpf, nome, email)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already has active subscription
    const { data: existingSub } = await supabase
      .from('carreira_assinaturas')
      .select('id, status, expira_em')
      .eq('user_id', user_id)
      .eq('crianca_id', crianca_id)
      .eq('status', 'ativa')
      .maybeSingle();

    if (existingSub && (!existingSub.expira_em || new Date(existingSub.expira_em) > new Date())) {
      return new Response(
        JSON.stringify({ error: 'Já existe uma assinatura ativa para este atleta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription value from saas_config
    const { data: configValor } = await supabase
      .from('saas_config')
      .select('valor')
      .eq('chave', 'carreira_valor_mensal')
      .maybeSingle();

    const valor = configValor ? parseFloat(configValor.valor) : 19.90;

    // Step 1: Find or create customer in Asaas Sandbox
    const cleanCpf = cpf.replace(/\D/g, '');
    let customerId: string | null = null;

    // Search by CPF
    const searchResp = await fetch(`${ASAAS_SANDBOX_URL}/customers?cpfCnpj=${cleanCpf}`, {
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
    });
    const searchResult = await searchResp.json();
    console.log('Customer search result:', JSON.stringify(searchResult));

    if (searchResult.data?.length > 0) {
      customerId = searchResult.data[0].id;
    } else {
      // Create customer
      const customerResp = await fetch(`${ASAAS_SANDBOX_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: nome,
          email: email,
          cpfCnpj: cleanCpf,
          notificationDisabled: true,
        }),
      });
      const customerResult = await customerResp.json();
      console.log('Customer creation result:', JSON.stringify(customerResult));

      if (customerResult.errors) {
        return new Response(
          JSON.stringify({ error: customerResult.errors[0]?.description || 'Erro ao criar cliente' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customerId = customerResult.id;
    }

    // Step 2: Create PIX payment
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

    const paymentResp = await fetch(`${ASAAS_SANDBOX_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: valor,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Carreira ID Pro - Assinatura mensal`,
        externalReference: `carreira_${user_id}_${crianca_id}`,
      }),
    });

    const paymentResult = await paymentResp.json();
    console.log('Payment result:', JSON.stringify(paymentResult));

    if (paymentResult.errors) {
      return new Response(
        JSON.stringify({ error: paymentResult.errors[0]?.description || 'Erro ao criar cobrança' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get PIX QR Code
    const qrResp = await fetch(`${ASAAS_SANDBOX_URL}/payments/${paymentResult.id}/pixQrCode`, {
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
    });
    const qrResult = await qrResp.json();
    console.log('QR Code result:', JSON.stringify(qrResult));

    if (qrResult.errors) {
      return new Response(
        JSON.stringify({ error: qrResult.errors[0]?.description || 'Erro ao gerar QR Code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create pending subscription record
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 30);

    const { data: subscription, error: subError } = await supabase
      .from('carreira_assinaturas')
      .insert({
        user_id,
        crianca_id,
        plano: 'pro_mensal',
        status: 'pendente',
        valor,
        gateway: 'asaas_sandbox',
        gateway_subscription_id: paymentResult.id,
        inicio_em: new Date().toISOString().split('T')[0],
        expira_em: expiraEm.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (subError) {
      console.error('Error creating subscription record:', subError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          paymentId: paymentResult.id,
          subscriptionId: subscription?.id,
          brCode: qrResult.payload,
          qrCodeImage: `data:image/png;base64,${qrResult.encodedImage}`,
          expiresAt: qrResult.expirationDate,
          valor,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
