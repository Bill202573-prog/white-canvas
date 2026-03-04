import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_SANDBOX_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { payment_id, subscription_id } = await req.json();

    console.log('Checking Carreira payment:', payment_id, 'subscription:', subscription_id);

    // Check payment status with Asaas Sandbox
    const response = await fetch(`${ASAAS_SANDBOX_URL}/payments/${payment_id}`, {
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
    });

    const paymentData = await response.json();
    console.log('Payment status:', JSON.stringify(paymentData));

    if (paymentData.errors) {
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paidStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
    const isPaid = paidStatuses.includes(paymentData.status);

    if (isPaid && subscription_id) {
      // Activate subscription
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 30);

      const { error: updateError } = await supabase
        .from('carreira_assinaturas')
        .update({
          status: 'ativa',
          inicio_em: new Date().toISOString().split('T')[0],
          expira_em: expiraEm.toISOString().split('T')[0],
        })
        .eq('id', subscription_id);

      if (updateError) {
        console.error('Error activating subscription:', updateError);
      } else {
        console.log('Subscription activated:', subscription_id);
      }
    }

    return new Response(
      JSON.stringify({ data: { isPaid, status: paymentData.status } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
