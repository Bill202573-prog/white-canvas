import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Search, Trash2, User, Users, FileText, Eye, EyeOff, ExternalLink,
  Send, Image, X, Mail, Phone, CreditCard, DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { PostAtleta, useMyPerfilAtleta, useCreatePostAtleta, generateSlug } from '@/hooks/useCarreiraData';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Auto-create admin profile if none exists
function useAutoCreateAdminPerfil() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Não autenticado');
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('perfil_atleta')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) return existing;
      
      const nome = 'Atleta ID (Admin)';
      const slug = generateSlug(nome);
      
      const { data, error } = await supabase
        .from('perfil_atleta')
        .insert({
          user_id: user.id,
          slug,
          nome,
          modalidade: 'Plataforma',
          bio: 'Conta oficial da plataforma Atleta ID',
          is_public: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meu-perfil-atleta'] });
      toast.success('Perfil de administrador criado automaticamente!');
    },
    onError: (e: any) => toast.error('Erro ao criar perfil: ' + e.message),
  });
}

// Fetch all posts for admin
function useAdminPosts(search: string) {
  return useQuery({
    queryKey: ['admin-posts', search],
    queryFn: async () => {
      let query = supabase
        .from('posts_atleta')
        .select(`*, perfil:perfil_atleta(id, nome, slug, foto_url, user_id, is_public, modalidade)`)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      let posts = (data || []) as unknown as PostAtleta[];
      if (search) {
        const s = search.toLowerCase();
        posts = posts.filter(p =>
          p.texto?.toLowerCase().includes(s) ||
          p.perfil?.nome?.toLowerCase().includes(s)
        );
      }
      return posts;
    },
  });
}

// Fetch all profiles for admin (both perfil_atleta AND perfis_rede)
function useAdminPerfis(search: string) {
  return useQuery({
    queryKey: ['admin-perfis', search],
    queryFn: async () => {
      // Fetch athlete profiles
      const { data: atletaData, error: atletaError } = await supabase
        .from('perfil_atleta')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (atletaError) throw atletaError;

      // Fetch professional network profiles
      const { data: redeData, error: redeError } = await supabase
        .from('perfis_rede')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (redeError) throw redeError;

      // Fetch user emails and auth providers
      const allUserIds = [
        ...(atletaData || []).map((p: any) => p.user_id),
        ...(redeData || []).map((p: any) => p.user_id),
      ].filter(Boolean);

      const uniqueUserIds = [...new Set(allUserIds)];
      
      // Get profiles table for email and auth provider info
      let profilesMap: Record<string, any> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, nome, provider')
          .in('user_id', uniqueUserIds);
        if (profilesData) {
          profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
        }
      }

      // Normalize perfis_rede to same shape
      const redeNormalized = (redeData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        slug: p.slug,
        nome: p.nome,
        foto_url: p.foto_url,
        modalidade: p.tipo ? (TYPE_LABELS_ADMIN[p.tipo] || p.tipo) : '—',
        cidade: p.cidade,
        estado: p.estado,
        bio: p.bio,
        is_public: true,
        created_at: p.created_at,
        _source: 'rede',
        cpf_cnpj: p.cpf_cnpj,
        tipo_documento: p.tipo_documento,
        telefone_whatsapp: p.telefone_whatsapp,
        status_conta: p.status_conta || 'ativo',
        email: profilesMap[p.user_id]?.email || null,
        provider: profilesMap[p.user_id]?.provider || null,
      }));

      const atletaNormalized = (atletaData || []).map((p: any) => ({
        ...p,
        _source: 'atleta',
        cpf_cnpj: p.cpf_cnpj,
        tipo_documento: p.tipo_documento,
        telefone_whatsapp: p.telefone_whatsapp,
        status_conta: p.status_conta || 'ativo',
        email: profilesMap[p.user_id]?.email || null,
        provider: profilesMap[p.user_id]?.provider || null,
      }));

      let perfis = [...atletaNormalized, ...redeNormalized];
      
      // Sort by created_at desc
      perfis.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (search) {
        const s = search.toLowerCase();
        perfis = perfis.filter((p: any) =>
          p.nome?.toLowerCase().includes(s) ||
          p.slug?.toLowerCase().includes(s) ||
          p.modalidade?.toLowerCase().includes(s) ||
          p.email?.toLowerCase().includes(s) ||
          p.telefone_whatsapp?.includes(s)
        );
      }
      return perfis;
    },
  });
}

const TYPE_LABELS_ADMIN: Record<string, string> = {
  professor: 'Professor/Treinador',
  tecnico: 'Técnico',
  dono_escola: 'Dono de Escola',
  preparador_fisico: 'Preparador Físico',
  empresario: 'Empresário',
  influenciador: 'Influenciador',
  pai_responsavel: 'Pai/Responsável',
  scout: 'Scout',
  agente_clube: 'Agente de Clube',
  fotografo: 'Fotógrafo',
};

function useAdminDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts_atleta').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts-global'] });
      toast.success('Post excluído com sucesso');
    },
    onError: (e: any) => toast.error('Erro ao excluir: ' + e.message),
  });
}

function useTogglePerfilVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase
        .from('perfil_atleta')
        .update({ is_public })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-perfis'] });
      toast.success('Visibilidade alterada');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

// Fetch subscriptions for admin
function useAdminAssinaturas(search: string) {
  return useQuery({
    queryKey: ['admin-assinaturas', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carreira_assinaturas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Get user emails and crianca names
      const userIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const criancaIds = [...new Set((data || []).map((a: any) => a.crianca_id))];

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, nome')
          .in('user_id', userIds);
        if (profiles) profiles.forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      let criancasMap: Record<string, string> = {};
      if (criancaIds.length > 0) {
        const { data: criancas } = await supabase
          .from('criancas')
          .select('id, nome')
          .in('id', criancaIds);
        if (criancas) criancas.forEach((c: any) => { criancasMap[c.id] = c.nome; });
      }

      let result = (data || []).map((a: any) => ({
        ...a,
        user_email: profilesMap[a.user_id]?.email || '—',
        user_nome: profilesMap[a.user_id]?.nome || '—',
        crianca_nome: criancasMap[a.crianca_id] || '—',
      }));

      if (search) {
        const s = search.toLowerCase();
        result = result.filter((a: any) =>
          a.user_email?.toLowerCase().includes(s) ||
          a.user_nome?.toLowerCase().includes(s) ||
          a.crianca_nome?.toLowerCase().includes(s)
        );
      }
      return result;
    },
  });
}

const AdminRedeSocialPage = () => {
  const { user } = useAuth();
  const [searchPosts, setSearchPosts] = useState('');
  const [searchPerfis, setSearchPerfis] = useState('');
  const [searchAssinaturas, setSearchAssinaturas] = useState('');
  const [novoPostTexto, setNovoPostTexto] = useState('');
  const [postImages, setPostImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: posts, isLoading: loadingPosts } = useAdminPosts(searchPosts);
  const { data: perfis, isLoading: loadingPerfis } = useAdminPerfis(searchPerfis);
  const { data: assinaturas, isLoading: loadingAssinaturas } = useAdminAssinaturas(searchAssinaturas);
  const { data: meuPerfil, isLoading: loadingPerfil } = useMyPerfilAtleta();
  const deletePost = useAdminDeletePost();
  const toggleVisibility = useTogglePerfilVisibility();
  const createPost = useCreatePostAtleta();
  const autoCreate = useAutoCreateAdminPerfil();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (postImages.length + files.length > 3) {
      toast.error('Máximo de 3 imagens por post');
      return;
    }
    files.forEach((file) => {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        toast.error('Apenas imagens até 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPostImages(prev => [...prev, { file, preview: ev.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublicar = async () => {
    if (!novoPostTexto.trim() && postImages.length === 0) {
      toast.error('Escreva algo ou adicione uma imagem');
      return;
    }
    if (!meuPerfil) {
      toast.error('Você precisa ter um perfil Atleta ID para publicar');
      return;
    }
    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const img of postImages) {
        const ext = img.file.name.split('.').pop();
        const path = `posts/${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('atleta-posts').upload(path, img.file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('atleta-posts').getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }
      await createPost.mutateAsync({
        autor_id: meuPerfil.id,
        texto: novoPostTexto.trim(),
        imagens_urls: imageUrls,
      });
      setNovoPostTexto('');
      setPostImages([]);
    } catch (err: any) {
      toast.error('Erro ao publicar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = uploading || createPost.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rede Social - Moderação</h1>
        <p className="text-muted-foreground">Gerencie publicações e perfis da rede Carreira</p>
      </div>

      {/* Admin Post Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5" />
            Publicar na Rede
          </CardTitle>
          <CardDescription>
            {meuPerfil
              ? `Publicando como ${meuPerfil.nome}`
              : 'Você precisa ter um perfil Carreira para publicar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!meuPerfil && !loadingPerfil ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <User className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique abaixo para criar automaticamente seu perfil de administrador e começar a publicar.
              </p>
              <Button 
                size="sm" 
                onClick={() => autoCreate.mutate()}
                disabled={autoCreate.isPending}
              >
                {autoCreate.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
                ) : (
                  'Criar perfil automaticamente'
                )}
              </Button>
            </div>
          ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="O que você quer compartilhar na rede?"
              value={novoPostTexto}
              onChange={(e) => setNovoPostTexto(e.target.value)}
              rows={3}
              disabled={!meuPerfil || isSubmitting}
              className="resize-none"
            />
            {postImages.length > 0 && (
              <div className={cn(
                'grid gap-2',
                postImages.length === 1 && 'grid-cols-1',
                postImages.length === 2 && 'grid-cols-2',
                postImages.length >= 3 && 'grid-cols-3'
              )}>
                {postImages.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={postImages.length >= 3 || isSubmitting || !meuPerfil}
                  className="gap-2"
                >
                  <Image className="w-4 h-4" />
                  Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {postImages.length > 0 && (
                  <span className="text-xs text-muted-foreground">{postImages.length}/3</span>
                )}
              </div>
              <Button
                onClick={handlePublicar}
                disabled={isSubmitting || !meuPerfil || (!novoPostTexto.trim() && postImages.length === 0)}
                size="sm"
                className="gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Publicar</>
                )}
              </Button>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Posts</p>
                <p className="text-2xl font-bold">{posts?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perfis Ativos</p>
                <p className="text-2xl font-bold">{perfis?.filter((p: any) => p.is_public).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                <EyeOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perfis Ocultos</p>
                <p className="text-2xl font-bold">{perfis?.filter((p: any) => !p.is_public).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-2xl font-bold">{assinaturas?.filter((a: any) => a.status === 'ativa').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Publicações</TabsTrigger>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por texto ou autor..."
              value={searchPosts}
              onChange={(e) => setSearchPosts(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !posts?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma publicação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10 shrink-0">
                          {post.perfil?.foto_url && <AvatarImage src={post.perfil.foto_url} />}
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{post.perfil?.nome || 'Desconhecido'}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(post.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 line-clamp-3">{post.texto}</p>
                          {post.imagens_urls?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {post.imagens_urls.slice(0, 3).map((url, i) => (
                                <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover" />
                              ))}
                              {post.imagens_urls.length > 3 && (
                                <span className="text-xs text-muted-foreground self-center ml-1">
                                  +{post.imagens_urls.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{post.likes_count} curtidas</span>
                            <span>{post.comments_count} comentários</span>
                            {post.perfil?.slug && (
                              <a
                                href={`/carreira/${post.perfil.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver perfil
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é irreversível. O post de "{post.perfil?.nome}" será removido permanentemente da rede.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePost.mutate(post.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Perfis Tab */}
        <TabsContent value="perfis" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou modalidade..."
              value={searchPerfis}
              onChange={(e) => setSearchPerfis(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingPerfis ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !perfis?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum perfil encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="min-w-[220px]">Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfis.map((perfil: any) => (
                    <TableRow key={perfil.id} className={perfil.status_conta === 'inativo' ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {perfil.foto_url && <AvatarImage src={perfil.foto_url} />}
                            <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{perfil.nome}</p>
                            <p className="text-xs text-muted-foreground">@{perfil.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {perfil.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[260px]" title={perfil.email}>{perfil.email}</span>
                            </div>
                          )}
                          {perfil.telefone_whatsapp && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{perfil.telefone_whatsapp}</span>
                            </div>
                          )}
                          {perfil.cpf_cnpj && (
                            <span className="text-muted-foreground">
                              {perfil.tipo_documento === 'cnpj' ? 'CNPJ' : 'CPF'}: {perfil.cpf_cnpj}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {perfil.provider === 'google' ? '🔵 Google' : '📧 Email'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{perfil.modalidade}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(perfil.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={perfil.status_conta === 'ativo' ? 'default' : 'destructive'}
                          className={perfil.status_conta === 'ativo' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                          {perfil.status_conta === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={perfil.is_public ? 'default' : 'secondary'}
                          className={perfil.is_public ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}>
                          {perfil.is_public ? 'Público' : 'Oculto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {perfil.slug && (
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <a href={`/carreira/${perfil.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleVisibility.mutate({ id: perfil.id, is_public: !perfil.is_public })}
                            title={perfil.is_public ? 'Ocultar perfil' : 'Tornar público'}
                          >
                            {perfil.is_public ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Assinaturas Tab */}
        <TabsContent value="assinaturas" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou atleta..."
              value={searchAssinaturas}
              onChange={(e) => setSearchAssinaturas(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingAssinaturas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !assinaturas?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma assinatura encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Atleta</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Expiração</TableHead>
                      <TableHead>Gateway</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assinaturas.map((ass: any) => (
                      <TableRow key={ass.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{ass.user_nome}</p>
                            <p className="text-xs text-muted-foreground">{ass.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{ass.crianca_nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{ass.plano}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {ass.valor ? `R$ ${Number(ass.valor).toFixed(2).replace('.', ',')}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={ass.status === 'ativa' ? 'default' : 'secondary'}
                            className={ass.status === 'ativa' ? 'bg-accent/10 text-accent border-accent/20' : ''}
                          >
                            {ass.status === 'ativa' ? 'Ativa' : ass.status === 'cancelada' ? 'Cancelada' : ass.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ass.inicio_em), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ass.expira_em ? format(new Date(ass.expira_em), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ass.gateway === 'asaas' ? '💳 Asaas' : ass.gateway || '—'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRedeSocialPage;
