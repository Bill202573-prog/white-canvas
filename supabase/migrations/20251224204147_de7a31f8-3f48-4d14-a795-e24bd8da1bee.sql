-- Add new fields to professores table
ALTER TABLE public.professores
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS hora_aula numeric,
ADD COLUMN IF NOT EXISTS tipo_contratacao text,
ADD COLUMN IF NOT EXISTS senha_temporaria text,
ADD COLUMN IF NOT EXISTS senha_temporaria_ativa boolean DEFAULT false;

-- Add professor_substituto_id to aulas for substitute teacher
ALTER TABLE public.aulas
ADD COLUMN IF NOT EXISTS professor_substituto_id uuid REFERENCES public.professores(id);

-- Update presencas table to track who confirmed
ALTER TABLE public.presencas
ADD COLUMN IF NOT EXISTS responsavel_confirmou_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS professor_confirmou_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS motivo_ausencia text;

-- Create index for professor substituto
CREATE INDEX IF NOT EXISTS idx_aulas_professor_substituto ON public.aulas(professor_substituto_id);

-- Create RLS policy for aulas - professors can manage classes where they are substitute
CREATE POLICY "Professores substitutos podem gerenciar suas aulas"
ON public.aulas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM professores p
    WHERE p.id = aulas.professor_substituto_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM professores p
    WHERE p.id = aulas.professor_substituto_id
    AND p.user_id = auth.uid()
  )
);