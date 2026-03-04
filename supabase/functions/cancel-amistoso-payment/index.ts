import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelPaymentRequest {
  convocacao_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { convocacao_id }: CancelPaymentRequest = await req.json();

    if (!convocacao_id) {
      return new Response(
        JSON.stringify({ error: 'convocacao_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Cancelling participation for convocacao: ${convocacao_id}`);

    // Get the convocacao data
    const { data: convocacao, error: fetchError } = await supabase
      .from('amistoso_convocacoes')
      .select('id, asaas_payment_id, status')
      .eq('id', convocacao_id)
      .single();

    if (fetchError || !convocacao) {
      console.error('Convocacao not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Convocação não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // If there's an Asaas payment, cancel it
    if (convocacao.asaas_payment_id) {
      console.log(`Cancelling Asaas payment: ${convocacao.asaas_payment_id}`);
      
      try {
        const asaasResponse = await fetch(
          `https://api.asaas.com/v3/payments/${convocacao.asaas_payment_id}`,
          {
            method: 'DELETE',
            headers: {
              'accept': 'application/json',
              'access_token': asaasApiKey,
            },
          }
        );

        if (!asaasResponse.ok) {
          const errorText = await asaasResponse.text();
          console.warn(`Asaas cancellation warning (continuing anyway): ${errorText}`);
          // Continue even if Asaas returns an error - the payment might already be cancelled
        } else {
          console.log('Asaas payment cancelled successfully');
        }
      } catch (asaasError) {
        console.warn('Error calling Asaas API (continuing anyway):', asaasError);
        // Continue - we still want to update the local status
      }
    }

    // Update the convocacao status to 'recusado'
    const { error: updateError } = await supabase
      .from('amistoso_convocacoes')
      .update({
        status: 'recusado',
        pix_br_code: null,
        pix_qr_code_url: null,
        pix_expires_at: null,
        asaas_payment_id: null,
      })
      .eq('id', convocacao_id);

    if (updateError) {
      console.error('Error updating convocacao:', updateError);
      throw new Error('Erro ao atualizar convocação');
    }

    console.log('Convocacao cancelled successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Participação cancelada com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in cancel-amistoso-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao cancelar participação' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
