import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ========== Types ==========

export interface GolPublico {
  id: string;
  evento_id: string;
  crianca_id: string;
  quantidade: number;
  evento?: {
    id: string;
    nome: string;
    data: string;
    tipo: string;
    adversario: string | null;
    local: string | null;
    placar_time1: number | null;
    placar_time2: number | null;
    status: string;
  };
  time?: {
    id: string;
    nome: string;
  };
}

export interface AmistosoConvocacaoPublica {
  id: string;
  evento_id: string;
  crianca_id: string;
  status: string;
  presente: boolean | null;
  evento?: {
    id: string;
    nome: string;
    data: string;
    tipo: string;
    adversario: string | null;
    local: string | null;
    placar_time1: number | null;
    placar_time2: number | null;
    status: string;
  };
}

export interface CampeonatoConvocacaoPublica {
  id: string;
  campeonato_id: string;
  crianca_id: string;
  status: string;
  campeonato?: {
    id: string;
    nome: string;
    ano: number;
    categoria: string | null;
    status: string;
    nome_time: string | null;
    escolinha?: {
      id: string;
      nome: string;
    };
  };
}

export interface PremiacaoPublica {
  id: string;
  evento_id: string;
  crianca_id: string;
  tipo_premiacao: string;
  evento?: {
    id: string;
    nome: string;
    data: string;
    tipo: string;
  };
}

export interface ConquistaPublica {
  id: string;
  evento_id: string;
  escolinha_id: string;
  nome_campeonato: string;
  colocacao: string;
  ano: number;
  categoria: string | null;
}

export interface CarreiraStats {
  totalGols: number;
  totalJogos: number;
  totalCampeonatos: number;
  totalPremiacoes: number;
  totalConquistas: number;
}

// ========== Hooks ==========

export function useCarreiraGols(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['carreira-gols', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('evento_gols')
        .select(`
          id,
          evento_id,
          crianca_id,
          quantidade,
          time:evento_times(id, nome),
          evento:eventos_esportivos(id, nome, data, tipo, adversario, local, placar_time1, placar_time2, status)
        `)
        .eq('crianca_id', criancaId)
        .order('quantidade', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        evento: Array.isArray(item.evento) ? item.evento[0] : item.evento,
        time: Array.isArray(item.time) ? item.time[0] : item.time,
      })) as GolPublico[];
    },
    enabled: !!criancaId,
  });
}

export function useCarreiraAmistosos(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['carreira-amistosos', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('amistoso_convocacoes')
        .select(`
          id,
          evento_id,
          crianca_id,
          status,
          presente,
          evento:eventos_esportivos(id, nome, data, tipo, adversario, local, placar_time1, placar_time2, status)
        `)
        .eq('crianca_id', criancaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        evento: Array.isArray(item.evento) ? item.evento[0] : item.evento,
      })) as AmistosoConvocacaoPublica[];
    },
    enabled: !!criancaId,
  });
}

export function useCarreiraCampeonatos(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['carreira-campeonatos', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('campeonato_convocacoes')
        .select(`
          id,
          campeonato_id,
          crianca_id,
          status,
          campeonato:campeonatos(
            id, nome, ano, categoria, status, nome_time,
            escolinha:escolinhas(id, nome)
          )
        `)
        .eq('crianca_id', criancaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        campeonato: Array.isArray(item.campeonato) ? item.campeonato[0] : item.campeonato,
      })).map((item: any) => ({
        ...item,
        campeonato: item.campeonato ? {
          ...item.campeonato,
          escolinha: Array.isArray(item.campeonato.escolinha) ? item.campeonato.escolinha[0] : item.campeonato.escolinha,
        } : null,
      })) as CampeonatoConvocacaoPublica[];
    },
    enabled: !!criancaId,
  });
}

export function useCarreiraPremiacoes(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['carreira-premiacoes', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('evento_premiacoes')
        .select(`
          id,
          evento_id,
          crianca_id,
          tipo_premiacao,
          evento:eventos_esportivos(id, nome, data, tipo)
        `)
        .eq('crianca_id', criancaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        evento: Array.isArray(item.evento) ? item.evento[0] : item.evento,
      })) as PremiacaoPublica[];
    },
    enabled: !!criancaId,
  });
}

export function useCarreiraConquistas(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['carreira-conquistas', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      // Get escolinha IDs the child belongs to
      const { data: vinculos, error: vinculosError } = await supabase
        .from('crianca_escolinha')
        .select('escolinha_id')
        .eq('crianca_id', criancaId);

      if (vinculosError) throw vinculosError;
      if (!vinculos?.length) return [];

      const escolinhaIds = vinculos.map(v => v.escolinha_id);

      const { data, error } = await supabase
        .from('conquistas_coletivas')
        .select('*')
        .in('escolinha_id', escolinhaIds)
        .order('ano', { ascending: false });

      if (error) throw error;
      return data as ConquistaPublica[];
    },
    enabled: !!criancaId,
  });
}

// ========== Aggregated Stats ==========

export function useCarreiraStats(criancaId: string | null | undefined) {
  const { data: gols } = useCarreiraGols(criancaId);
  const { data: amistosos } = useCarreiraAmistosos(criancaId);
  const { data: campeonatos } = useCarreiraCampeonatos(criancaId);
  const { data: premiacoes } = useCarreiraPremiacoes(criancaId);
  const { data: conquistas } = useCarreiraConquistas(criancaId);

  const totalGols = (gols || []).reduce((sum, g) => sum + g.quantidade, 0);

  // Count unique events (amistosos finalizados + orphan gol events)
  const amistososFinalizados = (amistosos || []).filter(a => a.evento?.status === 'finalizado' || a.evento?.status === 'realizado');
  const amistososEventIds = new Set(amistososFinalizados.map(a => a.evento_id));
  const orphanGolEventIds = new Set((gols || []).filter(g => !amistososEventIds.has(g.evento_id) && g.evento).map(g => g.evento_id));
  const uniqueCampeonatoIds = new Set((campeonatos || []).map(c => c.campeonato_id));

  const stats: CarreiraStats = {
    totalGols,
    totalJogos: amistososFinalizados.length + orphanGolEventIds.size,
    totalCampeonatos: uniqueCampeonatoIds.size,
    totalPremiacoes: (premiacoes || []).length,
    totalConquistas: (conquistas || []).length,
  };

  return stats;
}
