import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasPaymentResponse {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  billingType: string;
}

interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

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

    // Buscar o pedido com detalhes
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select(`
        *,
        responsavel:responsaveis(nome, email, telefone, cpf),
        itens:pedido_itens(
          *,
          produto:produtos(nome)
        )
      `)
      .eq('id', pedido_id)
      .single();

    if (pedidoError || !pedido) {
      throw new Error('Pedido não encontrado');
    }

    if (pedido.status === 'pago' || pedido.status === 'entregue') {
      throw new Error('Este pedido já foi pago');
    }

    // Se já tem PIX gerado e não expirou, retornar os dados existentes
    if (pedido.pix_payload && pedido.pix_expires_at) {
      const expiresAt = new Date(pedido.pix_expires_at);
      if (expiresAt > new Date()) {
        return new Response(
          JSON.stringify({
            pixId: pedido.asaas_payment_id,
            brCode: pedido.pix_payload,
            qrCodeUrl: pedido.pix_qrcode_url,
            expiresAt: pedido.pix_expires_at,
            valor: pedido.valor_total,
            numero_pedido: pedido.numero_pedido,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Buscar a configuração financeira da escolinha para usar a subconta correta
    const { data: escolinhaFinanceiro } = await supabase
      .from('escolinha_financeiro')
      .select('asaas_api_key')
      .eq('escolinha_id', pedido.escolinha_id)
      .single();

    const apiKeyToUse = escolinhaFinanceiro?.asaas_api_key || asaasApiKey;

    // Verificar/criar cliente no Asaas
    const responsavel = pedido.responsavel;
    let customerId: string;

    // Buscar cliente existente
    const searchUrl = `${asaasBaseUrl}/customers?email=${encodeURIComponent(responsavel.email)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: { 'access_token': apiKeyToUse },
    });
    const searchData = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      // Criar novo cliente
      const createCustomerResponse = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': apiKeyToUse,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: responsavel.nome,
          email: responsavel.email,
          phone: responsavel.telefone?.replace(/\D/g, ''),
          cpfCnpj: responsavel.cpf?.replace(/\D/g, ''),
          notificationDisabled: true,
        }),
      });
      const customerData = await createCustomerResponse.json();
      
      if (!customerData.id) {
        throw new Error('Erro ao criar cliente no Asaas');
      }
      customerId = customerData.id;
    }

    // Criar cobrança PIX
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const itensDescricao = pedido.itens
      .map((item: any) => `${item.quantidade}x ${item.produto?.nome || 'Produto'}`)
      .join(', ');

    const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKeyToUse,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: pedido.valor_total,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Pedido Loja: ${itensDescricao}`,
        externalReference: pedido_id,
      }),
    });

    const paymentData: AsaasPaymentResponse = await paymentResponse.json();

    if (!paymentData.id) {
      console.error('Erro ao criar pagamento:', paymentData);
      throw new Error('Erro ao criar cobrança PIX');
    }

    // Buscar QR Code
    const qrCodeResponse = await fetch(`${asaasBaseUrl}/payments/${paymentData.id}/pixQrCode`, {
      headers: { 'access_token': apiKeyToUse },
    });
    const qrCodeData: AsaasPixQrCodeResponse = await qrCodeResponse.json();

    if (!qrCodeData.payload) {
      throw new Error('Erro ao gerar QR Code PIX');
    }

    // Atualizar pedido com dados do PIX
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({
        status: 'aguardando_pagamento',
        asaas_payment_id: paymentData.id,
        pix_payload: qrCodeData.payload,
        pix_qrcode_url: `data:image/png;base64,${qrCodeData.encodedImage}`,
        pix_expires_at: qrCodeData.expirationDate,
      })
      .eq('id', pedido_id);

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
    }

    return new Response(
      JSON.stringify({
        pixId: paymentData.id,
        brCode: qrCodeData.payload,
        qrCodeUrl: `data:image/png;base64,${qrCodeData.encodedImage}`,
        expiresAt: qrCodeData.expirationDate,
        valor: pedido.valor_total,
        numero_pedido: pedido.numero_pedido,
      }),
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
