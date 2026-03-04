-- ============================================================
-- MIGRAÇÃO CRÍTICA DE SEGURANÇA: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

-- Habilitar RLS em todas as tabelas que estão desabilitadas
-- Estas tabelas já têm policies, apenas o RLS não está habilitado

ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_escolinha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_turma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolinha_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolinhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_aula_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_cancelamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES - Adicionar policies (tabela não tem policies)
-- ============================================================
-- Usuários podem ver e atualizar seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins podem ver todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- School admins podem ver profiles de responsáveis e professores vinculados
CREATE POLICY "School admins can view related profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM responsaveis r
    JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
    JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE r.user_id = profiles.user_id
    AND e.admin_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM professores p
    JOIN escolinhas e ON e.id = p.escolinha_id
    WHERE p.user_id = profiles.user_id
    AND e.admin_user_id = auth.uid()
  )
);