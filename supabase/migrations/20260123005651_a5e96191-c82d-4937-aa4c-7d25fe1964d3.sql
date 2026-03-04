-- Corrigir função com search_path
CREATE OR REPLACE FUNCTION generate_pedido_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obter o próximo número para a escola
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO next_number
  FROM public.pedidos
  WHERE escolinha_id = NEW.escolinha_id;
  
  NEW.numero_pedido := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;