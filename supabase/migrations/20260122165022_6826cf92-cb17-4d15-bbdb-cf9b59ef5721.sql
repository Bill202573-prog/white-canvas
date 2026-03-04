-- Funções RPC para a loja

-- Função para buscar produtos do responsável
CREATE OR REPLACE FUNCTION get_guardian_products(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  escolinha_id uuid,
  nome text,
  descricao text,
  tipo text,
  valor numeric,
  estoque integer,
  foto_url text,
  ativo boolean,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id, p.escolinha_id, p.nome, p.descricao, p.tipo, p.valor, p.estoque, p.foto_url, p.ativo, p.created_at
  FROM produtos p
  WHERE p.ativo = true
    AND p.escolinha_id IN (
      SELECT ce.escolinha_id
      FROM crianca_escolinha ce
      JOIN crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
      JOIN responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = p_user_id AND ce.ativo = true
    )
  ORDER BY p.nome;
END;
$$;

-- Função para buscar pedidos do responsável
CREATE OR REPLACE FUNCTION get_guardian_pedidos(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_responsavel_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_responsavel_id FROM responsaveis WHERE user_id = p_user_id;
  IF v_responsavel_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
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
      'crianca', CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('nome', c.nome) ELSE NULL END,
      'itens', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'pedido_id', pi.pedido_id,
            'produto_id', pi.produto_id,
            'quantidade', pi.quantidade,
            'valor_unitario', pi.valor_unitario,
            'valor_total', pi.valor_total,
            'produto', jsonb_build_object('nome', pr.nome, 'foto_url', pr.foto_url)
          )
        ), '[]'::jsonb)
        FROM pedido_itens pi
        LEFT JOIN produtos pr ON pr.id = pi.produto_id
        WHERE pi.pedido_id = p.id
      )
    )
  ) INTO v_result
  FROM pedidos p
  LEFT JOIN criancas c ON c.id = p.crianca_id
  WHERE p.responsavel_id = v_responsavel_id
  ORDER BY p.created_at DESC;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Função para criar pedido
CREATE OR REPLACE FUNCTION create_pedido(
  p_escolinha_id uuid,
  p_crianca_id uuid,
  p_itens jsonb,
  p_observacoes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_responsavel_id uuid;
  v_pedido_id uuid;
  v_valor_total numeric := 0;
  v_item jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id INTO v_responsavel_id FROM responsaveis WHERE user_id = v_user_id;
  IF v_responsavel_id IS NULL THEN
    RAISE EXCEPTION 'Responsável não encontrado';
  END IF;

  -- Calcular valor total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_valor_total := v_valor_total + ((v_item->>'valor_unitario')::numeric * (v_item->>'quantidade')::integer);
  END LOOP;

  -- Criar pedido
  INSERT INTO pedidos (escolinha_id, responsavel_id, crianca_id, valor_total, status, observacoes)
  VALUES (p_escolinha_id, v_responsavel_id, p_crianca_id, v_valor_total, 'pendente', p_observacoes)
  RETURNING id INTO v_pedido_id;

  -- Criar itens do pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, valor_unitario, valor_total)
    VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'quantidade')::integer,
      (v_item->>'valor_unitario')::numeric,
      (v_item->>'valor_unitario')::numeric * (v_item->>'quantidade')::integer
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_pedido_id);
END;
$$;

-- Função para cancelar pedido
CREATE OR REPLACE FUNCTION cancel_pedido(p_pedido_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_responsavel_id uuid;
BEGIN
  v_user_id := auth.uid();
  SELECT id INTO v_responsavel_id FROM responsaveis WHERE user_id = v_user_id;

  UPDATE pedidos SET status = 'cancelado'
  WHERE id = p_pedido_id AND responsavel_id = v_responsavel_id;
END;
$$;

-- Função para buscar produtos da escola
CREATE OR REPLACE FUNCTION get_school_products(p_escolinha_id uuid)
RETURNS TABLE (
  id uuid,
  escolinha_id uuid,
  nome text,
  descricao text,
  tipo text,
  valor numeric,
  estoque integer,
  foto_url text,
  ativo boolean,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.escolinha_id, p.nome, p.descricao, p.tipo, p.valor, p.estoque, p.foto_url, p.ativo, p.created_at
  FROM produtos p
  WHERE p.escolinha_id = p_escolinha_id
  ORDER BY p.nome;
END;
$$;

-- Função para criar/atualizar produto
CREATE OR REPLACE FUNCTION upsert_produto(
  p_id uuid,
  p_escolinha_id uuid,
  p_nome text,
  p_descricao text,
  p_tipo text,
  p_valor numeric,
  p_estoque integer,
  p_foto_url text,
  p_ativo boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_id IS NOT NULL THEN
    UPDATE produtos SET
      nome = p_nome,
      descricao = p_descricao,
      tipo = p_tipo,
      valor = p_valor,
      estoque = p_estoque,
      foto_url = p_foto_url,
      ativo = p_ativo,
      updated_at = now()
    WHERE id = p_id;
  ELSE
    INSERT INTO produtos (escolinha_id, nome, descricao, tipo, valor, estoque, foto_url, ativo)
    VALUES (p_escolinha_id, p_nome, p_descricao, p_tipo, p_valor, p_estoque, p_foto_url, p_ativo);
  END IF;
END;
$$;

-- Função para buscar pedidos da escola
CREATE OR REPLACE FUNCTION get_school_pedidos(p_escolinha_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
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
      'crianca', CASE WHEN c.id IS NOT NULL THEN jsonb_build_object('nome', c.nome) ELSE NULL END,
      'responsavel', CASE WHEN r.id IS NOT NULL THEN jsonb_build_object('nome', r.nome) ELSE NULL END,
      'itens', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'pedido_id', pi.pedido_id,
            'produto_id', pi.produto_id,
            'quantidade', pi.quantidade,
            'valor_unitario', pi.valor_unitario,
            'valor_total', pi.valor_total,
            'produto', jsonb_build_object('nome', pr.nome, 'foto_url', pr.foto_url)
          )
        ), '[]'::jsonb)
        FROM pedido_itens pi
        LEFT JOIN produtos pr ON pr.id = pi.produto_id
        WHERE pi.pedido_id = p.id
      )
    )
  ) INTO v_result
  FROM pedidos p
  LEFT JOIN criancas c ON c.id = p.crianca_id
  LEFT JOIN responsaveis r ON r.id = p.responsavel_id
  WHERE p.escolinha_id = p_escolinha_id
  ORDER BY p.created_at DESC;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Função para atualizar status do pedido
CREATE OR REPLACE FUNCTION update_pedido_status(p_pedido_id uuid, p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE pedidos SET status = p_status, updated_at = now()
  WHERE id = p_pedido_id;
END;
$$;

-- Função para decrementar estoque
CREATE OR REPLACE FUNCTION decrement_estoque(p_produto_id uuid, p_quantidade integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE produtos SET estoque = GREATEST(0, estoque - p_quantidade)
  WHERE id = p_produto_id AND estoque IS NOT NULL;
END;
$$;