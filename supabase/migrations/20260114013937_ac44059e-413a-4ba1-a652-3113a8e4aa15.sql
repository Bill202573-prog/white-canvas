-- Create table for school bank registration data
CREATE TABLE public.escola_cadastro_bancario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL UNIQUE REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  tipo_pessoa VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('cpf', 'cnpj')),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  cep VARCHAR(10),
  rua VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  banco VARCHAR(100) NOT NULL,
  agencia VARCHAR(20) NOT NULL,
  conta VARCHAR(30) NOT NULL,
  tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('corrente', 'poupanca')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escola_cadastro_bancario ENABLE ROW LEVEL SECURITY;

-- Policy: School admin can view their own bank registration
CREATE POLICY "School admin can view own bank registration"
ON public.escola_cadastro_bancario
FOR SELECT
USING (is_admin_of_escolinha(escolinha_id));

-- Policy: School admin can insert their own bank registration
CREATE POLICY "School admin can insert own bank registration"
ON public.escola_cadastro_bancario
FOR INSERT
WITH CHECK (is_admin_of_escolinha(escolinha_id));

-- Policy: School admin can update their own bank registration
CREATE POLICY "School admin can update own bank registration"
ON public.escola_cadastro_bancario
FOR UPDATE
USING (is_admin_of_escolinha(escolinha_id));

-- Policy: Global admin can view all bank registrations
CREATE POLICY "Global admin can view all bank registrations"
ON public.escola_cadastro_bancario
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_escola_cadastro_bancario_updated_at
BEFORE UPDATE ON public.escola_cadastro_bancario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();