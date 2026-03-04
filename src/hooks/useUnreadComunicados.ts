import { useGuardianComunicadosEscola } from '@/hooks/useComunicadosEscolaData';
import { useMemo } from 'react';

export const useUnreadComunicados = () => {
  const { data: comunicados = [], isLoading } = useGuardianComunicadosEscola();

  const unreadCount = useMemo(() => {
    return comunicados.filter(c => !c.lido).length;
  }, [comunicados]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    isLoading,
  };
};
