-- =====================================================
-- ATIVIDADES ESPORTIVAS EXTERNAS - ESTRUTURA DE DADOS
-- Funcionalidade INERTE - Sem acesso liberado
-- =====================================================

-- Tipo de atividade (enum para consistência)
CREATE TYPE public.atividade_externa_tipo AS ENUM (
  'clinica_camp',
  'treino_preparador_fisico',
  'treino_tecnico',
  'avaliacao',
  'competicao_torneio',
  'jogo_amistoso_externo',
  'outro'
);

-- Abrangência de torneio (enum)
CREATE TYPE public.torneio_abrangencia AS ENUM (
  'municipal',
  'regional',
  'estadual',
  'nacional',
  'internacional'
);

-- Status de credibilidade (enum)
CREATE TYPE public.atividade_credibilidade_status AS ENUM (
  'registrado',
  'com_evidencia',
  'validado'
);

-- Tabela principal de atividades externas
CREATE TABLE public.atividades_externas (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL, -- responsavel user_id
  
  -- Tipo da atividade (obrigatório)
  tipo public.atividade_externa_tipo NOT NULL,
  tipo_outro_descricao TEXT, -- obrigatório se tipo = 'outro'
  
  -- Data e duração (obrigatórios)
  data DATE NOT NULL,
  duracao_minutos INTEGER NOT NULL CHECK (duracao_minutos > 0),
  
  -- Local e responsável (obrigatórios)
  local_atividade TEXT NOT NULL,
  profissional_instituicao TEXT NOT NULL,
  
  -- Campos para futura entidade (preparação para evolução)
  local_id UUID, -- futuro: referência para tabela de locais
  profissional_id UUID, -- futuro: referência para tabela de profissionais
  
  -- Detalhamento de competições (condicional)
  torneio_abrangencia public.torneio_abrangencia,
  torneio_nome TEXT,
  torneio_id UUID, -- futuro: referência para tabela de torneios
  
  -- Objetivos da atividade (múltipla escolha - array)
  objetivos TEXT[] DEFAULT '{}',
  -- Valores permitidos: força, velocidade, agilidade, resistencia, 
  -- coordenacao_motora, mobilidade_flexibilidade, prevencao_lesao, fundamentos_tecnicos
  
  -- Metodologia (opcional)
  metodologia TEXT CHECK (metodologia IN ('funcional', 'circuito', 'tecnico_analitico', 'integrado', 'ludico')),
  
  -- Observações (opcional)
  observacoes TEXT,
  
  -- Evidência (opcional)
  evidencia_url TEXT,
  evidencia_tipo TEXT, -- 'foto', 'documento', etc.
  
  -- Status de credibilidade (sistema)
  credibilidade_status public.atividade_credibilidade_status NOT NULL DEFAULT 'registrado',
  
  -- Visibilidade (dormente - sempre privado nesta fase)
  visibilidade TEXT NOT NULL DEFAULT 'privado' CHECK (visibilidade IN ('privado', 'publico')),
  
  -- Campos técnicos
  origem TEXT NOT NULL DEFAULT 'app_escolinha',
  slug_publico TEXT UNIQUE, -- futuro: URL pública
  validado_por UUID, -- futuro: validação institucional
  validado_em TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance futura
CREATE INDEX idx_atividades_externas_crianca ON public.atividades_externas(crianca_id);
CREATE INDEX idx_atividades_externas_data ON public.atividades_externas(data DESC);
CREATE INDEX idx_atividades_externas_tipo ON public.atividades_externas(tipo);
CREATE INDEX idx_atividades_externas_criado_por ON public.atividades_externas(criado_por);

-- Trigger para updated_at
CREATE TRIGGER update_atividades_externas_updated_at
  BEFORE UPDATE ON public.atividades_externas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS - TOTALMENTE RESTRITIVO (FUNCIONALIDADE INERTE)
-- Nenhum usuário pode acessar neste momento
-- =====================================================
ALTER TABLE public.atividades_externas ENABLE ROW LEVEL SECURITY;

-- Política de bloqueio total - NENHUM acesso permitido
CREATE POLICY "Funcionalidade inerte - acesso bloqueado"
  ON public.atividades_externas
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Comentários para documentação
COMMENT ON TABLE public.atividades_externas IS 'Registro de atividades esportivas externas do atleta. FUNCIONALIDADE INERTE - sem acesso liberado.';
COMMENT ON COLUMN public.atividades_externas.visibilidade IS 'Campo dormente - sempre privado nesta fase. Preparado para feed público futuro.';
COMMENT ON COLUMN public.atividades_externas.local_id IS 'Preparado para futura tabela de locais cadastrados.';
COMMENT ON COLUMN public.atividades_externas.profissional_id IS 'Preparado para futura tabela de profissionais cadastrados.';
COMMENT ON COLUMN public.atividades_externas.torneio_id IS 'Preparado para futura tabela de torneios cadastrados.';
COMMENT ON COLUMN public.atividades_externas.slug_publico IS 'Preparado para URLs públicas no feed Atleta ID.';