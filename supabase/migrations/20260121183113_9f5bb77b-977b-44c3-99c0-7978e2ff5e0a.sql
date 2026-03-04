-- Create enum for indicacao status
CREATE TYPE public.indicacao_status AS ENUM ('novo', 'contatado', 'matriculado', 'nao_convertido');

-- Create indicacoes table
CREATE TABLE public.indicacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
    pai_indicador_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    nome_pai_indicador TEXT NOT NULL,
    nome_responsavel_indicado TEXT NOT NULL,
    telefone_responsavel_indicado TEXT NOT NULL,
    nome_crianca TEXT NOT NULL,
    idade_crianca INTEGER NOT NULL,
    status public.indicacao_status NOT NULL DEFAULT 'novo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Platform admins can manage all indicacoes
CREATE POLICY "Admins podem gerenciar todas as indicacoes"
ON public.indicacoes
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- School admins can manage indicacoes from their school
CREATE POLICY "Admins de escolinha podem gerenciar indicacoes"
ON public.indicacoes
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

-- Guardians can create indicacoes for schools their children attend
CREATE POLICY "Responsaveis podem criar indicacoes"
ON public.indicacoes
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM responsaveis r
        WHERE r.id = pai_indicador_id
        AND r.user_id = auth.uid()
    )
    AND guardian_can_access_escolinha(escolinha_id)
);

-- Guardians can view their own indicacoes
CREATE POLICY "Responsaveis podem ver suas indicacoes"
ON public.indicacoes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM responsaveis r
        WHERE r.id = pai_indicador_id
        AND r.user_id = auth.uid()
    )
);

-- Block anonymous access
CREATE POLICY "Bloquear acesso anonimo indicacoes"
ON public.indicacoes
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger for updated_at
CREATE TRIGGER update_indicacoes_updated_at
BEFORE UPDATE ON public.indicacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_indicacoes_escolinha_id ON public.indicacoes(escolinha_id);
CREATE INDEX idx_indicacoes_pai_indicador_id ON public.indicacoes(pai_indicador_id);
CREATE INDEX idx_indicacoes_status ON public.indicacoes(status);