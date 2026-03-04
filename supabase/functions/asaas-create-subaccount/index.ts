import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

interface CadastroBancario {
  id: string;
  escolinha_id: string;
  tipo_pessoa: "cpf" | "cnpj";
  nome: string;
  email: string;
  telefone: string | null;
  data_nascimento: string | null;
  income_value: number | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: "corrente" | "poupanca";
}

interface Escolinha {
  id: string;
  nome: string;
  documento: string | null;
  cnpj: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Keep references so we can mark the job as erro even on early validation failures
  let supabase: any = null;
  let jobId: string | null = null;

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { escolinha_id } = await req.json();

    if (!escolinha_id) {
      throw new Error("escolinha_id é obrigatório");
    }

    // Fetch cadastro bancario
    const { data: cadastro, error: cadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .select("*")
      .eq("escolinha_id", escolinha_id)
      .single();

    if (cadastroError || !cadastro) {
      throw new Error("Cadastro bancário não encontrado");
    }

    // Check if already has account
    if (cadastro.asaas_account_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Subconta já existe",
          account_id: cadastro.asaas_account_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch escolinha data
    const { data: escolinha, error: escolinhaError } = await supabase
      .from("escolinhas")
      .select("id, nome, documento, cnpj")
      .eq("id", escolinha_id)
      .single();

    if (escolinhaError || !escolinha) {
      throw new Error("Escola não encontrada");
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("escola_asaas_jobs")
      .insert({
        escolinha_id,
        tipo: "criar_subconta",
        status: "processando",
        payload: { cadastro, escolinha },
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Erro ao criar job: ${jobError.message}`);
    }

    jobId = job.id;

    // Prepare Asaas payload
    const cpfCnpj = cadastro.tipo_pessoa === "cnpj" 
      ? escolinha.cnpj 
      : escolinha.documento;

    // Format birth date for Asaas (requires YYYY-MM-DD format)
    const birthDate = cadastro.data_nascimento || null;

    // Validate incomeValue is present
    if (!cadastro.income_value) {
      throw new Error("Faturamento/renda mensal é obrigatório para criar subconta no Asaas");
    }

    // Extract bank code from banco field (e.g., "336 Banco C6" -> "336", or just "336" -> "336")
    const extractBankCode = (banco: string | null): string => {
      if (!banco) return "";
      // If it starts with digits, extract them
      const match = banco.match(/^(\d+)/);
      return match ? match[1] : banco.replace(/\D/g, "");
    };

    const bankCode = extractBankCode(cadastro.banco);
    if (!bankCode) {
      throw new Error("Informe o código do banco (ex: 001, 237, 336).");
    }

    // Extract account digit if present (e.g., "12345-6" -> digit "6", account "12345")
    const extractAccountParts = (conta: string | null): { account: string; digit: string } => {
      if (!conta) return { account: "", digit: "0" };
      const parts = conta.split("-");
      if (parts.length === 2) {
        return { account: parts[0], digit: parts[1] || "0" };
      }
      // If no dash, take last char as digit
      if (conta.length > 1) {
        return { account: conta.slice(0, -1), digit: conta.slice(-1) };
      }
      return { account: conta, digit: "0" };
    };

    const accountParts = extractAccountParts(cadastro.conta);

    console.log("Extracted bank code:", bankCode);
    console.log("Account parts:", accountParts);
    console.log("Cadastro banco raw value:", cadastro.banco);

    // NOTE: bankAccount is NOT sent during subaccount creation
    // It will be added later via a separate endpoint after account is approved
    // Storing bank info locally for later use
    const bankAccountData = {
      bank: { code: bankCode },
      accountName: cadastro.nome,
      ownerName: cadastro.nome,
      ownerBirthDate: birthDate || undefined,
      cpfCnpj: cpfCnpj?.replace(/\D/g, ""),
      agency: cadastro.agencia?.replace(/\D/g, ""),
      account: accountParts.account,
      accountDigit: accountParts.digit,
      bankAccountType: cadastro.tipo_conta === "corrente" ? "CONTA_CORRENTE" : "CONTA_POUPANCA",
    };
    console.log("Bank account data (for later):", JSON.stringify(bankAccountData, null, 2));

    const asaasPayload: Record<string, unknown> = {
      name: cadastro.nome,
      email: cadastro.email,
      cpfCnpj: cpfCnpj?.replace(/\D/g, ""),
      mobilePhone: cadastro.telefone?.replace(/\D/g, ""),
      address: cadastro.rua,
      addressNumber: cadastro.numero,
      complement: cadastro.complemento,
      province: cadastro.bairro,
      postalCode: cadastro.cep?.replace(/\D/g, ""),
      companyType: cadastro.tipo_pessoa === "cnpj" ? "LIMITED" : null,
      // Income value is required by Asaas
      incomeValue: cadastro.income_value,
      // Birth date is required for PF (CPF) accounts
      ...(cadastro.tipo_pessoa === "cpf" && birthDate ? { birthDate } : {}),
    };

    console.log("Asaas payload prepared:", JSON.stringify(asaasPayload, null, 2));
    console.log("Calling Asaas API at:", `${ASAAS_API_URL}/accounts`);
    console.log("API Key (first 20 chars):", ASAAS_API_KEY.substring(0, 20) + "...");

    // Call Asaas API to create subaccount
    const asaasResponse = await fetch(`${ASAAS_API_URL}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(asaasPayload),
    });

    console.log("Asaas response status:", asaasResponse.status);
    console.log("Asaas response content-type:", asaasResponse.headers.get("content-type"));

    // Get response text first to handle non-JSON responses
    const responseText = await asaasResponse.text();
    console.log("Asaas response body (first 500 chars):", responseText.substring(0, 500));

    // Check if response is JSON
    let asaasResult: Record<string, unknown>;
    try {
      asaasResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Asaas response as JSON. Response was:", responseText.substring(0, 200));
      
      // Update job with error
      await supabase
        .from("escola_asaas_jobs")
        .update({
          status: "erro",
          erro: JSON.stringify({ 
            message: `API retornou resposta inválida (status ${asaasResponse.status}). Verifique a chave de API.`,
            rawResponse: responseText.substring(0, 200)
          }),
          processed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      throw new Error(`Asaas API retornou resposta inválida (status ${asaasResponse.status}). Verifique se a chave de API está correta.`);
    }

    if (!asaasResponse.ok) {
      // Update job with error
      await supabase
        .from("escola_asaas_jobs")
        .update({
          status: "erro",
          erro: JSON.stringify(asaasResult),
          processed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      const errors = (asaasResult as any).errors;
      const errorMessage = errors?.[0]?.description || (asaasResult as any).message || "Erro ao criar subconta no Asaas";
      throw new Error(errorMessage);
    }

    // Update cadastro with Asaas account ID, API Key and Wallet ID
    const { error: updateCadastroError } = await supabase
      .from("escola_cadastro_bancario")
      .update({
        asaas_account_id: asaasResult.id,
        asaas_api_key: asaasResult.apiKey || null,
        asaas_wallet_id: asaasResult.walletId || null,
        asaas_status: "pending",
        asaas_enviado_em: new Date().toISOString(),
        asaas_atualizado_em: new Date().toISOString(),
      })
      .eq("id", cadastro.id);

    if (updateCadastroError) {
      console.error("Error updating cadastro bancario:", updateCadastroError);
    } else {
      console.log(`Cadastro bancario updated with Asaas data: account_id=${asaasResult.id}, apiKey=${asaasResult.apiKey ? 'present' : 'null'}, walletId=${asaasResult.walletId || 'null'}`);
    }

    // Create notification for admin
    const { error: notificationError } = await supabase
      .from("escola_asaas_admin_notifications")
      .insert({
        escolinha_id: escolinha_id,
        evento: "subconta_criada",
        mensagem: `Subconta Asaas criada: ${asaasResult.id}`,
        dados: {
          account_id: asaasResult.id,
          wallet_id: asaasResult.walletId || null,
          email: cadastro.email,
          api_key_present: !!asaasResult.apiKey,
        },
        lida: false,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    } else {
      console.log(`Notification created for escola ${escolinha_id}: subconta_criada`);
    }

    // Update school status
    await supabase
      .from("escolinhas")
      .update({ status_financeiro_escola: "EM_ANALISE" })
      .eq("id", escolinha_id);

    // Update job as completed
    await supabase
      .from("escola_asaas_jobs")
      .update({
        status: "concluido",
        resultado: asaasResult,
        processed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    console.log(`Subaccount creation completed successfully for escola ${escolinha_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subconta criada com sucesso",
        account_id: asaasResult.id,
        wallet_id: asaasResult.walletId || null,
        api_key_present: !!asaasResult.apiKey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    // If we already created a job, mark it as erro so it doesn't get stuck in 'processando'
    try {
      if (supabase && jobId) {
        await supabase
          .from("escola_asaas_jobs")
          .update({
            status: "erro",
            erro: JSON.stringify({ message: errorMessage }),
            processed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    } catch (updateJobError) {
      console.error("Failed to update job as erro:", updateJobError);
    }

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
