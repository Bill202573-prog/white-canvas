ALTER TABLE perfis_rede ADD COLUMN IF NOT EXISTS tema text DEFAULT NULL;
ALTER TABLE perfil_atleta ADD COLUMN IF NOT EXISTS tema text DEFAULT NULL;

-- Set Enzo's profile to dark theme
UPDATE perfis_rede SET tema = 'dark-orange' WHERE slug = 'enzo-de-souza-filho';