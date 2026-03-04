
-- =====================================================
-- DESABILITAR RLS EM TODAS AS TABELAS TEMPORARIAMENTE
-- =====================================================

-- ATENÇÃO: Isso remove toda proteção de dados!
-- Qualquer usuário autenticado poderá ver/editar TODOS os dados.

ALTER TABLE public.aulas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_escolinha DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_responsavel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_turma DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.criancas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolinha_financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolinhas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cobrancas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_aula_extra DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_cancelamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_saas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
