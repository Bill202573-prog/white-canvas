import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Home, ArrowLeft } from 'lucide-react';
import logoAtletaId from '@/assets/logo-atleta-id.png';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';

interface CarreiraLayoutProps {
  children: React.ReactNode;
}

export function CarreiraLayout({ children }: CarreiraLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="container flex items-center justify-between h-14 px-4">
          {/* Logo e identidade */}
          <div className="flex items-center gap-3">
            <Link to={carreiraPath('/minha')} className="flex items-center gap-2">
              <img src={logoAtletaId} alt="Carreira" className="h-8" />
            </Link>
            <span className="hidden sm:inline text-xs text-muted-foreground border-l pl-3">
              Carreira Esportiva
            </span>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {/* Voltar para o app da escolinha */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Voltar ao App</span>
            </Button>

            {/* Menu do usuário */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(carreiraPath('/minha'))}>
                    <User className="w-4 h-4 mr-2" />
                    Minha Carreira
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBackToDashboard}>
                    <Home className="w-4 h-4 mr-2" />
                    App da Escolinha
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl py-6 px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-12 py-6 bg-white/50 dark:bg-slate-900/50">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Carreira Esportiva — Sua trajetória no esporte</p>
        </div>
      </footer>
    </div>
  );
}