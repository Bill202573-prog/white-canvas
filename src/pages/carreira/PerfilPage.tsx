import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PerfilLayout } from '@/components/carreira/perfis/PerfilLayout';
import { DadosEspecificos } from '@/components/carreira/perfis/DadosEspecificos';
import { ConnectionsSection } from '@/components/carreira/ConnectionsSection';
import { EditPerfilRedeDialog } from '@/components/carreira/EditPerfilRedeDialog';
import { MigrarPerfilBanner } from '@/components/carreira/MigrarPerfilBanner';
import { CarreiraBottomNav } from '@/components/carreira/CarreiraBottomNav';
import { CreatePostForm } from '@/components/carreira/CreatePostForm';
import { PostCard } from '@/components/carreira/PostCard';
import { usePostsRede } from '@/hooks/useCarreiraData';
import logoCarreira from '@/assets/logo-carreira-id-dark.png';
import { useEffect, useState } from 'react';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';

export default function PerfilPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil-rede', userId],
    queryFn: async () => {
      const { data: redeData, error: redeError } = await supabase
        .from('perfis_rede')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (redeError) throw redeError;
      if (redeData) return { type: 'rede' as const, data: redeData };

      const { data: atletaData, error: atletaError } = await supabase
        .from('perfil_atleta')
        .select('slug')
        .eq('user_id', userId!)
        .maybeSingle();
      if (atletaError) throw atletaError;
      if (atletaData?.slug) return { type: 'atleta_redirect' as const, slug: atletaData.slug };

      return null;
    },
    enabled: !!userId,
  });

  const tema = 'dark-orange'; // Dark premium theme for all Carreira profiles
  const isDarkTheme = true;

  useEffect(() => {
    if (perfil?.type === 'atleta_redirect' && perfil.slug) {
      navigate(carreiraPath(`/${perfil.slug}`), { replace: true });
    }
  }, [perfil, navigate]);

  if (isLoading || perfil?.type === 'atleta_redirect') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="dark-orange">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const redeProfile = perfil?.type === 'rede' ? perfil.data : null;

  if (!redeProfile) {
    return (
      <div className="min-h-screen bg-background" data-theme="dark-orange">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container flex items-center h-20 px-4">
            <button onClick={() => navigate(carreiraPath('/'))} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <img src={logoCarreira} alt="Carreira" className="h-24" />
            </button>
          </div>
        </header>
        <main className="container max-w-lg px-4 py-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-foreground">Perfil não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-2">Este usuário ainda não criou um perfil na rede.</p>
          <Button className="mt-6" onClick={() => navigate(carreiraPath('/'))}>
            Voltar ao Feed
          </Button>
        </main>
      </div>
    );
  }

  const isOwnProfile = currentUserId === redeProfile.user_id;

  return (
    <div className="min-h-screen bg-background" data-theme="dark-orange">
      <header className={`sticky top-0 z-50 backdrop-blur border-b ${isDarkTheme ? 'bg-[hsl(220_12%_10%/0.95)] border-[hsl(220_10%_18%)]' : 'bg-background/95'}`}>
        <div className="container flex items-center justify-between h-20 px-4">
          <button onClick={() => navigate(carreiraPath('/'))} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <img src={logoCarreira} alt="Carreira" className="h-24" />
          </button>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              Editar Perfil
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-lg px-4 py-6">
        {isOwnProfile && redeProfile.tipo === 'pai_responsavel' && (
          <div className="mb-4">
            <MigrarPerfilBanner
              userId={redeProfile.user_id}
              perfilNome={redeProfile.nome}
              onMigrated={() => {
                // Redirect to the new athlete profile
                supabase
                  .from('perfil_atleta')
                  .select('slug')
                  .eq('user_id', redeProfile.user_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data?.slug) {
                      navigate(carreiraPath(`/${data.slug}`), { replace: true });
                    } else {
                      window.location.reload();
                    }
                  });
              }}
            />
          </div>
        )}
        <PerfilLayout
          perfil={{
            id: redeProfile.id,
            user_id: redeProfile.user_id,
            nome: redeProfile.nome,
            tipo: redeProfile.tipo,
            foto_url: redeProfile.foto_url,
            bio: redeProfile.bio,
            instagram: redeProfile.instagram,
            dados_perfil: redeProfile.dados_perfil as Record<string, any> | null,
          }}
          isOwnProfile={isOwnProfile}
          currentUserId={currentUserId}
        >
          <Tabs defaultValue="publicacoes" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="publicacoes" className="flex-1">Publicações</TabsTrigger>
              <TabsTrigger value="sobre" className="flex-1">Sobre</TabsTrigger>
              <TabsTrigger value="conexoes" className="flex-1">Conexões</TabsTrigger>
            </TabsList>
            <TabsContent value="publicacoes">
              <RedePostsFeed perfilId={redeProfile.id} isOwnProfile={isOwnProfile} perfilNome={redeProfile.nome} perfilFoto={redeProfile.foto_url} />
            </TabsContent>
            <TabsContent value="sobre">
              <DadosEspecificos
                tipo={redeProfile.tipo as any}
                dados={redeProfile.dados_perfil as Record<string, any> | null}
              />
            </TabsContent>
            <TabsContent value="conexoes">
              <ConnectionsSection
                userId={redeProfile.user_id}
                currentUserId={currentUserId}
              />
            </TabsContent>
          </Tabs>
        </PerfilLayout>
      </main>

      {isOwnProfile && redeProfile && (
        <EditPerfilRedeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          perfil={redeProfile}
        />
      )}

      <CarreiraBottomNav currentUserId={currentUserId} profileSlug={null} />
    </div>
  );
}

function RedePostsFeed({ perfilId, isOwnProfile, perfilNome, perfilFoto }: { perfilId: string; isOwnProfile: boolean; perfilNome: string; perfilFoto: string | null }) {
  const { data: posts, isLoading } = usePostsRede(perfilId);

  return (
    <div className="space-y-4 mt-4">
      {isOwnProfile && (
        <CreatePostForm perfilRedeId={perfilId} perfilRedeNome={perfilNome} perfilRedeFoto={perfilFoto} />
      )}
      {isLoading && <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {!isLoading && (!posts || posts.length === 0) && !isOwnProfile && (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhuma publicação ainda.</p>
      )}
    </div>
  );
}