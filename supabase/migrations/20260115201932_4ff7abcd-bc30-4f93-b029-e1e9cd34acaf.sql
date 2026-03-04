-- Add endereco field to eventos_esportivos for friendly match location details
ALTER TABLE public.eventos_esportivos 
ADD COLUMN IF NOT EXISTS endereco text;