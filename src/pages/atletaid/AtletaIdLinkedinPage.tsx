import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyPerfilAtleta } from '@/hooks/useAtletaIdData';
import { AtletaIdLayout } from '@/components/layout/AtletaIdLayout';
import { CreatePerfilForm } from '@/components/atleta-id/CreatePerfilForm';
import { PerfilHeader } from '@/components/atleta-id/PerfilHeader';
import { AtletaTimeline } from '@/components/atleta-id/AtletaTimeline';
import { Loader2 } from 'lucide-react';

export default function AtletaIdLinkedinPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: perfil, isLoading: perfilLoading } = useMyPerfilAtleta();

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = authLoading || perfilLoading;

  return (
    <AtletaIdLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil de Atleta</h1>
          <p className="text-muted-foreground">
            Sua vitrine esportiva pública
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : perfil ? (
          <div className="space-y-6">
            <PerfilHeader perfil={perfil} isOwner={true} />
            <AtletaTimeline perfil={perfil} isOwner={true} />
          </div>
        ) : (
          <CreatePerfilForm />
        )}
      </div>
    </AtletaIdLayout>
  );
}
