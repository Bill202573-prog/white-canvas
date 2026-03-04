import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface AsaasStatusResponse {
  id: string;
  commercialInfo: string;
  bankAccountInfo: string;
  documentation: string;
  general: string;
}

interface AsaasDocumentGroup {
  id: string;
  status: string;
  type: string;
  title: string;
  description: string;
  onboardingUrl?: string;
  responsible?: {
    name: string | null;
    type: string;
  };
  documents: Array<{
    id: string;
    status: string;
  }>;
}

interface AsaasDocumentsResponse {
  rejectReasons: string | null;
  data: AsaasDocumentGroup[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { escolinha_id } = await req.json();
    
    if (!escolinha_id) {
      throw new Error('escolinha_id is required');
    }

    console.log(`Checking Asaas account status for escolinha: ${escolinha_id}`);

    // Fetch the cadastro bancário to get the Asaas account ID and API key
    const { data: cadastro, error: cadastroError } = await supabase
      .from('escola_cadastro_bancario')
      .select('*')
      .eq('escolinha_id', escolinha_id)
      .single();

    if (cadastroError || !cadastro) {
      console.error('Cadastro not found:', cadastroError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cadastro bancário não encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!cadastro.asaas_account_id) {
      console.log('No Asaas account ID found - registration not submitted yet');
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'not_submitted',
          message: 'Cadastro ainda não foi enviado para o Asaas',
          localStatus: cadastro.asaas_status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the subaccount's API key to query its own status
    const subaccountApiKey = cadastro.asaas_api_key;
    if (!subaccountApiKey) {
      console.error('Subaccount API key not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Chave API da subconta não encontrada. A subconta pode não ter sido criada corretamente.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch account status from Asaas using /myAccount/status endpoint
    console.log(`Fetching Asaas status for account: ${cadastro.asaas_account_id}`);
    
    const statusResponse = await fetch(`${ASAAS_API_URL}/myAccount/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': subaccountApiKey,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Asaas status API error:', errorText);
      throw new Error(`Erro ao consultar status no Asaas: ${statusResponse.status}`);
    }

    const statusData: AsaasStatusResponse = await statusResponse.json();
    console.log('Asaas status data:', JSON.stringify(statusData, null, 2));

    // Fetch pending documents
    let documentsData: AsaasDocumentsResponse | null = null;
    let pendingDocuments: Array<{
      type: string;
      title: string;
      description: string;
      status: string;
      onboardingUrl?: string;
      responsibleName?: string | null;
    }> = [];

    try {
      const docsResponse = await fetch(`${ASAAS_API_URL}/myAccount/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': subaccountApiKey,
        },
      });

      if (docsResponse.ok) {
        documentsData = await docsResponse.json();
        console.log('Asaas documents data:', JSON.stringify(documentsData, null, 2));
        
        // Extract pending/rejected/not sent documents
        // Include NOT_SENT as these are required documents that haven't been uploaded yet
        if (documentsData?.data) {
          pendingDocuments = documentsData.data
            .filter(doc => 
              doc.status === 'PENDING' || 
              doc.status === 'REJECTED' || 
              doc.status === 'AWAITING_APPROVAL' ||
              doc.status === 'NOT_SENT'
            )
            .map(doc => ({
              type: doc.type,
              title: doc.title,
              description: doc.description,
              status: doc.status,
              onboardingUrl: doc.onboardingUrl,
              responsibleName: doc.responsible?.name || null,
            }));
        }
      } else {
        console.log('Could not fetch documents (non-critical):', await docsResponse.text());
      }
    } catch (docError) {
      console.log('Error fetching documents (non-critical):', docError);
    }

    // Extract the status information
    const generalStatus = statusData.general || 'PENDING';
    const commercialStatus = statusData.commercialInfo || 'PENDING';
    const bankAccountStatus = statusData.bankAccountInfo || 'PENDING';
    const documentationStatus = statusData.documentation || 'PENDING';

    // Map Asaas status to our internal status
    // CRITICAL: For payments to work, ALL statuses must be APPROVED, not just general
    let mappedStatus = 'pending';
    let statusLabel = 'Em Análise';
    let statusDescription = 'Seu cadastro está em análise. Aguarde a aprovação.';
    const issues: string[] = [];

    // Check if ALL required statuses are approved
    const allApproved = generalStatus === 'APPROVED' && 
                        commercialStatus === 'APPROVED' && 
                        bankAccountStatus === 'APPROVED' && 
                        documentationStatus === 'APPROVED';

    if (allApproved) {
      mappedStatus = 'approved';
      statusLabel = 'Aprovado';
      statusDescription = 'Seu cadastro foi aprovado! Você pode receber pagamentos.';
    } else if (generalStatus === 'REJECTED') {
      mappedStatus = 'rejected';
      statusLabel = 'Rejeitado';
      statusDescription = 'Seu cadastro foi rejeitado.';
      issues.push('Cadastro geral rejeitado');
    } else {
      // Check individual statuses for more specific feedback
      if (commercialStatus === 'REJECTED') {
        mappedStatus = 'rejected';
        issues.push('Informações comerciais rejeitadas');
      } else if (commercialStatus === 'AWAITING_APPROVAL') {
        issues.push('Informações comerciais em análise');
      } else if (commercialStatus === 'PENDING') {
        issues.push('Informações comerciais pendentes');
      }

      if (bankAccountStatus === 'REJECTED') {
        mappedStatus = 'rejected';
        issues.push('Dados bancários rejeitados - verifique agência e conta');
      } else if (bankAccountStatus === 'AWAITING_APPROVAL') {
        issues.push('Dados bancários em análise pelo Asaas');
      } else if (bankAccountStatus === 'PENDING') {
        mappedStatus = 'awaiting_action';
        issues.push('Validação bancária pendente - o Asaas precisa confirmar seus dados bancários');
      }

      if (documentationStatus === 'REJECTED') {
        mappedStatus = 'awaiting_action';
        issues.push('Documentação rejeitada - reenvie os documentos');
      } else if (documentationStatus === 'AWAITING_APPROVAL') {
        issues.push('Documentação em análise');
      } else if (documentationStatus === 'PENDING') {
        mappedStatus = 'awaiting_action';
        issues.push('Documentação pendente - envie os documentos necessários');
      }

      // Update description based on issues
      if (issues.length > 0) {
        if (mappedStatus === 'rejected') {
          statusLabel = 'Rejeitado';
          statusDescription = 'Há problemas que precisam ser corrigidos.';
        } else if (mappedStatus === 'awaiting_action') {
          statusLabel = 'Ação Necessária';
          statusDescription = 'É necessário uma ação para continuar.';
        } else {
          statusLabel = 'Em Análise';
          statusDescription = 'Seu cadastro está sendo analisado pelo Asaas.';
        }
      }
    }

    const now = new Date().toISOString();

    // Update local status
    const updateData: Record<string, unknown> = {
      asaas_status: mappedStatus,
      asaas_atualizado_em: now,
    };

    const { error: updateError } = await supabase
      .from('escola_cadastro_bancario')
      .update(updateData)
      .eq('id', cadastro.id);

    if (updateError) {
      console.error('Error updating local status:', updateError);
    } else {
      console.log(`Updated local status to ${mappedStatus}, timestamp updated to ${now}`);
    }

    // Update escolinha status based on approval
    let escolinhaStatus = 'EM_ANALISE';
    if (mappedStatus === 'approved') {
      escolinhaStatus = 'APROVADO';
    } else if (mappedStatus === 'rejected') {
      escolinhaStatus = 'REPROVADO';
    }

    await supabase
      .from('escolinhas')
      .update({ status_financeiro_escola: escolinhaStatus })
      .eq('id', escolinha_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: mappedStatus,
        statusLabel,
        statusDescription,
        issues,
        pendingDocuments,
        rejectReasons: documentsData?.rejectReasons || null,
        detailedStatus: {
          general: generalStatus,
          commercialInfo: commercialStatus,
          bankAccountInfo: bankAccountStatus,
          documentation: documentationStatus,
        },
        accountId: cadastro.asaas_account_id,
        accountEmail: cadastro.email,
        updatedAt: now,
        // Instruções para o usuário
        actionRequired: mappedStatus === 'awaiting_action' || documentationStatus === 'PENDING',
        actionInstructions: documentationStatus === 'PENDING' 
          ? 'É necessário enviar documentos de identificação (RG/CNH e selfie) através do aplicativo Asaas ou do link de onboarding enviado por email.'
          : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking Asaas account status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao consultar status';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
