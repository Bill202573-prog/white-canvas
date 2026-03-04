import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  LogOut,
  Users,
  GraduationCap,
  CalendarCheck,
  Home,
  DollarSign,
  Key,
  Upload,
  Loader2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ClipboardCheck,
  UserPlus,
  ShoppingBag,
  Globe,
} from 'lucide-react';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/dashboard/children', label: 'Alunos', icon: Users },
  { href: '/dashboard/teachers', label: 'Professores', icon: GraduationCap },
  { href: '/dashboard/classes', label: 'Turmas', icon: CalendarCheck },
  { href: '/dashboard/aulas', label: 'Aulas', icon: CalendarCheck },
  { href: '/dashboard/chamada', label: 'Chamada', icon: ClipboardCheck },
  { href: '/dashboard/amistosos', label: 'Amistosos', icon: Trophy },
  { href: '/dashboard/campeonatos', label: 'Campeonatos', icon: Trophy },
  { href: '/dashboard/trofeus', label: 'Troféus', icon: Trophy },
  { href: '/dashboard/comunicados', label: 'Comunicados', icon: MessageSquare },
  { href: '/dashboard/indicacoes', label: 'Indicações', icon: UserPlus },
  { href: '/dashboard/loja', label: 'Loja', icon: ShoppingBag },
  { href: '/dashboard/perfil-publico', label: 'Perfil Público', icon: Globe },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
];

export function SchoolSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-header', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome, logo_url, status_financeiro_escola')
        .eq('admin_user_id', user?.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - logo doesn't change often
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Sidebar collapsible="icon">
      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-2",
          isCollapsed && "justify-center"
        )}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative group cursor-pointer shrink-0"
            title="Clique para alterar a logo"
          >
            <Avatar className={cn(
              "border-2 border-sidebar-border transition-all group-hover:border-primary",
              isCollapsed ? "w-8 h-8" : "w-12 h-12"
            )}>
              {escolinha?.logo_url ? (
                <AvatarImage src={escolinha.logo_url} alt={escolinha?.nome || 'Logo'} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-sidebar-accent text-sm">
                {escolinha?.nome?.charAt(0) || 'E'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
          
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sidebar-foreground text-sm truncate">
                {escolinha?.nome || 'Escolinha'}
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Administração</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link to={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {/* Theme toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Change password */}
          <SidebarMenuItem>
            <ChangePasswordDialog
              trigger={
                <SidebarMenuButton tooltip="Alterar Senha">
                  <Key className="w-4 h-4" />
                  <span>Alterar Senha</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>

          <SidebarSeparator />

          {/* User info and logout */}
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center gap-2 p-2",
              isCollapsed && "justify-center"
            )}>
              <Avatar className="w-8 h-8 shrink-0">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-xs">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
                  {user?.name}
                </span>
              )}
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
