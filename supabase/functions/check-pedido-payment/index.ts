import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
    const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { pedido_id } = await req.json();
    if (!pedido_id) {
      throw new Error('ID do pedido é obrigatório');
    }

    // Buscar o pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('*, escolinha_id')
      .eq('id', pedido_id)
      .single();

    if (pedidoError || !pedido) {
      throw new Error('Pedido não encontrado');
    }

    if (!pedido.asaas_payment_id) {
      throw new Error('Este pedido não tem pagamento PIX associado');
    }

    // Se já está pago, retornar o status
    if (pedido.status === 'pago' || pedido.status === 'entregue') {
      return new Response(
        JSON.stringify({ status: 'pago', pedido }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar a configuração financeira da escolinha
    const { data: escolinhaFinanceiro } = await supabase
      .from('escolinha_financeiro')
      .select('asaas_api_key')
      .eq('escolinha_id', pedido.escolinha_id)
      .single();

    const apiKeyToUse = escolinhaFinanceiro?.asaas_api_key || asaasApiKey;

    // Verificar status no Asaas
    const paymentResponse = await fetch(
      `${asaasBaseUrl}/payments/${pedido.asaas_payment_id}`,
      {
        headers: { 'access_token': apiKeyToUse },
      }
    );

    const paymentData = await paymentResponse.json();

    console.log('Status do pagamento Asaas:', paymentData.status);

    // Status que indicam pagamento confirmado
    const paidStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

    if (paidStatuses.includes(paymentData.status)) {
      // Atualizar pedido como pago
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString(),
        })
        .eq('id', pedido_id);

      if (updateError) {
        console.error('Erro ao atualizar pedido:', updateError);
      }

      // Decrementar estoque usando a função que lida com tamanhos
      const { error: stockError } = await supabase.rpc('decrement_product_stock', {
        p_pedido_id: pedido_id,
      });

      if (stockError) {
        console.error('Erro ao decrementar estoque:', stockError);
      }

      return new Response(
        JSON.stringify({ status: 'pago', asaasStatus: paymentData.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: pedido.status, asaasStatus: paymentData.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
