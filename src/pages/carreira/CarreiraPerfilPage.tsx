import { useParams, Link, useNavigate } from 'react-router-dom';
import { useIsFollowing, useToggleFollow, useEscolinhasCarreira, usePostsRede } from '@/hooks/useCarreiraData';

import { PerfilHeader } from '@/components/carreira/PerfilHeader';
import { CarreiraTimeline } from '@/components/carreira/CarreiraTimeline';
import { ConexoesCount } from '@/components/carreira/ConexoesCount';
import { CarreiraBottomNav } from '@/components/carreira/CarreiraBottomNav';
import { PerfilLayout } from '@/components/carreira/perfis/PerfilLayout';
import { CreatePostForm } from '@/components/carreira/CreatePostForm';
import { PostCard } from '@/components/carreira/PostCard';
import { EditPerfilRedeDialog } from '@/components/carreira/EditPerfilRedeDialog';
import { EditPerfilDialog } from '@/components/carreira/EditPerfilDialog';
import { ConectarButton } from '@/components/carreira/ConectarButton';
import { MigrarPerfilBanner } from '@/components/carreira/MigrarPerfilBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserX, MapPin, Trophy, Share2, User, UserPlus, UserCheck, Users, Copy, Check, Search, School, X, LogOut, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import logoCarreira from '@/assets/logo-carreira-id-dark.png';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';

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

function useSuggestionsForProfile(userId?: string | null) {
  return useQuery({
    queryKey: ['profile-suggestions', userId],
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

      // Get suggestions from both perfis_rede and perfil_atleta
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

      // Merge and deduplicate by user_id
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

function useConnectionsList(userId?: string) {
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

      // Query both tables
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

// Search hook for people across the network
function useSearchPeople(query: string) {
  return useQuery({
    queryKey: ['search-people', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { rede: [] as any[], atletas: [] as any[] };
      const searchTerm = `%${query}%`;
      
      // Search in perfis_rede
      const { data: redeResults } = await supabase
        .from('perfis_rede')
        .select('id, user_id, nome, tipo, foto_url, slug')
        .ilike('nome', searchTerm)
        .limit(10);

      // Search in perfil_atleta
      const { data: atletaResults } = await supabase
        .from('perfil_atleta')
        .select('id, user_id, nome, foto_url, slug, modalidade, categoria')
        .eq('is_public', true)
        .ilike('nome', searchTerm)
        .limit(10);

      return {
        rede: redeResults || [],
        atletas: atletaResults || [],
      };
    },
    enabled: query.length >= 2,
  });
}

// Unified profile type that works for both perfil_atleta and perfis_rede
type UnifiedProfile = {
  type: 'atleta' | 'rede';
  // Common fields
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  // Atleta-specific
  banner_url?: string | null;
  modalidade?: string;
  modalidades?: string[] | null;
  categoria?: string | null;
  cidade?: string | null;
  estado?: string | null;
  instagram_url?: string | null;
  cor_destaque?: string | null;
  is_public?: boolean;
  crianca_id?: string | null;
  followers_count?: number;
  conexoes_count?: number;
  created_at?: string;
  updated_at?: string;
  // Rede-specific
  tipo?: string;
  instagram?: string | null;
  dados_perfil?: Record<string, any> | null;
  // Theme
  tema?: string | null;
};

function useProfileBySlug(slug: string) {
  return useQuery({
    queryKey: ['carreira-profile-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;

      // 1. Try perfil_atleta first
      const { data: atletaData, error: atletaError } = await supabase
        .from('perfil_atleta')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle();
      if (atletaError && atletaError.code !== 'PGRST116') throw atletaError;
      if (atletaData) return { type: 'atleta' as const, ...atletaData } as UnifiedProfile;

      // 2. Try perfis_rede
      const { data: redeData, error: redeError } = await supabase
        .from('perfis_rede')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (redeError && redeError.code !== 'PGRST116') throw redeError;
      if (redeData) return { type: 'rede' as const, ...redeData } as UnifiedProfile;

      return null;
    },
    enabled: !!slug,
  });
}

export default function CarreiraPerfilPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: perfil, isLoading, error } = useProfileBySlug(slug || '');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const isOwner = !!(currentUserId && perfil && currentUserId === perfil.user_id);
  
  const [mySlug, setMySlug] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        // Fetch my slug for bottom nav
        const { data: pa } = await supabase.from('perfil_atleta').select('slug').eq('user_id', uid).maybeSingle();
        const { data: pr } = await supabase.from('perfis_rede').select('slug').eq('user_id', uid).maybeSingle();
        setMySlug(pa?.slug || pr?.slug || null);
      }
    });
  }, []);

  const { data: suggestions } = useSuggestionsForProfile(currentUserId);
  const { data: connections } = useConnectionsList(perfil?.user_id);
  const { data: escolinhas } = useEscolinhasCarreira(perfil?.type === 'atleta' ? perfil?.crianca_id : undefined);
  const { data: searchResults } = useSearchPeople(searchQuery);

  // Dynamic category from birth date
  const { data: criancaSidebar } = useQuery({
    queryKey: ['crianca-nascimento', perfil?.crianca_id],
    queryFn: async () => {
      const { data } = await supabase.from('criancas').select('data_nascimento').eq('id', perfil!.crianca_id!).single();
      return data;
    },
    enabled: !!perfil?.crianca_id,
  });

  // Pending connection requests (only for own profile)
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-connection-requests-sidebar', currentUserId],
    queryFn: async () => {
      if (!currentUserId || !isOwner) return [];
      const { data, error } = await supabase
        .from('rede_conexoes')
        .select('id, solicitante_id')
        .eq('destinatario_id', currentUserId)
        .eq('status', 'pendente');
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const senderIds = data.map(r => r.solicitante_id);
      const { data: redeP } = await supabase.from('perfis_rede').select('id, user_id, nome, tipo, foto_url').in('user_id', senderIds);
      const { data: atletaP } = await supabase.from('perfil_atleta').select('id, user_id, nome, foto_url, slug').eq('is_public', true).in('user_id', senderIds);
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const p of (redeP || [])) { if (!seen.has(p.user_id)) { seen.add(p.user_id); merged.push(p); } }
      for (const p of (atletaP || [])) { if (!seen.has(p.user_id)) { seen.add(p.user_id); merged.push({ ...p, tipo: 'Atleta' }); } }
      return merged.map(p => ({ ...p, connectionId: data.find(r => r.solicitante_id === p.user_id)?.id }));
    },
    enabled: !!currentUserId && isOwner,
  });

  const handleAcceptRequest = async (connectionId: string) => {
    const { error } = await supabase.from('rede_conexoes').update({ status: 'aceita' } as any).eq('id', connectionId);
    if (error) toast.error('Erro ao aceitar');
    else {
      toast.success('Conexão aceita!');
      queryClient.invalidateQueries({ queryKey: ['pending-connection-requests-sidebar'] });
      queryClient.invalidateQueries({ queryKey: ['profile-connections-list'] });
      queryClient.invalidateQueries({ queryKey: ['conexao-status'] });
      queryClient.invalidateQueries({ queryKey: ['connections-count'] });
      queryClient.invalidateQueries({ queryKey: ['user-connections'] });
      queryClient.invalidateQueries({ queryKey: ['my-connections-accepted'] });
      queryClient.invalidateQueries({ queryKey: ['conexoes-count'] });
      queryClient.invalidateQueries({ queryKey: ['pending-connections-count'] });
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    const { error } = await supabase.from('rede_conexoes').delete().eq('id', connectionId);
    if (error) toast.error('Erro ao recusar');
    else {
      toast.success('Solicitação recusada');
      queryClient.invalidateQueries({ queryKey: ['pending-connection-requests-sidebar'] });
    }
  };

  const queryClient = useQueryClient();
  const handleConnect = async (targetUserId: string) => {
    if (!currentUserId) return;
    setConnectingId(targetUserId);
    try {
      const { error } = await supabase.from('rede_conexoes').insert({
        solicitante_id: currentUserId,
        destinatario_id: targetUserId,
        status: 'pendente',
      } as any);
      if (error) throw error;
      toast.success('Solicitação enviada!');
      queryClient.invalidateQueries({ queryKey: ['profile-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['connection-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['conexao-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile-connections-list'] });
    } catch {
      toast.error('Erro ao conectar');
    }
    setConnectingId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-theme="dark-orange" style={{ backgroundColor: 'hsl(220 15% 6%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="min-h-screen" data-theme="dark-orange" style={{ backgroundColor: 'hsl(220 15% 6%)' }}>
        <div className="container py-20 text-center">
          <UserX className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este perfil não existe ou não está disponível publicamente.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const accentColor = perfil.cor_destaque || '#3b82f6';
  const modalidades = perfil.type === 'atleta' 
    ? (perfil.modalidades?.length ? perfil.modalidades : [perfil.modalidade || 'Futebol'])
    : [];
  const isRedeProfile = perfil.type === 'rede';

  const sidebarCategoria = criancaSidebar?.data_nascimento
    ? (() => { const age = new Date().getFullYear() - new Date(criancaSidebar.data_nascimento).getFullYear(); return `Sub ${age}`; })()
    : perfil.categoria;

  const isDarkTheme = true; // Dark premium theme for all Carreira profiles

  return (
    <div className="min-h-screen bg-background" data-theme="dark-orange">
      {/* Accent top bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-sm shadow-sm bg-[hsl(0_0%_0%/0.97)] border-b`} style={{ borderColor: `${accentColor}40` }}>
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
            {currentUserId && (
              <>
                {isOwner && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar Perfil
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={async () => {
                  if (mySlug) {
                    navigate(carreiraPath(`/${mySlug}`));
                  } else {
                    const { data: pa } = await supabase.from('perfil_atleta').select('slug').eq('user_id', currentUserId!).maybeSingle();
                    const { data: pr } = await supabase.from('perfis_rede').select('slug').eq('user_id', currentUserId!).maybeSingle();
                    const foundSlug = pa?.slug || pr?.slug;
                    if (foundSlug) navigate(carreiraPath(`/${foundSlug}`));
                    else navigate(carreiraPath(`/perfil/${currentUserId}`));
                  }
                }}>
                  Meu Perfil
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:flex h-8 text-xs" onClick={async () => {
                  await supabase.auth.signOut();
                  toast.success('Você saiu da sua conta');
                  if (isCarreiraDomain()) {
                    navigate(carreiraPath('/'), { replace: true });
                  } else {
                    navigate('/auth', { replace: true });
                  }
                }}>
                  <LogOut className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">Sair</span>
                </Button>
              </>
            )}
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

      {/* Search overlay + results — OUTSIDE header to fix z-index stacking */}
      {searchOpen && <div className="fixed inset-0 z-[55]" onClick={() => setSearchOpen(false)} />}
      {searchOpen && searchQuery.length >= 2 && searchResults && (
        <div className="sticky top-[7.5rem] lg:top-16 z-[60] container max-w-6xl px-4">
          <div className="lg:max-w-sm lg:mx-auto relative">
            <Card className="absolute top-0 left-0 right-0 max-h-80 overflow-y-auto p-2 shadow-lg">
              {searchResults.atletas.length === 0 && searchResults.rede.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>
              ) : (
                <>
                  {searchResults.atletas.map((a) => (
                    <div key={`a-${a.id}`} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 rounded-lg cursor-pointer"
                      onClick={() => { navigate(carreiraPath(`/${a.slug}`)); setSearchOpen(false); setSearchQuery(''); }}>
                      {a.foto_url ? <img src={a.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{a.nome?.[0]}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.modalidade}{a.categoria ? ` • ${a.categoria}` : ''} • Atleta</p>
                      </div>
                    </div>
                  ))}
                  {searchResults.rede.map((r) => (
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

      {/* Main Content — 3 columns on desktop */}
      <main className="container max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-6">
          
          {/* Left Sidebar — Athlete Card */}
          <aside className="hidden lg:block space-y-4">
            <Card className="text-center overflow-hidden" style={{ borderColor: `${accentColor}50`, borderWidth: 2, backgroundColor: 'hsl(220 12% 10%)' }}>
              {/* Banner */}
              {perfil.banner_url && (
                <div className="h-20 w-full overflow-hidden">
                  <img src={perfil.banner_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`p-4 ${perfil.banner_url ? '-mt-8' : ''}`}>
              {/* Avatar */}
              <Avatar 
                className="w-20 h-20 mx-auto mb-3 ring-2 ring-offset-2 ring-offset-background"
                style={{ '--tw-ring-color': accentColor } as any}
              >
                {perfil.foto_url ? (
                  <AvatarImage src={perfil.foto_url} alt={perfil.nome} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-xl"><User className="w-8 h-8" /></AvatarFallback>
              </Avatar>

              <h2 className="font-bold text-foreground text-sm">{perfil.nome}</h2>
              
              {/* Athlete subtitle: "Atleta Sub X" + managed by guardian */}
              {!isRedeProfile && sidebarCategoria && (
                <p className="text-xs font-medium mt-0.5" style={{ color: accentColor }}>
                  Atleta {sidebarCategoria}
                </p>
              )}
              {!isRedeProfile && perfil.crianca_id && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Perfil administrado pelo responsável
                </p>
              )}

              {/* Modalities (athlete only) */}
              {modalidades.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                {modalidades.map((mod, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] gap-0.5"
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}30` }}>
                    <Trophy className="w-2.5 h-2.5" />{mod}
                  </Badge>
                ))}
              </div>
              )}
              
              {/* Type label (rede only) */}
              {isRedeProfile && perfil.tipo && (
                <p className="text-xs text-muted-foreground mt-1">{TYPE_LABELS[perfil.tipo] || perfil.tipo}</p>
              )}

              {/* Location */}
              {(perfil.cidade || perfil.estado) && (
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mt-2">
                  <MapPin className="w-3 h-3" />
                  <span>{[perfil.cidade, perfil.estado].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Bio */}
              {perfil.bio && (
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line line-clamp-4">{perfil.bio}</p>
              )}

              {/* Followers & Connections */}
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{perfil.followers_count || 0}</span> seguidores
                </div>
                <ConexoesCount userId={perfil.user_id} />
              </div>

              {/* Actions */}
              <div className="mt-3 space-y-2">
                {isOwner && !isRedeProfile && (
                  <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="w-3 h-3" />
                    Editar Perfil
                  </Button>
                )}
                {!isOwner && currentUserId && (
                  <ConectarButton targetUserId={perfil.user_id} currentUserId={currentUserId} />
                )}
                <FollowButton perfil={perfil} currentUserId={currentUserId} isOwner={isOwner} />
                <ShareButton slug={perfil.slug} nome={perfil.nome} />
              </div>
              </div>
            </Card>

            {/* Escolinhas vinculadas */}
            {escolinhas && escolinhas.length > 0 && (
              <Card className="p-4" style={{ borderColor: `${accentColor}50`, borderWidth: 2 }}>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5" />
                  Escolinhas ({escolinhas.length})
                </h3>
                <div className="space-y-2">
                  {escolinhas.map((esc) => (
                    <div key={esc.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
                      onClick={() => esc.slug ? navigate(`/escola/${esc.slug}`) : undefined}>
                      {esc.logo_url ? (
                        <img src={esc.logo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {esc.nome?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{esc.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{esc.ativo ? 'Ativo' : 'Inativo'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </aside>

          {/* Center — Profile Header (mobile only) + Timeline */}
          <div className="space-y-4">
            {/* Migration banner for pai_responsavel profiles */}
            {isOwner && isRedeProfile && perfil.tipo === 'pai_responsavel' && (
              <MigrarPerfilBanner
                userId={perfil.user_id}
                perfilNome={perfil.nome}
                onMigrated={async () => {
                  // Delete the old perfis_rede profile after migration
                  await supabase
                    .from('perfis_rede')
                    .delete()
                    .eq('user_id', perfil.user_id);

                  const { data } = await supabase
                    .from('perfil_atleta')
                    .select('slug')
                    .eq('user_id', perfil.user_id)
                    .maybeSingle();
                  
                  if (data?.slug) {
                    navigate(carreiraPath(`/${data.slug}`), { replace: true });
                  } else {
                    window.location.reload();
                  }
                }}
              />
            )}
            {/* Mobile-only: full PerfilHeader */}
            {perfil.type === 'atleta' && (
              <div className="lg:hidden">
                <PerfilHeader perfil={perfil as any} isOwner={isOwner} />
              </div>
            )}
            {perfil.type === 'rede' && (
              <div className="lg:hidden">
                <PerfilLayout
                  perfil={{
                    id: perfil.id,
                    user_id: perfil.user_id,
                    nome: perfil.nome,
                    tipo: perfil.tipo || '',
                    foto_url: perfil.foto_url,
                    bio: perfil.bio,
                    instagram: perfil.instagram || null,
                    dados_perfil: perfil.dados_perfil || null,
                  }}
                  isOwnProfile={isOwner}
                  currentUserId={currentUserId}
                />
              </div>
            )}

            {/* Mobile-only: Pending connection requests */}
            {isOwner && pendingRequests && pendingRequests.length > 0 && (
              <div className="lg:hidden">
                <Card className="p-4" style={{ borderColor: `${accentColor}50`, borderWidth: 2 }}>
                   <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                     Solicitações de conexão ({pendingRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingRequests.map((person: any) => (
                      <div key={person.id} className="flex items-center gap-2">
                        {person.foto_url ? (
                          <img src={person.foto_url} alt="" className="w-9 h-9 rounded-full object-cover cursor-pointer"
                            onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer"
                            onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>
                            {person.nome?.[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{person.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-[10px] px-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0" onClick={() => person.connectionId && handleAcceptRequest(person.connectionId)}>
                            <Check className="w-3 h-3 mr-0.5" /> Aceitar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5" onClick={() => person.connectionId && handleRejectRequest(person.connectionId)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            
            {perfil.type === 'atleta' ? (
              <CarreiraTimeline perfil={perfil as any} isOwner={isOwner} />
            ) : (
              <RedeTimelineInline perfilId={perfil.id} isOwner={isOwner} perfilNome={perfil.nome} perfilFoto={perfil.foto_url} accentColor={accentColor} />
            )}
          </div>

          {/* Right Sidebar — Pending Requests + Suggestions + Connections */}
          <aside className="hidden lg:block space-y-4">
            {/* Pending connection requests (own profile only) */}
            {isOwner && pendingRequests && pendingRequests.length > 0 && (
              <Card className={`p-4 ${isDarkTheme ? 'border border-[hsl(25_60%_25%/0.3)] bg-card' : ''}`}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Solicitações ({pendingRequests.length})
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map((person: any) => (
                    <div key={person.id} className="flex items-center gap-2">
                      {person.foto_url ? (
                        <img src={person.foto_url} alt="" className="w-9 h-9 rounded-full object-cover cursor-pointer"
                           onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer"
                          onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>

                          {person.nome?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{person.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => person.connectionId && handleAcceptRequest(person.connectionId)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1" onClick={() => person.connectionId && handleRejectRequest(person.connectionId)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {currentUserId && suggestions && suggestions.length > 0 && (
              <Card className="p-4" style={{ borderColor: `${accentColor}50`, borderWidth: 2 }}>
                <h3 className="text-sm font-semibold text-foreground mb-3">Sugestões para conectar</h3>
                <div className="space-y-3">
                  {suggestions.map((person) => (
                    <div key={person.id} className="flex items-center gap-2">
                      {person.foto_url ? (
                        <img src={person.foto_url} alt="" className="w-9 h-9 rounded-full object-cover cursor-pointer"
                           onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground cursor-pointer"
                          onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>

                          {person.nome?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate cursor-pointer hover:underline"
                          onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>
                          {person.nome}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                      </div>
                      <ConectarButton targetUserId={person.user_id} currentUserId={currentUserId} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Connected people */}
            {connections && connections.length > 0 && (
              <Card className="p-4" style={{ borderColor: `${accentColor}50`, borderWidth: 2 }}>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                   <Users className="w-3.5 h-3.5" />
                   Conectados ({connections.length})
                </h3>
                <div className="space-y-2">
                  {connections.slice(0, 5).map((person) => (
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

      {/* Footer */}
      <footer className={`border-t mt-12 py-6 pb-20 lg:pb-6 ${isDarkTheme ? 'border-border' : ''}`} style={!isDarkTheme ? { borderColor: `${accentColor}20` } : undefined}>
        <div className="container text-center text-sm text-muted-foreground">
          <p>Carreira Esportiva — Sua trajetória no esporte</p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <CarreiraBottomNav currentUserId={currentUserId} profileSlug={mySlug} />

      {/* Edit dialog for rede profiles */}
      {isOwner && isRedeProfile && perfil && (
        <EditPerfilRedeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          perfil={perfil}
        />
      )}
      {/* Edit dialog for athlete profiles */}
      {isOwner && !isRedeProfile && perfil && (
        <EditPerfilDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          perfil={perfil as any}
        />
      )}
    </div>
  );
}

/* --- Sub-components --- */

function FollowButton({ perfil, currentUserId, isOwner }: { perfil: any; currentUserId: string | null; isOwner: boolean }) {
  const { data: isFollowing } = useIsFollowing(perfil.id);
  const toggleFollow = useToggleFollow();

  if (isOwner || !currentUserId) return null;

  const handleFollow = () => {
    toggleFollow.mutate({ perfilId: perfil.id, isFollowing: !!isFollowing });
  };

  return (
    <Button size="sm" className="w-full text-xs h-8" variant={isFollowing ? 'outline' : 'default'}
      onClick={handleFollow} disabled={toggleFollow.isPending}
      style={!isFollowing ? { backgroundColor: perfil.cor_destaque || undefined } : undefined}>
      {isFollowing ? <><UserCheck className="w-3.5 h-3.5 mr-1" />Seguindo</> : <><UserPlus className="w-3.5 h-3.5 mr-1" />Seguir</>}
    </Button>
  );
}

function ShareButton({ slug, nome }: { slug: string; nome: string }) {
  const handleShare = async () => {
    const url = `${window.location.origin}${carreiraPath(`/${slug}`)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${nome} - Carreira Esportiva`, text: `Confira a carreira de ${nome}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  return (
    <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleShare}>
      <Share2 className="w-3.5 h-3.5 mr-1" />Compartilhar
    </Button>
  );
}

function RedeTimelineInline({ perfilId, isOwner, perfilNome, perfilFoto, accentColor }: { perfilId: string; isOwner: boolean; perfilNome: string; perfilFoto: string | null; accentColor?: string }) {
  const { data: posts, isLoading } = usePostsRede(perfilId);

  return (
    <div className="space-y-4">
      {isOwner && (
        <CreatePostForm perfilRedeId={perfilId} perfilRedeNome={perfilNome} perfilRedeFoto={perfilFoto} accentColor={accentColor} />
      )}
      {isLoading && <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} accentColor={accentColor} />
      ))}
      {!isLoading && (!posts || posts.length === 0) && !isOwner && (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhuma publicação ainda.</p>
      )}
    </div>
  );
}
