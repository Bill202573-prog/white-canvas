import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type CampeonatoStatus = 'em_andamento' | 'finalizado';

export interface Campeonato {
  id: string;
  escolinha_id: string;
  nome: string;
  nome_time: string | null;
  ano: number;
  categoria: string | null;
  status: CampeonatoStatus;
  observacoes: string | null;
  valor: number | null;
  created_at: string;
  updated_at: string;
}

export interface CampeonatoEvento {
  id: string;
  nome: string;
  data: string;
  fase: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  local: string | null;
  status: 'agendado' | 'realizado' | 'finalizado';
  placar_time1: number | null;
  placar_time2: number | null;
  adversario: string | null;
  categoria: string | null;
  taxa_juiz: number | null;
  cobrar_taxa_juiz: boolean;
  data_limite_pagamento: string | null;
}

export interface CampeonatoWithEventos extends Campeonato {
  eventos_count?: number;
  eventos?: CampeonatoEvento[];
}

export interface CreateCampeonatoInput {
  nome: string;
  nome_time?: string | null;
  ano?: number;
  categoria?: string | null;
  status?: CampeonatoStatus;
  observacoes?: string | null;
  valor?: number | null;
}

export interface UpdateCampeonatoInput extends Partial<CreateCampeonatoInput> {
  id: string;
}

// Fetch all campeonatos for the school
export function useSchoolCampeonatos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campeonatos', user?.id],
    queryFn: async () => {
      // First get the escolinha_id
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('campeonatos')
        .select('*')
        .eq('escolinha_id', escolinha.id)
        .order('ano', { ascending: false })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as Campeonato[];
    },
    enabled: !!user?.id && user?.role === 'school',
  });
}

// Fetch campeonatos with event count and eventos list
export function useCampeonatosWithEventCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campeonatos-with-events', user?.id],
    queryFn: async () => {
      // First get the escolinha_id
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .maybeSingle();

      if (escolinhaError) throw escolinhaError;
      if (!escolinha) return [];

      // Get campeonatos
      const { data: campeonatos, error: campError } = await supabase
        .from('campeonatos')
        .select('*')
        .eq('escolinha_id', escolinha.id)
        .order('created_at', { ascending: false });

      if (campError) throw campError;

      // Get all events for this school's campeonatos
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos_esportivos')
        .select('id, nome, data, fase, horario_inicio, horario_fim, local, status, placar_time1, placar_time2, campeonato_id, adversario, categoria, taxa_juiz, cobrar_taxa_juiz, data_limite_pagamento')
        .eq('escolinha_id', escolinha.id)
        .not('campeonato_id', 'is', null)
        .order('data', { ascending: true });

      if (eventosError) throw eventosError;

      // Group events by campeonato
      const eventosMap = eventos.reduce((acc, evento) => {
        if (evento.campeonato_id) {
          if (!acc[evento.campeonato_id]) {
            acc[evento.campeonato_id] = [];
          }
          acc[evento.campeonato_id].push({
            id: evento.id,
            nome: evento.nome,
            data: evento.data,
            fase: evento.fase,
            horario_inicio: evento.horario_inicio,
            horario_fim: evento.horario_fim,
            local: evento.local,
            status: evento.status as 'agendado' | 'realizado' | 'finalizado',
            placar_time1: evento.placar_time1,
            placar_time2: evento.placar_time2,
            adversario: evento.adversario,
            categoria: evento.categoria,
            taxa_juiz: evento.taxa_juiz,
            cobrar_taxa_juiz: evento.cobrar_taxa_juiz ?? false,
            data_limite_pagamento: evento.data_limite_pagamento,
          });
        }
        return acc;
      }, {} as Record<string, CampeonatoEvento[]>);

      return campeonatos.map(camp => ({
        ...camp,
        eventos_count: eventosMap[camp.id]?.length || 0,
        eventos: eventosMap[camp.id] || [],
      })) as CampeonatoWithEventos[];
    },
    enabled: !!user?.id && user?.role === 'school',
  });
}

// Fetch a single campeonato with its events
export function useCampeonatoDetail(campeonatoId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campeonato-detail', campeonatoId, user?.id],
    queryFn: async () => {
      if (!campeonatoId) return null;

      const { data: campeonato, error: campError } = await supabase
        .from('campeonatos')
        .select('*')
        .eq('id', campeonatoId)
        .maybeSingle();

      if (campError) throw campError;
      if (!campeonato) return null;

      const { data: eventos, error: eventosError } = await supabase
        .from('eventos_esportivos')
        .select('*')
        .eq('campeonato_id', campeonatoId)
        .order('data', { ascending: true });

      if (eventosError) throw eventosError;

      return {
        ...campeonato,
        eventos,
      };
    },
    // Aguarda o auth estar pronto para não cachear "não encontrado" como usuário anônimo
    enabled: !!campeonatoId && !!user?.id,
  });
}

// Create a new campeonato
export function useCreateCampeonato() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampeonatoInput) => {
      // First get the escolinha_id
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('campeonatos')
        .insert({
          ...input,
          escolinha_id: escolinha.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campeonato;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos-with-events'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-detail', created.id] });
    },
  });
}

// Update a campeonato
export function useUpdateCampeonato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCampeonatoInput) => {
      const { data, error } = await supabase
        .from('campeonatos')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Campeonato;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos-with-events'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-detail', updated.id] });
    },
  });
}

// Delete a campeonato
export function useDeleteCampeonato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campeonatos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos-with-events'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-detail'] });
    },
  });
}
