import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Wallet, Trophy, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGuardianNotifications } from '@/hooks/useGuardianNotifications';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badgeKey?: 'games' | 'payments' | 'messages';
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Início', href: '/dashboard/inicio', badgeKey: 'messages' },
  { icon: Calendar, label: 'Agenda', href: '/dashboard/agenda' },
  { icon: Swords, label: 'Jogos', href: '/dashboard/convocacoes', badgeKey: 'games' },
  { icon: Wallet, label: 'Pagar', href: '/dashboard/financeiro', badgeKey: 'payments' },
  { icon: Trophy, label: 'Jornada', href: '/dashboard/jornada' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pendingGames, pendingPayments, unreadMessages } = useGuardianNotifications();

  const getBadgeCount = (key?: 'games' | 'payments' | 'messages') => {
    if (!key) return 0;
    switch (key) {
      case 'games': return pendingGames;
      case 'payments': return pendingPayments;
      case 'messages': return unreadMessages;
      default: return 0;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard/inicio' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item.badgeKey);
          
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                "touch-manipulation active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "w-6 h-6 transition-transform",
                  isActive && "scale-110"
                )} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
