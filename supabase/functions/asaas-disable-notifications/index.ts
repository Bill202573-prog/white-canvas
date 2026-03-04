import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { escolinha_id } = await req.json();

    if (!escolinha_id) {
      throw new Error("escolinha_id é obrigatório");
    }

    // Get the school's Asaas API key
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("asaas_api_key, asaas_account_id")
      .eq("escolinha_id", escolinha_id)
      .single();

    if (cadastroError || !cadastro?.asaas_api_key) {
      throw new Error("API Key da subconta não encontrada. Verifique se a subconta foi criada.");
    }

    const apiKey = cadastro.asaas_api_key;

    // 1. List all customers of this subaccount
    let offset = 0;
    const limit = 100;
    let totalUpdated = 0;
    let totalCustomers = 0;
    const errors: string[] = [];

    while (true) {
      const listResponse = await fetch(
        `${ASAAS_API_URL}/customers?offset=${offset}&limit=${limit}`,
        {
          headers: { "access_token": apiKey },
        }
      );

      if (!listResponse.ok) {
        const errText = await listResponse.text();
        throw new Error(`Erro ao listar clientes: ${errText}`);
      }

      const listResult = await listResponse.json();
      const customers = listResult.data || [];

      if (customers.length === 0) break;

      totalCustomers += customers.length;

      // 2. Update each customer to disable notifications
      for (const customer of customers) {
        if (customer.notificationDisabled) {
          console.log(`Customer ${customer.id} (${customer.name}) already has notifications disabled`);
          totalUpdated++;
          continue;
        }

        const updateResponse = await fetch(
          `${ASAAS_API_URL}/customers/${customer.id}`,
          {
            method: "PUT",
            headers: {
              "access_token": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notificationDisabled: true }),
          }
        );

        if (updateResponse.ok) {
          totalUpdated++;
          console.log(`Disabled notifications for customer ${customer.id} (${customer.name})`);
        } else {
          const errText = await updateResponse.text();
          const errMsg = `Erro ao atualizar cliente ${customer.id} (${customer.name}): ${errText}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }

      if (!listResult.hasMore) break;
      offset += limit;
    }

    console.log(`Finished: ${totalUpdated}/${totalCustomers} customers updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificações desabilitadas para ${totalUpdated} de ${totalCustomers} clientes.`,
        total_customers: totalCustomers,
        total_updated: totalUpdated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
