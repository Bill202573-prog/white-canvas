import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://sandbox.asaas.com/api/v3";

interface Documento {
  id: string;
  tipo_documento: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number;
  mime_type: string;
}

// Map document types to Asaas document types
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  "documento_foto_pf": "IDENTIFICATION",
  "contrato_social": "SOCIAL_CONTRACT",
  "documento_responsavel_pj": "IDENTIFICATION",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { escolinha_id } = await req.json();

    if (!escolinha_id) {
      throw new Error("escolinha_id é obrigatório");
    }

    // Fetch cadastro to get Asaas account ID
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("asaas_account_id")
      .eq("escolinha_id", escolinha_id)
      .single();

    if (cadastroError || !cadastro?.asaas_account_id) {
      throw new Error("Subconta Asaas não encontrada. Crie a subconta primeiro.");
    }

    // Fetch documents
    const { data: documentos, error: docError } = await supabase
      .from("escola_documentos")
      .select("*")
      .eq("escolinha_id", escolinha_id);

    if (docError) {
      throw new Error(`Erro ao buscar documentos: ${docError.message}`);
    }

    if (!documentos || documentos.length === 0) {
      throw new Error("Nenhum documento encontrado para enviar");
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("escola_asaas_jobs")
      .insert({
        escolinha_id,
        tipo: "enviar_documento",
        status: "processando",
        payload: { document_count: documentos.length },
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Erro ao criar job: ${jobError.message}`);
    }

    const results: { documento: string; success: boolean; error?: string }[] = [];

    // Send each document to Asaas
    for (const doc of documentos as Documento[]) {
      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("escola-documentos")
          .download(doc.storage_path);

        if (downloadError || !fileData) {
          results.push({
            documento: doc.nome_arquivo,
            success: false,
            error: `Erro ao baixar arquivo: ${downloadError?.message}`,
          });
          continue;
        }

        // Convert to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Determine Asaas document type
        const asaasDocType = DOCUMENT_TYPE_MAP[doc.tipo_documento] || "CUSTOM";

        // Send to Asaas
        const asaasResponse = await fetch(
          `${ASAAS_API_URL}/myAccount/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "access_token": ASAAS_API_KEY,
            },
            body: JSON.stringify({
              id: cadastro.asaas_account_id,
              type: asaasDocType,
              documentFile: base64,
            }),
          }
        );

        const asaasResult = await asaasResponse.json();

        if (!asaasResponse.ok) {
          results.push({
            documento: doc.nome_arquivo,
            success: false,
            error: asaasResult.errors?.[0]?.description || "Erro ao enviar",
          });
        } else {
          results.push({
            documento: doc.nome_arquivo,
            success: true,
          });
        }
      } catch (docError) {
        const docErrorMessage = docError instanceof Error ? docError.message : "Erro desconhecido";
        results.push({
          documento: doc.nome_arquivo,
          success: false,
          error: docErrorMessage,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    // Update cadastro status
    if (anySuccess) {
      await supabase
        .from("escola_cadastro_bancario")
        .update({
          asaas_status: "pending_approval",
          asaas_atualizado_em: new Date().toISOString(),
        })
        .eq("escolinha_id", escolinha_id);
    }

    // Update job
    await supabase
      .from("escola_asaas_jobs")
      .update({
        status: allSuccess ? "concluido" : "erro",
        resultado: results,
        erro: allSuccess ? null : "Alguns documentos falharam",
        processed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: allSuccess
          ? "Todos os documentos enviados com sucesso"
          : "Alguns documentos não puderam ser enviados",
        results,
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
