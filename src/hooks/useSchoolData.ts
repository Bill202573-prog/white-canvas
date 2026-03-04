import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Crianca {
  id: string;
  nome: string;
  data_nascimento: string;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  // Financial fields
  valor_mensalidade?: number;
  dia_vencimento?: number;
  forma_cobranca?: string;
  data_inicio_cobranca?: string;
  status_financeiro?: 'ativo' | 'suspenso' | 'isento';
}

export interface Professor {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  foto_url: string | null;
  ativo: boolean;
  escolinha_id: string;
  cpf?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  hora_aula?: number | null;
  tipo_contratacao?: string | null;
  tipo_profissional?: string | null;
  senha_temporaria?: string | null;
  senha_temporaria_ativa?: boolean | null;
}

export type TurmaStatus = 'ativa' | 'inativa' | 'encerrada';

export interface Turma {
  id: string;
  nome: string;
  professor_id: string | null;
  assistente_id: string | null;
  escolinha_id: string;
  dias_semana: string[];
  horario_inicio: string | null;
  horario_fim: string | null;
  ativo: boolean;
  status: TurmaStatus;
  campo?: string | null;
  categoria_sub?: number | null;
}

// Helper: returns display name (just the turma name, categoria shown as tag)
export const getTurmaDisplayName = (turma: { nome: string; categoria_sub?: number | null }) => {
  return turma.nome;
};

// Helper: returns the Sub category label if available
export const getTurmaCategoriaBadge = (turma: { categoria_sub?: number | null }) => {
  if (turma.categoria_sub) {
    return `Sub ${turma.categoria_sub}`;
  }
  return null;
};

export interface Responsavel {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  senha_temporaria?: string | null;
  senha_temporaria_ativa?: boolean | null;
}

export interface EscolinhaBasic {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
}

export interface CriancaWithRelations extends Crianca {
  turmas: { turma: Turma }[];
  responsaveis: { responsavel: Responsavel; parentesco: string | null }[];
  escolinhas: EscolinhaBasic[];
  financeiroStatus?: CriancaFinanceiroStatus;
  motivo_inativacao?: string | null;
  observacoes_inativacao?: string | null;
  inativado_em?: string | null;
}

export interface TurmaWithRelations extends Turma {
  professor: Professor | null;
  assistentes: Professor[];
  criancas: { crianca: Crianca }[];
}

export interface ProfessorWithTurmas extends Professor {
  turmas: Turma[];
}

export interface Aula {
  id: string;
  turma_id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  observacoes: string | null;
  turma?: Turma;
}

// Hook for fetching school children
export const useSchoolChildren = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-children', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data, error } = await supabase
        .from('crianca_escolinha')
        .select(`
          crianca:criancas(
            id,
            nome,
            data_nascimento,
            foto_url,
            ativo,
            created_at,
            valor_mensalidade,
            dia_vencimento,
            forma_cobranca,
            data_inicio_cobranca,
            status_financeiro
          )
        `)
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);
      
      if (error) throw error;
      return data?.map(d => d.crianca).filter(Boolean) as Crianca[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Helper to calculate financial status from mensalidades
export type MensalidadeStatus = 'em_dia' | 'pendente' | 'atrasado' | 'isento';

export interface CriancaFinanceiroStatus {
  status: MensalidadeStatus;
  pendentes: number;
  atrasadas: number;
}

// Hook for fetching children with full relations
// includeInactive: if true, includes children with crianca_escolinha.ativo = false
export const useSchoolChildrenWithRelations = (overrideEscolinhaId?: string, includeInactive: boolean = true) => {
  const { user } = useAuth();
  const escolinhaId = overrideEscolinhaId || user?.escolinhaId;
  
  return useQuery({
    queryKey: ['school-children-relations', escolinhaId, includeInactive],
    queryFn: async () => {
      if (!escolinhaId) return [];

      // First get children from this school - including their ativo status from crianca_escolinha
      let query = supabase
        .from('crianca_escolinha')
        .select('crianca_id, ativo, data_inicio, data_fim, motivo_inativacao, observacoes_inativacao, inativado_em')
        .eq('escolinha_id', escolinhaId);
      
      // Only filter by ativo if we don't want inactive children
      if (!includeInactive) {
        query = query.eq('ativo', true);
      }
      
      const { data: criancaEscolinhas, error: ceError } = await query;
      
      if (ceError) throw ceError;
      
      const criancaIds = criancaEscolinhas?.map(ce => ce.crianca_id) || [];
      if (criancaIds.length === 0) return [];
      
      // Build a map of crianca_id -> ativo status (from crianca_escolinha, NOT criancas)
      const statusMap = new Map<string, boolean>();
      const inativacaoMap = new Map<string, { motivo?: string | null; observacoes?: string | null; inativado_em?: string | null }>();
      criancaEscolinhas?.forEach(ce => {
        statusMap.set(ce.crianca_id, ce.ativo);
        if (!ce.ativo) {
          inativacaoMap.set(ce.crianca_id, {
            motivo: ce.motivo_inativacao,
            observacoes: ce.observacoes_inativacao,
            inativado_em: ce.inativado_em,
          });
        }
      });
      
      // Get children with their class and guardian relations
      const { data: criancas, error } = await supabase
        .from('criancas')
        .select('*')
        .in('id', criancaIds);
      
      if (error) throw error;
      
      // Get turma relations - we'll filter by escolinha_id after fetching
      const { data: turmaRelations } = await supabase
        .from('crianca_turma')
        .select(`
          crianca_id,
          turma:turmas(
            id,
            nome,
            professor_id,
            assistente_id,
            escolinha_id,
            dias_semana,
            horario_inicio,
            horario_fim,
            ativo,
            status,
            campo
          )
        `)
        .in('crianca_id', criancaIds)
        .eq('ativo', true);
      
      // Get responsavel relations  
      const { data: responsavelRelations } = await supabase
        .from('crianca_responsavel')
        .select(`
          crianca_id,
          parentesco,
          responsavel:responsaveis(id, user_id, nome, email, telefone, ativo, senha_temporaria, senha_temporaria_ativa)
        `)
        .in('crianca_id', criancaIds);

      // Get all escolinha relations for these children (including other schools - both active and inactive for history)
      const { data: allEscolinhaRelations } = await supabase
        .from('crianca_escolinha')
        .select(`
          crianca_id,
          data_inicio,
          data_fim,
          ativo,
          escolinha:escolinhas(id, nome)
        `)
        .in('crianca_id', criancaIds);

      // Get mensalidades to determine real financial status (exclude canceled)
      const { data: mensalidades } = await supabase
        .from('mensalidades')
        .select('crianca_id, status, data_vencimento')
        .eq('escolinha_id', escolinhaId)
        .in('crianca_id', criancaIds)
        .neq('status', 'cancelado');

      // Calculate financial status per child
      const financeiroStatusMap = new Map<string, CriancaFinanceiroStatus>();
      const today = new Date().toISOString().split('T')[0];
      
      criancaIds.forEach(criancaId => {
        const crianca = criancas?.find(c => c.id === criancaId);
        
        // Use status_financeiro field as the primary source of exempt status
        if (crianca?.status_financeiro === 'isento') {
          financeiroStatusMap.set(criancaId, { status: 'isento', pendentes: 0, atrasadas: 0 });
          return;
        }
        
        const childMensalidades = mensalidades?.filter(m => m.crianca_id === criancaId) || [];
        
        if (childMensalidades.length === 0) {
          financeiroStatusMap.set(criancaId, { status: 'em_dia', pendentes: 0, atrasadas: 0 });
          return;
        }
        
        const pendentes = childMensalidades.filter(m => 
          (m.status === 'pendente' || m.status === 'a_vencer') && m.data_vencimento >= today
        ).length;
        const atrasadas = childMensalidades.filter(m => 
          (m.status === 'pendente' || m.status === 'atrasado' || m.status === 'a_vencer') && m.data_vencimento < today
        ).length;
        
        let status: MensalidadeStatus = 'em_dia';
        if (atrasadas > 0) {
          status = 'atrasado';
        } else if (pendentes > 0) {
          status = 'pendente';
        }
        
        financeiroStatusMap.set(criancaId, { status, pendentes, atrasadas });
      });
      
      // Combine data
      const result = criancas?.map(crianca => {
        // Build escolinhas array from relations (includes both active and inactive for history)
        const childEscolinhas: EscolinhaBasic[] = allEscolinhaRelations
          ?.filter(er => er.crianca_id === crianca.id && er.escolinha)
          .map(er => ({
            id: (er.escolinha as { id: string; nome: string }).id,
            nome: (er.escolinha as { id: string; nome: string }).nome,
            data_inicio: er.data_inicio,
            data_fim: er.data_fim,
            ativo: er.ativo,
          })) || [];

        const inativacaoInfo = inativacaoMap.get(crianca.id);
        return {
          ...crianca,
          // IMPORTANT: Use the ativo status from crianca_escolinha (school-specific)
          // NOT from criancas table (which is global)
          ativo: statusMap.get(crianca.id) ?? crianca.ativo,
          // Filter turmas by escolinha_id to prevent cross-school data leakage
          turmas: turmaRelations?.filter(tr => 
            tr.crianca_id === crianca.id && 
            tr.turma && 
            (tr.turma as Turma).escolinha_id === escolinhaId
          ).map(tr => ({ turma: tr.turma })) || [],
          responsaveis: responsavelRelations?.filter(rr => rr.crianca_id === crianca.id).map(rr => ({ 
            responsavel: rr.responsavel, 
            parentesco: rr.parentesco 
          })) || [],
          escolinhas: childEscolinhas,
          financeiroStatus: financeiroStatusMap.get(crianca.id) || { status: 'em_dia' as MensalidadeStatus, pendentes: 0, atrasadas: 0 },
          motivo_inativacao: inativacaoInfo?.motivo,
          observacoes_inativacao: inativacaoInfo?.observacoes,
          inativado_em: inativacaoInfo?.inativado_em,
        };
      }) as CriancaWithRelations[];
      
      return result || [];
    },
    enabled: !!escolinhaId,
  });
};

// Hook for fetching school teachers
export const useSchoolTeachers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-teachers', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data, error } = await supabase
        .from('professores')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      if (error) throw error;
      return data as Professor[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for fetching teachers with their classes
export const useSchoolTeachersWithTurmas = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-teachers-turmas', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data: professores, error } = await supabase
        .from('professores')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      if (error) throw error;
      
      const professorIds = professores?.map(p => p.id) || [];
      
      const { data: turmas } = await supabase
        .from('turmas')
        .select('*')
        .in('professor_id', professorIds);
      
      return professores?.map(professor => ({
        ...professor,
        turmas: turmas?.filter(t => t.professor_id === professor.id) || [],
      })) as ProfessorWithTurmas[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for fetching school classes
export const useSchoolTurmas = (overrideEscolinhaId?: string) => {
  const { user } = useAuth();
  const escolinhaId = overrideEscolinhaId || user?.escolinhaId;
  
  return useQuery({
    queryKey: ['school-turmas', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];
      
      const { data, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('escolinha_id', escolinhaId);
      
      if (error) throw error;
      return data as Turma[];
    },
    enabled: !!escolinhaId,
  });
};

// Hook for fetching classes with relations
export const useSchoolTurmasWithRelations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-turmas-relations', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data: turmas, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      if (error) throw error;
      
      // Get professors
      const { data: professores } = await supabase
        .from('professores')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      // Get children relations
      const turmaIds = turmas?.map(t => t.id) || [];
      const { data: criancaTurmas } = await supabase
        .from('crianca_turma')
        .select(`
          turma_id,
          crianca:criancas(*)
        `)
        .in('turma_id', turmaIds)
        .eq('ativo', true);
      
      // Get assistants relations
      const { data: turmaAssistentes } = await supabase
        .from('turma_assistentes')
        .select('turma_id, professor_id')
        .in('turma_id', turmaIds);
      
      return turmas?.map(turma => {
        // Get assistant IDs for this turma
        const assistenteIds = turmaAssistentes
          ?.filter(ta => ta.turma_id === turma.id)
          .map(ta => ta.professor_id) || [];
        
        return {
          ...turma,
          professor: professores?.find(p => p.id === turma.professor_id) || null,
          assistentes: professores?.filter(p => assistenteIds.includes(p.id)) || [],
          criancas: criancaTurmas?.filter(ct => ct.turma_id === turma.id).map(ct => ({ crianca: ct.crianca })) || [],
        };
      }) as TurmaWithRelations[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for fetching school responsaveis
export const useSchoolResponsaveis = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-responsaveis', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      // Get children from this school first
      const { data: criancaEscolinhas } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id')
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);
      
      const criancaIds = criancaEscolinhas?.map(ce => ce.crianca_id) || [];
      if (criancaIds.length === 0) return [];
      
      // Get responsaveis linked to these children
      const { data: criancaResponsaveis } = await supabase
        .from('crianca_responsavel')
        .select('responsavel_id')
        .in('crianca_id', criancaIds);
      
      const responsavelIds = [...new Set(criancaResponsaveis?.map(cr => cr.responsavel_id) || [])];
      if (responsavelIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('responsaveis')
        .select('*')
        .in('id', responsavelIds);
      
      if (error) throw error;
      return data as Responsavel[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for today's classes
export const useTodaysAulas = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['todays-aulas', user?.escolinhaId, today],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      // Get turmas from this school
      const { data: turmas } = await supabase
        .from('turmas')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);
      
      if (!turmas || turmas.length === 0) return [];
      
      const turmaIds = turmas.map(t => t.id);
      
      // Get today's aulas
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select('*')
        .in('turma_id', turmaIds)
        .eq('data', today);
      
      if (error) throw error;
      
      return aulas?.map(aula => ({
        ...aula,
        turma: turmas.find(t => t.id === aula.turma_id),
      })) as Aula[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for week's classes
export const useWeekAulas = () => {
  const { user } = useAuth();
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return useQuery({
    queryKey: ['week-aulas', user?.escolinhaId, startOfWeek.toISOString()],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data: turmas } = await supabase
        .from('turmas')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);
      
      if (!turmas || turmas.length === 0) return [];
      
      const turmaIds = turmas.map(t => t.id);
      
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select('*')
        .in('turma_id', turmaIds)
        .gte('data', startOfWeek.toISOString().split('T')[0])
        .lte('data', endOfWeek.toISOString().split('T')[0])
        .order('data', { ascending: true });
      
      if (error) throw error;
      
      return aulas?.map(aula => ({
        ...aula,
        turma: turmas.find(t => t.id === aula.turma_id),
      })) as Aula[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Mutations

// Updates child data (global fields like nome, data_nascimento, etc.)
// NOTE: Do NOT use this for ativo status - use useUpdateCriancaEscolinhaStatus instead
export const useUpdateCrianca = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Crianca> & { id: string }) => {
      const { error } = await supabase
        .from('criancas')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-children', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations', user?.escolinhaId] });
    },
  });
};

// Updates the ativo status for a child in a SPECIFIC school (crianca_escolinha)
// This is the correct way to activate/deactivate a child per school (multi-tenant)
export const useUpdateCriancaEscolinhaStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ criancaId, escolinhaId, ativo }: { criancaId: string; escolinhaId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('crianca_escolinha')
        .update({ 
          ativo,
          data_fim: ativo ? null : new Date().toISOString().split('T')[0]
        })
        .eq('crianca_id', criancaId)
        .eq('escolinha_id', escolinhaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-children', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations', user?.escolinhaId] });
    },
  });
};

export const useUpdateProfessor = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Professor> & { id: string }) => {
      const { error } = await supabase
        .from('professores')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-teachers', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-teachers-turmas', user?.escolinhaId] });
    },
  });
};

export const useUpdateTurma = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Turma> & { id: string }) => {
      const { error } = await supabase
        .from('turmas')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-turmas', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations', user?.escolinhaId] });
    },
  });
};

export const useAddCriancaToTurma = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ criancaId, turmaId }: { criancaId: string; turmaId: string }) => {
      const { error } = await supabase
        .from('crianca_turma')
        .insert({ crianca_id: criancaId, turma_id: turmaId, ativo: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations', user?.escolinhaId] });
    },
  });
};

export const useRemoveCriancaFromTurma = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ criancaId, turmaId }: { criancaId: string; turmaId: string }) => {
      const { error } = await supabase
        .from('crianca_turma')
        .update({ ativo: false })
        .eq('crianca_id', criancaId)
        .eq('turma_id', turmaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations', user?.escolinhaId] });
    },
  });
};
// Create aula
export const useCreateAula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ turmaId, data, horarioInicio, horarioFim }: { 
      turmaId: string; 
      data: string; 
      horarioInicio?: string;
      horarioFim?: string;
    }) => {
      const { error } = await supabase
        .from('aulas')
        .insert({ 
          turma_id: turmaId, 
          data,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-aulas', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas', user?.escolinhaId] });
    },
  });
};

// Create crianca (student)
export const useCreateCrianca = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ nome, dataNascimento, fotoUrl }: { 
      nome: string; 
      dataNascimento: string; 
      fotoUrl?: string;
    }) => {
      // Create the child
      const { data: crianca, error: criancaError } = await supabase
        .from('criancas')
        .insert({ 
          nome,
          data_nascimento: dataNascimento,
          foto_url: fotoUrl,
          ativo: true,
        })
        .select()
        .single();
      
      if (criancaError) throw criancaError;
      
      // Link to school
      if (user?.escolinhaId) {
        const { error: linkError } = await supabase
          .from('crianca_escolinha')
          .insert({
            crianca_id: crianca.id,
            escolinha_id: user.escolinhaId,
            ativo: true,
          });
        if (linkError) throw linkError;
      }
      
      return crianca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-children', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations', user?.escolinhaId] });
    },
  });
};

// Create turma (class)
export const useCreateTurma = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ nome, professorId, diasSemana, horarioInicio, horarioFim, campo, categoriaSub }: { 
      nome: string; 
      professorId?: string;
      diasSemana: string[];
      horarioInicio?: string;
      horarioFim?: string;
      campo?: string;
      categoriaSub?: number;
    }) => {
      if (!user?.escolinhaId) throw new Error('No school ID');
      
      const { data, error } = await supabase
        .from('turmas')
        .insert({ 
          nome,
          professor_id: professorId || null,
          escolinha_id: user.escolinhaId,
          dias_semana: diasSemana,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          campo: campo || null,
          categoria_sub: categoriaSub || null,
          ativo: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-turmas', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations', user?.escolinhaId] });
    },
  });
};

// Create professor (teacher) - with auto-login via edge function
export const useCreateProfessor = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      nome, 
      email, 
      telefone, 
      fotoUrl,
      tipoProfissional,
      cpf,
      endereco,
      cidade,
      estado,
      cep,
      horaAula,
      tipoContratacao
    }: { 
      nome: string; 
      email: string;
      telefone?: string;
      fotoUrl?: string;
      tipoProfissional?: string;
      cpf?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
      horaAula?: number;
      tipoContratacao?: string;
    }) => {
      if (!user?.escolinhaId) throw new Error('No school ID');
      
      // Call edge function to create professor with login
      const { data, error } = await supabase.functions.invoke('create-teacher-with-login', {
        body: {
          nome,
          email,
          telefone,
          fotoUrl,
          tipoProfissional: tipoProfissional || 'professor',
          cpf,
          endereco,
          cidade,
          estado,
          cep,
          horaAula,
          tipoContratacao,
          escolinhaId: user.escolinhaId
        }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return { professor: data.professor, tempPassword: data.tempPassword };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-teachers', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-teachers-turmas', user?.escolinhaId] });
    },
  });
};

// Reset professor password
export const useResetProfessorPassword = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (professorId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-teacher-password', {
        body: { professorId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.tempPassword;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-teachers', user?.escolinhaId] });
      queryClient.invalidateQueries({ queryKey: ['school-teachers-turmas', user?.escolinhaId] });
    },
  });
};

// Hook for month's classes
export const useMonthAulas = () => {
  const { user } = useAuth();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return useQuery({
    queryKey: ['month-aulas', user?.escolinhaId, startOfMonth.toISOString()],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      const { data: turmas } = await supabase
        .from('turmas')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);
      
      if (!turmas || turmas.length === 0) return [];
      
      const turmaIds = turmas.map(t => t.id);
      
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select('*')
        .in('turma_id', turmaIds)
        .gte('data', startOfMonth.toISOString().split('T')[0])
        .lte('data', endOfMonth.toISOString().split('T')[0])
        .order('data', { ascending: true });
      
      if (error) throw error;
      
      return aulas?.map(aula => ({
        ...aula,
        turma: turmas.find(t => t.id === aula.turma_id),
      })) as Aula[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Helper function for day names
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayOfWeek];
};

export const getShortDayName = (dayOfWeek: number): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[dayOfWeek];
};

// Birthday helpers
export const isBirthdayToday = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
};

export const isBirthdayThisMonth = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  return birth.getMonth() === today.getMonth();
};

export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

export const getBirthYear = (dateStr: string): number => {
  return new Date(dateStr).getFullYear();
};

// ==================== GUARDIAN HOOKS ====================

export interface EscolinhaForGuardian {
  id: string;
  nome: string;
  data_inicio?: string; // Data de matrícula na escola
  data_fim?: string | null; // Data de saída da escola (se inativo)
  ativo: boolean; // Status do vínculo do aluno com a escola
}

export interface CriancaForGuardian extends Crianca {
  turmas: TurmaForGuardian[];
  escolinhas: EscolinhaForGuardian[];
}

export interface TurmaForGuardian extends Turma {
  professor: Professor | null;
  escolinha?: { id: string; nome: string }; // Versão simplificada apenas com id e nome
}

// Hook for fetching guardian's children with their classes and schools
export const useGuardianChildren = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['guardian-children', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the responsavel record for this user
      const { data: responsavel, error: respError } = await supabase
        .from('responsaveis')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (respError || !responsavel) return [];
      
      // Get children linked to this responsavel
      const { data: criancaLinks, error: linksError } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id, parentesco')
        .eq('responsavel_id', responsavel.id);
      
      if (linksError || !criancaLinks || criancaLinks.length === 0) return [];
      
      const criancaIds = criancaLinks.map(cl => cl.crianca_id);
      
      // Get children data
      const { data: criancas, error: criancasError } = await supabase
        .from('criancas')
        .select('*')
        .in('id', criancaIds)
        .eq('ativo', true);
      
      if (criancasError || !criancas) return [];
      
      // Get turma links for these children
      const { data: turmaLinks } = await supabase
        .from('crianca_turma')
        .select('crianca_id, turma_id')
        .in('crianca_id', criancaIds)
        .eq('ativo', true);
      
      const turmaIds = [...new Set(turmaLinks?.map(tl => tl.turma_id) || [])];
      
      // Get turmas with escolinha_id
      const { data: turmas } = await supabase
        .from('turmas')
        .select('*')
        .in('id', turmaIds)
        .eq('ativo', true);
      
      // Get professors for these turmas
      const professorIds = [...new Set(turmas?.map(t => t.professor_id).filter(Boolean) || [])];
      const { data: professores } = await supabase
        .from('professores')
        .select('*')
        .in('id', professorIds);

      // Get escolinha links for these children (including ativo, data_inicio, data_fim for enrollment history)
      // Traz TODAS as escolas, ativas e inativas para manter o histórico
      const { data: escolinhaLinks } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id, escolinha_id, data_inicio, data_fim, ativo')
        .in('crianca_id', criancaIds);

      // Get unique escolinha IDs from both turmas and escolinha links
      const escolinhaIdsFromTurmas = turmas?.map(t => t.escolinha_id) || [];
      const escolinhaIdsFromLinks = escolinhaLinks?.map(el => el.escolinha_id) || [];
      const allEscolinhaIds = [...new Set([...escolinhaIdsFromTurmas, ...escolinhaIdsFromLinks])];
      
      // Get escolinhas
      const { data: escolinhas } = await supabase
        .from('escolinhas')
        .select('id, nome')
        .in('id', allEscolinhaIds);
      
      // Build map of child -> active escola IDs
      const activeEscolinhasByChild: Record<string, string[]> = {};
      escolinhaLinks?.forEach(link => {
        if (link.ativo) {
          if (!activeEscolinhasByChild[link.crianca_id]) {
            activeEscolinhasByChild[link.crianca_id] = [];
          }
          activeEscolinhasByChild[link.crianca_id].push(link.escolinha_id);
        }
      });
      
      // Build result with nested turmas, professors and escolinhas
      const result = criancas.map(crianca => {
        const childTurmaIds = turmaLinks?.filter(tl => tl.crianca_id === crianca.id).map(tl => tl.turma_id) || [];
        const activeSchools = activeEscolinhasByChild[crianca.id] || [];
        
        // Filter turmas to only include those from active schools
        const childTurmas: TurmaForGuardian[] = turmas
          ?.filter(t => childTurmaIds.includes(t.id) && activeSchools.includes(t.escolinha_id))
          .map(t => ({
            ...t,
            professor: professores?.find(p => p.id === t.professor_id) || null,
            escolinha: escolinhas?.find(e => e.id === t.escolinha_id) || undefined,
          })) || [];

        // Get escolinhas for this child with enrollment date and active status
        const childEscolinhaLinks = escolinhaLinks?.filter(el => el.crianca_id === crianca.id) || [];
        const childEscolinhas: EscolinhaForGuardian[] = childEscolinhaLinks
          .map(link => {
            const escola = escolinhas?.find(e => e.id === link.escolinha_id);
            return escola ? { 
              id: escola.id, 
              nome: escola.nome, 
              data_inicio: link.data_inicio,
              data_fim: link.data_fim,
              ativo: link.ativo 
            } : null;
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);
        
        return {
          ...crianca,
          forma_cobranca: crianca.forma_cobranca as string,
          status_financeiro: crianca.status_financeiro as 'ativo' | 'suspenso' | 'isento',
          turmas: childTurmas,
          escolinhas: childEscolinhas,
        };
      }) as CriancaForGuardian[];
      
      return result;
    },
    enabled: !!user?.id,
  });
};

// Hook for fetching guardian profile
export const useGuardianProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['guardian-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('responsaveis')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data as Responsavel;
    },
    enabled: !!user?.id,
  });
};

// Interface for mensalidade
export interface Mensalidade {
  id: string;
  crianca_id: string;
  escolinha_id: string;
  mes_referencia: string;
  valor: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  observacoes: string | null;
}

export interface MensalidadeSummary {
  mes: string;
  mesLabel: string;
  totalAlunos: number;
  totalPago: number;
  totalPendente: number;
  qtdPagos: number;
  qtdPendentes: number;
  isProjection?: boolean;
  previsaoReceita?: number;
}

// Hook for school mensalidades summary
// Agora inclui receitas de cobrancas_entrada (matrículas, uniformes) 
// e previsão para o próximo mês baseada em alunos ativos
export const useSchoolMensalidades = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['school-mensalidades', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];
      
      // Get last 2 months + current month of data
      const today = new Date();
      const months: { mes: string; year: number; month: number }[] = [];
      
      for (let i = 2; i >= 0; i--) {
        let m = today.getMonth() + 1 - i;
        let y = today.getFullYear();
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push({
          mes: `${y}-${String(m).padStart(2, '0')}-01`,
          year: y,
          month: m
        });
      }
      
      const mesReferences = months.map(m => m.mes);
      
      // Fetch mensalidades
      const { data: mensalidadesData, error } = await supabase
        .from('mensalidades')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .in('mes_referencia', mesReferences);
      
      if (error) throw error;
      
      // Fetch cobrancas_entrada pagas para incluir na receita
      const { data: entradasData } = await supabase
        .from('cobrancas_entrada')
        .select('valor_matricula, valor_uniforme, valor_mensalidade, data_pagamento')
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');
      
      const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      const summary: MensalidadeSummary[] = months.map(({ mes, month, year }) => {
        const mensalidadesMes = mensalidadesData?.filter(m => m.mes_referencia === mes) || [];
        const pagos = mensalidadesMes.filter(m => m.status === 'pago');
        const pendentes = mensalidadesMes.filter(m => m.status !== 'pago' && m.status !== 'cancelado');
        
        // Calcular receita de mensalidades pagas neste mês
        const receitaMensalidades = pagos.reduce((acc, m) => acc + Number(m.valor_pago ?? m.valor), 0);
        
        // Calcular receita de cobrancas_entrada pagas neste mês (por data_pagamento)
        const entradasMes = entradasData?.filter(e => {
          if (!e.data_pagamento) return false;
          const payDate = new Date(e.data_pagamento);
          return payDate.getFullYear() === year && (payDate.getMonth() + 1) === month;
        }) || [];
        
        const receitaEntradas = entradasMes.reduce((acc, e) => {
          return acc + Number(e.valor_matricula || 0) + Number(e.valor_uniforme || 0) + Number(e.valor_mensalidade || 0);
        }, 0);
        
        return {
          mes,
          mesLabel: monthNames[month],
          totalAlunos: mensalidadesMes.length,
          totalPago: receitaMensalidades + receitaEntradas,
          totalPendente: pendentes.reduce((acc, m) => acc + Number(m.valor), 0),
          qtdPagos: pagos.length + entradasMes.length,
          qtdPendentes: pendentes.length
        };
      });
      
      return summary;
    },
    enabled: !!user?.escolinhaId,
  });
};
