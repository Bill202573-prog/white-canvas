-- Primeiro dropar a função existente
DROP FUNCTION IF EXISTS public.get_guardian_products(uuid);

-- Recriar com novo retorno incluindo tamanhos e nome da escola
CREATE OR REPLACE FUNCTION public.get_guardian_products(p_user_id uuid)
RETURNS TABLE(
  id uuid, 
  escolinha_id uuid, 
  escolinha_nome text,
  nome text, 
  descricao text, 
  tipo text, 
  valor numeric, 
  estoque integer, 
  foto_url text, 
  ativo boolean, 
  created_at timestamp with time zone,
  tamanhos jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    p.id, 
    p.escolinha_id, 
    e.nome as escolinha_nome,
    p.nome, 
    p.descricao, 
    p.tipo, 
    p.valor, 
    p.estoque, 
    p.foto_url, 
    p.ativo, 
    p.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('tamanho', pt.tamanho, 'estoque', pt.estoque) ORDER BY pt.tamanho)
       FROM produto_tamanhos pt 
       WHERE pt.produto_id = p.id AND pt.estoque > 0),
      '[]'::jsonb
    ) as tamanhos
  FROM produtos p
  JOIN escolinhas e ON e.id = p.escolinha_id
  WHERE p.ativo = true
    AND p.escolinha_id IN (
      SELECT ce.escolinha_id
      FROM crianca_escolinha ce
      JOIN crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
      JOIN responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = p_user_id AND ce.ativo = true
    )
  ORDER BY e.nome, p.nome;
END;
$$;

-- Função para decrementar estoque após pagamento
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  FOR v_item IN 
    SELECT produto_id, quantidade, tamanho 
    FROM pedido_itens 
    WHERE pedido_id = p_pedido_id
  LOOP
    -- Se tem tamanho, decrementar do produto_tamanhos
    IF v_item.tamanho IS NOT NULL AND v_item.tamanho != '' THEN
      UPDATE produto_tamanhos 
      SET estoque = GREATEST(0, estoque - v_item.quantidade)
      WHERE produto_id = v_item.produto_id AND tamanho = v_item.tamanho;
      
      -- Atualizar estoque total do produto
      UPDATE produtos p
      SET estoque = (
        SELECT COALESCE(SUM(pt.estoque), 0)::integer
        FROM produto_tamanhos pt
        WHERE pt.produto_id = p.id
      )
      WHERE p.id = v_item.produto_id;
    ELSE
      -- Sem tamanho, decrementar direto do produto
      UPDATE produtos 
      SET estoque = GREATEST(0, COALESCE(estoque, 0) - v_item.quantidade)
      WHERE id = v_item.produto_id;
    END IF;
  END LOOP;
END;
$$;