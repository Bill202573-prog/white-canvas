import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CarreiraBottomNav } from '@/components/carreira/CarreiraBottomNav';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PostAtleta } from '@/hooks/useCarreiraData';
import { PostCard } from '@/components/carreira/PostCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Rss, UserPlus, Users, Copy, Check, Search, X } from 'lucide-react';
import { ConectarButton } from '@/components/carreira/ConectarButton';
import { CarreiraLandingPage } from '@/components/carreira/CarreiraLandingPage';
import logoCarreira from '@/assets/logo-carreira-id-dark.png';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';

const TYPE_LABELS: Record<string, string> = {
  professor: 'Professor',
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

// Hook to get current Supabase session user (independent of institutional AuthContext)
function useCarreiraSession() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { sessionUserId, loading };
}

function useMyPerfilRede(userId?: string | null) {
  return useQuery({
    queryKey: ['meu-perfil-rede', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('perfis_rede')
        .select('id, slug, tipo, convite_codigo, nome, foto_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

function useMyPerfilAtletaBySession(userId?: string | null) {
  return useQuery({
    queryKey: ['meu-perfil-atleta-session', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('perfil_atleta')
        .select('id, nome, foto_url, slug')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

function useMyConnections(userId?: string | null) {
  return useQuery({
    queryKey: ['my-connections-accepted', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rede_conexoes')
        .select('solicitante_id, destinatario_id')
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`)
        .eq('status', 'aceita');
      if (error) throw error;
      return (data || []).map(c => c.solicitante_id === userId ? c.destinatario_id : c.solicitante_id);
    },
    enabled: !!userId,
  });
}

function useConnectionsCount(userId?: string | null) {
  return useQuery({
    queryKey: ['connections-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('rede_conexoes')
        .select('id', { count: 'exact', head: true })
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`)
        .eq('status', 'aceita');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}

function useConnectionsList(userId?: string | null) {
  return useQuery({
    queryKey: ['profile-connections-list', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('rede_conexoes')
        .select('solicitante_id, destinatario_id')
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`)
        .eq('status', 'aceita');
      if (error) throw error;
      const connectedUserIds = (data || []).map(c =>
        c.solicitante_id === userId ? c.destinatario_id : c.solicitante_id
      );
      if (connectedUserIds.length === 0) return [];
      const { data: redeProfiles } = await supabase
        .from('perfis_rede')
        .select('id, user_id, nome, tipo, foto_url')
        .in('user_id', connectedUserIds);
      const { data: atletaProfiles } = await supabase
        .from('perfil_atleta')
        .select('id, user_id, nome, foto_url, slug')
        .eq('is_public', true)
        .in('user_id', connectedUserIds);
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const p of (redeProfiles || [])) {
        if (!seen.has(p.user_id)) { seen.add(p.user_id); merged.push(p); }
      }
      for (const p of (atletaProfiles || [])) {
        if (!seen.has(p.user_id)) { seen.add(p.user_id); merged.push({ ...p, tipo: 'Atleta' }); }
      }
      return merged;
    },
    enabled: !!userId,
  });
}

function useFeedPosts(connectionIds: string[], userId?: string | null) {
  return useQuery({
    queryKey: ['feed-posts-connections', connectionIds, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts_atleta')
        .select(`*, perfil:perfil_atleta(*), perfil_rede:perfis_rede(*)`)
        .eq('visibilidade', 'publico')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        perfil: Array.isArray(p.perfil) ? p.perfil[0] : p.perfil,
        perfil_rede: Array.isArray(p.perfil_rede) ? p.perfil_rede[0] : p.perfil_rede,
      })) as PostAtleta[];
    },
    enabled: true,
  });
}

function useSuggestions(userId?: string | null) {
  return useQuery({
    queryKey: ['connection-suggestions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: existing } = await supabase
        .from('rede_conexoes')
        .select('solicitante_id, destinatario_id')
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`);

      const connectedIds = new Set(
        (existing || []).flatMap(c => [c.solicitante_id, c.destinatario_id])
      );
      connectedIds.add(userId);

      const { data: redeData } = await supabase
        .from('perfis_rede')
        .select('id, user_id, nome, tipo, foto_url')
        .limit(30);
      const { data: atletaData } = await supabase
        .from('perfil_atleta')
        .select('id, user_id, nome, foto_url, slug, modalidade')
        .eq('is_public', true)
        .limit(20);

      const redeProfiles = (redeData || []).filter(p => !connectedIds.has(p.user_id)).map(p => ({ ...p, source: 'rede' as const }));
      const atletaProfiles = (atletaData || []).filter(p => !connectedIds.has(p.user_id)).map(p => ({ ...p, tipo: 'Atleta', source: 'atleta' as const }));

      const seen = new Set<string>();
      const merged: any[] = [];
      for (const p of [...redeProfiles, ...atletaProfiles]) {
        if (!seen.has(p.user_id)) {
          seen.add(p.user_id);
          merged.push(p);
        }
      }
      return merged.slice(0, 5);
    },
    enabled: !!userId,
  });
}

function useSearchPeopleExplorar(query: string) {
  return useQuery({
    queryKey: ['search-people', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { rede: [] as any[], atletas: [] as any[] };
      const searchTerm = `%${query}%`;
      const { data: redeResults } = await supabase
        .from('perfis_rede')
        .select('id, user_id, nome, tipo, foto_url, slug')
        .ilike('nome', searchTerm)
        .limit(10);
      const { data: atletaResults } = await supabase
        .from('perfil_atleta')
        .select('id, user_id, nome, foto_url, slug, modalidade, categoria')
        .eq('is_public', true)
        .ilike('nome', searchTerm)
        .limit(10);
      return { rede: redeResults || [], atletas: atletaResults || [] };
    },
    enabled: query.length >= 2,
  });
}

export default function CarreiraExplorarPage() {
  const { sessionUserId, loading: sessionLoading } = useCarreiraSession();
  const navigate = useNavigate();
  const { data: meuPerfil, isLoading: perfilLoading } = useMyPerfilAtletaBySession(sessionUserId);
  const { data: meuPerfilRede, isLoading: perfilRedeLoading } = useMyPerfilRede(sessionUserId);
  const { data: connectionIds = [] } = useMyConnections(sessionUserId);
  const { data: connectionsCount = 0 } = useConnectionsCount(sessionUserId);
  const { data: posts, isLoading: postsLoading } = useFeedPosts(connectionIds, sessionUserId);
  const { data: suggestions } = useSuggestions(sessionUserId);
  const { data: connectionsList } = useConnectionsList(sessionUserId);
  const [copied, setCopied] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: searchResults } = useSearchPeopleExplorar(searchQuery);

  const hasProfile = !!meuPerfil || !!meuPerfilRede;

  // No auto-redirect — let the user stay on the feed/explorar page

  // Timeout to prevent infinite loading (e.g. profile queries hanging)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isStillLoading = sessionLoading || (sessionUserId && (perfilLoading || perfilRedeLoading));

  if (isStillLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="dark-orange">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionUserId || !hasProfile) {
    return <CarreiraLandingPage />;
  }

  const inviteLink = meuPerfilRede?.convite_codigo
    ? `${window.location.origin}${carreiraPath('/cadastro')}?convite=${meuPerfilRede.convite_codigo}`
    : '';

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const queryClient = useQueryClient();
  const handleConnect = async (targetUserId: string) => {
    if (!sessionUserId) return;
    setConnectingId(targetUserId);
    try {
      const { error } = await supabase.from('rede_conexoes').insert({
        solicitante_id: sessionUserId,
        destinatario_id: targetUserId,
        status: 'pendente',
      } as any);
      if (error) throw error;
      toast.success('Solicitação enviada!');
      queryClient.invalidateQueries({ queryKey: ['connection-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['conexao-status'] });
    } catch {
      toast.error('Erro ao conectar');
    }
    setConnectingId(null);
  };

  const profileName = meuPerfilRede?.nome || meuPerfil?.nome || 'Usuário';
  const profilePhoto = meuPerfilRede?.foto_url || meuPerfil?.foto_url;
  const profileType = meuPerfilRede?.tipo ? TYPE_LABELS[meuPerfilRede.tipo] : 'Atleta';

  return (
    <div className="min-h-screen bg-background" data-theme="dark-orange">
      {/* Accent top bar */}
      <div className="h-1 w-full bg-[hsl(25_95%_55%)]" />
      {/* Header */}
        <header className="sticky top-0 z-50 bg-[hsl(0_0%_0%/0.97)] border-b border-[hsl(25_95%_55%/0.4)]">
        {/* Row 1: Logo + Search (desktop inline) + Actions */}
        <div className="container flex items-center justify-between h-14 lg:h-16 px-4 max-w-6xl">
          <Link to={carreiraPath('/explorar')} className="flex items-center gap-2 shrink-0">
            <img src={logoCarreira} alt="Carreira" className="h-16 lg:h-20" />
          </Link>

          {/* Search bar — desktop inline */}
          <div className="hidden lg:block flex-1 max-w-xs mx-auto relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar pessoas na rede..."
                className="pl-9 pr-8 h-9 text-sm text-foreground placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10" onClick={() => { setSearchQuery(''); setSearchOpen(false); }}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate(carreiraPath(`/perfil/${sessionUserId}`))}>
              <Users className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Conexões</span>
              {connectionsCount > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{connectionsCount}</span>
              )}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => {
              const { data: pa } = await supabase.from('perfil_atleta').select('slug').eq('user_id', sessionUserId!).maybeSingle();
              const { data: pr } = await supabase.from('perfis_rede').select('slug').eq('user_id', sessionUserId!).maybeSingle();
              const slug = pa?.slug || pr?.slug;
              if (slug) navigate(carreiraPath(`/${slug}`));
              else navigate(carreiraPath(`/perfil/${sessionUserId}`));
            }}>
              Meu Perfil
            </Button>
          </div>
        </div>
        {/* Row 2: Search bar — mobile only */}
        <div className="lg:hidden container px-4 pb-2 max-w-6xl">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar pessoas na rede..."
              className="pl-9 pr-8 h-9 text-sm w-full text-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQuery && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10" onClick={() => { setSearchQuery(''); setSearchOpen(false); }}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search overlay + results — OUTSIDE header for correct z-index */}
      {searchOpen && <div className="fixed inset-0 z-[55]" onClick={() => setSearchOpen(false)} />}
      {searchOpen && searchQuery.length >= 2 && searchResults && (
        <div className="sticky top-[7.5rem] lg:top-16 z-[60] container max-w-6xl px-4">
          <div className="lg:max-w-sm lg:mx-auto relative">
            <Card className="absolute top-0 left-0 right-0 max-h-80 overflow-y-auto p-2 shadow-lg">
              {searchResults.atletas.length === 0 && searchResults.rede.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>
              ) : (
                <>
                  {searchResults.atletas.map((a: any) => (
                    <div key={`a-${a.id}`} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 rounded-lg cursor-pointer"
                      onClick={() => { navigate(carreiraPath(`/${a.slug}`)); setSearchOpen(false); setSearchQuery(''); }}>
                      {a.foto_url ? <img src={a.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{a.nome?.[0]}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.modalidade}{a.categoria ? ` • ${a.categoria}` : ''} • Atleta</p>
                      </div>
                    </div>
                  ))}
                  {searchResults.rede.map((r: any) => (
                    <div key={`r-${r.id}`} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 rounded-lg cursor-pointer"
                      onClick={() => { navigate(carreiraPath(`/${r.slug || `perfil/${r.user_id}`}`)); setSearchOpen(false); setSearchQuery(''); }}>
                      {r.foto_url ? <img src={r.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{r.nome?.[0]}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABELS[r.tipo] || r.tipo}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      <main className="container max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-6">
          {/* Left sidebar */}
          <aside className="hidden lg:block space-y-4">
            <Card className="p-4 text-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-2" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-xl font-bold text-primary">
                  {profileName[0]}
                </div>
              )}
              <h3 className="font-semibold text-foreground text-sm">{profileName}</h3>
              <p className="text-xs text-muted-foreground">{profileType}</p>
              <div className="mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => navigate(carreiraPath(`/perfil/${sessionUserId}`))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {connectionsCount} {connectionsCount === 1 ? 'conexão' : 'conexões'}
                </button>
              </div>
            </Card>

            {inviteLink && (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-2">Convide para sua rede:</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleCopyInvite}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copiado!' : 'Copiar link de convite'}
                </Button>
              </Card>
            )}
          </aside>

          {/* Center — Feed */}
          <div>
            {postsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !posts?.length ? (
              <Card className="text-center py-16 px-4">
                <Rss className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p className="font-medium text-foreground">Nenhuma publicação ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte-se com mais pessoas para ver publicações no seu feed.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} showAuthor={true} />
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar — Suggestions */}
          <aside className="hidden lg:block space-y-4">
            {suggestions && suggestions.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Sugestões para conectar</h3>
                <div className="space-y-3">
                  {suggestions.map((person) => (
                    <div key={person.id} className="flex items-center gap-2">
                      {person.foto_url ? (
                        <img
                          src={person.foto_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover cursor-pointer"
                          onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer"
                           onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}
                        >
                          {person.nome?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium truncate cursor-pointer hover:underline"
                          onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}
                        >
                          {person.nome}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                      </div>
                      <ConectarButton targetUserId={person.user_id} currentUserId={sessionUserId} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Connected people */}
            {connectionsList && connectionsList.length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Conectados ({connectionsList.length})
                </h3>
                <div className="space-y-2">
                  {connectionsList.slice(0, 5).map((person: any) => (
                    <div key={person.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
                      onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>
                      {person.foto_url ? (
                        <img src={person.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {person.nome?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{person.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </aside>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <CarreiraBottomNav currentUserId={sessionUserId} profileSlug={meuPerfil?.slug || meuPerfilRede?.slug || null} />
    </div>
  );
}
