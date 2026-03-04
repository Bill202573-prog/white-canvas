import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventoTime {
  id: string;
  evento_id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface EventoTimeAluno {
  id: string;
  time_id: string;
  crianca_id: string;
  created_at: string;
  crianca?: {
    id: string;
    nome: string;
    data_nascimento: string;
    foto_url: string | null;
  };
}

export interface EventoTimeWithAlunos extends EventoTime {
  alunos: EventoTimeAluno[];
}

// Fetch times for an event with their students
export function useEventoTimes(eventoId: string | undefined) {
  return useQuery({
    queryKey: ['evento-times', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      // Fetch times
      const { data: times, error: timesError } = await supabase
        .from('evento_times')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: true });

      if (timesError) throw timesError;

      // Fetch alunos for each time
      const timesWithAlunos = await Promise.all(
        (times || []).map(async (time) => {
          const { data: alunos, error: alunosError } = await supabase
            .from('evento_time_alunos')
            .select(`
              id,
              time_id,
              crianca_id,
              created_at,
              crianca:criancas(id, nome, data_nascimento, foto_url)
            `)
            .eq('time_id', time.id);

          if (alunosError) throw alunosError;

          return {
            ...time,
            alunos: alunos || [],
          } as EventoTimeWithAlunos;
        })
      );

      return timesWithAlunos;
    },
    enabled: !!eventoId,
  });
}

// Create a new team
export function useCreateEventoTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventoId, nome }: { eventoId: string; nome: string }) => {
      const { data, error } = await supabase
        .from('evento_times')
        .insert({ evento_id: eventoId, nome })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-times', variables.eventoId] });
    },
  });
}

// Update a team name
export function useUpdateEventoTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nome, eventoId }: { id: string; nome: string; eventoId: string }) => {
      const { data, error } = await supabase
        .from('evento_times')
        .update({ nome })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-times', variables.eventoId] });
    },
  });
}

// Delete a team
export function useDeleteEventoTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('evento_times')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-times', variables.eventoId] });
    },
  });
}

// Add student to team
export function useAddAlunoToTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeId, criancaId, eventoId }: { timeId: string; criancaId: string; eventoId: string }) => {
      const { data, error } = await supabase
        .from('evento_time_alunos')
        .insert({ time_id: timeId, crianca_id: criancaId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-times', variables.eventoId] });
    },
  });
}

// Remove student from team
export function useRemoveAlunoFromTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('evento_time_alunos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-times', variables.eventoId] });
    },
  });
}

// Get all students already in any team of this event
export function useEventoAlunosIds(eventoId: string | undefined) {
  return useQuery({
    queryKey: ['evento-alunos-ids', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      const { data: times } = await supabase
        .from('evento_times')
        .select('id')
        .eq('evento_id', eventoId);

      if (!times || times.length === 0) return [];

      const timeIds = times.map(t => t.id);

      const { data: alunos, error } = await supabase
        .from('evento_time_alunos')
        .select('crianca_id')
        .in('time_id', timeIds);

      if (error) throw error;
      return alunos?.map(a => a.crianca_id) || [];
    },
    enabled: !!eventoId,
  });
}
