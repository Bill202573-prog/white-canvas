import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, MoreHorizontal, Trash2, User, MapPin, Trophy } from 'lucide-react';
import { PostAtleta, useDeletePostAtleta, usePostLike } from '@/hooks/useAtletaIdData';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface PostCardProps {
  post: PostAtleta;
  showAuthor?: boolean;
}

export function PostCard({ post, showAuthor = true }: PostCardProps) {
  const { user } = useAuth();
  const deletePost = useDeletePostAtleta();
  const { isLiked, toggleLike } = usePostLike(post.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const perfil = post.perfil;
  const isOwner = perfil?.user_id === user?.id;

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este post?')) {
      await deletePost.mutateAsync({ postId: post.id, autorId: post.autor_id });
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <>
      <Card className="overflow-hidden">
        {showAuthor && perfil && (
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <Avatar className="w-12 h-12 border-2 border-primary/10">
                  {perfil.foto_url ? (
                    <AvatarImage src={perfil.foto_url} alt={perfil.nome} />
                  ) : null}
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {perfil.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span>{perfil.modalidade}</span>
                      {perfil.categoria && (
                        <span className="text-muted-foreground/70">• {perfil.categoria}</span>
                      )}
                    </div>
                  </div>
                  {(perfil.cidade || perfil.estado) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {[perfil.cidade, perfil.estado].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className={cn(!showAuthor && 'pt-4')}>
          {/* Post text */}
          <p className="text-sm whitespace-pre-wrap">{post.texto}</p>

          {/* Images */}
          {post.imagens_urls && post.imagens_urls.length > 0 && (
            <div className={cn(
              'mt-3 grid gap-2',
              post.imagens_urls.length === 1 && 'grid-cols-1',
              post.imagens_urls.length === 2 && 'grid-cols-2',
              post.imagens_urls.length >= 3 && 'grid-cols-3'
            )}>
              {post.imagens_urls.slice(0, 3).map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(url)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleLike.mutate()}
            disabled={toggleLike.isPending}
            className={cn(
              'gap-2',
              isLiked && 'text-red-500 hover:text-red-600'
            )}
          >
            <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
            <span>{post.likes_count}</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Imagem ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
