-- First drop the existing check constraint
ALTER TABLE public.mensalidades DROP CONSTRAINT IF EXISTS mensalidades_status_check;

-- Add new check constraint that allows both old and new values temporarily
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_status_check 
CHECK (status IN ('pendente', 'a_vencer', 'atrasado', 'pago', 'isento'));