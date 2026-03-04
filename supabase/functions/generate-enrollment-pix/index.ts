import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AsaasPaymentResponse {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
}

interface AsaasPixQrCodeResponse {
  payload: string;
  expirationDate: string;
  encodedImage: string;
}

// Generate a valid test CPF for Asaas sandbox
function generateTestCpf(): string {
  const randomDigits = () => Math.floor(Math.random() * 9);
  const base = Array.from({ length: 9 }, randomDigits);
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += base[i] * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  base.push(d1);
  
  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += base[i] * (11 - i);
  }
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  base.push(d2);
  
  return base.join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { criancaId, escolinhaId, valorMatricula, valorMensalidade, valorUniforme } = await req.json();

    if (!criancaId || !escolinhaId) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is school admin
    const { data: escolinha, error: escolinhaError } = await supabase
      .from("escolinhas")
      .select("id, nome, admin_user_id")
      .eq("id", escolinhaId)
      .single();

    if (escolinhaError || !escolinha || escolinha.admin_user_id !== caller.id) {
      // Check if caller is system admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .maybeSingle();
      
      if (roleData?.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: "Sem permissão para esta operação" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get child and guardian data
    const { data: crianca, error: criancaError } = await supabase
      .from("criancas")
      .select("id, nome")
      .eq("id", criancaId)
      .single();

    if (criancaError || !crianca) {
      return new Response(
        JSON.stringify({ error: "Aluno não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get guardian
    const { data: linkData, error: linkError } = await supabase
      .from("crianca_responsavel")
      .select("responsavel_id")
      .eq("crianca_id", criancaId)
      .limit(1)
      .single();

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: "Responsável não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: responsavel, error: respError } = await supabase
      .from("responsaveis")
      .select("id, nome, email, telefone, cpf")
      .eq("id", linkData.responsavel_id)
      .single();

    if (respError || !responsavel) {
      return new Response(
        JSON.stringify({ error: "Dados do responsável não encontrados" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if active enrollment charge already exists (ignore cancelled ones)
    const { data: existingCharge } = await supabase
      .from("cobrancas_entrada")
      .select("id, status")
      .eq("crianca_id", criancaId)
      .eq("escolinha_id", escolinhaId)
      .neq("status", "cancelado")
      .maybeSingle();

    if (existingCharge) {
      if (existingCharge.status === 'pago') {
        return new Response(
          JSON.stringify({ error: "A cobrança de matrícula já foi paga" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (existingCharge.status === 'pendente') {
        return new Response(
          JSON.stringify({ error: "Já existe uma cobrança de matrícula pendente para este aluno" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate total
    const matriculaVal = Number(valorMatricula) || 0;
    const mensalidadeVal = Number(valorMensalidade) || 0;
    const uniformeVal = Number(valorUniforme) || 0;
    const totalValue = matriculaVal + mensalidadeVal + uniformeVal;

    if (totalValue <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor total deve ser maior que zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build description items
    const descricaoItens = [];
    if (matriculaVal > 0) descricaoItens.push({ tipo: 'matricula', valor: matriculaVal, descricao: 'Taxa de Matrícula' });
    if (mensalidadeVal > 0) descricaoItens.push({ tipo: 'mensalidade', valor: mensalidadeVal, descricao: 'Primeira Mensalidade' });
    if (uniformeVal > 0) descricaoItens.push({ tipo: 'uniforme', valor: uniformeVal, descricao: 'Uniforme' });

    const descriptionText = descricaoItens.map(i => `${i.descricao}: R$ ${i.valor.toFixed(2)}`).join(' | ');

    // Get school's Asaas API key - use subconta if available, fallback to master for testing
    const { data: cadastroBancario } = await supabase
      .from("escola_cadastro_bancario")
      .select("asaas_account_id, asaas_api_key, asaas_status")
      .eq("escolinha_id", escolinhaId)
      .maybeSingle();

    // Use school's subconta API key if available, otherwise use master key for testing
    let apiKeyToUse: string;
    let usingMasterKey = false;
    
    if (cadastroBancario?.asaas_api_key) {
      apiKeyToUse = cadastroBancario.asaas_api_key;
      console.log("Using school's Asaas subconta API key for escola:", escolinhaId, "Account ID:", cadastroBancario.asaas_account_id);
    } else {
      // Fallback to master API key for schools without subconta (testing purposes)
      apiKeyToUse = asaasApiKey;
      usingMasterKey = true;
      console.log("School does not have subconta, using master API key for escola:", escolinhaId);
    }
    
    const asaasBaseUrl = "https://api.asaas.com/v3";

    // Create or find customer in Asaas
    let cpfToUse = responsavel.cpf?.replace(/\D/g, '') || '';
    if (!cpfToUse || cpfToUse.length !== 11) {
      cpfToUse = generateTestCpf();
      console.log("Generated test CPF for sandbox:", cpfToUse);
    }

    // Search for existing customer
    const searchCustomerResponse = await fetch(
      `${asaasBaseUrl}/customers?email=${encodeURIComponent(responsavel.email)}`,
      {
        method: "GET",
        headers: {
          "access_token": apiKeyToUse,
          "Content-Type": "application/json",
        },
      }
    );

    const searchData = await searchCustomerResponse.json();
    let customerId: string;

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log("Found existing Asaas customer:", customerId);
    } else {
      // Create new customer - disable notifications, payment will be shown in app
      const createCustomerWithCpf = async (cpf: string): Promise<{ ok: boolean; data: any }> => {
        const response = await fetch(
          `${asaasBaseUrl}/customers`,
          {
            method: "POST",
            headers: {
              "access_token": apiKeyToUse,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: responsavel.nome,
              email: responsavel.email,
              phone: responsavel.telefone?.replace(/\D/g, '') || undefined,
              cpfCnpj: cpf,
              notificationDisabled: true, // Don't send email - payment shown in app popup
            }),
          }
        );
        const data = await response.json();
        return { ok: response.ok, data };
      };

      // Try with original CPF first
      let result = await createCustomerWithCpf(cpfToUse);
      
      // If CPF is invalid, retry with a generated test CPF
      if (!result.ok && result.data?.errors?.some((e: any) => 
        e.code === 'invalid_object' || e.description?.toLowerCase().includes('cpf')
      )) {
        console.log("Original CPF rejected, retrying with test CPF");
        const testCpf = generateTestCpf();
        result = await createCustomerWithCpf(testCpf);
        
        if (!result.ok) {
          console.error("Error creating Asaas customer with test CPF:", result.data);
          return new Response(
            JSON.stringify({ error: "Erro ao criar cliente no sistema de pagamentos", details: result.data }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("Created customer with test CPF:", testCpf);
      } else if (!result.ok) {
        console.error("Error creating Asaas customer:", result.data);
        return new Response(
          JSON.stringify({ error: "Erro ao criar cliente no sistema de pagamentos", details: result.data }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = result.data.id;
      console.log("Created new Asaas customer:", customerId);
    }

    // Calculate due date (today + 3 days, min tomorrow)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create PIX payment
    const createPaymentResponse = await fetch(
      `${asaasBaseUrl}/payments`,
      {
        method: "POST",
        headers: {
          "access_token": apiKeyToUse,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: totalValue,
          dueDate: dueDateStr,
          description: `Matrícula ${escolinha?.nome || 'Escola'} - ${crianca.nome}: ${descriptionText}`,
          externalReference: `enrollment_${criancaId}_${escolinhaId}`,
        }),
      }
    );

    const paymentData: AsaasPaymentResponse = await createPaymentResponse.json();

    if (!createPaymentResponse.ok) {
      console.error("Error creating Asaas payment:", paymentData);
      return new Response(
        JSON.stringify({ error: "Erro ao criar cobrança PIX", details: paymentData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created Asaas payment:", paymentData.id);

    // Get PIX QR code
    const qrCodeResponse = await fetch(
      `${asaasBaseUrl}/payments/${paymentData.id}/pixQrCode`,
      {
        method: "GET",
        headers: {
          "access_token": apiKeyToUse,
          "Content-Type": "application/json",
        },
      }
    );

    const qrCodeData: AsaasPixQrCodeResponse = await qrCodeResponse.json();

    if (!qrCodeResponse.ok) {
      console.error("Error getting PIX QR code:", qrCodeData);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar QR Code PIX" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiration (payment due date + 1 day for PIX)
    const expiresAt = new Date(qrCodeData.expirationDate || dueDate);
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Create enrollment charge record
    const { data: cobranca, error: cobrancaError } = await supabase
      .from("cobrancas_entrada")
      .insert({
        crianca_id: criancaId,
        escolinha_id: escolinhaId,
        responsavel_id: responsavel.id,
        valor_matricula: matriculaVal,
        valor_mensalidade: mensalidadeVal,
        valor_uniforme: uniformeVal,
        valor_total: totalValue,
        descricao_itens: descricaoItens,
        status: 'pendente',
        asaas_payment_id: paymentData.id,
        asaas_customer_id: customerId,
        pix_payload: qrCodeData.payload,
        pix_qrcode_url: `data:image/png;base64,${qrCodeData.encodedImage}`,
        pix_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (cobrancaError) {
      console.error("Error creating enrollment charge record:", cobrancaError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar cobrança: " + cobrancaError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update crianca_escolinha status to 'aguardando_pagamento'
    await supabase
      .from("crianca_escolinha")
      .update({ 
        status_matricula: 'aguardando_pagamento',
        valor_matricula: matriculaVal,
        valor_uniforme: uniformeVal,
      })
      .eq("crianca_id", criancaId)
      .eq("escolinha_id", escolinhaId);

    console.log("Enrollment charge created successfully:", cobranca.id);

    return new Response(
      JSON.stringify({
        success: true,
        cobrancaId: cobranca.id,
        pixPayload: qrCodeData.payload,
        pixQrCodeUrl: cobranca.pix_qrcode_url,
        expiresAt: cobranca.pix_expires_at,
        valorTotal: totalValue,
        paymentId: paymentData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating enrollment PIX:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
