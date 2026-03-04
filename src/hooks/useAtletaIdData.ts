import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types for Atleta ID
export interface PerfilAtleta {
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  foto_url: string | null;
  modalidade: string;
  categoria: string | null;
  cidade: string | null;
  estado: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostAtleta {
  id: string;
  autor_id: string;
  texto: string;
  imagens_urls: string[];
  visibilidade: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  perfil?: PerfilAtleta;
}

// Generate slug from name
export function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/(^-|-$)/g, '') // Remove leading/trailing hyphens
    + '-' + Math.random().toString(36).substring(2, 8); // Add random suffix
}

// Hook to get current user's athlete profile
export function useMyPerfilAtleta() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meu-perfil-atleta', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('perfil_atleta')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as PerfilAtleta | null;
    },
    enabled: !!user?.id,
  });
}

// Hook to get athlete profile by slug (public)
export function usePerfilAtletaBySlug(slug: string) {
  return useQuery({
    queryKey: ['perfil-atleta', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfil_atleta')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      return data as PerfilAtleta;
    },
    enabled: !!slug,
  });
}

// Hook to create athlete profile
export function useCreatePerfilAtleta() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      nome: string;
      modalidade?: string;
      categoria?: string;
      cidade?: string;
      estado?: string;
      bio?: string;
      foto_url?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const slug = generateSlug(data.nome);

      const { data: perfil, error } = await supabase
        .from('perfil_atleta')
        .insert({
          user_id: user.id,
          slug,
          nome: data.nome,
          modalidade: data.modalidade || 'futebol',
          categoria: data.categoria,
          cidade: data.cidade,
          estado: data.estado,
          bio: data.bio,
          foto_url: data.foto_url,
        })
        .select()
        .single();

      if (error) throw error;
      return perfil as PerfilAtleta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meu-perfil-atleta'] });
      toast.success('Perfil criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar perfil: ' + error.message);
    },
  });
}

// Hook to update athlete profile
export function useUpdatePerfilAtleta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PerfilAtleta> & { id: string }) => {
      const { data: perfil, error } = await supabase
        .from('perfil_atleta')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return perfil as PerfilAtleta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meu-perfil-atleta'] });
      toast.success('Perfil atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    },
  });
}

// Hook to get posts for a profile
export function usePostsAtleta(autorId: string | undefined) {
  return useQuery({
    queryKey: ['posts-atleta', autorId],
    queryFn: async () => {
      if (!autorId) return [];

      const { data, error } = await supabase
        .from('posts_atleta')
        .select(`
          *,
          perfil:perfil_atleta(*)
        `)
        .eq('autor_id', autorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PostAtleta[];
    },
    enabled: !!autorId,
  });
}

// Hook to create a post
export function useCreatePostAtleta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      autor_id: string;
      texto: string;
      imagens_urls?: string[];
    }) => {
      const { data: post, error } = await supabase
        .from('posts_atleta')
        .insert({
          autor_id: data.autor_id,
          texto: data.texto,
          imagens_urls: data.imagens_urls || [],
          visibilidade: 'publico',
        })
        .select()
        .single();

      if (error) throw error;
      return post as PostAtleta;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts-atleta', variables.autor_id] });
      toast.success('Post publicado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar: ' + error.message);
    },
  });
}

// Hook to delete a post
export function useDeletePostAtleta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, autorId }: { postId: string; autorId: string }) => {
      const { error } = await supabase
        .from('posts_atleta')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return { autorId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts-atleta', data.autorId] });
      toast.success('Post excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir post: ' + error.message);
    },
  });
}

// Hook to check if user liked a post
export function usePostLike(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isLiked } = useQuery({
    queryKey: ['post-like', postId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user?.id && !!postId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-like', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['posts-rede'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-connections'] });
    },
  });

  return { isLiked: !!isLiked, toggleLike };
}

// Upload image for post
export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('atleta-posts')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('atleta-posts')
    .getPublicUrl(fileName);

  return publicUrl;
}

// Upload profile photo
export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('atleta-fotos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('atleta-fotos')
    .getPublicUrl(fileName);

  return publicUrl;
}
