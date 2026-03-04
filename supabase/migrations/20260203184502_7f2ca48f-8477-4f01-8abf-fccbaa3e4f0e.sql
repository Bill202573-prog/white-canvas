-- Adicionar 'cancelado' como status válido para mensalidades
-- Isso é necessário para permitir cancelamento de cobranças indevidas
ALTER TABLE public.mensalidades DROP CONSTRAINT IF EXISTS mensalidades_status_check;

ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_status_check 
  CHECK (status = ANY (ARRAY['pendente'::text, 'a_vencer'::text, 'atrasado'::text, 'pago'::text, 'isento'::text, 'cancelado'::text]));