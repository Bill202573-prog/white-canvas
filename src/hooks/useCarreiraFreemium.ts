import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CarreiraLimitResult {
  status: 'allowed' | 'limit_reached' | 'subscribed';
  source: 'legacy_access' | 'carreira_subscription' | 'freemium';
  count: number;
  limit: number;
}

export const useCarreiraAtividadeLimit = (criancaId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['carreira-atividade-limit', user?.id, criancaId],
    queryFn: async (): Promise<CarreiraLimitResult> => {
      // Get the actual session user ID to handle social auth correctly
      let userId = user?.id;
      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user?.id;
      }

      if (!userId || !criancaId) {
        console.warn('[CarreiraLimit] No userId or criancaId available');
        return { status: 'limit_reached', source: 'freemium', count: 99, limit: 2 };
      }

      console.log('[CarreiraLimit] Checking limit for user:', userId, 'crianca:', criancaId);

      const { data, error } = await supabase.rpc('check_carreira_atividade_limit', {
        p_user_id: userId,
        p_crianca_id: criancaId,
      });

      if (error) {
        console.error('[CarreiraLimit] RPC error:', JSON.stringify(error));
        return { status: 'limit_reached', source: 'freemium', count: 99, limit: 2 };
      }

      console.log('[CarreiraLimit] Result:', data);
      return data as unknown as CarreiraLimitResult;
    },
    enabled: !!criancaId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};
