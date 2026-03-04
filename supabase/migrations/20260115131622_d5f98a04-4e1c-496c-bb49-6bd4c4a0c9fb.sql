-- Add fee fields to eventos_esportivos table for friendly matches
ALTER TABLE public.eventos_esportivos
ADD COLUMN taxa_participacao numeric DEFAULT NULL,
ADD COLUMN cobrar_taxa_participacao boolean DEFAULT false,
ADD COLUMN taxa_juiz numeric DEFAULT NULL,
ADD COLUMN cobrar_taxa_juiz boolean DEFAULT false;