-- Remover a constraint que bloqueia tornar_publico = true
-- Isso habilita a funcionalidade de publicar atividades na carreira
ALTER TABLE public.atividades_externas 
DROP CONSTRAINT atividades_externas_no_public_yet;