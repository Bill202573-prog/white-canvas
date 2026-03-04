import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { cobrancaId } = await req.json();

    if (!cobrancaId) {
      return new Response(
        JSON.stringify({ error: "ID da cobrança não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get enrollment charge with full details for mensalidade creation
    const { data: cobranca, error: cobrancaError } = await supabase
      .from("cobrancas_entrada")
      .select("id, asaas_payment_id, status, crianca_id, escolinha_id, responsavel_id, valor_mensalidade")
      .eq("id", cobrancaId)
      .single();

    if (cobrancaError || !cobranca) {
      return new Response(
        JSON.stringify({ error: "Cobrança não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cobranca.status === 'pago') {
      return new Response(
        JSON.stringify({ success: true, status: 'pago', message: "Pagamento já confirmado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cobranca.asaas_payment_id) {
      return new Response(
        JSON.stringify({ error: "Cobrança sem ID de pagamento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get school's Asaas API key - MUST use subconta's key
    const { data: cadastroBancario } = await supabase
      .from("escola_cadastro_bancario")
      .select("asaas_api_key, asaas_account_id")
      .eq("escolinha_id", cobranca.escolinha_id)
      .maybeSingle();

    if (!cadastroBancario?.asaas_api_key) {
      console.error("School does not have Asaas subconta configured:", cobranca.escolinha_id);
      return new Response(
        JSON.stringify({ error: "Esta escola não possui subconta Asaas configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKeyToUse = cadastroBancario.asaas_api_key;
    console.log("Using school's Asaas subconta API key for escola:", cobranca.escolinha_id);
    
    // Check payment status in Asaas - use production API
    const asaasBaseUrl = "https://api.asaas.com/v3";
    
    const paymentResponse = await fetch(
      `${asaasBaseUrl}/payments/${cobranca.asaas_payment_id}`,
      {
        method: "GET",
        headers: {
          "access_token": apiKeyToUse,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("Error checking Asaas payment:", paymentData);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar pagamento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Asaas payment status:", paymentData.status);

    const paidStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
    
    if (paidStatuses.includes(paymentData.status)) {
      const paymentDate = paymentData.confirmedDate || paymentData.paymentDate || new Date().toISOString().split('T')[0];

      // Update enrollment charge as paid
      await supabase
        .from("cobrancas_entrada")
        .update({
          status: 'pago',
          data_pagamento: paymentDate,
        })
        .eq("id", cobranca.id);

      // Update crianca_escolinha to active
      await supabase
        .from("crianca_escolinha")
        .update({
          status_matricula: 'ativo',
          ativo: true,
          entrada_paga: true,
        })
        .eq("crianca_id", cobranca.crianca_id)
        .eq("escolinha_id", cobranca.escolinha_id);

      // Update crianca as active
      await supabase
        .from("criancas")
        .update({ ativo: true })
        .eq("id", cobranca.crianca_id);

      // Update profile to remove force password change (they've completed enrollment)
      const { data: responsavel } = await supabase
        .from("responsaveis")
        .select("user_id")
        .eq("id", cobranca.responsavel_id)
        .single();

      if (responsavel?.user_id) {
        await supabase
          .from("profiles")
          .update({ password_needs_change: false })
          .eq("user_id", responsavel.user_id);
      }

      // Create or update the first mensalidade record (already paid) if valor_mensalidade > 0
      if (cobranca.valor_mensalidade && Number(cobranca.valor_mensalidade) > 0) {
        // Calculate the reference month based on data_inicio_cobranca or current month
        const { data: criancaData } = await supabase
          .from("criancas")
          .select("data_inicio_cobranca, dia_vencimento")
          .eq("id", cobranca.crianca_id)
          .single();

        const now = new Date();
        let refYear = now.getFullYear();
        let refMonth = now.getMonth(); // 0-indexed

        // If data_inicio_cobranca is set, use its month as reference
        if (criancaData?.data_inicio_cobranca) {
          const inicio = new Date(criancaData.data_inicio_cobranca);
          refYear = inicio.getFullYear();
          refMonth = inicio.getMonth();
        }

        const mesReferencia = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`;
        const diaVencimento = criancaData?.dia_vencimento || 10;
        const dataVencimento = new Date(refYear, refMonth, diaVencimento);

        // Check if mensalidade already exists for this month (any status except cancelado)
        const { data: existingMensalidade } = await supabase
          .from("mensalidades")
          .select("id, status")
          .eq("crianca_id", cobranca.crianca_id)
          .eq("escolinha_id", cobranca.escolinha_id)
          .eq("mes_referencia", mesReferencia)
          .neq("status", "cancelado")
          .maybeSingle();

        if (existingMensalidade) {
          // Update existing mensalidade to 'pago' (it was generated before enrollment was paid)
          if (existingMensalidade.status !== 'pago') {
            await supabase
              .from("mensalidades")
              .update({
                status: 'pago',
                valor_pago: cobranca.valor_mensalidade,
                data_pagamento: paymentDate,
                forma_pagamento: 'pix',
                observacoes: 'Primeira mensalidade - paga junto com a matrícula',
              })
              .eq("id", existingMensalidade.id);
            console.log("Updated existing mensalidade to pago:", existingMensalidade.id);
          }
        } else {
          // Create the mensalidade as already paid
          await supabase
            .from("mensalidades")
            .insert({
              crianca_id: cobranca.crianca_id,
              escolinha_id: cobranca.escolinha_id,
              mes_referencia: mesReferencia,
              valor: cobranca.valor_mensalidade,
              valor_pago: cobranca.valor_mensalidade,
              status: 'pago',
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              data_pagamento: paymentDate,
              forma_pagamento: 'pix',
              observacoes: 'Primeira mensalidade - paga junto com a matrícula',
            });
          console.log("Created first mensalidade for child:", cobranca.crianca_id, "month:", mesReferencia);
        }

        // Set mes_referencia_primeira_mensalidade on the cobranca_entrada
        await supabase
          .from("cobrancas_entrada")
          .update({ mes_referencia_primeira_mensalidade: mesReferencia })
          .eq("id", cobranca.id);
        console.log("Set mes_referencia_primeira_mensalidade:", mesReferencia, "on cobranca:", cobranca.id);
      }

      console.log("Enrollment payment confirmed for child:", cobranca.crianca_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'pago', 
          message: "Pagamento confirmado! Matrícula concluída." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'pendente', 
        asaasStatus: paymentData.status,
        message: "Pagamento ainda não confirmado" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking enrollment payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
