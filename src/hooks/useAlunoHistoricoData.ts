import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AlunoEventoHistorico {
  id: string;
  nome: string;
  tipo: 'amistoso' | 'campeonato';
  categoria: string | null;
  data: string;
  timeNome: string;
  timeId: string;
  placarTime1: number | null;
  placarTime2: number | null;
  adversario: string | null;
  golsMarcados: number;
  premiacoes: {
    id: string;
    tipo: string;
  }[];
  resultado: 'vitoria' | 'derrota' | 'empate' | null;
  escolinhaNome: string;
  escolinhaId: string;
  // New fields for presence tracking
  presente?: boolean | null;
  motivoAusencia?: string | null;
}

export interface AlunoHistoricoStats {
  totalEventos: number;
  totalAmistosos: number;
  totalCampeonatos: number;
  totalGols: number;
  golsAmistosos: number;
  golsCampeonatos: number;
  totalPremiacoes: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  presencas: number;
  faltas: number;
  faltasSemAviso: number;
}

export function useAlunoHistorico(criancaId: string | undefined) {
  return useQuery({
    queryKey: ['aluno-historico', criancaId],
    queryFn: async (): Promise<{ eventos: AlunoEventoHistorico[]; stats: AlunoHistoricoStats }> => {
      if (!criancaId) return { eventos: [], stats: getEmptyStats() };

      // Get all events the student participated in
      // Use escolinhas table directly - the view has proper RLS
      const { data: participacoes, error: partError } = await supabase
        .from('evento_time_alunos')
        .select(`
          id,
          time_id,
          time:evento_times(
            id,
            nome,
            evento_id,
            evento:eventos_esportivos!evento_times_evento_id_fkey(
              id,
              nome,
              tipo,
              categoria,
              data,
              status,
              placar_time1,
              placar_time2,
              adversario,
              time1_id,
              escolinha_id
            )
          )
        `)
        .eq('crianca_id', criancaId);

      if (partError) throw partError;

      // Get escola names in a separate query to handle inactive student access
      const escolinhaIds = [...new Set(
        participacoes
          ?.map(p => (p.time as any)?.evento?.escolinha_id)
          .filter(Boolean) || []
      )];

      // Use escolinhas_publico view which is accessible to all authenticated users
      const { data: escolinhasData } = await supabase
        .from('escolinhas')
        .select('id, nome')
        .in('id', escolinhaIds);

      const escolinhasMap: Record<string, string> = {};
      escolinhasData?.forEach(e => {
        escolinhasMap[e.id] = e.nome;
      });

      // Get all goals
      const { data: gols, error: golsError } = await supabase
        .from('evento_gols')
        .select('evento_id, quantidade')
        .eq('crianca_id', criancaId);

      if (golsError) throw golsError;

      // Get all awards
      const { data: premiacoes, error: premError } = await supabase
        .from('evento_premiacoes')
        .select('id, evento_id, tipo_premiacao')
        .eq('crianca_id', criancaId);

      if (premError) throw premError;

      // Get amistoso convocacoes for presence info
      const { data: convocacoes, error: convError } = await supabase
        .from('amistoso_convocacoes')
        .select('evento_id, presente, motivo_ausencia')
        .eq('crianca_id', criancaId);

      if (convError) throw convError;

      // Build maps
      const golsByEvento: Record<string, number> = {};
      gols?.forEach((g) => {
        golsByEvento[g.evento_id] = (golsByEvento[g.evento_id] || 0) + g.quantidade;
      });

      const premiacoesByEvento: Record<string, { id: string; tipo: string }[]> = {};
      premiacoes?.forEach((p) => {
        if (!premiacoesByEvento[p.evento_id]) {
          premiacoesByEvento[p.evento_id] = [];
        }
        premiacoesByEvento[p.evento_id].push({ id: p.id, tipo: p.tipo_premiacao });
      });

      const convocacoesByEvento: Record<string, { presente: boolean | null; motivo_ausencia: string | null }> = {};
      convocacoes?.forEach((c) => {
        convocacoesByEvento[c.evento_id] = {
          presente: c.presente,
          motivo_ausencia: c.motivo_ausencia,
        };
      });

      const eventos: AlunoEventoHistorico[] = [];
      const seenEventos = new Set<string>();

      participacoes?.forEach((p) => {
        const time = p.time as any;
        const evento = time?.evento;
        
        if (!evento || evento.status === 'agendado' || seenEventos.has(evento.id)) return;
        seenEventos.add(evento.id);

        const isTime1 = time.id === evento.time1_id;
        let resultado: 'vitoria' | 'derrota' | 'empate' | null = null;

        if (evento.placar_time1 !== null && evento.placar_time2 !== null) {
          if (isTime1) {
            if (evento.placar_time1 > evento.placar_time2) resultado = 'vitoria';
            else if (evento.placar_time1 < evento.placar_time2) resultado = 'derrota';
            else resultado = 'empate';
          } else {
            if (evento.placar_time2 > evento.placar_time1) resultado = 'vitoria';
            else if (evento.placar_time2 < evento.placar_time1) resultado = 'derrota';
            else resultado = 'empate';
          }
        }

        // Use the escolinhas map to get the name (works even if student is inactive)
        const escolinhaNome = escolinhasMap[evento.escolinha_id] || 'Escola';
        
        // Get presence info for amistosos
        const convInfo = convocacoesByEvento[evento.id];
        
        eventos.push({
          id: evento.id,
          nome: evento.nome,
          tipo: evento.tipo,
          categoria: evento.categoria,
          data: evento.data,
          timeNome: time.nome,
          timeId: time.id,
          placarTime1: evento.placar_time1,
          placarTime2: evento.placar_time2,
          adversario: evento.adversario,
          golsMarcados: golsByEvento[evento.id] || 0,
          premiacoes: premiacoesByEvento[evento.id] || [],
          resultado,
          escolinhaNome,
          escolinhaId: evento.escolinha_id,
          presente: convInfo?.presente ?? null,
          motivoAusencia: convInfo?.motivo_ausencia ?? null,
        });
      });

      // Sort by date descending
      eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Calculate stats
      const stats: AlunoHistoricoStats = {
        totalEventos: eventos.length,
        totalAmistosos: eventos.filter((e) => e.tipo === 'amistoso').length,
        totalCampeonatos: eventos.filter((e) => e.tipo === 'campeonato').length,
        totalGols: eventos.reduce((acc, e) => acc + e.golsMarcados, 0),
        golsAmistosos: eventos.filter((e) => e.tipo === 'amistoso').reduce((acc, e) => acc + e.golsMarcados, 0),
        golsCampeonatos: eventos.filter((e) => e.tipo === 'campeonato').reduce((acc, e) => acc + e.golsMarcados, 0),
        totalPremiacoes: eventos.reduce((acc, e) => acc + e.premiacoes.length, 0),
        vitorias: eventos.filter((e) => e.resultado === 'vitoria').length,
        derrotas: eventos.filter((e) => e.resultado === 'derrota').length,
        empates: eventos.filter((e) => e.resultado === 'empate').length,
        presencas: eventos.filter((e) => e.presente === true).length,
        faltas: eventos.filter((e) => e.presente === false).length,
        faltasSemAviso: eventos.filter((e) => e.presente === false && e.motivoAusencia === 'sem_aviso').length,
      };

      return { eventos, stats };
    },
    enabled: !!criancaId,
  });
}

function getEmptyStats(): AlunoHistoricoStats {
  return {
    totalEventos: 0,
    totalAmistosos: 0,
    totalCampeonatos: 0,
    totalGols: 0,
    golsAmistosos: 0,
    golsCampeonatos: 0,
    totalPremiacoes: 0,
    vitorias: 0,
    derrotas: 0,
    empates: 0,
    presencas: 0,
    faltas: 0,
    faltasSemAviso: 0,
  };
}
