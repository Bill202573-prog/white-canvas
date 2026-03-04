import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventoGol {
  id: string;
  evento_id: string;
  time_id: string;
  crianca_id: string;
  quantidade: number;
  created_at: string;
  updated_at: string;
  crianca?: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  time?: {
    id: string;
    nome: string;
  };
}

export function useEventoGols(eventoId: string | undefined) {
  return useQuery({
    queryKey: ['evento-gols', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      const { data, error } = await supabase
        .from('evento_gols')
        .select(`
          *,
          crianca:criancas(id, nome, foto_url),
          time:evento_times(id, nome)
        `)
        .eq('evento_id', eventoId)
        .order('quantidade', { ascending: false });

      if (error) throw error;
      return data as EventoGol[];
    },
    enabled: !!eventoId,
  });
}

export interface CreateGolInput {
  eventoId: string;
  timeId: string;
  criancaId: string;
  quantidade: number;
}

export function useCreateEventoGol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventoId, timeId, criancaId, quantidade }: CreateGolInput) => {
      const { data, error } = await supabase
        .from('evento_gols')
        .insert({
          evento_id: eventoId,
          time_id: timeId,
          crianca_id: criancaId,
          quantidade,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-gols', variables.eventoId] });
    },
  });
}

export interface UpdateGolInput {
  id: string;
  eventoId: string;
  quantidade: number;
}

export function useUpdateEventoGol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantidade }: UpdateGolInput) => {
      const { data, error } = await supabase
        .from('evento_gols')
        .update({ quantidade })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-gols', variables.eventoId] });
    },
  });
}

export interface DeleteGolInput {
  id: string;
  eventoId: string;
}

export function useDeleteEventoGol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteGolInput) => {
      const { error } = await supabase
        .from('evento_gols')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evento-gols', variables.eventoId] });
    },
  });
}
