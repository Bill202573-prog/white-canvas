import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import heic2any from 'heic2any';

interface SchoolChildPhotoUploadProps {
  childId: string;
  childName: string;
  currentPhotoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPhotoUpdated?: (url: string) => void;
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

const SchoolChildPhotoUpload = ({ 
  childId, 
  childName, 
  currentPhotoUrl,
  size = 'lg',
  onPhotoUpdated
}: SchoolChildPhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  const fallbackSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const buttonSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (including HEIC)
    const isImage = file.type.startsWith('image/') || 
                    file.name.toLowerCase().endsWith('.heic') || 
                    file.name.toLowerCase().endsWith('.heif');
    if (!isImage) {
      toast.error('Por favor, selecione uma imagem válida');
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
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${childId}-${Date.now()}.${fileExt}`;
      const filePath = `${childId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is now private for security)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('child-photos')
        .createSignedUrl(filePath, 31536000); // 1 year expiration

      if (signedUrlError) throw signedUrlError;
      
      const photoUrl = signedUrlData.signedUrl;

      // Update child record via secure function (bypasses RLS)
      const { error: updateError } = await supabase.rpc('update_child_photo', {
        p_crianca_id: childId,
        p_foto_url: photoUrl
      });

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      
      onPhotoUpdated?.(photoUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <Avatar className={cn(sizeClasses[size], "border-4 border-background shadow-lg")}>
        <AvatarImage src={currentPhotoUrl || undefined} alt={childName} />
        <AvatarFallback className={cn(fallbackSizeClasses[size], "font-bold bg-primary text-primary-foreground")}>
          {childName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      {/* Upload overlay button */}
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          buttonSizeClasses[size],
          "absolute bottom-0 right-0 rounded-full shadow-md",
          "opacity-80 group-hover:opacity-100 transition-opacity"
        )}
        onClick={handleClick}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
        ) : (
          <Camera className={iconSizeClasses[size]} />
        )}
      </Button>
      
      {/* Hidden file input - accepts camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default SchoolChildPhotoUpload;
