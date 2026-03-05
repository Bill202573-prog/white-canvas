import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CarreiraExperiencia {
  id: string;
  crianca_id: string;
  user_id: string;
  nome_escola: string;
  escolinha_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  atual: boolean;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCarreiraExperiencias(criancaId?: string | null) {
  return useQuery({
    queryKey: ['carreira-experiencias', criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carreira_experiencias')
        .select('*')
        .eq('crianca_id', criancaId!)
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as CarreiraExperiencia[];
    },
    enabled: !!criancaId,
  });
}

export function useCreateCarreiraExperiencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<CarreiraExperiencia, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('carreira_experiencias')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['carreira-experiencias', vars.crianca_id] });
    },
  });
}

export function useUpdateCarreiraExperiencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CarreiraExperiencia> & { id: string; crianca_id: string }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('carreira_experiencias')
        .update(rest as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['carreira-experiencias', vars.crianca_id] });
    },
  });
}

export function useDeleteCarreiraExperiencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, criancaId }: { id: string; criancaId: string }) => {
      const { error } = await supabase.from('carreira_experiencias').delete().eq('id', id);
      if (error) throw error;
      return criancaId;
    },
    onSuccess: (criancaId) => {
      queryClient.invalidateQueries({ queryKey: ['carreira-experiencias', criancaId] });
    },
  });
}

export function useEscolinhasAutocomplete(search: string) {
  return useQuery({
    queryKey: ['escolinhas-autocomplete', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas_publico')
        .select('id, nome, logo_url, cidade, estado')
        .ilike('nome', `%${search}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });
}
