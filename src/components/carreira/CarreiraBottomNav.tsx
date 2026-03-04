import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';

interface CarreiraBottomNavProps {
  currentUserId?: string | null;
  profileSlug?: string | null;
}

export function CarreiraBottomNav({ currentUserId, profileSlug }: CarreiraBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Count pending connection requests
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-connections-count', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      const { count, error } = await supabase
        .from('rede_conexoes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', currentUserId)
        .eq('status', 'pendente');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!currentUserId,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Você saiu da sua conta');
    // If on carreira domain, go to carreira landing; otherwise go back to AtletaID login
    if (isCarreiraDomain()) {
      navigate(carreiraPath('/'), { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  };

  const goToProfile = async () => {
    if (profileSlug) {
      navigate(carreiraPath(`/${profileSlug}`));
    } else if (currentUserId) {
      const { data: pa } = await supabase.from('perfil_atleta').select('slug').eq('user_id', currentUserId).maybeSingle();
      const { data: pr } = await supabase.from('perfis_rede').select('slug').eq('user_id', currentUserId).maybeSingle();
      const foundSlug = pa?.slug || pr?.slug;
      if (foundSlug) navigate(carreiraPath(`/${foundSlug}`));
      else navigate(carreiraPath(`/perfil/${currentUserId}`));
    }
  };

  const explorarPath = carreiraPath('/explorar');
  const conexoesPath = carreiraPath('/conexoes');

  const items = [
    {
      icon: Home,
      label: 'Início',
      onClick: () => navigate(explorarPath),
      active: location.pathname === explorarPath || location.pathname === carreiraPath('/explorar'),
      badge: 0,
    },
    {
      icon: Users,
      label: 'Conexões',
      onClick: () => navigate(conexoesPath),
      active: location.pathname === conexoesPath,
      badge: (pendingCount || 0),
    },
    {
      icon: User,
      label: 'Meu Perfil',
      onClick: goToProfile,
      active: !!profileSlug && location.pathname === carreiraPath(`/${profileSlug}`),
      badge: 0,
    },
    {
      icon: LogOut,
      label: 'Sair',
      onClick: handleLogout,
      active: false,
      badge: 0,
    },
  ];

  if (!currentUserId) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              item.active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}