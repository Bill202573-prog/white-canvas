import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compressor';

interface AtividadeExternaPhotoUploadProps {
  criancaId: string;
  atividadeId?: string;
  existingPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onPersistPhotos?: (photos: string[]) => Promise<void>;
  disabled?: boolean;
}

const MAX_PHOTOS = 3;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const AtividadeExternaPhotoUpload = ({
  criancaId,
  atividadeId,
  existingPhotos,
  onPhotosChange,
  onUploadingChange,
  onPersistPhotos,
  disabled = false,
}: AtividadeExternaPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(existingPhotos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with parent when existingPhotos changes (e.g. on edit mode)
  useEffect(() => {
    setPhotoUrls(existingPhotos || []);
  }, [existingPhotos]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const persistIfNeeded = async (photos: string[]) => {
    if (!atividadeId) return; // criação: persiste no submit do formulário
    if (!onPersistPhotos) return;
    try {
      await onPersistPhotos(photos);
    } catch (e) {
      console.error('[AtividadeExternaPhotoUpload] Persist photos error:', e);
      toast.error('As fotos foram enviadas, mas não foi possível vinculá-las à atividade. Tente salvar novamente.');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photoUrls.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos permitido`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    // Validate files
    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Formato não permitido: ${file.name}. Use JPG ou PNG.`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`Arquivo muito grande: ${file.name}. Máximo ${MAX_SIZE_MB}MB.`);
        return;
      }
    }

    setUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData.session?.user?.id;
      if (!authUserId) {
        throw new Error('Usuário não autenticado para enviar fotos');
      }

      const uploadedUrls: string[] = [];

      for (let file of filesToUpload) {
        // Compress image before upload
        file = await compressImage(file, { maxWidth: 1920, quality: 0.85 });
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 11);
        const fileName = `${timestamp}-${randomStr}.${fileExt}`;
        
        // Storage policy requires the first folder to be auth.uid()
        const filePath = `${authUserId}/${criancaId}/${fileName}`;

        console.log('[AtividadeExternaPhotoUpload] Uploading to path:', filePath);
        console.log('[AtividadeExternaPhotoUpload] File size:', file.size, 'bytes');
        console.log('[AtividadeExternaPhotoUpload] File type:', file.type);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('atividade-externa-fotos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('[AtividadeExternaPhotoUpload] Upload error:', uploadError);
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        console.log('[AtividadeExternaPhotoUpload] Upload successful:', uploadData);

        // Get a signed URL with long expiration (1 year)
        const { data: signedData, error: signedError } = await supabase.storage
          .from('atividade-externa-fotos')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

        if (signedError) {
          console.error('[AtividadeExternaPhotoUpload] Signed URL error:', signedError);
          throw new Error('Erro ao gerar URL da imagem');
        }

        if (signedData?.signedUrl) {
          console.log('[AtividadeExternaPhotoUpload] Signed URL generated successfully');
          uploadedUrls.push(signedData.signedUrl);
        }
      }

      const newPhotos = [...photoUrls, ...uploadedUrls];
      setPhotoUrls(newPhotos);
      onPhotosChange(newPhotos);

      // Em modo edição, já persiste no backend para não depender do “Salvar Alterações”
      await persistIfNeeded(newPhotos);

      toast.success(`${uploadedUrls.length} foto(s) enviada(s) com sucesso`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photoUrls.filter((_, i) => i !== index);
    setPhotoUrls(newPhotos);
    onPhotosChange(newPhotos);
    void persistIfNeeded(newPhotos);
    toast.success('Foto removida');
  };

  const canAddMore = photoUrls.length < MAX_PHOTOS && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Fotos ({photoUrls.length}/{MAX_PHOTOS})
        </span>
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 mr-2" />
            )}
            Adicionar
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {photoUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photoUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={url}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image load error for:', url);
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">Adicionar</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full py-8 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-sm">Clique para adicionar fotos</span>
              <span className="text-xs">JPG ou PNG, máx. {MAX_SIZE_MB}MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AtividadeExternaPhotoUpload;
