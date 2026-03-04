-- Adicionar número sequencial de pedido por escola
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero_pedido INTEGER;

-- Criar função para gerar número sequencial do pedido por escola
CREATE OR REPLACE FUNCTION generate_pedido_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obter o próximo número para a escola
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO next_number
  FROM pedidos
  WHERE escolinha_id = NEW.escolinha_id;
  
  NEW.numero_pedido := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atribuir número sequencial ao criar pedido
DROP TRIGGER IF EXISTS trigger_generate_pedido_numero ON pedidos;
CREATE TRIGGER trigger_generate_pedido_numero
BEFORE INSERT ON pedidos
FOR EACH ROW
EXECUTE FUNCTION generate_pedido_numero();

-- Atualizar pedidos existentes que não têm número
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY escolinha_id ORDER BY created_at) as num
  FROM pedidos
  WHERE numero_pedido IS NULL
)
UPDATE pedidos
SET numero_pedido = numbered.num
FROM numbered
WHERE pedidos.id = numbered.id;