import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function orchestrates the async submission process
// It queues the jobs and returns immediately
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Autorização necessária");
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Usuário não autenticado");
    }

    const { escolinha_id } = await req.json();

    if (!escolinha_id) {
      throw new Error("escolinha_id é obrigatório");
    }

    // Verify user is admin of this escola
    const { data: escolinha, error: escolinhaError } = await supabase
      .from("escolinhas")
      .select("id, admin_user_id")
      .eq("id", escolinha_id)
      .single();

    if (escolinhaError || !escolinha || escolinha.admin_user_id !== userData.user.id) {
      throw new Error("Acesso negado");
    }

    // Check if cadastro exists
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("id, asaas_account_id, asaas_status")
      .eq("escolinha_id", escolinha_id)
      .single();

    if (cadastroError || !cadastro) {
      throw new Error("Cadastro bancário não encontrado. Complete o cadastro primeiro.");
    }

    // Check if documents exist
    const { data: documentos, error: docError } = await supabase
      .from("escola_documentos")
      .select("id")
      .eq("escolinha_id", escolinha_id);

    if (docError || !documentos || documentos.length === 0) {
      throw new Error("Documentos não encontrados. Envie os documentos obrigatórios primeiro.");
    }

    // Check if already processing
    const { data: pendingJobs } = await supabase
      .from("escola_asaas_jobs")
      .select("id")
      .eq("escolinha_id", escolinha_id)
      .in("status", ["pendente", "processando"])
      .limit(1);

    if (pendingJobs && pendingJobs.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Seu cadastro já está sendo processado. Aguarde a conclusão.",
          status: "processing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update escola status to EM_ANALISE immediately
    await supabase
      .from("escolinhas")
      .update({ status_financeiro_escola: "EM_ANALISE" })
      .eq("id", escolinha_id);

    // Trigger the async process
    // Call create-subaccount in the background using EdgeRuntime.waitUntil pattern
    const baseUrl = supabaseUrl.replace("/rest/v1", "");
    
    // Fire and forget - create subaccount
    fetch(`${baseUrl}/functions/v1/asaas-create-subaccount`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ escolinha_id }),
    }).then(async (response) => {
      const result = await response.json();
      console.log("Create subaccount result:", result);
      
      // If subaccount created successfully, send documents
      if (result.success && result.account_id) {
        fetch(`${baseUrl}/functions/v1/asaas-send-documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ escolinha_id }),
        }).then(async (docResponse) => {
          const docResult = await docResponse.json();
          console.log("Send documents result:", docResult);
        }).catch((err) => {
          console.error("Error sending documents:", err);
        });
      }
    }).catch((err) => {
      console.error("Error creating subaccount:", err);
    });

    // Return immediately to user
    return new Response(
      JSON.stringify({
        success: true,
        message: "Cadastro enviado para análise. Você será notificado quando estiver concluído.",
        status: "submitted",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
