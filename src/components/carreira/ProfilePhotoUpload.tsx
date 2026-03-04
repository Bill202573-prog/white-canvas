import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, User, ImageIcon, Palette } from 'lucide-react';
import { uploadProfilePhoto } from '@/hooks/useCarreiraData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRESET_BANNERS = [
  { url: '/banners/banner-campo-verde.jpg', label: 'Campo Verde' },
  { url: '/banners/banner-azul-dourado.jpg', label: 'Azul & Dourado' },
  { url: '/banners/banner-vermelho-preto.jpg', label: 'Vermelho & Preto' },
  { url: '/banners/banner-branco-preto.jpg', label: 'Branco & Preto' },
  { url: '/banners/banner-amarelo-verde.jpg', label: 'Amarelo & Verde' },
  { url: '/banners/banner-roxo-branco.jpg', label: 'Roxo' },
  { url: '/banners/banner-tricolor.jpg', label: 'Tricolor' },
  { url: '/banners/banner-azul-celeste.jpg', label: 'Azul Celeste' },
  { url: '/banners/banner-laranja-preto.jpg', label: 'Laranja & Preto' },
  { url: '/banners/banner-futsal-quadra.jpg', label: 'Quadra Futsal' },
];

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  currentBannerUrl?: string | null;
  onPhotoChange: (url: string) => void;
  onBannerChange: (url: string) => void;
  showBanner?: boolean;
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  currentBannerUrl,
  onPhotoChange,
  onBannerChange,
  showBanner = true,
}: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Fallback to direct Supabase auth for Carreira-only users
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setSessionUserId(session.user.id);
    });
  }, []);

  const effectiveUserId = user?.id || sessionUserId;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUserId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(file, effectiveUserId);
      onPhotoChange(url);
      toast.success('Foto atualizada!');
    } catch (error: any) {
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUserId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${effectiveUserId}/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('atleta-fotos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('atleta-fotos')
        .getPublicUrl(fileName);

      onBannerChange(`${publicUrl}?t=${Date.now()}`);
      toast.success('Banner atualizado!');
    } catch (error: any) {
      toast.error('Erro ao enviar banner: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePresetBanner = async (bannerUrl: string) => {
    if (!effectiveUserId) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setUploadingBanner(true);
    try {
      // Fetch the preset image and upload to storage for persistence
      const response = await fetch(bannerUrl);
      const blob = await response.blob();
      const file = new File([blob], `preset-banner.jpg`, { type: 'image/jpeg' });
      
      const fileName = `${effectiveUserId}/banner-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('atleta-fotos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('atleta-fotos')
        .getPublicUrl(fileName);

      onBannerChange(`${publicUrl}?t=${Date.now()}`);
      setShowPresets(false);
      toast.success('Banner aplicado!');
    } catch (error: any) {
      toast.error('Erro ao aplicar banner: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Upload */}
      {showBanner && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Banner do Perfil</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => setShowPresets(!showPresets)}
            >
              <Palette className="w-3.5 h-3.5" />
              {showPresets ? 'Fechar' : 'Temas'}
            </Button>
          </div>

          {/* Preset banners gallery */}
          {showPresets && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-muted/50 rounded-lg">
              {PRESET_BANNERS.map((banner) => (
                <button
                  key={banner.url}
                  type="button"
                  onClick={() => handlePresetBanner(banner.url)}
                  className="relative h-12 rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all group"
                >
                  <img
                    src={banner.url}
                    alt={banner.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-medium">{banner.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div 
            className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => bannerInputRef.current?.click()}
          >
            {currentBannerUrl ? (
              <img 
                src={currentBannerUrl} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="w-8 h-8 mr-2" />
                <span className="text-sm">Clique para adicionar banner</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              {uploadingBanner ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Foto de Perfil</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2 border-border">
              {currentPhotoUrl ? (
                <AvatarImage src={currentPhotoUrl} alt="Foto" />
              ) : null}
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Clique no ícone da câmera para alterar</p>
            <p>Formatos: JPG, PNG, WebP</p>
          </div>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
