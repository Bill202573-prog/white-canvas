-- Adicionar novos campos para suportar formulário dinâmico
ALTER TABLE public.atividades_externas
ADD COLUMN IF NOT EXISTS data_fim DATE,
ADD COLUMN IF NOT EXISTS frequencia_semanal INTEGER,
ADD COLUMN IF NOT EXISTS carga_horaria_horas NUMERIC(6,1),
ADD COLUMN IF NOT EXISTS profissionais_envolvidos TEXT[],
ADD COLUMN IF NOT EXISTS organizador TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.atividades_externas.data_fim IS 'Data de fim para atividades com período (Clínica, Torneio, Treinos contínuos)';
COMMENT ON COLUMN public.atividades_externas.frequencia_semanal IS 'Frequência semanal (1x, 2x, 3x, etc.) para treinos contínuos';
COMMENT ON COLUMN public.atividades_externas.carga_horaria_horas IS 'Carga horária total em horas (substitui duracao_minutos em alguns tipos)';
COMMENT ON COLUMN public.atividades_externas.profissionais_envolvidos IS 'Lista de profissionais envolvidos (para Clínicas/Camps)';
COMMENT ON COLUMN public.atividades_externas.organizador IS 'Organizador do torneio/competição';