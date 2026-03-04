import { useMemo, useEffect } from 'react';
import { useGuardianAmistosoConvocacoes } from './useGuardianConvocacoesData';
import { useGuardianCampeonatoConvocacoes } from './useCampeonatoConvocacoesData';
import { useUnreadComunicados } from './useUnreadComunicados';
import { useGuardianChildren } from './useSchoolData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Update the PWA badge on Android/Chrome
 */
function updateAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge?.().catch(() => {});
    }
  }
}

export function useGuardianNotifications() {
  const { hasUnread: hasUnreadMessages, unreadCount: unreadMessagesCount } = useUnreadComunicados();
  const { data: amistosos = [] } = useGuardianAmistosoConvocacoes();
  const { data: campeonatos = [] } = useGuardianCampeonatoConvocacoes();
  const { data: children = [] } = useGuardianChildren();
  const { session } = useAuth();

  // Count pending convocations (games)
  const pendingGames = useMemo(() => {
    const pendingAmistosos = amistosos.filter(c => 
      c.status !== 'pago' && 
      c.status !== 'confirmado' && 
      c.status !== 'recusado'
    ).length;

    const pendingCampeonatos = campeonatos.filter(c => 
      c.status !== 'pago' && 
      c.status !== 'confirmado' && 
      c.status !== 'recusado'
    ).length;

    return pendingAmistosos + pendingCampeonatos;
  }, [amistosos, campeonatos]);

  // Count pending payments (mensalidades)
  const { data: pendingPaymentsCount = 0 } = useQuery({
    queryKey: ['pending-payments-count', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return 0;
      
      // Get children ids
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return 0;

      // Get pending mensalidades - status can be a_vencer, atrasado, pendente, or vencido
      const { count, error } = await supabase
        .from('mensalidades')
        .select('id', { count: 'exact', head: true })
        .in('crianca_id', childIds)
        .in('status', ['pendente', 'vencido', 'a_vencer', 'atrasado']);

      if (error) {
        console.error('Error counting pending payments:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!session?.user?.id && children.length > 0,
  });

  // Total pending items
  const totalPending = pendingGames + pendingPaymentsCount + unreadMessagesCount;

  // Update PWA badge on Android when total changes
  useEffect(() => {
    updateAppBadge(totalPending);
  }, [totalPending]);

  return {
    // Individual counts
    pendingGames,
    pendingPayments: pendingPaymentsCount,
    unreadMessages: unreadMessagesCount,
    
    // Booleans
    hasUnreadMessages,
    hasPendingGames: pendingGames > 0,
    hasPendingPayments: pendingPaymentsCount > 0,
    
    // Total
    totalPending,
    hasAnyPending: totalPending > 0,
  };
}
