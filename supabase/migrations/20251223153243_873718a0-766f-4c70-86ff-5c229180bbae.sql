-- Create enum for escolinha status
CREATE TYPE public.escolinha_status AS ENUM ('em_teste', 'ativa', 'inativa', 'suspensa');

-- Create enum for financial status
CREATE TYPE public.status_financeiro AS ENUM ('em_dia', 'atrasado', 'suspenso');

-- Update escolinhas table with new fields
ALTER TABLE public.escolinhas 
ADD COLUMN IF NOT EXISTS tipo_documento TEXT CHECK (tipo_documento IN ('cpf', 'cnpj')),
ADD COLUMN IF NOT EXISTS documento TEXT,
ADD COLUMN IF NOT EXISTS nome_responsavel TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS rua TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS status escolinha_status NOT NULL DEFAULT 'em_teste';

-- Create SaaS plans table
CREATE TABLE public.planos_saas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  min_alunos INTEGER NOT NULL DEFAULT 0,
  max_alunos INTEGER,
  valor_mensal DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on planos_saas
ALTER TABLE public.planos_saas ENABLE ROW LEVEL SECURITY;

-- Only admins can manage plans
CREATE POLICY "Admins podem gerenciar planos" ON public.planos_saas
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can read plans (for display purposes)
CREATE POLICY "Todos podem ver planos" ON public.planos_saas
FOR SELECT USING (true);

-- Insert default SaaS plans
INSERT INTO public.planos_saas (nome, min_alunos, max_alunos, valor_mensal) VALUES
('FIT 1', 0, 50, 176.31),
('FIT 2', 51, 200, 212.31),
('FIT 3', 201, 300, 248.31),
('FIT 4', 301, 500, 311.31),
('FIT 5', 501, 800, 455.31),
('FIT 6', 801, NULL, 518.31);

-- Create escolinha financial table
CREATE TABLE public.escolinha_financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos_saas(id),
  valor_mensal DECIMAL(10,2),
  data_inicio_cobranca DATE,
  status status_financeiro NOT NULL DEFAULT 'em_dia',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(escolinha_id)
);

-- Enable RLS on escolinha_financeiro
ALTER TABLE public.escolinha_financeiro ENABLE ROW LEVEL SECURITY;

-- Only admins can access financial data
CREATE POLICY "Admins podem gerenciar financeiro" ON public.escolinha_financeiro
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create billing history table
CREATE TABLE public.historico_cobrancas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos_saas(id),
  valor DECIMAL(10,2) NOT NULL,
  mes_referencia DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on historico_cobrancas
ALTER TABLE public.historico_cobrancas ENABLE ROW LEVEL SECURITY;

-- Only admins can access billing history
CREATE POLICY "Admins podem gerenciar historico" ON public.historico_cobrancas
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at on escolinha_financeiro
CREATE TRIGGER update_escolinha_financeiro_updated_at
BEFORE UPDATE ON public.escolinha_financeiro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get active student count for an escolinha
CREATE OR REPLACE FUNCTION public.get_escolinha_alunos_ativos(p_escolinha_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT ce.crianca_id)::INTEGER
  FROM crianca_escolinha ce
  JOIN criancas c ON c.id = ce.crianca_id
  WHERE ce.escolinha_id = p_escolinha_id
    AND ce.ativo = true
    AND c.ativo = true
$$;