import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AulaHistorico {
  id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  status: string;
  turma: {
    id: string;
    nome: string;
  };
  escolinha: {
    id: string;
    nome: string;
  };
  presenca: {
    id: string;
    presente: boolean | null;
    confirmado_responsavel: boolean | null;
    confirmado_professor: boolean | null;
    motivo_ausencia: string | null;
  } | null;
}

export interface AulaHistoricoStats {
  totalAulas: number;
  presencas: number;
  faltas: number;
  pendentes: number;
  taxaPresenca: number;
}

export interface EscolinhaStats {
  escolinhaId: string;
  escolinhaNome: string;
  stats: AulaHistoricoStats;
}

export function useAulaHistorico(criancaId: string | undefined) {
  return useQuery({
    queryKey: ['aula-historico', criancaId],
    queryFn: async (): Promise<{ aulas: AulaHistorico[]; stats: AulaHistoricoStats; statsPorEscolinha: EscolinhaStats[] }> => {
      if (!criancaId) return { aulas: [], stats: getEmptyStats(), statsPorEscolinha: [] };

      // Get child's turmas with escolinha info
      const { data: criancaTurmas, error: turmasError } = await supabase
        .from('crianca_turma')
        .select('turma_id, turmas(id, nome, escolinha_id, escolinhas(id, nome))')
        .eq('crianca_id', criancaId)
        .eq('ativo', true);

      if (turmasError) throw turmasError;
      if (!criancaTurmas || criancaTurmas.length === 0) {
        return { aulas: [], stats: getEmptyStats(), statsPorEscolinha: [] };
      }

      const turmaIds = criancaTurmas.map(ct => ct.turma_id);
      const turmaMap: Record<string, { id: string; nome: string; escolinha: { id: string; nome: string } }> = {};
      criancaTurmas.forEach(ct => {
        const turma = ct.turmas as any;
        if (turma) {
          turmaMap[ct.turma_id] = { 
            id: turma.id, 
            nome: turma.nome,
            escolinha: turma.escolinhas ? { id: turma.escolinhas.id, nome: turma.escolinhas.nome } : { id: '', nome: 'Escolinha' }
          };
        }
      });

      // Get past aulas (status normal, date <= today)
      const today = new Date().toISOString().split('T')[0];
      
      const { data: aulas, error: aulasError } = await supabase
        .from('aulas')
        .select('*')
        .in('turma_id', turmaIds)
        .lte('data', today)
        .order('data', { ascending: false });

      if (aulasError) throw aulasError;
      if (!aulas || aulas.length === 0) {
        return { aulas: [], stats: getEmptyStats(), statsPorEscolinha: [] };
      }

      const aulaIds = aulas.map(a => a.id);

      // Get presencas for these aulas
      const { data: presencas, error: presencasError } = await supabase
        .from('presencas')
        .select('*')
        .in('aula_id', aulaIds)
        .eq('crianca_id', criancaId);

      if (presencasError) throw presencasError;

      const presencaByAula: Record<string, typeof presencas[0]> = {};
      presencas?.forEach(p => {
        presencaByAula[p.aula_id] = p;
      });

      // Build aulas list
      const aulaHistorico: AulaHistorico[] = aulas
        .filter(a => a.status !== 'cancelada')
        .map(aula => {
          const presenca = presencaByAula[aula.id];
          const turmaInfo = turmaMap[aula.turma_id] || { id: aula.turma_id, nome: 'Turma', escolinha: { id: '', nome: 'Escolinha' } };
          return {
            id: aula.id,
            data: aula.data,
            horario_inicio: aula.horario_inicio,
            horario_fim: aula.horario_fim,
            status: aula.status,
            turma: { id: turmaInfo.id, nome: turmaInfo.nome },
            escolinha: turmaInfo.escolinha,
            presenca: presenca ? {
              id: presenca.id,
              presente: presenca.presente,
              confirmado_responsavel: presenca.confirmado_responsavel,
              confirmado_professor: presenca.confirmado_professor,
              motivo_ausencia: presenca.motivo_ausencia,
            } : null,
          };
        });

      // Calculate total stats
      const stats = calculateStats(aulaHistorico);

      // Calculate stats per escolinha
      const escolinhaIds = [...new Set(aulaHistorico.map(a => a.escolinha.id))];
      const statsPorEscolinha: EscolinhaStats[] = escolinhaIds.map(escolinhaId => {
        const aulasEscolinha = aulaHistorico.filter(a => a.escolinha.id === escolinhaId);
        const escolinhaNome = aulasEscolinha[0]?.escolinha.nome || 'Escolinha';
        return {
          escolinhaId,
          escolinhaNome,
          stats: calculateStats(aulasEscolinha),
        };
      });

      return { aulas: aulaHistorico, stats, statsPorEscolinha };
    },
    enabled: !!criancaId,
  });
}

function calculateStats(aulas: AulaHistorico[]): AulaHistoricoStats {
  let presencasCount = 0;
  let faltasCount = 0;
  let pendentesCount = 0;

  aulas.forEach(aula => {
    if (aula.presenca?.presente === true) {
      presencasCount++;
    } else if (aula.presenca?.presente === false) {
      faltasCount++;
    } else {
      pendentesCount++;
    }
  });

  const totalAulas = aulas.length;
  const aulasConfirmadas = presencasCount + faltasCount;
  const taxaPresenca = aulasConfirmadas > 0 ? Math.round((presencasCount / aulasConfirmadas) * 100) : 0;

  return {
    totalAulas,
    presencas: presencasCount,
    faltas: faltasCount,
    pendentes: pendentesCount,
    taxaPresenca,
  };
}

function getEmptyStats(): AulaHistoricoStats {
  return {
    totalAulas: 0,
    presencas: 0,
    faltas: 0,
    pendentes: 0,
    taxaPresenca: 0,
  };
}
