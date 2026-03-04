import { useParams, Link } from 'react-router-dom';
import { usePerfilAtletaBySlug } from '@/hooks/useAtletaIdData';
import { PerfilHeader } from '@/components/atleta-id/PerfilHeader';
import { AtletaTimeline } from '@/components/atleta-id/AtletaTimeline';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserX } from 'lucide-react';
import logoAtletaId from '@/assets/logo-atleta-id.png';

export default function AtletaIdPerfilPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: perfil, isLoading, error } = usePerfilAtletaBySlug(slug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="container py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoAtletaId} alt="Atleta ID" className="h-8" />
              <span className="hidden sm:inline text-xs text-muted-foreground border-l pl-3">
                O LinkedIn do Esporte
              </span>
            </Link>
          </div>
        </header>
        
        <div className="container py-20 text-center">
          <UserX className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este perfil não existe ou não está disponível publicamente.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAtletaId} alt="Atleta ID" className="h-8" />
            <span className="hidden sm:inline text-xs text-muted-foreground border-l pl-3">
              O LinkedIn do Esporte
            </span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 max-w-2xl px-4">
        <PerfilHeader perfil={perfil} isOwner={false} />
        
        <div className="mt-6">
          <AtletaTimeline perfil={perfil} isOwner={false} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-12 py-6 bg-white/50 dark:bg-slate-900/50">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Atleta ID — O LinkedIn do Esporte</p>
        </div>
      </footer>
    </div>
  );
}
