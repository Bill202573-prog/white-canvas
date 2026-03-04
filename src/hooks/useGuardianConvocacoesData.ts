import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConvocacaoAmistoso {
  id: string;
  evento_id: string;
  crianca_id: string;
  valor: number | null;
  isento: boolean;
  status: string;
  asaas_payment_id: string | null;
  pix_br_code: string | null;
  pix_qr_code_url: string | null;
  pix_expires_at: string | null;
  data_pagamento: string | null;
  notificado_em: string | null;
  created_at: string;
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  evento: {
    id: string;
    nome: string;
    data: string;
    horario_inicio: string | null;
    local: string | null;
    endereco: string | null;
    adversario: string | null;
    categoria: string | null;
    observacoes: string | null;
    taxa_participacao: number | null;
    cobrar_taxa_participacao: boolean | null;
    taxa_juiz: number | null;
    cobrar_taxa_juiz: boolean | null;
    data_limite_pagamento: string | null;
    tipo: string;
    campeonato_id: string | null;
    campeonato_nome: string | null;
    escolinha: {
      id: string;
      nome: string;
      logo_url: string | null;
    };
  };
}

// Hook para buscar convocações de amistosos do responsável
export function useGuardianAmistosoConvocacoes() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['guardian-amistoso-convocacoes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      // Get responsavel ID
      const { data: responsavelId } = await supabase
        .rpc('get_responsavel_id', { _user_id: session.user.id });

      if (!responsavelId) return [];

      // Get children linked to this guardian
      const { data: criancaLinks } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id')
        .eq('responsavel_id', responsavelId);

      if (!criancaLinks || criancaLinks.length === 0) return [];

      const criancaIds = criancaLinks.map(l => l.crianca_id);

      // Get convocacoes for these children
      const { data: convocacoes, error } = await supabase
        .from('amistoso_convocacoes')
        .select(`
          id,
          evento_id,
          crianca_id,
          valor,
          isento,
          status,
          asaas_payment_id,
          pix_br_code,
          pix_qr_code_url,
          pix_expires_at,
          data_pagamento,
          notificado_em,
          created_at
        `)
        .in('crianca_id', criancaIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!convocacoes || convocacoes.length === 0) return [];

      // Get criancas data
      const { data: criancas } = await supabase
        .from('criancas')
        .select('id, nome, foto_url')
        .in('id', criancaIds);

      // Get eventos data
      const eventoIds = [...new Set(convocacoes.map(c => c.evento_id))];
      const { data: eventos } = await supabase
        .from('eventos_esportivos')
        .select(`
          id,
          nome,
          data,
          horario_inicio,
          local,
          endereco,
          adversario,
          categoria,
          observacoes,
          taxa_participacao,
          cobrar_taxa_participacao,
          taxa_juiz,
          cobrar_taxa_juiz,
          data_limite_pagamento,
          tipo,
          campeonato_id,
          escolinha_id
        `)
        .in('id', eventoIds);

      // Get campeonatos for championship games
      const campeonatoIds = [...new Set(eventos?.filter(e => e.campeonato_id).map(e => e.campeonato_id) || [])];
      const { data: campeonatos } = campeonatoIds.length > 0 
        ? await supabase
            .from('campeonatos')
            .select('id, nome')
            .in('id', campeonatoIds)
        : { data: [] };

      // Get escolinhas
      const escolinhaIds = [...new Set(eventos?.map(e => e.escolinha_id) || [])];
      const { data: escolinhas } = await supabase
        .from('escolinhas')
        .select('id, nome, logo_url')
        .in('id', escolinhaIds);

      // Build map for quick lookup
      const criancaMap = new Map(criancas?.map(c => [c.id, c]) || []);
      const escolinhaMap = new Map(escolinhas?.map(e => [e.id, e]) || []);
      
      const campeonatoMap: Record<string, { id: string; nome: string }> = {};
      campeonatos?.forEach(c => {
        campeonatoMap[c.id] = c;
      });

      const eventoMap: Record<string, any> = {};
      eventos?.forEach(e => {
        const campeonato = e.campeonato_id ? campeonatoMap[e.campeonato_id] : null;
        eventoMap[e.id] = {
          ...e,
          campeonato_nome: campeonato?.nome || null,
          escolinha: escolinhaMap.get(e.escolinha_id) || { id: e.escolinha_id, nome: 'Escola', logo_url: null }
        };
      });

      // Combine data
      return convocacoes.map(conv => ({
        ...conv,
        crianca: criancaMap.get(conv.crianca_id) || { id: conv.crianca_id, nome: 'Atleta', foto_url: null },
        evento: eventoMap[conv.evento_id] || {
          id: conv.evento_id,
          nome: 'Evento',
          data: '',
          horario_inicio: null,
          local: null,
          endereco: null,
          adversario: null,
          categoria: null,
          observacoes: null,
          taxa_participacao: null,
          cobrar_taxa_participacao: null,
          taxa_juiz: null,
          cobrar_taxa_juiz: null,
          data_limite_pagamento: null,
          tipo: 'amistoso',
          campeonato_id: null,
          campeonato_nome: null,
          escolinha: { id: '', nome: 'Escola', logo_url: null }
        }
      })) as ConvocacaoAmistoso[];
    },
    enabled: !!session?.user?.id,
  });
}

// Hook para buscar convocações pendentes (para exibir no dashboard)
// Inclui: pagantes não pagos e isentos não confirmados
export function useGuardianPendingConvocacoes() {
  const { data: convocacoes = [], ...rest } = useGuardianAmistosoConvocacoes();
  
  const pendingConvocacoes = convocacoes.filter(c => {
    // Excluir recusados
    if (c.status === 'recusado') return false;
    
    // Excluir já confirmados ou pagos
    if (c.status === 'pago' || c.status === 'confirmado') return false;
    
    // Isento não confirmado = pendente
    if (c.isento) return true;
    
    // Pagante com valor > 0 e não pago = pendente
    if (c.valor && c.valor > 0) return true;
    
    return false;
  });

  return { data: pendingConvocacoes, ...rest };
}

// Hook para gerar PIX de uma convocação
export function useGenerateAmistosoPix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-amistoso-pix', {
        body: { convocacao_id: convocacaoId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
    },
  });
}

// Hook para cancelar participação em um amistoso (cancela PIX no Asaas se existir)
export function useCancelAmistosoParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      // Call edge function to cancel the Asaas payment and update the convocacao
      const { data, error } = await supabase.functions.invoke('cancel-amistoso-payment', {
        body: { convocacao_id: convocacaoId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
      queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
    },
  });
}

// Hook para confirmar participação de atleta isento
export function useConfirmExemptParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      // Update the convocacao status to 'confirmado'
      const { error } = await supabase
        .from('amistoso_convocacoes')
        .update({ status: 'confirmado' })
        .eq('id', convocacaoId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
    },
  });
}
