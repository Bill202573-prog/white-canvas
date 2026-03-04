import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

interface AsaasWebhookPayload {
  event: string;
  account?: {
    id: string;
    name?: string;
    email?: string;
    status?: string;
    generalStatus?: string;
    commercialInfo?: {
      status?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      throw new Error("Missing required environment variables");
    }

    // Validate webhook token if configured
    if (ASAAS_WEBHOOK_TOKEN) {
      const receivedToken = req.headers.get("asaas-access-token");
      if (receivedToken !== ASAAS_WEBHOOK_TOKEN) {
        console.warn("Invalid webhook token received");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse webhook payload
    const payload: AsaasWebhookPayload = await req.json();
    console.log("Received Asaas webhook:", JSON.stringify(payload, null, 2));

    const { event, account } = payload;

    if (!event) {
      console.error("Missing event in payload");
      return new Response(
        JSON.stringify({ error: "Missing event in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only process account-related events
    const accountEvents = [
      "ACCOUNT_STATUS_UPDATED",
      "ACCOUNT_UPDATED",
      "ACCOUNT_DOCUMENT_APPROVED",
      "ACCOUNT_DOCUMENT_REJECTED",
      "ACCOUNT_DOCUMENT_ANALYSIS",
    ];

    if (!accountEvents.includes(event)) {
      console.log(`Event ${event} not handled, ignoring`);
      return new Response(
        JSON.stringify({ success: true, message: "Event not handled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!account || !account.id) {
      console.error("Missing account data in payload");
      return new Response(
        JSON.stringify({ error: "Missing account data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing event: ${event} for account: ${account.id}`);

    // Find escolinha by asaas_account_id
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("id, escolinha_id, asaas_status")
      .eq("asaas_account_id", account.id)
      .maybeSingle();

    if (cadastroError) {
      console.error("Error fetching cadastro:", cadastroError);
      throw new Error(`Database error: ${cadastroError.message}`);
    }

    if (!cadastro) {
      console.warn(`No cadastro found for Asaas account: ${account.id}`);
      return new Response(
        JSON.stringify({ error: "Cadastro not found for this account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found cadastro: ${cadastro.id} for escolinha: ${cadastro.escolinha_id}`);

    // Determine the new status
    const newStatus = account.status || account.generalStatus || account.commercialInfo?.status || "UNKNOWN";
    const previousStatus = cadastro.asaas_status;

    console.log(`Status change: ${previousStatus} -> ${newStatus}`);

    // Update escola_cadastro_bancario
    const { error: updateCadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .update({
        asaas_status: newStatus.toLowerCase(),
        asaas_atualizado_em: new Date().toISOString(),
      })
      .eq("id", cadastro.id);

    if (updateCadastroError) {
      console.error("Error updating cadastro:", updateCadastroError);
      throw new Error(`Failed to update cadastro: ${updateCadastroError.message}`);
    }

    console.log(`Cadastro bancario updated with status: ${newStatus}`);

    // Create notification
    const { error: notificationError } = await supabase
      .from("escola_asaas_admin_notifications")
      .insert({
        escolinha_id: cadastro.escolinha_id,
        evento: event,
        mensagem: `Status da conta Asaas atualizado para: ${newStatus}`,
        dados: payload,
        lida: false,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't throw, notification is not critical
    } else {
      console.log(`Notification created for event: ${event}`);
    }

    // Special logic based on status - use case-insensitive matching
    let escolinhaStatusUpdate: string | null = null;
    const normalizedStatus = newStatus.toUpperCase();

    if (normalizedStatus === "APPROVED") {
      escolinhaStatusUpdate = "APROVADO";
      console.log("Account APPROVED - setting escola status to APROVADO");
    } else if (normalizedStatus === "REJECTED") {
      escolinhaStatusUpdate = "REPROVADO";
      console.log("Account REJECTED - setting escola status to REPROVADO");
    } else if (normalizedStatus === "PENDING" || normalizedStatus === "AWAITING_ACTION_AUTHORIZATION" || normalizedStatus === "AWAITING_APPROVAL") {
      escolinhaStatusUpdate = "EM_ANALISE";
      console.log(`Account ${newStatus} - setting escola status to EM_ANALISE`);
    }

    if (escolinhaStatusUpdate) {
      const { error: updateEscolaError } = await supabase
        .from("escolinhas")
        .update({ status_financeiro_escola: escolinhaStatusUpdate })
        .eq("id", cadastro.escolinha_id);

      if (updateEscolaError) {
        console.error("Error updating escola status:", updateEscolaError);
        // Don't throw, we already updated the main cadastro
      } else {
        console.log(`Escola status updated to: ${escolinhaStatusUpdate}`);
      }
    }

    console.log(`Webhook processing completed successfully for account: ${account.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        event,
        status: newStatus,
        previousStatus,
        escolinhaId: cadastro.escolinha_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
