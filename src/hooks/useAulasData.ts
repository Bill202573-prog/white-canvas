import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Turma } from './useSchoolData';

// Types
export type AulaStatus = 'normal' | 'cancelada' | 'extra';

export interface MotivoCancelamento {
  id: string;
  escolinha_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface MotivoAulaExtra {
  id: string;
  escolinha_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface AulaWithStatus {
  id: string;
  turma_id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  observacoes: string | null;
  status: AulaStatus;
  motivo_cancelamento_id: string | null;
  motivo_aula_extra_id: string | null;
  cancelado_em: string | null;
  cancelado_por: string | null;
  turma?: Turma;
  motivo_cancelamento?: MotivoCancelamento;
  motivo_aula_extra?: MotivoAulaExtra;
}

// Hook for fetching cancellation reasons
export const useMotivosCancelamento = (escolinhaIdOverride?: string) => {
  const { user } = useAuth();
  const escolinhaId = escolinhaIdOverride || user?.escolinhaId;
  
  return useQuery({
    queryKey: ['motivos-cancelamento', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];
      
      const { data, error } = await supabase
        .from('motivos_cancelamento')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as MotivoCancelamento[];
    },
    enabled: !!escolinhaId,
  });
};

// Hook for fetching extra class reasons
export const useMotivosAulaExtra = (escolinhaIdOverride?: string) => {
  const { user } = useAuth();
  const escolinhaId = escolinhaIdOverride || user?.escolinhaId;
  
  return useQuery({
    queryKey: ['motivos-aula-extra', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];
      
      const { data, error } = await supabase
        .from('motivos_aula_extra')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as MotivoAulaExtra[];
    },
    enabled: !!escolinhaId,
  });
};

// Hook for fetching classes for a specific month with status
export const useAulasForMonth = (year: number, month: number) => {
  const { user } = useAuth();
  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['aulas-month', user?.escolinhaId, year, month],
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
        .gte('data', startOfMonth)
        .lte('data', endOfMonth)
        .order('data', { ascending: true })
        .order('horario_inicio', { ascending: true });
      
      if (error) throw error;
      
      // Get motivos
      const { data: motivosCancelamento } = await supabase
        .from('motivos_cancelamento')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      const { data: motivosExtra } = await supabase
        .from('motivos_aula_extra')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      return aulas?.map(aula => ({
        ...aula,
        turma: turmas.find(t => t.id === aula.turma_id),
        motivo_cancelamento: motivosCancelamento?.find(m => m.id === aula.motivo_cancelamento_id),
        motivo_aula_extra: motivosExtra?.find(m => m.id === aula.motivo_aula_extra_id),
      })) as AulaWithStatus[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Hook for fetching classes for a specific week with status
export const useAulasForWeek = (startDate: Date) => {
  const { user } = useAuth();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['aulas-week', user?.escolinhaId, startStr],
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
        .gte('data', startStr)
        .lte('data', endStr)
        .order('data', { ascending: true })
        .order('horario_inicio', { ascending: true });
      
      if (error) throw error;
      
      // Get motivos
      const { data: motivosCancelamento } = await supabase
        .from('motivos_cancelamento')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      const { data: motivosExtra } = await supabase
        .from('motivos_aula_extra')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);
      
      return aulas?.map(aula => ({
        ...aula,
        turma: turmas.find(t => t.id === aula.turma_id),
        motivo_cancelamento: motivosCancelamento?.find(m => m.id === aula.motivo_cancelamento_id),
        motivo_aula_extra: motivosExtra?.find(m => m.id === aula.motivo_aula_extra_id),
      })) as AulaWithStatus[];
    },
    enabled: !!user?.escolinhaId,
  });
};

// Mutation to cancel a class
export const useCancelAula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ aulaId, motivoId }: { aulaId: string; motivoId: string }) => {
      const { error } = await supabase
        .from('aulas')
        .update({
          status: 'cancelada',
          motivo_cancelamento_id: motivoId,
          cancelado_em: new Date().toISOString(),
          cancelado_por: user?.id,
        })
        .eq('id', aulaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-month'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-week'] });
      queryClient.invalidateQueries({ queryKey: ['todays-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
    },
  });
};

// Mutation to restore a cancelled class
export const useRestoreAula = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (aulaId: string) => {
      const { error } = await supabase
        .from('aulas')
        .update({
          status: 'normal',
          motivo_cancelamento_id: null,
          cancelado_em: null,
          cancelado_por: null,
        })
        .eq('id', aulaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-month'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-week'] });
      queryClient.invalidateQueries({ queryKey: ['todays-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
    },
  });
};

// Mutation to create an extra class
export const useCreateExtraAula = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      turmaId, 
      data, 
      horarioInicio, 
      horarioFim, 
      motivoId,
      observacoes,
      professorSubstitutoId,
    }: { 
      turmaId: string;
      data: string;
      horarioInicio: string;
      horarioFim: string;
      motivoId: string | null;
      observacoes?: string;
      professorSubstitutoId?: string;
    }) => {
      const { error } = await supabase
        .from('aulas')
        .insert({
          turma_id: turmaId,
          data,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          status: 'extra',
          motivo_aula_extra_id: motivoId,
          observacoes,
          professor_substituto_id: professorSubstitutoId || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-month'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-week'] });
      queryClient.invalidateQueries({ queryKey: ['todays-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
    },
  });
};

// Mutation to delete an aula permanently
export const useDeleteAula = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (aulaId: string) => {
      // First delete any presencas related to this aula
      await supabase
        .from('presencas')
        .delete()
        .eq('aula_id', aulaId);
      
      // Then delete the aula
      const { error } = await supabase
        .from('aulas')
        .delete()
        .eq('id', aulaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-month'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-week'] });
      queryClient.invalidateQueries({ queryKey: ['todays-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
    },
  });
};

// Mutation to update aula details
export const useUpdateAula = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      aulaId,
      horarioInicio,
      horarioFim,
      observacoes,
    }: { 
      aulaId: string;
      horarioInicio?: string;
      horarioFim?: string;
      observacoes?: string;
    }) => {
      const { error } = await supabase
        .from('aulas')
        .update({
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          observacoes,
        })
        .eq('id', aulaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aulas-month'] });
      queryClient.invalidateQueries({ queryKey: ['aulas-week'] });
      queryClient.invalidateQueries({ queryKey: ['todays-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
    },
  });
};

// CRUD for motivos
export const useCreateMotivoCancelamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (nome: string) => {
      if (!user?.escolinhaId) throw new Error('No school ID');
      
      const { error } = await supabase
        .from('motivos_cancelamento')
        .insert({ escolinha_id: user.escolinhaId, nome });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-cancelamento'] });
    },
  });
};

export const useUpdateMotivoCancelamento = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('motivos_cancelamento')
        .update({ nome })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-cancelamento'] });
    },
  });
};

export const useDeleteMotivoCancelamento = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('motivos_cancelamento')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-cancelamento'] });
    },
  });
};

export const useCreateMotivoAulaExtra = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (nome: string) => {
      if (!user?.escolinhaId) throw new Error('No school ID');
      
      const { error } = await supabase
        .from('motivos_aula_extra')
        .insert({ escolinha_id: user.escolinhaId, nome });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-aula-extra'] });
    },
  });
};

export const useUpdateMotivoAulaExtra = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('motivos_aula_extra')
        .update({ nome })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-aula-extra'] });
    },
  });
};

export const useDeleteMotivoAulaExtra = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('motivos_aula_extra')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-aula-extra'] });
    },
  });
};
