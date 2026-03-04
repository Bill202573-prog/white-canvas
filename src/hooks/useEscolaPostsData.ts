import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PostEscola {
  id: string;
  escolinha_id: string;
  autor_user_id: string;
  texto: string;
  imagens_urls: string[];
  visibilidade: string;
  created_at: string;
  updated_at: string;
  // Joined
  escola?: {
    nome: string;
    logo_url: string | null;
    slug: string | null;
  };
}

export function usePostsEscola(escolinhaId: string | undefined) {
  return useQuery({
    queryKey: ['posts-escola', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await supabase
        .from('posts_escola')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .eq('visibilidade', 'publico')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PostEscola[];
    },
    enabled: !!escolinhaId,
  });
}

export function useCreatePostEscola() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      escolinha_id: string;
      autor_user_id: string;
      texto: string;
      imagens_urls?: string[];
    }) => {
      const { data: post, error } = await supabase
        .from('posts_escola')
        .insert({
          escolinha_id: data.escolinha_id,
          autor_user_id: data.autor_user_id,
          texto: data.texto,
          imagens_urls: data.imagens_urls || [],
          visibilidade: 'publico',
        })
        .select()
        .single();

      if (error) throw error;
      return post as PostEscola;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts-escola', variables.escolinha_id] });
      toast.success('Post publicado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar: ' + error.message);
    },
  });
}

export function useDeletePostEscola() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, escolinhaId }: { postId: string; escolinhaId: string }) => {
      const { error } = await supabase
        .from('posts_escola')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return { escolinhaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts-escola', data.escolinhaId] });
      toast.success('Post excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir post: ' + error.message);
    },
  });
}

export async function uploadEscolaPostImage(file: File, escolinhaId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${escolinhaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('escola-posts')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('escola-posts')
    .getPublicUrl(fileName);

  return publicUrl;
}
