import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
type IndicacaoStatus = 'novo' | 'contatado' | 'matriculado' | 'nao_convertido';

export interface Indicacao {
  id: string;
  escolinha_id: string;
  pai_indicador_id: string;
  nome_pai_indicador: string;
  nome_responsavel_indicado: string;
  telefone_responsavel_indicado: string;
  nome_crianca: string;
  idade_crianca: number;
  status: IndicacaoStatus;
  created_at: string;
  updated_at: string;
}

export function useSchoolIndicacoes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['school-indicacoes', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('indicacoes')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching indicacoes:', error);
        throw error;
      }

      return data as Indicacao[];
    },
    enabled: !!user?.escolinhaId,
  });
}

export function useUpdateIndicacaoStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IndicacaoStatus }) => {
      if (!user?.escolinhaId) {
        throw new Error('Escola não identificada');
      }

      const { error } = await supabase
        .from('indicacoes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('escolinha_id', user.escolinhaId);

      if (error) {
        console.error('Error updating indicacao status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-indicacoes'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });
}
