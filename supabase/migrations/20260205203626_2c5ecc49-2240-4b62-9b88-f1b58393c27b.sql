-- Add banner_url column for profile banner image
ALTER TABLE public.perfil_atleta 
ADD COLUMN banner_url text;

-- Add comment explaining the columns
COMMENT ON COLUMN public.perfil_atleta.banner_url IS 'URL of the banner image for the athlete profile';

-- Change modalidade to support multiple sports (array)
-- First, create the new column
ALTER TABLE public.perfil_atleta 
ADD COLUMN modalidades text[] DEFAULT ARRAY['Futebol'];

-- Copy existing modalidade value to the new array column
UPDATE public.perfil_atleta 
SET modalidades = ARRAY[modalidade];

-- Note: We'll keep the old modalidade column for now for backward compatibility
-- The frontend will use modalidades array going forward