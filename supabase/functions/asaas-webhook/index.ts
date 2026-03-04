import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // SECURITY: Validate webhook access token
    // ============================================
    const accessToken = req.headers.get("asaas-access-token");
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    
    // If webhook token is configured, validate it
    if (expectedToken) {
      if (!accessToken || accessToken !== expectedToken) {
        console.error("Webhook authentication failed: invalid or missing access token");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Invalid access token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Webhook access token validated successfully");
    } else {
      console.warn("ASAAS_WEBHOOK_TOKEN not configured - webhook authentication disabled. Please configure this secret for production security.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(payload));

    const { event, payment, account } = payload;

    // ============================================
    // PAYMENT EVENTS - Handle PIX payment confirmations
    // ============================================
    if (payment) {
      console.log("Processing payment event:", event, "Payment ID:", payment.id);
      
      // Handle payment confirmation events
      // PAYMENT_RECEIVED = PIX payment received
      // PAYMENT_CONFIRMED = Payment confirmed
      const paymentConfirmedEvents = [
        "PAYMENT_RECEIVED",
        "PAYMENT_CONFIRMED",
      ];

      if (paymentConfirmedEvents.includes(event)) {
        // ============================================
        // First, check if this is an amistoso payment
        // ============================================
        const { data: amistosoConvocacao, error: amistosoError } = await supabase
          .from("amistoso_convocacoes")
          .select("id, crianca_id, evento_id, status")
          .eq("asaas_payment_id", payment.id)
          .single();

        if (amistosoConvocacao && !amistosoError) {
          // This is an amistoso payment
          if (amistosoConvocacao.status?.toLowerCase() === "pago") {
            console.log("Amistoso convocacao already paid, skipping");
            return new Response(
              JSON.stringify({ success: true, message: "Amistoso already paid" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const paymentDate = payment.confirmedDate || payment.paymentDate || new Date().toISOString().split('T')[0];

          // Update amistoso_convocacoes as paid
          const { error: updateError } = await supabase
            .from("amistoso_convocacoes")
            .update({
              status: "pago",
              data_pagamento: paymentDate,
            })
            .eq("id", amistosoConvocacao.id);

          if (updateError) {
            console.error("Error updating amistoso convocacao:", updateError);
          } else {
            console.log("Amistoso convocacao", amistosoConvocacao.id, "marked as paid via webhook");
          }

          return new Response(
            JSON.stringify({ success: true, message: "Amistoso payment confirmed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // ============================================
        // Check if this is an enrollment payment
        // ============================================
        const { data: cobrancaEntrada, error: cobrancaError } = await supabase
          .from("cobrancas_entrada")
          .select("id, crianca_id, escolinha_id, responsavel_id, status")
          .eq("asaas_payment_id", payment.id)
          .single();

        if (cobrancaEntrada && !cobrancaError) {
          // This is an enrollment payment
          if (cobrancaEntrada.status?.toLowerCase() === "pago") {
            console.log("Enrollment charge already paid, skipping");
            return new Response(
              JSON.stringify({ success: true, message: "Enrollment already paid" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const paymentDate = payment.confirmedDate || payment.paymentDate || new Date().toISOString().split('T')[0];

          // Update enrollment charge as paid
          const { error: updateError } = await supabase
            .from("cobrancas_entrada")
            .update({
              status: "pago",
              data_pagamento: paymentDate,
            })
            .eq("id", cobrancaEntrada.id);

          if (updateError) {
            console.error("Error updating enrollment charge:", updateError);
          } else {
            console.log("Enrollment charge", cobrancaEntrada.id, "marked as paid via webhook");

            // Update crianca_escolinha to active
            await supabase
              .from("crianca_escolinha")
              .update({
                status_matricula: "ativo",
                ativo: true,
                entrada_paga: true,
              })
              .eq("crianca_id", cobrancaEntrada.crianca_id)
              .eq("escolinha_id", cobrancaEntrada.escolinha_id);

            // Update crianca as active
            await supabase
              .from("criancas")
              .update({ ativo: true })
              .eq("id", cobrancaEntrada.crianca_id);

            // Update profile to remove force password change
            const { data: responsavel } = await supabase
              .from("responsaveis")
              .select("user_id")
              .eq("id", cobrancaEntrada.responsavel_id)
              .single();

            if (responsavel?.user_id) {
              await supabase
                .from("profiles")
                .update({ password_needs_change: false })
                .eq("user_id", responsavel.user_id);
            }

            console.log("Student", cobrancaEntrada.crianca_id, "activated after enrollment payment");

            // Handle first mensalidade from enrollment
            // Get full cobranca data for mensalidade value
            const { data: fullCobranca } = await supabase
              .from("cobrancas_entrada")
              .select("valor_mensalidade")
              .eq("id", cobrancaEntrada.id)
              .single();

            if (fullCobranca?.valor_mensalidade && Number(fullCobranca.valor_mensalidade) > 0) {
              const { data: criancaData } = await supabase
                .from("criancas")
                .select("data_inicio_cobranca, dia_vencimento")
                .eq("id", cobrancaEntrada.crianca_id)
                .single();

              const now = new Date();
              let refYear = now.getFullYear();
              let refMonth = now.getMonth();

              if (criancaData?.data_inicio_cobranca) {
                const inicio = new Date(criancaData.data_inicio_cobranca);
                refYear = inicio.getFullYear();
                refMonth = inicio.getMonth();
              }

              const mesReferencia = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`;
              const diaVencimento = criancaData?.dia_vencimento || 10;
              const dataVencimento = new Date(refYear, refMonth, diaVencimento);

              // Check for existing mensalidade
              const { data: existingMensalidade } = await supabase
                .from("mensalidades")
                .select("id, status")
                .eq("crianca_id", cobrancaEntrada.crianca_id)
                .eq("escolinha_id", cobrancaEntrada.escolinha_id)
                .eq("mes_referencia", mesReferencia)
                .neq("status", "cancelado")
                .maybeSingle();

              if (existingMensalidade) {
                if (existingMensalidade.status !== 'pago') {
                  await supabase
                    .from("mensalidades")
                    .update({
                      status: 'pago',
                      valor_pago: fullCobranca.valor_mensalidade,
                      data_pagamento: paymentDate,
                      forma_pagamento: 'pix',
                      observacoes: 'Primeira mensalidade - paga junto com a matrícula (webhook)',
                    })
                    .eq("id", existingMensalidade.id);
                  console.log("Webhook: Updated mensalidade to pago:", existingMensalidade.id);
                }
              } else {
                await supabase
                  .from("mensalidades")
                  .insert({
                    crianca_id: cobrancaEntrada.crianca_id,
                    escolinha_id: cobrancaEntrada.escolinha_id,
                    mes_referencia: mesReferencia,
                    valor: fullCobranca.valor_mensalidade,
                    valor_pago: fullCobranca.valor_mensalidade,
                    status: 'pago',
                    data_vencimento: dataVencimento.toISOString().split('T')[0],
                    data_pagamento: paymentDate,
                    forma_pagamento: 'pix',
                    observacoes: 'Primeira mensalidade - paga junto com a matrícula (webhook)',
                  });
                console.log("Webhook: Created first mensalidade for:", cobrancaEntrada.crianca_id);
              }

              // Set mes_referencia_primeira_mensalidade
              await supabase
                .from("cobrancas_entrada")
                .update({ mes_referencia_primeira_mensalidade: mesReferencia })
                .eq("id", cobrancaEntrada.id);
              console.log("Webhook: Set mes_referencia_primeira_mensalidade:", mesReferencia);
            }
          }

          return new Response(
            JSON.stringify({ success: true, message: "Enrollment payment confirmed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // ============================================
        // Not an amistoso, check if it's a mensalidade
        // ============================================
        // Find mensalidade by Asaas payment ID (stored in abacatepay_billing_id field)
        const { data: mensalidade, error: mensalidadeError } = await supabase
          .from("mensalidades")
          .select("id, crianca_id, status")
          .eq("abacatepay_billing_id", payment.id)
          .single();

        if (mensalidadeError || !mensalidade) {
          console.log("Mensalidade not found for payment:", payment.id);
          
          // Check if this is a externalReference (mensalidade_id)
          if (payment.externalReference) {
            const { data: mensalidadeByRef, error: refError } = await supabase
              .from("mensalidades")
              .select("id, crianca_id, status")
              .eq("id", payment.externalReference)
              .single();
            
            if (refError || !mensalidadeByRef) {
              console.log("Mensalidade not found by externalReference:", payment.externalReference);
              return new Response(
                JSON.stringify({ success: true, message: "Payment not found" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            
            // Process mensalidade found by externalReference
            if (mensalidadeByRef.status?.toLowerCase() === "pago") {
              console.log("Mensalidade already paid, skipping");
              return new Response(
                JSON.stringify({ success: true, message: "Already paid" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            
            // Update mensalidade as paid
            const paymentDate = payment.confirmedDate || payment.paymentDate || new Date().toISOString().split('T')[0];
            
            const { error: updateError } = await supabase
              .from("mensalidades")
              .update({
                status: "pago",
                data_pagamento: paymentDate,
                forma_pagamento: "pix",
                valor_pago: payment.netValue || payment.value,
                abacatepay_billing_id: payment.id, // Store Asaas payment ID
              })
              .eq("id", mensalidadeByRef.id);

            if (updateError) {
              console.error("Error updating mensalidade:", updateError);
            } else {
              console.log("Mensalidade", mensalidadeByRef.id, "marked as paid via webhook");
              
              // Update child's financial status if no pending payments
              const { data: pendingPayments } = await supabase
                .from("mensalidades")
                .select("id")
                .eq("crianca_id", mensalidadeByRef.crianca_id)
                .in("status", ["a_vencer", "atrasado"]);
                
              if (!pendingPayments || pendingPayments.length === 0) {
                await supabase
                  .from("criancas")
                  .update({ status_financeiro: "ativo" })
                  .eq("id", mensalidadeByRef.crianca_id);
              }
            }
            
            return new Response(
              JSON.stringify({ success: true, message: "Payment confirmed via externalReference" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ success: true, message: "Payment not found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Idempotency: check if already paid
        if (mensalidade.status?.toLowerCase() === "pago") {
          console.log("Mensalidade already paid, skipping");
          return new Response(
            JSON.stringify({ success: true, message: "Already paid" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update mensalidade as paid
        const paymentDate = payment.confirmedDate || payment.paymentDate || new Date().toISOString().split('T')[0];
        
        const { error: updateError } = await supabase
          .from("mensalidades")
          .update({
            status: "pago",
            data_pagamento: paymentDate,
            forma_pagamento: "pix",
            valor_pago: payment.netValue || payment.value,
          })
          .eq("id", mensalidade.id);

        if (updateError) {
          console.error("Error updating mensalidade:", updateError);
        } else {
          console.log("Mensalidade", mensalidade.id, "marked as paid via webhook");
          
          // Update child's financial status if no pending payments
          const { data: pendingPayments } = await supabase
            .from("mensalidades")
            .select("id")
            .eq("crianca_id", mensalidade.crianca_id)
            .in("status", ["a_vencer", "atrasado"]);
            
          if (!pendingPayments || pendingPayments.length === 0) {
            await supabase
              .from("criancas")
              .update({ status_financeiro: "ativo" })
              .eq("id", mensalidade.crianca_id);
          }
        }

        return new Response(
          JSON.stringify({ success: true, message: "Payment confirmed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log other payment events for debugging
      console.log("Unhandled payment event:", event);
      return new Response(
        JSON.stringify({ success: true, message: "Payment event logged: " + event }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACCOUNT EVENTS - Handle school subaccount status
    // ============================================
    if (account?.id) {
      // Find the cadastro by Asaas account ID
      const { data: cadastro, error: cadastroError } = await supabase
        .from("escola_cadastro_bancario")
        .select("id, escolinha_id, asaas_status")
        .eq("asaas_account_id", account.id)
        .single();

      if (cadastroError || !cadastro) {
        console.log("Cadastro not found for account:", account.id);
        return new Response(
          JSON.stringify({ success: true, message: "Cadastro not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Idempotency check - avoid processing same status twice
      let newAsaasStatus = "";
      let newEscolaStatus: "NAO_CONFIGURADO" | "EM_ANALISE" | "APROVADO" | "REPROVADO" = "EM_ANALISE";

      // Handle different Asaas account events
      switch (event) {
        // Account registration rejected
        case "ACCOUNT_STATUS_REJECTED":
        case "ACCOUNT_DOCUMENT_REJECTED":
          newAsaasStatus = "rejected";
          newEscolaStatus = "REPROVADO";
          break;

        // Account fully approved
        case "ACCOUNT_STATUS_APPROVED":
        case "ACCOUNT_APPROVED":
          newAsaasStatus = "approved";
          newEscolaStatus = "APROVADO";
          break;

        // Account pending approval/verification
        case "ACCOUNT_STATUS_PENDING_INFO":
        case "ACCOUNT_PENDING_APPROVAL":
        case "ACCOUNT_STATUS_AWAITING_APPROVAL":
          newAsaasStatus = "pending_approval";
          newEscolaStatus = "EM_ANALISE";
          break;

        // Documents pending
        case "ACCOUNT_STATUS_PENDING_DOCUMENT":
        case "ACCOUNT_DOCUMENT_PENDING":
          newAsaasStatus = "pending_documents";
          newEscolaStatus = "EM_ANALISE";
          break;

        // Commercial info required
        case "ACCOUNT_STATUS_PENDING_COMMERCIAL_INFO":
          newAsaasStatus = "pending_commercial_info";
          newEscolaStatus = "EM_ANALISE";
          break;

        default:
          console.log("Unhandled account event:", event);
          return new Response(
            JSON.stringify({ success: true, message: "Event not handled: " + event }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      // Idempotency: check if status already matches
      if (cadastro.asaas_status === newAsaasStatus) {
        console.log(`Status already ${newAsaasStatus}, skipping update`);
        return new Response(
          JSON.stringify({ success: true, message: "Status already up to date" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update cadastro bancario
      const { error: updateCadastroError } = await supabase
        .from("escola_cadastro_bancario")
        .update({
          asaas_status: newAsaasStatus,
          asaas_atualizado_em: new Date().toISOString(),
        })
        .eq("id", cadastro.id);

      if (updateCadastroError) {
        console.error("Error updating cadastro:", updateCadastroError);
      }

      // Update escola status
      const { error: updateEscolaError } = await supabase
        .from("escolinhas")
        .update({ status_financeiro_escola: newEscolaStatus })
        .eq("id", cadastro.escolinha_id);

      if (updateEscolaError) {
        console.error("Error updating escola:", updateEscolaError);
      }

      console.log(`Updated escola ${cadastro.escolinha_id} to status ${newEscolaStatus} (asaas: ${newAsaasStatus})`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Status updated to ${newEscolaStatus}`,
          event,
          asaas_status: newAsaasStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No account or payment in payload
    console.log("No account or payment in webhook payload, event:", event);
    return new Response(
      JSON.stringify({ success: true, message: "Event processed (no account or payment)" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});