import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types for Carreira
export interface PerfilAtleta {
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  foto_url: string | null;
  banner_url: string | null;
  modalidade: string;
  modalidades: string[] | null;
  categoria: string | null;
  cidade: string | null;
  estado: string | null;
  bio: string | null;
  instagram_url: string | null;
  cor_destaque: string | null;
  is_public: boolean;
  crianca_id?: string | null;
  followers_count: number;
  conexoes_count: number;
  origem: string;
  atleta_app_id: string | null;
  atleta_id_vinculado: boolean;
  atleta_id_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerfilRede {
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  tipo: string;
  foto_url: string | null;
  bio: string | null;
  instagram: string | null;
}

export interface PostAtleta {
  id: string;
  autor_id: string;
  perfil_rede_id?: string | null;
  texto: string;
  imagens_urls: string[];
  visibilidade: string;
  likes_count: number;
  comments_count: number;
  link_preview?: any;
  created_at: string;
  updated_at: string;
  perfil?: PerfilAtleta;
  perfil_rede?: PerfilRede;
}

export interface PostComentario {
  id: string;
  post_id: string;
  user_id: string;
  texto: string;
  created_at: string;
  // joined
  profile?: { nome: string; email: string };
}

export interface AtividadeExternaPublica {
  id: string;
  crianca_id: string;
  tipo: string;
  tipo_outro_descricao?: string;
  data: string;
  data_fim?: string;
  local_atividade: string;
  profissional_instituicao: string;
  torneio_nome?: string;
  torneio_abrangencia?: string;
  observacoes?: string;
  fotos_urls: string[];
  created_at: string;
  crianca_nome?: string;
}

// Generate slug from name
export function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).substring(2, 8);
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

// Hook to get public activities for a profile
export function useAtividadesPublicas(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['atividades-publicas', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('atividades_externas')
        .select(`
          id, crianca_id, tipo, tipo_outro_descricao, data, data_fim,
          local_atividade, profissional_instituicao,
          torneio_nome, torneio_abrangencia, observacoes,
          fotos_urls, created_at
        `)
        .eq('crianca_id', criancaId)
        .eq('tornar_publico', true)
        .order('data', { ascending: false });

      if (error) throw error;
      return data as AtividadeExternaPublica[];
    },
    enabled: !!criancaId,
  });
}

// Hook to get escolinhas for an athlete profile
export interface EscolinhaCarreira {
  id: string;
  nome: string;
  logo_url: string | null;
  slug: string | null;
  ativo: boolean;
  data_inicio: string;
  data_fim: string | null;
}

export function useEscolinhasCarreira(criancaId: string | null | undefined) {
  return useQuery({
    queryKey: ['escolinhas-carreira', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data: vinculos, error: vinculosError } = await supabase
        .from('crianca_escolinha')
        .select('id, ativo, data_inicio, data_fim, escolinha_id')
        .eq('crianca_id', criancaId);

      if (vinculosError) throw vinculosError;
      if (!vinculos?.length) return [];

      const escolinhaIds = vinculos.map(v => v.escolinha_id);
      const { data: escolinhas, error: escError } = await (supabase
        .from('escolinhas_publico')
        .select('id, nome, logo_url, slug') as any)
        .in('id', escolinhaIds);

      if (escError) throw escError;

      const escMap = new Map((escolinhas || []).map((e: any) => [e.id, e]));

      return vinculos
        .map(v => {
          const esc: any = escMap.get(v.escolinha_id);
          if (!esc) return null;
          return {
            id: esc.id, nome: esc.nome, logo_url: esc.logo_url, slug: esc.slug,
            ativo: v.ativo, data_inicio: v.data_inicio, data_fim: v.data_fim,
          } as EscolinhaCarreira;
        })
        .filter(Boolean) as EscolinhaCarreira[];
    },
    enabled: !!criancaId,
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
      crianca_id?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const slug = generateSlug(data.nome);

      const { data: perfil, error } = await supabase
        .from('perfil_atleta')
        .insert({
          user_id: user.id, slug, nome: data.nome,
          modalidade: data.modalidade || 'Futebol',
          categoria: data.categoria, cidade: data.cidade, estado: data.estado,
          bio: data.bio, foto_url: data.foto_url, crianca_id: data.crianca_id,
          origem: 'carreira',
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
    onSuccess: (updatedPerfil) => {
      queryClient.invalidateQueries({ queryKey: ['meu-perfil-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['perfil-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['carreira-profile-by-slug'] });
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['posts-rede'] });
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
        .select(`*, perfil:perfil_atleta(*), perfil_rede:perfis_rede(*)`)
        .eq('autor_id', autorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        perfil: Array.isArray(p.perfil) ? p.perfil[0] : p.perfil,
        perfil_rede: Array.isArray(p.perfil_rede) ? p.perfil_rede[0] : p.perfil_rede,
      })) as PostAtleta[];
    },
    enabled: !!autorId,
  });
}

// Hook to get posts for a rede profile
export function usePostsRede(perfilRedeId: string | undefined) {
  return useQuery({
    queryKey: ['posts-rede', perfilRedeId],
    queryFn: async () => {
      if (!perfilRedeId) return [];

      const { data, error } = await supabase
        .from('posts_atleta')
        .select(`*, perfil:perfil_atleta(*), perfil_rede:perfis_rede(*)`)
        .eq('perfil_rede_id', perfilRedeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        perfil: Array.isArray(p.perfil) ? p.perfil[0] : p.perfil,
        perfil_rede: Array.isArray(p.perfil_rede) ? p.perfil_rede[0] : p.perfil_rede,
      })) as PostAtleta[];
    },
    enabled: !!perfilRedeId,
  });
}

// Hook to create a post (supports both perfil_atleta and perfis_rede)
export function useCreatePostAtleta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { autor_id?: string; perfil_rede_id?: string; texto: string; imagens_urls?: string[]; link_preview?: any }) => {
      const insertData: any = {
        texto: data.texto,
        imagens_urls: data.imagens_urls || [],
        visibilidade: 'publico',
        link_preview: data.link_preview || null,
      };
      if (data.perfil_rede_id) {
        insertData.perfil_rede_id = data.perfil_rede_id;
      } else {
        insertData.autor_id = data.autor_id;
      }

      const { data: post, error } = await supabase
        .from('posts_atleta')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return post as PostAtleta;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-connections'] });
      queryClient.invalidateQueries({ queryKey: ['posts-rede'] });
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
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['posts-rede'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-connections'] });
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
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['post-like', postId, user?.id] });

      // Snapshot previous values
      const previousLiked = queryClient.getQueryData(['post-like', postId, user?.id]);

      // Optimistically update isLiked
      queryClient.setQueryData(['post-like', postId, user?.id], !isLiked);

      // Optimistically update likes_count in all feed queries
      const feedKeys = ['posts-atleta', 'posts-rede', 'feed-posts-global', 'feed-posts-connections'];
      const previousFeeds: Record<string, unknown> = {};

      feedKeys.forEach(key => {
        const queries = queryClient.getQueriesData({ queryKey: [key] });
        queries.forEach(([queryKey, data]) => {
          if (Array.isArray(data)) {
            previousFeeds[JSON.stringify(queryKey)] = data;
            queryClient.setQueryData(queryKey, (data as PostAtleta[]).map(p =>
              p.id === postId
                ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) }
                : p
            ));
          }
        });
      });

      return { previousLiked, previousFeeds };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(['post-like', postId, user?.id], context.previousLiked);
        Object.entries(context.previousFeeds).forEach(([key, data]) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
    },
    onSettled: () => {
      // Sync with server
      queryClient.invalidateQueries({ queryKey: ['post-like', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['posts-rede'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-connections'] });
    },
  });

  return { isLiked: !!isLiked, toggleLike };
}

// Hook for post comments
export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comentarios')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data?.length) return [] as PostComentario[];

      // Fetch profile names
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as { nome: string; email: string } | undefined,
      })) as PostComentario[];
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, texto }: { postId: string; texto: string; userId: string }) => {
      const { error } = await supabase
        .from('post_comentarios')
        .insert({ post_id: postId, user_id: (await supabase.auth.getUser()).data.user?.id, texto });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao comentar: ' + error.message);
    },
  });
}

// Hook for follows
export function useIsFollowing(perfilId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-following', perfilId, user?.id],
    queryFn: async () => {
      if (!user?.id || !perfilId) return false;

      const { data } = await supabase
        .from('atleta_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_perfil_id', perfilId)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user?.id && !!perfilId,
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ perfilId, isFollowing }: { perfilId: string; isFollowing: boolean }) => {
      if (!user?.id) throw new Error('Faça login para seguir');

      if (isFollowing) {
        const { error } = await supabase
          .from('atleta_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_perfil_id', perfilId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('atleta_follows')
          .insert({ follower_id: user.id, following_perfil_id: perfilId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['is-following', vars.perfilId] });
      queryClient.invalidateQueries({ queryKey: ['perfil-atleta'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Convert HEIC to JPEG before upload
async function convertHeicIfNeeded(file: File): Promise<File> {
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    const heic2any = (await import('heic2any')).default;
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 }) as Blob;
    return new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
  }
  return file;
}

// Upload image for post
export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const converted = await convertHeicIfNeeded(file);
  const fileExt = converted.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('atleta-posts')
    .upload(fileName, converted);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('atleta-posts')
    .getPublicUrl(fileName);

  return publicUrl;
}

// Upload profile photo
export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  const converted = await convertHeicIfNeeded(file);
  const fileExt = converted.name.split('.').pop();
  const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('atleta-fotos')
    .upload(fileName, converted, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('atleta-fotos')
    .getPublicUrl(fileName);

  // Cache-buster to avoid browser caching old image
  return `${publicUrl}?t=${Date.now()}`;
}
