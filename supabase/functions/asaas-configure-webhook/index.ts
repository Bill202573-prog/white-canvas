import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Asaas API base URLs
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://api.asaas.com/v3";

// Webhook events we want to receive
const WEBHOOK_EVENTS = [
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED", 
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_UPDATED",
  "PAYMENT_REFUNDED",
];

interface WebhookConfig {
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion: number;
  authToken: string;
  sendType?: string;
}

interface WebhookResponse {
  id: string;
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion: number;
  authToken: string;
  sendType?: string;
}

interface WebhookListItem {
  id: string;
  name: string;
  url: string;
  email: string | null;
  sendType: string;
  enabled: boolean;
  interrupted: boolean;
  authToken: string | null;
  apiVersion: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { escolinha_id } = await req.json();

    if (!escolinha_id) {
      return new Response(
        JSON.stringify({ success: false, error: "escolinha_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get school's Asaas API key
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("asaas_api_key, asaas_account_id, asaas_status")
      .eq("escolinha_id", escolinha_id)
      .maybeSingle();

    if (cadastroError) {
      console.error("Error fetching cadastro:", cadastroError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao buscar cadastro bancário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cadastro?.asaas_api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Subconta Asaas não configurada. Aguarde a aprovação do cadastro." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasApiKey = cadastro.asaas_api_key;
    
    // Our webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "atleta-id-webhook-2024";

    console.log(`Configuring webhook for escola ${escolinha_id}`);
    console.log(`Webhook URL: ${webhookUrl}`);

    // First, check existing webhooks
    const listResponse = await fetch(`${ASAAS_API_URL}/webhooks`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
    });

    let existingWebhook: WebhookListItem | null = null;
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log("Existing webhooks:", JSON.stringify(listData));
      
      // Find if our webhook already exists
      if (listData.data && Array.isArray(listData.data)) {
        existingWebhook = listData.data.find((wh: WebhookListItem) => 
          wh.url === webhookUrl || wh.url.includes("asaas-webhook")
        );
      }
    }

    let webhookResult: WebhookResponse;
    let wasCreated = false;
    let wasUpdated = false;

    if (existingWebhook) {
      console.log(`Found existing webhook: ${existingWebhook.id}`);
      
      // Update existing webhook to ensure it's enabled and has correct config
      const updateResponse = await fetch(`${ASAAS_API_URL}/webhooks/${existingWebhook.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          interrupted: false,
          authToken: webhookToken,
          apiVersion: 3,
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Error updating webhook:", errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro ao atualizar webhook: ${errorText}` 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      webhookResult = await updateResponse.json();
      wasUpdated = true;
    } else {
      // Create new webhook
      console.log("Creating new webhook...");
      
      const createResponse = await fetch(`${ASAAS_API_URL}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          name: "Atleta ID - Pagamentos",
          url: webhookUrl,
          email: "suporte@atletaid.com.br",
          enabled: true,
          interrupted: false,
          authToken: webhookToken,
          apiVersion: 3,
          sendType: "SEQUENTIALLY",
          events: WEBHOOK_EVENTS,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Error creating webhook:", errorText);
        
        // Check if it's a duplicate error
        if (errorText.includes("já existe") || errorText.includes("already exists")) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Webhook já estava configurado",
              events: WEBHOOK_EVENTS,
              status: "configured"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Erro ao criar webhook: ${errorText}` 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      webhookResult = await createResponse.json();
      wasCreated = true;
    }

    console.log("Webhook configured successfully:", webhookResult);

    // Verify webhook is working by fetching its status
    const verifyResponse = await fetch(`${ASAAS_API_URL}/webhooks`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
    });

    let configuredEvents: string[] = [];
    let webhookStatus = "unknown";

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      if (verifyData.data && Array.isArray(verifyData.data)) {
        const ourWebhook = verifyData.data.find((wh: WebhookListItem) => 
          wh.url === webhookUrl
        );
        if (ourWebhook) {
          webhookStatus = ourWebhook.enabled ? "active" : "inactive";
          // Asaas webhooks receive all payment events by default
          configuredEvents = WEBHOOK_EVENTS;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: wasCreated 
          ? "Webhook criado com sucesso!" 
          : wasUpdated 
            ? "Webhook atualizado com sucesso!"
            : "Webhook configurado!",
        webhookId: webhookResult.id,
        url: webhookUrl,
        enabled: webhookResult.enabled,
        events: configuredEvents,
        status: webhookStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in asaas-configure-webhook:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro interno" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
