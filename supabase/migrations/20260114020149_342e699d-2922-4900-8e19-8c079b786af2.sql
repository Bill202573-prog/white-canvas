-- Add Asaas integration fields to escola_cadastro_bancario
ALTER TABLE public.escola_cadastro_bancario
ADD COLUMN IF NOT EXISTS asaas_account_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS asaas_enviado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS asaas_atualizado_em TIMESTAMP WITH TIME ZONE;

-- Create table for tracking Asaas integration jobs
CREATE TABLE IF NOT EXISTS public.escola_asaas_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'criar_subconta', 'enviar_documento'
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'processando', 'concluido', 'erro'
  payload JSONB,
  resultado JSONB,
  erro TEXT,
  tentativas INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.escola_asaas_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for jobs table
CREATE POLICY "School admin can view own jobs"
  ON public.escola_asaas_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas e
      WHERE e.id = escola_asaas_jobs.escolinha_id
      AND e.admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all jobs"
  ON public.escola_asaas_jobs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for processing jobs
CREATE INDEX IF NOT EXISTS idx_escola_asaas_jobs_status ON public.escola_asaas_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_escola_asaas_jobs_escolinha ON public.escola_asaas_jobs(escolinha_id);