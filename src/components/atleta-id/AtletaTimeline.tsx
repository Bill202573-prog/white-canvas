import { PerfilAtleta, usePostsAtleta } from '@/hooks/useAtletaIdData';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { Loader2, FileText } from 'lucide-react';

interface AtletaTimelineProps {
  perfil: PerfilAtleta;
  isOwner?: boolean;
}

export function AtletaTimeline({ perfil, isOwner = false }: AtletaTimelineProps) {
  const { data: posts, isLoading } = usePostsAtleta(perfil.id);

  return (
    <div className="space-y-4">
      {/* Create Post Form - only for owner */}
      {isOwner && <CreatePostForm perfil={perfil} />}

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showAuthor={true} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {isOwner 
              ? 'Nenhuma publicação ainda. Compartilhe sua jornada!'
              : 'Este atleta ainda não publicou nada.'}
          </p>
        </div>
      )}
    </div>
  );
}
