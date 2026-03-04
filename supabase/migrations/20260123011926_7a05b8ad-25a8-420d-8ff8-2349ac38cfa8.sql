-- Corrigir função get_guardian_pedidos para incluir numero_pedido e corrigir ORDER BY
CREATE OR REPLACE FUNCTION get_guardian_pedidos(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responsavel_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_responsavel_id FROM responsaveis WHERE user_id = p_user_id;
  IF v_responsavel_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(pedido_json ORDER BY pedido_created_at DESC)
  INTO v_result
  FROM (
    SELECT 
      p.created_at AS pedido_created_at,
      jsonb_build_object(
        'id', p.id,
        'escolinha_id', p.escolinha_id,
        'responsavel_id', p.responsavel_id,
        'crianca_id', p.crianca_id,
        'numero_pedido', p.numero_pedido,
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
      ) AS pedido_json
    FROM pedidos p
    LEFT JOIN criancas c ON c.id = p.crianca_id
    WHERE p.responsavel_id = v_responsavel_id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Corrigir função get_school_pedidos para incluir numero_pedido e corrigir ORDER BY
CREATE OR REPLACE FUNCTION get_school_pedidos(p_escolinha_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(pedido_json ORDER BY pedido_created_at DESC)
  INTO v_result
  FROM (
    SELECT 
      p.created_at AS pedido_created_at,
      jsonb_build_object(
        'id', p.id,
        'escolinha_id', p.escolinha_id,
        'responsavel_id', p.responsavel_id,
        'crianca_id', p.crianca_id,
        'numero_pedido', p.numero_pedido,
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
      ) AS pedido_json
    FROM pedidos p
    LEFT JOIN criancas c ON c.id = p.crianca_id
    LEFT JOIN responsaveis r ON r.id = p.responsavel_id
    WHERE p.escolinha_id = p_escolinha_id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;