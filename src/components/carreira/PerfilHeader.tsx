import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, MapPin, Share2, Trophy, User, Pencil, Instagram, UserPlus, UserCheck, ShieldCheck } from 'lucide-react';
import { PerfilAtleta, useUpdatePerfilAtleta, uploadProfilePhoto, useIsFollowing, useToggleFollow } from '@/hooks/useCarreiraData';
import { ConectarButton } from './ConectarButton';
import { ConexoesCount } from './ConexoesCount';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function calcularCategoria(dataNascimento: string): string {
  const birthYear = new Date(dataNascimento).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return `Sub ${age}`;
}
import { toast } from 'sonner';
import { EditPerfilDialog } from './EditPerfilDialog';

interface PerfilHeaderProps {
  perfil: PerfilAtleta;
  isOwner?: boolean;
}

export function PerfilHeader({ perfil, isOwner = false }: PerfilHeaderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updatePerfil = useUpdatePerfilAtleta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: isFollowing } = useIsFollowing(perfil.id);
  const toggleFollow = useToggleFollow();

  // Fetch child's birth date to calculate category dynamically
  const { data: criancaData } = useQuery({
    queryKey: ['crianca-nascimento', perfil.crianca_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('criancas')
        .select('data_nascimento')
        .eq('id', perfil.crianca_id!)
        .single();
      return data;
    },
    enabled: !!perfil.crianca_id,
  });

  const categoriaDisplay = criancaData?.data_nascimento
    ? calcularCategoria(criancaData.data_nascimento)
    : perfil.categoria;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.heic')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(file, user.id);
      // Optimistic update: reflect photo immediately in cache
      queryClient.setQueryData(['perfil-atleta', perfil.slug], (old: any) =>
        old ? { ...old, foto_url: url } : old
      );
      queryClient.setQueryData(['meu-perfil-atleta', user.id], (old: any) =>
        old ? { ...old, foto_url: url } : old
      );
      // Also update the page-level cache key used by CarreiraPerfilPage
      queryClient.setQueryData(['carreira-profile-by-slug', perfil.slug], (old: any) =>
        old ? { ...old, foto_url: url } : old
      );
      await updatePerfil.mutateAsync({ id: perfil.id, foto_url: url });
    } catch (error: any) {
      toast.error('Erro ao atualizar foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/carreira/${perfil.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${perfil.nome} - Carreira Esportiva`, text: `Confira a carreira de ${perfil.nome}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleFollow = () => {
    if (!user) { toast.error('Faça login para seguir'); return; }
    toggleFollow.mutate({ perfilId: perfil.id, isFollowing: !!isFollowing });
  };

  const modalidades = perfil.modalidades?.length > 0 ? perfil.modalidades : [perfil.modalidade];

  return (
    <>
      <Card className="overflow-hidden" style={{ borderColor: `${perfil.cor_destaque || '#3b82f6'}50`, borderWidth: 2 }}>
        {/* Banner */}
        {perfil.banner_url && (
          <div className="h-28 sm:h-36 w-full overflow-hidden">
            <img src={perfil.banner_url} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className={`p-4 sm:p-5 ${perfil.banner_url ? '-mt-10' : ''}`}>
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar 
                className="w-24 h-24 sm:w-28 sm:h-28 border-3 shadow-lg ring-2"
                style={{ borderColor: `${perfil.cor_destaque || '#3b82f6'}33`, boxShadow: `0 0 0 2px ${perfil.cor_destaque || '#3b82f6'}22` }}>
                {perfil.foto_url ? <AvatarImage src={perfil.foto_url} alt={perfil.nome} className="object-cover" /> : null}
                <AvatarFallback className="text-2xl"><User className="w-10 h-10" /></AvatarFallback>
              </Avatar>
              {isOwner && (
                <>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="absolute bottom-0 right-0 text-white rounded-full p-1.5 shadow-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: perfil.cor_destaque || '#3b82f6' }}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" onChange={handlePhotoUpload} className="hidden" />
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">{perfil.nome}</h1>
              
              {/* Subtitle: "Atleta Sub X" + "Perfil administrado pelo responsável" */}
              {categoriaDisplay && (
                <p className="text-xs font-medium mt-0.5" style={{ color: perfil.cor_destaque || '#3b82f6' }}>
                  Atleta {categoriaDisplay}
                </p>
              )}
              {perfil.crianca_id && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Perfil administrado pelo responsável</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {modalidades.map((mod, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 text-xs"
                    style={{ backgroundColor: `${perfil.cor_destaque || '#3b82f6'}18`, color: perfil.cor_destaque || '#3b82f6', borderColor: `${perfil.cor_destaque || '#3b82f6'}30` }}>
                    <Trophy className="w-3 h-3" />{mod}
                  </Badge>
                ))}
              </div>

              {(perfil.cidade || perfil.estado) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{[perfil.cidade, perfil.estado].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Followers / Connections */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                <span><strong className="text-foreground">{perfil.followers_count || 0}</strong> seguidores</span>
                <ConexoesCount userId={perfil.user_id} />
              </div>

              {perfil.bio && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{perfil.bio}</p>}

              {(perfil as any).instagram_url && (
                <a href={(perfil as any).instagram_url.startsWith('http') ? (perfil as any).instagram_url : `https://instagram.com/${(perfil as any).instagram_url.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline">
                  <Instagram className="w-3.5 h-3.5" />
                  {(perfil as any).instagram_url.includes('instagram.com') 
                    ? '@' + (perfil as any).instagram_url.split('/').filter(Boolean).pop()
                    : (perfil as any).instagram_url.startsWith('@') ? (perfil as any).instagram_url : '@' + (perfil as any).instagram_url}
                </a>
              )}

              {/* Actions */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {isOwner && (
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="w-3 h-3 mr-1" />Editar
                  </Button>
                )}
                {!isOwner && user && (
                  <>
                    <ConectarButton targetUserId={perfil.user_id} currentUserId={user.id} />
                    <Button size="sm" className="h-7 text-xs px-2.5" variant={isFollowing ? 'outline' : 'default'}
                      onClick={handleFollow} disabled={toggleFollow.isPending}
                      style={!isFollowing ? { backgroundColor: perfil.cor_destaque || undefined } : undefined}>
                      {isFollowing ? <><UserCheck className="w-3 h-3 mr-1" />Seguindo</> : <><UserPlus className="w-3 h-3 mr-1" />Seguir</>}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={handleShare}>
                  <Share2 className="w-3 h-3 mr-1" />Compartilhar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwner && <EditPerfilDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} perfil={perfil} />}
    </>
  );
}
