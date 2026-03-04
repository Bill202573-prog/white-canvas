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

    const { cobrancaId } = await req.json();

    if (!cobrancaId) {
      return new Response(
        JSON.stringify({ error: "ID da cobrança não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the charge details
    const { data: cobranca, error: cobrancaError } = await supabase
      .from("cobrancas_entrada")
      .select("id, asaas_payment_id, status, crianca_id, escolinha_id, responsavel_id")
      .eq("id", cobrancaId)
      .single();

    if (cobrancaError || !cobranca) {
      return new Response(
        JSON.stringify({ error: "Cobrança não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is school admin
    const { data: escolinha, error: escolinhaError } = await supabase
      .from("escolinhas")
      .select("id, nome, admin_user_id")
      .eq("id", cobranca.escolinha_id)
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
    if (cobranca.status === 'pago') {
      return new Response(
        JSON.stringify({ error: "Esta cobrança já foi paga e não pode ser cancelada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already cancelled
    if (cobranca.status === 'cancelado') {
      return new Response(
        JSON.stringify({ error: "Esta cobrança já foi cancelada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel in Asaas if payment ID exists
    if (cobranca.asaas_payment_id) {
      // Get school's Asaas API key or use master key
      const { data: cadastroBancario } = await supabase
        .from("escola_cadastro_bancario")
        .select("asaas_api_key")
        .eq("escolinha_id", cobranca.escolinha_id)
        .maybeSingle();

      const asaasApiKey = cadastroBancario?.asaas_api_key || Deno.env.get("ASAAS_API_KEY");
      
      if (asaasApiKey) {
        try {
          const asaasBaseUrl = "https://api.asaas.com/v3";
          
          // Delete/cancel the payment in Asaas
          const deleteResponse = await fetch(
            `${asaasBaseUrl}/payments/${cobranca.asaas_payment_id}`,
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
            console.log("Asaas payment cancelled:", cobranca.asaas_payment_id);
          }
        } catch (asaasError) {
          console.error("Error calling Asaas API:", asaasError);
          // Continue anyway - we still want to cancel locally
        }
      }
    }

    // Update the charge status to cancelled and clear PIX data
    const { error: updateError } = await supabase
      .from("cobrancas_entrada")
      .update({
        status: 'cancelado',
        pix_payload: null,
        pix_qrcode_url: null,
        pix_expires_at: null,
      })
      .eq("id", cobrancaId);

    if (updateError) {
      console.error("Error updating cobranca:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao cancelar cobrança: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset crianca_escolinha status back to pending
    await supabase
      .from("crianca_escolinha")
      .update({ 
        status_matricula: 'pendente',
        entrada_paga: false,
      })
      .eq("crianca_id", cobranca.crianca_id)
      .eq("escolinha_id", cobranca.escolinha_id);

    console.log("Enrollment charge cancelled successfully:", cobrancaId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Cobrança cancelada com sucesso. Você pode gerar uma nova cobrança." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error cancelling enrollment payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
