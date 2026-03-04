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
    const masterAsaasApiKey = Deno.env.get("ASAAS_API_KEY");
    
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

    const { mensalidadeId } = await req.json();

    if (!mensalidadeId) {
      return new Response(
        JSON.stringify({ error: "ID da mensalidade não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cancelling mensalidade:", mensalidadeId);

    // Get the mensalidade details
    const { data: mensalidade, error: mensalidadeError } = await supabase
      .from("mensalidades")
      .select("id, abacatepay_billing_id, status, crianca_id, escolinha_id, mes_referencia, valor")
      .eq("id", mensalidadeId)
      .single();

    if (mensalidadeError || !mensalidade) {
      console.error("Mensalidade not found:", mensalidadeError);
      return new Response(
        JSON.stringify({ error: "Mensalidade não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is school admin
    const { data: escolinha, error: escolinhaError } = await supabase
      .from("escolinhas")
      .select("id, nome, admin_user_id")
      .eq("id", mensalidade.escolinha_id)
      .single();

    if (escolinhaError || !escolinha) {
      return new Response(
        JSON.stringify({ error: "Escola não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is school admin or system admin
    const isSchoolAdmin = escolinha.admin_user_id === caller.id;
    
    if (!isSchoolAdmin) {
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

    // Check if already paid
    if (mensalidade.status === 'pago') {
      return new Response(
        JSON.stringify({ error: "Esta mensalidade já foi paga e não pode ser cancelada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already cancelled
    if (mensalidade.status === 'cancelado') {
      return new Response(
        JSON.stringify({ error: "Esta mensalidade já foi cancelada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel in Asaas if payment ID exists
    if (mensalidade.abacatepay_billing_id) {
      // Get school's Asaas API key or use master key
      const { data: cadastroBancario } = await supabase
        .from("escola_cadastro_bancario")
        .select("asaas_api_key")
        .eq("escolinha_id", mensalidade.escolinha_id)
        .maybeSingle();

      const asaasApiKey = cadastroBancario?.asaas_api_key || masterAsaasApiKey;
      
      if (asaasApiKey) {
        try {
          const asaasBaseUrl = "https://api.asaas.com/v3";
          
          // Delete/cancel the payment in Asaas
          const deleteResponse = await fetch(
            `${asaasBaseUrl}/payments/${mensalidade.abacatepay_billing_id}`,
            {
              method: "DELETE",
              headers: {
                "access_token": asaasApiKey,
                "Content-Type": "application/json",
              },
            }
          );

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.error("Error cancelling Asaas payment:", errorData);
            // Continue anyway - we still want to cancel locally
          } else {
            console.log("Asaas payment cancelled successfully:", mensalidade.abacatepay_billing_id);
          }
        } catch (asaasError) {
          console.error("Error calling Asaas API:", asaasError);
          // Continue anyway - we still want to cancel locally
        }
      }
    }

    // Update the mensalidade status to cancelled and clear payment data
    const { error: updateError } = await supabase
      .from("mensalidades")
      .update({
        status: 'cancelado',
        abacatepay_billing_id: null,
        abacatepay_url: null,
      })
      .eq("id", mensalidadeId);

    if (updateError) {
      console.error("Error updating mensalidade:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao cancelar mensalidade: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Mensalidade cancelled successfully:", mensalidadeId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Cobrança cancelada com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error cancelling mensalidade:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
