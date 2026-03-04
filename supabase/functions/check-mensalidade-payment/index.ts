import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface CheckPaymentRequest {
  pix_id: string;
  mensalidade_id: string;
}

interface AsaasPaymentStatus {
  id: string;
  status: string;
  value: number;
  netValue: number;
  confirmedDate?: string;
  paymentDate?: string;
  errors?: Array<{ code: string; description: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY) {
      console.error('Missing ASAAS_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { pix_id, mensalidade_id }: CheckPaymentRequest = await req.json();

    console.log('Checking payment for Asaas payment:', pix_id, 'Mensalidade:', mensalidade_id);

    // Check payment status with Asaas
    const response = await fetch(`${ASAAS_API_URL}/payments/${pix_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    const paymentData: AsaasPaymentStatus = await response.json();
    console.log('Asaas payment status response:', JSON.stringify(paymentData));

    if (paymentData.errors) {
      console.error('Asaas error:', paymentData.errors);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for paid statuses in Asaas
    // RECEIVED = PIX received
    // CONFIRMED = Payment confirmed
    // RECEIVED_IN_CASH = Received in cash (manual)
    const paidStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
    const isPaid = paidStatuses.includes(paymentData.status);

    console.log('Payment status:', paymentData.status, 'isPaid:', isPaid);

    if (isPaid) {
      // Update mensalidade as paid
      const paymentDate = paymentData.confirmedDate || paymentData.paymentDate || new Date().toISOString().split('T')[0];
      
      const { error: updateError } = await supabase
        .from('mensalidades')
        .update({
          status: 'pago',
          data_pagamento: paymentDate,
          forma_pagamento: 'pix',
          valor_pago: paymentData.netValue || paymentData.value,
        })
        .eq('id', mensalidade_id);

      if (updateError) {
        console.error('Error updating mensalidade:', updateError);
      } else {
        console.log('Mensalidade marked as pago');
        
        // Also update the child's financial status
        const { data: mensalidade } = await supabase
          .from('mensalidades')
          .select('crianca_id')
          .eq('id', mensalidade_id)
          .single();
          
        if (mensalidade) {
          // Check if there are any pending payments
          const { data: pendingPayments } = await supabase
            .from('mensalidades')
            .select('id')
            .eq('crianca_id', mensalidade.crianca_id)
            .in('status', ['a_vencer', 'atrasado']);
            
          if (!pendingPayments || pendingPayments.length === 0) {
            // Update child's financial status to 'ativo' (no pending payments)
            await supabase
              .from('criancas')
              .update({ status_financeiro: 'ativo' })
              .eq('id', mensalidade.crianca_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ data: { isPaid } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
