
-- Add aula reminder columns to escola_push_config
ALTER TABLE public.escola_push_config
  ADD COLUMN IF NOT EXISTS aula_3_dias_antes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aula_1_dia_antes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS aula_no_dia BOOLEAN NOT NULL DEFAULT true;
