import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ParentAccessData {
  responsavel_id: string;
  responsavel_nome: string;
  primeiro_acesso: string | null;
  ultimo_acesso: string | null;
  total_acessos: number;
  acessos_7_dias: number;
  acessos_30_dias: number;
  tem_acesso: boolean;
}

export interface ParentAccessStats {
  total_responsaveis: number;
  com_acesso: number;
  sem_acesso: number;
  taxa_adesao: number;
  ativos_7_dias: number;
  ativos_30_dias: number;
}

export function useParentAccessAnalytics(escolinhaId: string | null) {
  const { data: parentAccessData = [], isLoading, refetch } = useQuery({
    queryKey: ['parent-access-analytics', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await supabase.rpc('get_school_parent_access_analytics', {
        p_escolinha_id: escolinhaId
      });

      if (error) {
        console.error('Error fetching parent access analytics:', error);
        throw error;
      }

      return (data || []) as ParentAccessData[];
    },
    enabled: !!escolinhaId,
  });

  // Calculate stats
  const stats: ParentAccessStats = {
    total_responsaveis: parentAccessData.length,
    com_acesso: parentAccessData.filter(p => p.tem_acesso).length,
    sem_acesso: parentAccessData.filter(p => !p.tem_acesso).length,
    taxa_adesao: parentAccessData.length > 0 
      ? Math.round((parentAccessData.filter(p => p.tem_acesso).length / parentAccessData.length) * 100) 
      : 0,
    ativos_7_dias: parentAccessData.filter(p => p.acessos_7_dias > 0).length,
    ativos_30_dias: parentAccessData.filter(p => p.acessos_30_dias > 0).length,
  };

  return {
    parentAccessData,
    stats,
    isLoading,
    refetch,
  };
}
