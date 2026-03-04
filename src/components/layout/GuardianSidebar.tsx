import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  Home,
  Calendar,
  User,
  CreditCard,
  Trophy,
  LogOut,
  KeyRound,
  CheckCircle2,
  BarChart3,
  ShoppingBag,
  IdCard,
} from 'lucide-react';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';

interface GuardianSidebarProps {
  child: {
    id: string;
    nome: string;
    foto_url: string | null;
    turmas: Array<{ escolinha?: { nome: string } }>;
  } | null;
  guardianName?: string;
}

const menuItems = [
  { title: 'Início', url: '/dashboard', icon: Home, section: 'inicio' },
  { title: 'Agenda', url: '/dashboard/agenda', icon: Calendar, section: 'agenda' },
  { title: 'Perfil', url: '/dashboard/perfil', icon: User, section: 'perfil' },
  { title: 'Frequência', url: '/dashboard/frequencia', icon: BarChart3, section: 'frequencia' },
  { title: 'Financeiro', url: '/dashboard/financeiro', icon: CreditCard, section: 'financeiro' },
  { title: 'Loja', url: '/dashboard/loja', icon: ShoppingBag, section: 'loja' },
  { title: 'Jornada', url: '/dashboard/jornada', icon: Trophy, section: 'jornada' },
];

export function GuardianSidebar({ child, guardianName }: GuardianSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isCollapsed = state === 'collapsed';
  
  // Get the primary school name
  const schoolName = child?.turmas?.[0]?.escolinha?.nome || 'Escolinha';

  // Get first name and last name of guardian
  const getGuardianDisplayName = () => {
    if (!guardianName) return '';
    const parts = guardianName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border bg-primary text-primary-foreground">
        <div className={`flex items-center gap-3 p-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <Avatar className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} ring-2 ring-primary-foreground/30 transition-all shrink-0`}>
            {child?.foto_url && <AvatarImage src={child.foto_url} alt={child?.nome || ''} />}
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-lg font-bold">
              {child?.nome?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && child && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-tight text-primary-foreground line-clamp-2">
                  {child.nome}
                </h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              {guardianName && (
                <p className="text-xs text-primary-foreground/70 mt-0.5 truncate">
                  Resp: {getGuardianDisplayName()}
                </p>
              )}
              <Badge variant="secondary" className="text-[10px] bg-primary-foreground/20 text-primary-foreground border-0 mt-1">
                Ativo
              </Badge>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="px-3 pb-3">
            <div className="text-xs text-primary-foreground/70">Você está em</div>
            <span className="text-xs font-semibold text-primary-foreground truncate block">
              {schoolName.toUpperCase()}
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-primary">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url === '/dashboard' && location.pathname === '/dashboard');
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`
                        text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10
                        data-[active=true]:bg-primary-foreground data-[active=true]:text-primary data-[active=true]:font-semibold
                        rounded-lg mx-2 my-0.5 transition-all
                      `}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === '/dashboard'}
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-primary-foreground/20 bg-primary">
        <SidebarMenu>
          <SidebarMenuItem>
            <ChangePasswordDialog
              trigger={
                <SidebarMenuButton
                  tooltip="Alterar Senha"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mx-2 rounded-lg w-full"
                >
                  <KeyRound className="w-5 h-5 shrink-0" />
                  <span>Alterar Senha</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={handleLogout}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mx-2 rounded-lg"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
