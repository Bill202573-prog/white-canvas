import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PostEscola, useDeletePostEscola } from '@/hooks/useEscolaPostsData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EscolaPostCardProps {
  post: PostEscola;
  escolaNome: string;
  escolaLogo?: string | null;
  escolaSlug?: string | null;
  isOwner?: boolean;
}

export function EscolaPostCard({ post, escolaNome, escolaLogo, escolaSlug, isOwner = false }: EscolaPostCardProps) {
  const deletePost = useDeletePostEscola();

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const initials = escolaNome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const handleShare = async () => {
    const url = escolaSlug ? `${window.location.origin}/escola/${escolaSlug}` : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post de ${escolaNome}`,
          text: post.texto.substring(0, 100),
          url,
        });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este post?')) return;
    try {
      await deletePost.mutateAsync({ postId: post.id, escolinhaId: post.escolinha_id });
    } catch {
      // handled in hook
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              {escolaLogo && <AvatarImage src={escolaLogo} alt={escolaNome} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{escolaNome}</p>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {post.texto && <p className="text-sm whitespace-pre-wrap">{post.texto}</p>}

        {post.imagens_urls && post.imagens_urls.length > 0 && (
          <div className={cn(
            'grid gap-2 mt-3',
            post.imagens_urls.length === 1 && 'grid-cols-1',
            post.imagens_urls.length === 2 && 'grid-cols-2',
            post.imagens_urls.length >= 3 && 'grid-cols-3'
          )}>
            {post.imagens_urls.map((url, index) => (
              <div
                key={index}
                className={cn(
                  'relative rounded-lg overflow-hidden bg-muted',
                  'aspect-[4/5]'
                )}
              >
                <img src={url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      </CardFooter>
    </Card>
  );
}
