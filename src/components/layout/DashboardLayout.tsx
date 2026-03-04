import { ReactNode, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  LogOut, 
  Users, 
  School, 
  GraduationCap, 
  CalendarCheck,
  Home,
  UserCog,
  DollarSign,
  Key,
  Stethoscope,
  Globe,
  Upload,
  Loader2,
  MessageSquare,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoAtletaId from '@/assets/logo-atleta-id.png';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch escolinha data for school role users
  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-header', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome, logo_url')
        .eq('admin_user_id', user?.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: user?.role === 'school' && !!user?.id,
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !escolinha) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${escolinha.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('escolinha-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escolinha-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('escolinhas')
        .update({ logo_url: publicUrl })
        .eq('id', escolinha.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['escolinha-header'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-profile'] });
      toast.success('Logo atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo: ' + (error.message || 'Tente novamente'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { href: '/dashboard', label: 'Início', icon: Home },
          { href: '/dashboard/schools', label: 'Escolinhas', icon: School },
          { href: '/dashboard/comunicados', label: 'Comunicados', icon: MessageSquare },
          { href: '/dashboard/atividades-externas', label: 'Ativ. Externas', icon: Activity },
          { href: '/dashboard/rede-social', label: 'Rede Social', icon: Globe },
          { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
          { href: '/dashboard/users', label: 'Usuários', icon: UserCog },
          { href: '/dashboard/diagnostico', label: 'Diagnóstico', icon: Stethoscope },
        ];
      case 'school':
        return [
          { href: '/dashboard', label: 'Início', icon: Home },
          { href: '/dashboard/children', label: 'Alunos', icon: Users },
          { href: '/dashboard/teachers', label: 'Professores', icon: GraduationCap },
          { href: '/dashboard/classes', label: 'Turmas', icon: CalendarCheck },
          { href: '/dashboard/aulas', label: 'Aulas', icon: CalendarCheck },
          { href: '/dashboard/eventos', label: 'Eventos', icon: Trophy },
          { href: '/dashboard/campeonatos', label: 'Campeonatos', icon: Trophy },
          { href: '/dashboard/trofeus', label: 'Troféus', icon: Trophy },
          { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
        ];
      case 'teacher':
        return [
          { href: '/dashboard', label: 'Início', icon: Home },
          { href: '/dashboard/attendance', label: 'Presença', icon: CalendarCheck },
        ];
      case 'guardian':
        return [
          { href: '/dashboard', label: 'Início', icon: Home },
          { href: '/dashboard/children', label: 'Meus Filhos', icon: Users },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Administrador';
      case 'school': return 'Escolinha';
      case 'teacher': return 'Professor';
      case 'guardian': return 'Responsável';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            {user?.role === 'school' ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative group cursor-pointer"
                title="Clique para alterar a logo"
              >
                <Avatar className="w-14 h-14 border-2 border-border transition-all group-hover:border-primary">
                  {escolinha?.logo_url ? (
                    <AvatarImage src={escolinha.logo_url} alt={escolinha.nome || 'Logo'} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-lg">
                    {escolinha?.nome?.charAt(0) || 'E'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>
            ) : (
              <img src={logoAtletaId} alt="ATLETA ID" className="h-12 w-auto" />
            )}
            <div className="hidden sm:block">
              <h1 className="font-bold text-foreground text-lg">
                {user?.role === 'school' && escolinha?.nome ? escolinha.nome : 'ATLETA ID'}
              </h1>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar size="sm">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
            </div>
            {user?.role !== 'admin' && (
              <ChangePasswordDialog
                trigger={
                  <Button variant="ghost" size="icon" title="Alterar Senha">
                    <Key className="w-4 h-4" />
                  </Button>
                }
              />
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Force Password Change Dialog */}
      <ForcePasswordChangeDialog open={user?.passwordNeedsChange || false} />

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center overflow-x-auto scrollbar-hide py-2 px-1 gap-0.5">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href} className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-col h-auto py-2 px-2.5 gap-0.5 min-w-[60px]",
                  location.pathname === item.href && "text-primary bg-primary/10"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] leading-tight whitespace-nowrap">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="container py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
