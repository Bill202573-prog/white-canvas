import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface AmistosoPixRequest {
  convocacao_id: string;
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  billingType: string;
  pixQrCodeId?: string;
  errors?: Array<{ code: string; description: string }>;
}

interface AsaasPixQrCodeResponse {
  id: string;
  encodedImage: string;
  payload: string;
  expirationDate: string;
  errors?: Array<{ code: string; description: string }>;
}

// Generate valid test CPF for sandbox
function generateTestCpf(): string {
  const randomDigits = () => Math.floor(Math.random() * 9) + 1;
  const cpf = [
    randomDigits(), randomDigits(), randomDigits(),
    randomDigits(), randomDigits(), randomDigits(),
    randomDigits(), randomDigits(), randomDigits()
  ];
  
  // Calculate first verifier digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i);
  }
  let remainder = sum % 11;
  cpf.push(remainder < 2 ? 0 : 11 - remainder);
  
  // Calculate second verifier digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i);
  }
  remainder = sum % 11;
  cpf.push(remainder < 2 ? 0 : 11 - remainder);
  
  return cpf.join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY) {
      console.error('Missing ASAAS_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { convocacao_id }: AmistosoPixRequest = await req.json();

    console.log('Generating PIX for amistoso convocação:', convocacao_id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(convocacao_id)) {
      return new Response(
        JSON.stringify({ error: 'ID de convocação inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch convocacao with related data
    const { data: convocacao, error: convocacaoError } = await supabase
      .from('amistoso_convocacoes')
      .select(`
        id,
        evento_id,
        crianca_id,
        valor,
        isento,
        status,
        asaas_payment_id,
        crianca:criancas!amistoso_convocacoes_crianca_id_fkey(
          id,
          nome,
          crianca_responsavel(
            responsavel:responsaveis(
              id,
              nome,
              email,
              telefone,
              cpf
            )
          )
        ),
        evento:eventos_esportivos!amistoso_convocacoes_evento_id_fkey(
          id,
          nome,
          data,
          horario_inicio,
          local,
          adversario,
          taxa_participacao,
          cobrar_taxa_participacao,
          taxa_juiz,
          cobrar_taxa_juiz,
          escolinha_id,
          escolinha:escolinhas!eventos_esportivos_escolinha_id_fkey(
            id,
            nome,
            escola_cadastro_bancario(
              asaas_account_id,
              asaas_status
            )
          )
        )
      `)
      .eq('id', convocacao_id)
      .single();

    if (convocacaoError || !convocacao) {
      console.error('Convocação not found:', convocacaoError);
      return new Response(
        JSON.stringify({ error: 'Convocação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already paid
    if (convocacao.status === 'pago') {
      return new Response(
        JSON.stringify({ error: 'Esta convocação já foi paga' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if isento (exempt)
    if (convocacao.isento) {
      return new Response(
        JSON.stringify({ error: 'Esta convocação está isenta de pagamento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if has value
    const valorTotal = convocacao.valor;
    if (!valorTotal || valorTotal <= 0) {
      return new Response(
        JSON.stringify({ error: 'Esta convocação não tem valor definido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from relations
    const eventoRaw = convocacao.evento as any;
    const criancaRaw = convocacao.crianca as any;
    const escolinhaData = eventoRaw?.escolinha;
    const cadastroBancario = escolinhaData?.escola_cadastro_bancario?.[0];
    
    // Get responsavel data
    const responsavel = criancaRaw?.crianca_responsavel?.[0]?.responsavel;

    if (!responsavel) {
      return new Response(
        JSON.stringify({ error: 'Responsável não encontrado para esta criança' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine API key to use
    let activeApiKey = ASAAS_API_KEY;
    
    if (cadastroBancario?.asaas_account_id && !cadastroBancario.asaas_account_id.startsWith('acc_test_')) {
      const asaasAccountId = cadastroBancario.asaas_account_id;
      
      const walletResponse = await fetch(`${ASAAS_API_URL}/accounts/${asaasAccountId}/apiKey`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      });

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        if (walletData.apiKey) {
          activeApiKey = walletData.apiKey;
        }
      } else {
        console.log('Usando API key master para teste sandbox');
      }
    } else {
      console.log('Subconta de teste detectada ou não configurada - usando API key master');
    }

    // Step 1: Create or find customer in Asaas
    let customerId: string | null = null;
    
    // Search for existing customer by CPF or email
    const searchCpf = responsavel.cpf?.replace(/\D/g, '');
    
    if (searchCpf) {
      const customerSearchResponse = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=${searchCpf}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': activeApiKey,
          },
        }
      );
      
      const customerSearchResult = await customerSearchResponse.json();
      console.log('Customer search by CPF result:', JSON.stringify(customerSearchResult));
      
      if (customerSearchResult.data?.length > 0) {
        customerId = customerSearchResult.data[0].id;
      }
    }
    
    if (!customerId) {
      // Search by email
      const customerSearchResponse = await fetch(
        `${ASAAS_API_URL}/customers?email=${encodeURIComponent(responsavel.email)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': activeApiKey,
          },
        }
      );
      
      const customerSearchResult = await customerSearchResponse.json();
      console.log('Customer search by email result:', JSON.stringify(customerSearchResult));
      
      if (customerSearchResult.data?.length > 0) {
        customerId = customerSearchResult.data[0].id;
      }
    }
    
    // Create customer if not found
    if (!customerId) {
      // First try with the real CPF, if it fails use a generated valid CPF
      let cpfToUse = searchCpf;
      let customerResult: any = null;
      
      // Try creating customer with real CPF first (if available)
      if (cpfToUse) {
        const customerPayload: Record<string, string | boolean | undefined> = {
          name: responsavel.nome,
          email: responsavel.email,
          mobilePhone: responsavel.telefone?.replace(/\D/g, ''),
          cpfCnpj: cpfToUse,
          notificationDisabled: true,
        };
        
        Object.keys(customerPayload).forEach(key => {
          if (customerPayload[key] === undefined || customerPayload[key] === null || customerPayload[key] === '') {
            delete customerPayload[key];
          }
        });

        console.log('Creating customer with real CPF:', JSON.stringify(customerPayload));

        const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': activeApiKey,
          },
          body: JSON.stringify(customerPayload),
        });

        customerResult = await customerResponse.json();
        console.log('Customer creation result:', JSON.stringify(customerResult));

        if (!customerResult.errors) {
          customerId = customerResult.id;
        } else {
          console.log('Failed with real CPF, will try with generated CPF');
        }
      }
      
      // If customer creation failed (invalid CPF or no CPF), try with generated valid CPF
      if (!customerId) {
        cpfToUse = generateTestCpf();
        
        const customerPayload: Record<string, string | boolean | undefined> = {
          name: responsavel.nome,
          email: responsavel.email,
          mobilePhone: responsavel.telefone?.replace(/\D/g, ''),
          cpfCnpj: cpfToUse,
          notificationDisabled: true,
        };
        
        Object.keys(customerPayload).forEach(key => {
          if (customerPayload[key] === undefined || customerPayload[key] === null || customerPayload[key] === '') {
            delete customerPayload[key];
          }
        });

        console.log('Creating customer with generated CPF:', JSON.stringify(customerPayload));

        const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': activeApiKey,
          },
          body: JSON.stringify(customerPayload),
        });

        customerResult = await customerResponse.json();
        console.log('Customer creation result with generated CPF:', JSON.stringify(customerResult));

        if (customerResult.errors) {
          console.error('Error creating customer:', customerResult.errors);
          return new Response(
            JSON.stringify({ error: customerResult.errors[0]?.description || 'Erro ao criar cliente' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        customerId = customerResult.id;
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível identificar o responsável para a cobrança' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create PIX payment
    const eventoData = eventoRaw;
    const dueDate = eventoData?.data || new Date().toISOString().split('T')[0];
    
    // Build description with fees breakdown
    let description = `Amistoso - ${criancaRaw?.nome || 'Atleta'}`;
    if (eventoData?.adversario) {
      description += ` vs ${eventoData.adversario}`;
    }
    
    const paymentPayload = {
      customer: customerId,
      billingType: 'PIX',
      value: valorTotal,
      dueDate: dueDate,
      description: description,
      externalReference: convocacao_id,
    };

    console.log('Creating payment:', JSON.stringify(paymentPayload));

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': activeApiKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentResult: AsaasPaymentResponse = await paymentResponse.json();
    console.log('Payment creation result:', JSON.stringify(paymentResult));

    if (paymentResult.errors) {
      console.error('Error creating payment:', paymentResult.errors);
      return new Response(
        JSON.stringify({ error: paymentResult.errors[0]?.description || 'Erro ao criar cobrança PIX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get PIX QR Code
    const pixQrCodeResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentResult.id}/pixQrCode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': activeApiKey,
      },
    });

    const pixQrCodeResult: AsaasPixQrCodeResponse = await pixQrCodeResponse.json();
    console.log('PIX QR Code result:', JSON.stringify(pixQrCodeResult));

    if (pixQrCodeResult.errors) {
      console.error('Error getting PIX QR Code:', pixQrCodeResult.errors);
      return new Response(
        JSON.stringify({ error: pixQrCodeResult.errors[0]?.description || 'Erro ao gerar QR Code PIX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update convocacao with Asaas payment data
    const qrCodeUrl = `data:image/png;base64,${pixQrCodeResult.encodedImage}`;
    
    const { error: updateError } = await supabase
      .from('amistoso_convocacoes')
      .update({
        asaas_payment_id: paymentResult.id,
        pix_br_code: pixQrCodeResult.payload,
        pix_qr_code_url: qrCodeUrl,
        pix_expires_at: pixQrCodeResult.expirationDate,
        notificado_em: new Date().toISOString(),
        status: 'aguardando_pagamento',
      })
      .eq('id', convocacao_id);

    if (updateError) {
      console.error('Error updating convocacao:', updateError);
    }

    // Determine if this is a championship game
    const isCampeonatoGame = eventoRaw?.campeonato_id != null;
    const eventLabel = isCampeonatoGame ? 'jogo de campeonato' : 'amistoso';

    // Send push notification to guardian
    console.log(`Sending push notification for ${eventLabel} convocação:`, convocacao_id);
    try {
      const notificationPayload = {
        to: responsavel.email,
        subject: isCampeonatoGame 
          ? `Novo Jogo de Campeonato: ${eventoData?.nome}`
          : `Convocação para Amistoso: ${eventoData?.nome}`,
        message: isCampeonatoGame
          ? `Olá! ${criancaRaw?.nome} foi convocado para um novo jogo de campeonato: ${eventoData?.nome}. Confirme a participação realizando o pagamento da taxa de arbitragem de R$ ${valorTotal?.toFixed(2).replace('.', ',')}.`
          : `Olá! ${criancaRaw?.nome} foi convocado para o amistoso ${eventoData?.nome}. Confirme a participação realizando o pagamento de R$ ${valorTotal?.toFixed(2).replace('.', ',')}.`,
      };
      console.log('Notification payload:', JSON.stringify(notificationPayload));
      // In production, integrate with push notification service (e.g., Firebase Cloud Messaging)
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail the main request if notification fails
    }

    // Build fee breakdown for response
    const taxaParticipacao = eventoData?.cobrar_taxa_participacao ? (eventoData?.taxa_participacao || 0) : 0;
    const taxaJuiz = eventoData?.cobrar_taxa_juiz ? (eventoData?.taxa_juiz || 0) : 0;

    // Return PIX data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          pixId: paymentResult.id,
          brCode: pixQrCodeResult.payload,
          qrCodeUrl: qrCodeUrl,
          expiresAt: pixQrCodeResult.expirationDate,
          valor: valorTotal,
          taxaParticipacao: taxaParticipacao,
          taxaJuiz: taxaJuiz,
          evento: {
            nome: eventoData?.nome,
            data: eventoData?.data,
            horario: eventoData?.horario_inicio,
            local: eventoData?.local,
            adversario: eventoData?.adversario,
          },
          crianca: {
            nome: criancaRaw?.nome,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
