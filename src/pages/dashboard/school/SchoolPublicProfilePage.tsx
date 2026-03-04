import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Globe, Copy, Loader2, Save, Eye, Instagram } from 'lucide-react';
import { CreateEscolaPostForm } from '@/components/school/CreateEscolaPostForm';
import { EscolaPostCard } from '@/components/school/EscolaPostCard';
import { usePostsEscola } from '@/hooks/useEscolaPostsData';

export default function SchoolPublicProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: escolinha, isLoading } = useQuery({
    queryKey: ['escolinha-public-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome, slug, bio, cidade, estado, logo_url, instagram_url')
        .eq('admin_user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: posts = [] } = usePostsEscola(escolinha?.id);

  const escolinhaId = escolinha?.id;
  const storageKey = useCallback((field: string) => `school-profile-${escolinhaId}-${field}`, [escolinhaId]);

  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [initialized, setInitialized] = useState<string | null>(null);

  // Re-initialize when school changes, scoping drafts to the specific school
  useEffect(() => {
    if (!escolinha) return;
    if (initialized === escolinha.id) return;

    const draftSlug = sessionStorage.getItem(storageKey('slug'));
    const draftBio = sessionStorage.getItem(storageKey('bio'));
    const draftInstagram = sessionStorage.getItem(storageKey('instagram'));
    const hasDraft = draftSlug !== null || draftBio !== null || draftInstagram !== null;

    setSlug(hasDraft && draftSlug !== null ? draftSlug : escolinha.slug || '');
    setBio(hasDraft && draftBio !== null ? draftBio : escolinha.bio || '');
    setInstagramUrl(hasDraft && draftInstagram !== null ? draftInstagram : escolinha.instagram_url || '');
    setInitialized(escolinha.id);
  }, [escolinha, initialized, storageKey]);

  // Persist form state to sessionStorage so it survives app/tab switches
  useEffect(() => {
    if (initialized && escolinhaId) {
      sessionStorage.setItem(storageKey('slug'), slug);
      sessionStorage.setItem(storageKey('bio'), bio);
      sessionStorage.setItem(storageKey('instagram'), instagramUrl);
    }
  }, [slug, bio, instagramUrl, initialized, escolinhaId, storageKey]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanSlug = slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!cleanSlug) throw new Error('O slug não pode ficar vazio.');

      const { error } = await supabase
        .from('escolinhas')
        .update({ slug: cleanSlug, bio, instagram_url: instagramUrl || null })
        .eq('id', escolinha!.id);

      if (error) {
        if (error.code === '23505') throw new Error('Este endereço já está em uso. Escolha outro.');
        throw error;
      }

      setSlug(cleanSlug);
    },
    onSuccess: () => {
      // Clear draft from sessionStorage after successful save
      sessionStorage.removeItem(storageKey('slug'));
      sessionStorage.removeItem(storageKey('bio'));
      sessionStorage.removeItem(storageKey('instagram'));
      queryClient.invalidateQueries({ queryKey: ['escolinha-public-profile'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-header'] });
      toast.success('Perfil público salvo!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar.');
    },
  });

  const publicUrl = slug ? `${window.location.origin}/escola/${slug}` : null;

  const copyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Perfil Público
        </h1>
        <p className="text-muted-foreground">Configure a página pública da sua escolinha.</p>
      </div>

      {/* Preview link */}
      {publicUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">Seu link público:</p>
                <p className="text-sm text-primary truncate font-mono">{publicUrl}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-1" /> Copiar
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-1" /> Ver
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile settings */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do perfil</CardTitle>
          <CardDescription>Essas informações serão exibidas na página pública da escolinha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Endereço (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">/escola/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="minha-escolinha"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use letras minúsculas, números e hifens. Ex: <code>escola-futebol-sp</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / Descrição</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descreva sua escolinha em poucas palavras..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                id="instagram"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="@minha-escolinha ou link completo"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o link do Instagram ou apenas o @usuario.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <p className="text-sm text-muted-foreground flex-1">
              Nome e logo são editados na barra lateral (clique na logo).
            </p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !slug.trim()}
            className="w-full sm:w-auto"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Posts section */}
      {escolinha && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Publicações</h2>
          
          <CreateEscolaPostForm
            escolinhaId={escolinha.id}
            escolinhaNome={escolinha.nome}
            escolinhaLogo={escolinha.logo_url}
          />

          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma publicação ainda. Compartilhe novidades!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <EscolaPostCard
                  key={post.id}
                  post={post}
                  escolaNome={escolinha.nome}
                  escolaLogo={escolinha.logo_url}
                  escolaSlug={escolinha.slug}
                  isOwner
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
