-- Primeiro, verificar se há pedidos sem crianca_id e preencher se possível
UPDATE pedidos p
SET crianca_id = (
  SELECT cr.crianca_id 
  FROM crianca_responsavel cr 
  WHERE cr.responsavel_id = p.responsavel_id 
  LIMIT 1
)
WHERE p.crianca_id IS NULL;

-- Alterar a coluna para NOT NULL (após preencher valores existentes)
ALTER TABLE pedidos ALTER COLUMN crianca_id SET NOT NULL;

-- Atualizar RPC create_pedido para exigir crianca_id
CREATE OR REPLACE FUNCTION public.create_pedido(
  p_escolinha_id uuid,
  p_crianca_id uuid,
  p_itens jsonb,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responsavel_id uuid;
  v_pedido_id uuid;
  v_valor_total numeric := 0;
  v_item jsonb;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Validate crianca_id is provided
  IF p_crianca_id IS NULL THEN
    RAISE EXCEPTION 'crianca_id é obrigatório';
  END IF;

  -- Get responsavel_id from user
  SELECT id INTO v_responsavel_id
  FROM responsaveis
  WHERE user_id = v_user_id;
  
  IF v_responsavel_id IS NULL THEN
    RAISE EXCEPTION 'Responsável não encontrado';
  END IF;

  -- Verify responsavel is linked to crianca
  IF NOT EXISTS (
    SELECT 1 FROM crianca_responsavel 
    WHERE crianca_id = p_crianca_id 
    AND responsavel_id = v_responsavel_id
  ) THEN
    RAISE EXCEPTION 'Responsável não está vinculado a esta criança';
  END IF;

  -- Calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_valor_total := v_valor_total + (v_item->>'valor_unitario')::numeric * (v_item->>'quantidade')::int;
  END LOOP;

  -- Create pedido
  INSERT INTO pedidos (escolinha_id, responsavel_id, crianca_id, valor_total, status, observacoes)
  VALUES (p_escolinha_id, v_responsavel_id, p_crianca_id, v_valor_total, 'pendente', p_observacoes)
  RETURNING id INTO v_pedido_id;

  -- Create pedido items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO pedido_itens (
      pedido_id, 
      produto_id, 
      quantidade, 
      valor_unitario, 
      valor_total,
      tamanho
    )
    VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'quantidade')::int,
      (v_item->>'valor_unitario')::numeric,
      (v_item->>'valor_unitario')::numeric * (v_item->>'quantidade')::int,
      v_item->>'tamanho'
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_pedido_id);
END;
$$;

-- Atualizar RPC get_guardian_pedidos para ordenar corretamente
CREATE OR REPLACE FUNCTION public.get_guardian_pedidos(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responsavel_id uuid;
  v_result jsonb;
BEGIN
  -- Get responsavel_id
  SELECT id INTO v_responsavel_id
  FROM responsaveis
  WHERE user_id = p_user_id;
  
  IF v_responsavel_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(pedido_data ORDER BY pedido_created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      p.created_at as pedido_created_at,
      jsonb_build_object(
        'id', p.id,
        'numero_pedido', p.numero_pedido,
        'escolinha_id', p.escolinha_id,
        'responsavel_id', p.responsavel_id,
        'crianca_id', p.crianca_id,
        'valor_total', p.valor_total,
        'status', p.status,
        'asaas_payment_id', p.asaas_payment_id,
        'pix_payload', p.pix_payload,
        'pix_qrcode_url', p.pix_qrcode_url,
        'pix_expires_at', p.pix_expires_at,
        'data_pagamento', p.data_pagamento,
        'observacoes', p.observacoes,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'crianca', (SELECT jsonb_build_object('nome', c.nome) FROM criancas c WHERE c.id = p.crianca_id),
        'itens', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'pedido_id', pi.pedido_id,
              'produto_id', pi.produto_id,
              'quantidade', pi.quantidade,
              'valor_unitario', pi.valor_unitario,
              'valor_total', pi.valor_total,
              'tamanho', pi.tamanho,
              'produto', (SELECT jsonb_build_object('nome', pr.nome, 'foto_url', pr.foto_url) FROM produtos pr WHERE pr.id = pi.produto_id)
            )
          ), '[]'::jsonb)
          FROM pedido_itens pi
          WHERE pi.pedido_id = p.id
        )
      ) as pedido_data
    FROM pedidos p
    WHERE p.responsavel_id = v_responsavel_id
  ) sub;

  RETURN v_result;
END;
$$;

-- Atualizar RPC get_school_pedidos para incluir criança obrigatória
CREATE OR REPLACE FUNCTION public.get_school_pedidos(p_escolinha_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(pedido_data ORDER BY pedido_created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      p.created_at as pedido_created_at,
      jsonb_build_object(
        'id', p.id,
        'numero_pedido', p.numero_pedido,
        'escolinha_id', p.escolinha_id,
        'responsavel_id', p.responsavel_id,
        'crianca_id', p.crianca_id,
        'valor_total', p.valor_total,
        'status', p.status,
        'asaas_payment_id', p.asaas_payment_id,
        'pix_payload', p.pix_payload,
        'pix_qrcode_url', p.pix_qrcode_url,
        'pix_expires_at', p.pix_expires_at,
        'data_pagamento', p.data_pagamento,
        'observacoes', p.observacoes,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'responsavel', (SELECT jsonb_build_object('nome', r.nome) FROM responsaveis r WHERE r.id = p.responsavel_id),
        'crianca', (SELECT jsonb_build_object('nome', c.nome) FROM criancas c WHERE c.id = p.crianca_id),
        'itens', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'pedido_id', pi.pedido_id,
              'produto_id', pi.produto_id,
              'quantidade', pi.quantidade,
              'valor_unitario', pi.valor_unitario,
              'valor_total', pi.valor_total,
              'tamanho', pi.tamanho,
              'produto', (SELECT jsonb_build_object('nome', pr.nome, 'foto_url', pr.foto_url) FROM produtos pr WHERE pr.id = pi.produto_id)
            )
          ), '[]'::jsonb)
          FROM pedido_itens pi
          WHERE pi.pedido_id = p.id
        )
      ) as pedido_data
    FROM pedidos p
    WHERE p.escolinha_id = p_escolinha_id
  ) sub;

  RETURN v_result;
END;
$$;