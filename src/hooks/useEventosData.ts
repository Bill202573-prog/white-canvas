import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EventoTipo = 'amistoso' | 'campeonato';
export type EventoStatus = 'agendado' | 'realizado' | 'finalizado';

export interface EventoEsportivo {
  id: string;
  escolinha_id: string;
  nome: string;
  tipo: EventoTipo;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  local: string | null;
  categoria: string | null;
  status: EventoStatus;
  observacoes: string | null;
  time1_id: string | null;
  time2_id: string | null;
  adversario: string | null;
  placar_time1: number | null;
  placar_time2: number | null;
  campeonato_id: string | null;
  fase: string | null;
  taxa_participacao: number | null;
  cobrar_taxa_participacao: boolean | null;
  taxa_juiz: number | null;
  cobrar_taxa_juiz: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventoInput {
  nome: string;
  tipo: EventoTipo;
  data: string;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  local?: string | null;
  categoria?: string | null;
  status?: EventoStatus;
  observacoes?: string | null;
  campeonato_id?: string | null;
  fase?: string | null;
  adversario?: string | null;
  taxa_participacao?: number | null;
  cobrar_taxa_participacao?: boolean;
  taxa_juiz?: number | null;
  cobrar_taxa_juiz?: boolean;
}

export interface UpdateEventoInput extends Partial<CreateEventoInput> {
  id: string;
}

// Fetch all events for the school
export function useSchoolEventos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eventos-esportivos', user?.id],
    queryFn: async () => {
      // First get the escolinha_id
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('eventos_esportivos')
        .select('*')
        .eq('escolinha_id', escolinha.id)
        .order('data', { ascending: false });

      if (error) throw error;
      return data as EventoEsportivo[];
    },
    enabled: !!user?.id && user?.role === 'school',
  });
}

// Fetch a single event by ID
export function useEventoById(eventoId: string | null) {
  return useQuery({
    queryKey: ['evento-esportivo', eventoId],
    queryFn: async () => {
      if (!eventoId) return null;
      
      const { data, error } = await supabase
        .from('eventos_esportivos')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (error) throw error;
      return data as EventoEsportivo;
    },
    enabled: !!eventoId,
  });
}

export function useEventosForMonth(year: number, month: number) {
  const { user } = useAuth();

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['eventos-esportivos-month', user?.id, year, month],
    queryFn: async () => {
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('eventos_esportivos')
        .select('*')
        .eq('escolinha_id', escolinha.id)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as EventoEsportivo[];
    },
    enabled: !!user?.id && user?.role === 'school',
  });
}

// Fetch events for a specific week
export function useEventosForWeek(weekStart: Date) {
  const { user } = useAuth();

  const startDate = weekStart.toISOString().split('T')[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endDate = weekEnd.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['eventos-esportivos-week', user?.id, startDate],
    queryFn: async () => {
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('eventos_esportivos')
        .select('*')
        .eq('escolinha_id', escolinha.id)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as EventoEsportivo[];
    },
    enabled: !!user?.id && user?.role === 'school',
  });
}

// Create a new event
export function useCreateEvento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventoInput) => {
      // First get the escolinha_id
      const { data: escolinha, error: escolinhaError } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();

      if (escolinhaError) throw escolinhaError;

      const { data, error } = await supabase
        .from('eventos_esportivos')
        .insert({
          ...input,
          escolinha_id: escolinha.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-esportivos'] });
    },
  });
}

// Update an event
export function useUpdateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateEventoInput) => {
      const { data, error } = await supabase
        .from('eventos_esportivos')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-esportivos'] });
    },
  });
}

// Delete an event
export function useDeleteEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eventos_esportivos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-esportivos'] });
    },
  });
}

// Finalize an event with score
export interface FinalizarEventoInput {
  id: string;
  time1_id: string;
  adversario: string;
  placar_time1: number;
  placar_time2: number;
  status: EventoStatus;
}

export function useFinalizarEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: FinalizarEventoInput) => {
      const { data, error } = await supabase
        .from('eventos_esportivos')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-esportivos'] });
    },
  });
}

// Encerrar evento (close definitively)
export function useEncerrarEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('eventos_esportivos')
        .update({ status: 'finalizado' as EventoStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-esportivos'] });
    },
  });
}
