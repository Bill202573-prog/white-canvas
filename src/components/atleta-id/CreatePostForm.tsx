import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Image, Loader2, Send, User, X } from 'lucide-react';
import { PerfilAtleta, useCreatePostAtleta, uploadPostImage } from '@/hooks/useAtletaIdData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-compressor';

interface CreatePostFormProps {
  perfil: PerfilAtleta;
}

export function CreatePostForm({ perfil }: CreatePostFormProps) {
  const { user } = useAuth();
  const createPost = useCreatePostAtleta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [texto, setTexto] = useState('');
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 3) {
      toast.error('Máximo de 3 imagens por post');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Cada imagem deve ter no máximo 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          { file, preview: e.target?.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!texto.trim() && images.length === 0) {
      toast.error('Escreva algo ou adicione uma imagem');
      return;
    }

    if (!user?.id) {
      toast.error('Você precisa estar logado');
      return;
    }

    setUploading(true);
    try {
      // Compress and upload images
      const imageUrls: string[] = [];
      for (const img of images) {
        const compressed = await compressImage(img.file);
        const url = await uploadPostImage(compressed, user.id);
        imageUrls.push(url);
      }

      // Create post
      await createPost.mutateAsync({
        autor_id: perfil.id,
        texto: texto.trim(),
        imagens_urls: imageUrls,
      });

      // Reset form
      setTexto('');
      setImages([]);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = uploading || createPost.isPending;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            {perfil.foto_url ? (
              <AvatarImage src={perfil.foto_url} alt={perfil.nome} />
            ) : null}
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="O que está acontecendo na sua jornada esportiva?"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              className="resize-none border-0 p-0 focus-visible:ring-0 text-base"
            />

            {/* Image Previews */}
            {images.length > 0 && (
              <div className={cn(
                'grid gap-2',
                images.length === 1 && 'grid-cols-1',
                images.length === 2 && 'grid-cols-2',
                images.length >= 3 && 'grid-cols-3'
              )}>
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 3 || isSubmitting}
                  className="gap-2"
                >
                  <Image className="w-4 h-4" />
                  <span className="hidden sm:inline">Foto</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {images.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {images.length}/3 imagens
                  </span>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (!texto.trim() && images.length === 0)}
                size="sm"
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publicar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
