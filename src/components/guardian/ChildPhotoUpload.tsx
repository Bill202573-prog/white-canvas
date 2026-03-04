import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import heic2any from 'heic2any';

interface ChildPhotoUploadProps {
  childId: string;
  childName: string;
  currentPhotoUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Helper to convert HEIC to JPEG
const convertHeicToJpeg = async (file: File): Promise<File> => {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  
  if (!isHeic) return file;
  
  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });
    
    const convertedBlob = Array.isArray(blob) ? blob[0] : blob;
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpeg');
    
    return new File([convertedBlob], newFileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting HEIC:', error);
    throw new Error('Não foi possível converter a imagem HEIC');
  }
};

const ChildPhotoUpload = ({ childId, childName, currentPhotoUrl, size = 'md' }: ChildPhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24 ring-4 ring-primary-foreground/30 shadow-lg',
    xl: 'w-32 h-32 ring-4 ring-primary-foreground/30 shadow-lg',
  };

  const fallbackSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl font-bold bg-primary-foreground/20 text-primary-foreground',
    xl: 'text-4xl font-bold bg-primary-foreground/20 text-primary-foreground',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/') || 
                    file.name.toLowerCase().endsWith('.heic') || 
                    file.name.toLowerCase().endsWith('.heif');
    if (!isImage) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Convert HEIC to JPEG if needed
      file = await convertHeicToJpeg(file);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${childId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is now private for security)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('child-photos')
        .createSignedUrl(fileName, 31536000); // 1 year expiration

      if (signedUrlError) throw signedUrlError;
      
      const photoUrl = signedUrlData.signedUrl;

      // Update criancas table via secure function (bypasses RLS)
      const { error: updateError } = await supabase.rpc('update_child_photo', {
        p_crianca_id: childId,
        p_foto_url: photoUrl
      });

      if (updateError) throw updateError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['guardian-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children'] });

      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto: ' + (error.message || 'Tente novamente'));
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const buttonSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-10 h-10',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  return (
    <div className="relative group">
      <Avatar className={sizeClasses[size]}>
        {currentPhotoUrl && <AvatarImage src={currentPhotoUrl} alt={childName} className="object-cover" />}
        <AvatarFallback className={fallbackSizeClasses[size]}>{childName.charAt(0)}</AvatarFallback>
      </Avatar>
      
      {/* Upload button - always visible on mobile, hover on desktop */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`absolute bottom-0 right-0 ${buttonSizeClasses[size]} flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:bg-primary/90 transition-colors`}
      >
        {isUploading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
        ) : (
          <Camera className={iconSizeClasses[size]} />
        )}
      </button>

      {/* Hidden file input - allow both camera and gallery on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </div>
  );
};

export default ChildPhotoUpload;
