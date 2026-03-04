import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PwaInstallRecord {
  id: string;
  user_id: string;
  os: string;
  installed_at: string;
  user_agent: string | null;
  escolinha_id: string | null;
}

export function useSchoolPwaInstalls() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['school-pwa-installs', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('pwa_installs')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .order('installed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PwaInstallRecord[];
    },
    enabled: !!user?.escolinhaId && user?.role === 'school',
    staleTime: 1000 * 60 * 5,
  });
}

export function usePwaInstallsByEscolinha(escolinhaId: string | null) {
  return useQuery({
    queryKey: ['pwa-installs-by-escolinha', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await supabase
        .from('pwa_installs')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .order('installed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PwaInstallRecord[];
    },
    enabled: !!escolinhaId,
    staleTime: 1000 * 60 * 5,
  });
}
