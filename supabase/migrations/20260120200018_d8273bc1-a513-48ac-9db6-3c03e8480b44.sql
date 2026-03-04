-- Create products catalog table for schools (uniforms, materials, etc.)
CREATE TABLE public.produtos_escola (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('uniforme', 'material', 'taxa', 'outro')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos_escola ENABLE ROW LEVEL SECURITY;

-- RLS policies for produtos_escola
CREATE POLICY "School admins can manage their products" 
ON public.produtos_escola 
FOR ALL 
USING (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Teachers can view products" 
ON public.produtos_escola 
FOR SELECT 
USING (is_teacher_of_escolinha(escolinha_id));

-- Create enrollment charges table
CREATE TABLE public.cobrancas_entrada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  
  -- Values breakdown
  valor_matricula NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_uniforme NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL,
  
  -- Items description for reports
  descricao_itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Payment info
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  asaas_payment_id TEXT,
  asaas_customer_id TEXT,
  pix_payload TEXT,
  pix_qrcode_url TEXT,
  pix_expires_at TIMESTAMPTZ,
  
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure only one enrollment charge per student per school
  UNIQUE(crianca_id, escolinha_id)
);

-- Enable RLS
ALTER TABLE public.cobrancas_entrada ENABLE ROW LEVEL SECURITY;

-- RLS policies for cobrancas_entrada
CREATE POLICY "School admins can manage enrollment charges" 
ON public.cobrancas_entrada 
FOR ALL 
USING (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Guardians can view their children enrollment charges" 
ON public.cobrancas_entrada 
FOR SELECT 
USING (guardian_owns_crianca(crianca_id));

-- Add enrollment-related fields to crianca_escolinha
ALTER TABLE public.crianca_escolinha 
ADD COLUMN IF NOT EXISTS valor_matricula NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_uniforme NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS entrada_paga BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status_matricula TEXT DEFAULT 'pendente' CHECK (status_matricula IN ('pendente', 'aguardando_pagamento', 'ativo', 'inativo'));

-- Update existing active students to have 'ativo' status
UPDATE public.crianca_escolinha 
SET status_matricula = 'ativo', entrada_paga = true 
WHERE ativo = true;

-- Update existing inactive students
UPDATE public.crianca_escolinha 
SET status_matricula = 'inativo' 
WHERE ativo = false;

-- Create trigger for updated_at on produtos_escola
CREATE TRIGGER update_produtos_escola_updated_at
BEFORE UPDATE ON public.produtos_escola
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on cobrancas_entrada
CREATE TRIGGER update_cobrancas_entrada_updated_at
BEFORE UPDATE ON public.cobrancas_entrada
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_cobrancas_entrada_status ON public.cobrancas_entrada(status);
CREATE INDEX idx_cobrancas_entrada_crianca ON public.cobrancas_entrada(crianca_id);
CREATE INDEX idx_produtos_escola_escolinha ON public.produtos_escola(escolinha_id, ativo);