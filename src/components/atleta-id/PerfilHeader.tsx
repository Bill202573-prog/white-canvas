import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, MapPin, Share2, Trophy, User, ExternalLink } from 'lucide-react';
import { PerfilAtleta, useUpdatePerfilAtleta, uploadProfilePhoto } from '@/hooks/useAtletaIdData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PerfilHeaderProps {
  perfil: PerfilAtleta;
  isOwner?: boolean;
}

export function PerfilHeader({ perfil, isOwner = false }: PerfilHeaderProps) {
  const { user } = useAuth();
  const updatePerfil = useUpdatePerfilAtleta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadProfilePhoto(file, user.id);
      await updatePerfil.mutateAsync({ id: perfil.id, foto_url: url });
    } catch (error: any) {
      toast.error('Erro ao atualizar foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/atleta/${perfil.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${perfil.nome} - Atleta ID`,
          text: `Confira o perfil de ${perfil.nome} no Atleta ID`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Cover/Banner */}
      <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
      
      <CardContent className="pt-0 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-lg">
              {perfil.foto_url ? (
                <AvatarImage src={perfil.foto_url} alt={perfil.nome} />
              ) : null}
              <AvatarFallback className="text-2xl">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left pb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{perfil.nome}</h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <Badge variant="secondary" className="gap-1">
                <Trophy className="w-3 h-3" />
                {perfil.modalidade}
              </Badge>
              {perfil.categoria && (
                <Badge variant="outline">{perfil.categoria}</Badge>
              )}
            </div>

            {(perfil.cidade || perfil.estado) && (
              <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4" />
                <span>
                  {[perfil.cidade, perfil.estado].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            {isOwner && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`/atleta/${perfil.slug}`} target="_blank" rel="noopener">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Público
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Bio */}
        {perfil.bio && (
          <p className="mt-4 text-sm text-muted-foreground">{perfil.bio}</p>
        )}
      </CardContent>
    </Card>
  );
}
