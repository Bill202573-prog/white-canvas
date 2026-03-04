-- Add address fields to responsaveis table
ALTER TABLE public.responsaveis
ADD COLUMN cep text,
ADD COLUMN rua text,
ADD COLUMN numero text,
ADD COLUMN complemento text,
ADD COLUMN bairro text,
ADD COLUMN cidade text,
ADD COLUMN estado text;