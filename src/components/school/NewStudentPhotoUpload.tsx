import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewStudentPhotoUploadProps {
  studentName: string;
  currentPhotoUrl: string | null;
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Photo upload component for NEW students (before they have an ID).
 * Uploads to a temporary folder and returns the URL.
 * After student is created, the photo URL should be saved to the student record.
 */
const NewStudentPhotoUpload = ({ 
  studentName, 
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoRemoved,
  size = 'lg'
}: NewStudentPhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
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
      // Create unique filename - use temp folder for new students
      const fileExt = file.name.split('.').pop();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fileName = `${tempId}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private for security)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('child-photos')
        .createSignedUrl(filePath, 31536000); // 1 year expiration

      if (signedUrlError) throw signedUrlError;
      
      const photoUrl = signedUrlData.signedUrl;

      toast.success('Foto carregada com sucesso!');
      onPhotoUploaded(photoUrl);
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

  const handleRemove = () => {
    onPhotoRemoved();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "border-4 border-background shadow-lg")}>
          <AvatarImage src={currentPhotoUrl || undefined} alt={studentName || 'Novo aluno'} />
          <AvatarFallback className={cn(fallbackSizeClasses[size], "font-bold bg-primary text-primary-foreground")}>
            {(studentName || 'N').charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload/Camera button */}
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

        {/* Remove button - show when there's a photo */}
        {currentPhotoUrl && !isUploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className={cn(
              buttonSizeClasses[size],
              "absolute -top-1 -right-1 rounded-full shadow-md",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            onClick={handleRemove}
          >
            <X className={iconSizeClasses[size]} />
          </Button>
        )}
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center">
        {currentPhotoUrl ? 'Clique para trocar' : 'Adicionar foto'}
      </p>
      
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

export default NewStudentPhotoUpload;
