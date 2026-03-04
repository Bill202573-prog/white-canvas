import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'informativo' | 'urgente' | 'importante';
  escolinha_id: string | null;
  criado_por: string;
  ativo: boolean;
  data_expiracao: string | null;
  created_at: string;
  updated_at: string;
  escolinha?: {
    id: string;
    nome: string;
  } | null;
}

export interface ComunicadoLeitura {
  id: string;
  comunicado_id: string;
  escolinha_id: string;
  lido_em: string;
  lido_por: string;
}

export interface ComunicadoComLeitura extends Comunicado {
  lido: boolean;
  leitura?: ComunicadoLeitura | null;
}

export interface CreateComunicadoData {
  titulo: string;
  mensagem: string;
  tipo: 'informativo' | 'urgente' | 'importante';
  escolinha_id: string | null;
  data_expiracao?: string | null;
}

// Hook for admin to manage comunicados
export const useAdminComunicados = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-comunicados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          *,
          escolinha:escolinhas(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comunicado[];
    },
    enabled: !!user && user.role === 'admin',
  });
};

// Hook for guardians to see comunicados
export const useGuardianComunicados = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['guardian-comunicados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          *,
          escolinha:escolinhas(id, nome)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Comunicado[];
    },
    enabled: !!user && user.role === 'guardian',
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook for schools to see comunicados with read status
export const useSchoolComunicados = (escolinhaId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['school-comunicados', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      // Fetch comunicados for this school or all schools (escolinha_id is null)
      const { data: comunicados, error: comunicadosError } = await supabase
        .from('comunicados')
        .select(`
          *,
          escolinha:escolinhas(id, nome)
        `)
        .eq('ativo', true)
        .or(`escolinha_id.is.null,escolinha_id.eq.${escolinhaId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (comunicadosError) throw comunicadosError;

      // Fetch read confirmations for this school
      const { data: leituras, error: leiturasError } = await supabase
        .from('comunicado_leituras')
        .select('*')
        .eq('escolinha_id', escolinhaId);

      if (leiturasError) throw leiturasError;

      // Merge comunicados with read status
      const comunicadosComLeitura: ComunicadoComLeitura[] = (comunicados || []).map((c) => {
        const leitura = leituras?.find((l) => l.comunicado_id === c.id);
        return {
          ...c,
          lido: !!leitura,
          leitura: leitura || null,
        } as ComunicadoComLeitura;
      });

      return comunicadosComLeitura;
    },
    enabled: !!user && user.role === 'school' && !!escolinhaId,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Hook to mark comunicado as read (school only)
export const useConfirmLeitura = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ comunicadoId, escolinhaId }: { comunicadoId: string; escolinhaId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comunicado_leituras')
        .insert({
          comunicado_id: comunicadoId,
          escolinha_id: escolinhaId,
          lido_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-comunicados', variables.escolinhaId] });
    },
  });
};

// Hook to create comunicado (admin only)
export const useCreateComunicado = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateComunicadoData) => {
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('comunicados')
        .insert({
          titulo: data.titulo,
          mensagem: data.mensagem,
          tipo: data.tipo,
          escolinha_id: data.escolinha_id,
          data_expiracao: data.data_expiracao || null,
          criado_por: user.id,
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comunicados'] });
    },
  });
};

// Hook to update comunicado (admin only)
export const useUpdateComunicado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Comunicado> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('comunicados')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comunicados'] });
    },
  });
};

// Hook to delete comunicado (admin only)
export const useDeleteComunicado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comunicados')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comunicados'] });
    },
  });
};
