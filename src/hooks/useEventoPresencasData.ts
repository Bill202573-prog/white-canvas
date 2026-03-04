import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventoPresenca {
  id: string;
  evento_id: string;
  time_id: string;
  crianca_id: string;
  confirmado_responsavel: boolean | null;
  responsavel_confirmou_em: string | null;
  confirmado_escola: boolean | null;
  escola_confirmou_em: string | null;
  presente: boolean | null;
  observacoes: string | null;
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
}

export interface EventoPresencasByTime {
  time_id: string;
  time_nome: string;
  presencas: EventoPresenca[];
}

// Fetch all presencas for a specific event, grouped by team
export function useEventoPresencas(eventoId: string | undefined) {
  return useQuery({
    queryKey: ['evento-presencas', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      // Fetch times for this event
      const { data: times, error: timesError } = await supabase
        .from('evento_times')
        .select('id, nome')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: true });

      if (timesError) throw timesError;
      if (!times || times.length === 0) return [];

      // Fetch presencas for all times
      const { data: presencas, error: presencasError } = await supabase
        .from('evento_presencas')
        .select(`
          id,
          evento_id,
          time_id,
          crianca_id,
          confirmado_responsavel,
          responsavel_confirmou_em,
          confirmado_escola,
          escola_confirmou_em,
          presente,
          observacoes,
          crianca:criancas(id, nome, foto_url)
        `)
        .eq('evento_id', eventoId);

      if (presencasError) throw presencasError;

      // Also fetch alunos from evento_time_alunos that might not have presenca yet
      const { data: timeAlunos, error: alunosError } = await supabase
        .from('evento_time_alunos')
        .select(`
          id,
          time_id,
          crianca_id,
          crianca:criancas(id, nome, foto_url)
        `)
        .in('time_id', times.map(t => t.id));

      if (alunosError) throw alunosError;

      // Group by time
      const result: EventoPresencasByTime[] = times.map(time => {
        // Get alunos for this time
        const alunosDoTime = timeAlunos?.filter(a => a.time_id === time.id) || [];
        
        // Map alunos to presencas
        const presencasDoTime: EventoPresenca[] = alunosDoTime.map(aluno => {
          const presenca = presencas?.find(
            p => p.time_id === time.id && p.crianca_id === aluno.crianca_id
          );
          
          return {
            id: presenca?.id || aluno.id,
            evento_id: eventoId,
            time_id: time.id,
            crianca_id: aluno.crianca_id,
            confirmado_responsavel: presenca?.confirmado_responsavel ?? null,
            responsavel_confirmou_em: presenca?.responsavel_confirmou_em ?? null,
            confirmado_escola: presenca?.confirmado_escola ?? null,
            escola_confirmou_em: presenca?.escola_confirmou_em ?? null,
            presente: presenca?.presente ?? null,
            observacoes: presenca?.observacoes ?? null,
            crianca: aluno.crianca as unknown as { id: string; nome: string; foto_url: string | null },
          };
        });

        return {
          time_id: time.id,
          time_nome: time.nome,
          presencas: presencasDoTime,
        };
      });

      return result;
    },
    enabled: !!eventoId,
  });
}
