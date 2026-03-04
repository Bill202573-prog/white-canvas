import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
}

export function ConexoesCount({ userId }: Props) {
  const { data: count } = useQuery({
    queryKey: ['conexoes-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('rede_conexoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aceita')
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`);
      return count || 0;
    },
  });

  return (
    <span className="text-xs text-muted-foreground">
      <strong className="text-foreground">{count ?? 0}</strong> conexões
    </span>
  );
}
