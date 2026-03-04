
-- Add origin and Atleta ID integration columns to perfil_atleta
ALTER TABLE public.perfil_atleta
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'carreira',
  ADD COLUMN IF NOT EXISTS atleta_app_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS atleta_id_vinculado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS atleta_id_sync_at timestamptz DEFAULT NULL;

-- Index for fast lookup by atleta_app_id
CREATE INDEX IF NOT EXISTS idx_perfil_atleta_atleta_app_id ON public.perfil_atleta (atleta_app_id) WHERE atleta_app_id IS NOT NULL;

-- Index for filtering by origem
CREATE INDEX IF NOT EXISTS idx_perfil_atleta_origem ON public.perfil_atleta (origem);
