import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AcessoEscolinha {
  escolinha_id: string;
  escolinha_nome: string;
  total_acessos: number;
  acessos_hoje: number;
  acessos_7_dias: number;
  acessos_30_dias: number;
  ultimo_acesso: string | null;
}

export interface AcessosPorDia {
  data: string;
  total: number;
}

// Escolas de teste a serem excluídas
const ESCOLAS_TESTE = ['flamengo', 'fluminense', 'taquara'];

export function useAccessLogData() {
  // Buscar estatísticas de acesso por escola (apenas escolas não-teste)
  const { data: acessosPorEscola = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-access-logs'],
    queryFn: async () => {
      // Buscar todas as escolinhas
      const { data: escolinhas, error: escolinhasError } = await supabase
        .from('escolinhas')
        .select('id, nome, admin_user_id');

      if (escolinhasError) throw escolinhasError;

      // Filtrar escolas de teste
      const escolinhasValidas = escolinhas?.filter(e => 
        !ESCOLAS_TESTE.some(teste => e.nome.toLowerCase().includes(teste))
      ) || [];

      // Buscar todos os acessos
      const { data: acessos, error: acessosError } = await supabase
        .from('acessos_log')
        .select('*')
        .order('accessed_at', { ascending: false });

      if (acessosError) throw acessosError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Processar acessos por escola
      const resultado: AcessoEscolinha[] = escolinhasValidas.map(escola => {
        // Filtrar acessos desta escola (por escolinha_id direto ou por user_id do admin)
        const acessosEscola = acessos?.filter(a => 
          a.escolinha_id === escola.id || 
          (a.user_id === escola.admin_user_id && a.user_role === 'school')
        ) || [];

        const acessosHoje = acessosEscola.filter(a => 
          new Date(a.accessed_at) >= today
        ).length;

        const acessos7Dias = acessosEscola.filter(a => 
          new Date(a.accessed_at) >= sevenDaysAgo
        ).length;

        const acessos30Dias = acessosEscola.filter(a => 
          new Date(a.accessed_at) >= thirtyDaysAgo
        ).length;

        const ultimoAcesso = acessosEscola.length > 0 
          ? acessosEscola[0].accessed_at 
          : null;

        return {
          escolinha_id: escola.id,
          escolinha_nome: escola.nome,
          total_acessos: acessosEscola.length,
          acessos_hoje: acessosHoje,
          acessos_7_dias: acessos7Dias,
          acessos_30_dias: acessos30Dias,
          ultimo_acesso: ultimoAcesso,
        };
      });

      // Ordenar por total de acessos (decrescente)
      return resultado.sort((a, b) => b.total_acessos - a.total_acessos);
    },
  });

  // Buscar acessos agrupados por dia (últimos 30 dias)
  const { data: acessosPorDia = [] } = useQuery({
    queryKey: ['admin-access-logs-daily'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar escolinhas válidas
      const { data: escolinhas } = await supabase
        .from('escolinhas')
        .select('id, nome');

      const escolinhaIdsValidos = escolinhas
        ?.filter(e => !ESCOLAS_TESTE.some(teste => e.nome.toLowerCase().includes(teste)))
        .map(e => e.id) || [];

      // Buscar acessos
      const { data: acessos, error } = await supabase
        .from('acessos_log')
        .select('accessed_at, escolinha_id')
        .gte('accessed_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Filtrar apenas escolas válidas
      const acessosValidos = acessos?.filter(a => 
        a.escolinha_id && escolinhaIdsValidos.includes(a.escolinha_id)
      ) || [];

      // Agrupar por dia
      const porDia: Record<string, number> = {};
      acessosValidos.forEach(a => {
        const dia = a.accessed_at.split('T')[0];
        porDia[dia] = (porDia[dia] || 0) + 1;
      });

      // Converter para array ordenado
      return Object.entries(porDia)
        .map(([data, total]) => ({ data, total }))
        .sort((a, b) => a.data.localeCompare(b.data));
    },
  });

  // Estatísticas gerais
  const totalAcessos = acessosPorEscola.reduce((acc, e) => acc + e.total_acessos, 0);
  const acessosHoje = acessosPorEscola.reduce((acc, e) => acc + e.acessos_hoje, 0);
  const acessos7Dias = acessosPorEscola.reduce((acc, e) => acc + e.acessos_7_dias, 0);

  return {
    acessosPorEscola,
    acessosPorDia,
    totalAcessos,
    acessosHoje,
    acessos7Dias,
    isLoading,
    refetch,
  };
}

