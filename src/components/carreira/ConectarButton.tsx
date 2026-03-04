import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserPlus, Check, Clock, Loader2, UserMinus } from 'lucide-react';

interface Props {
  targetUserId: string;
  currentUserId?: string | null;
}

export function ConectarButton({ targetUserId, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: conexao, isLoading: statusLoading } = useQuery({
    queryKey: ['conexao-status', currentUserId, targetUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase
        .from('rede_conexoes')
        .select('*')
        .or(
          `and(solicitante_id.eq.${currentUserId},destinatario_id.eq.${targetUserId}),and(solicitante_id.eq.${targetUserId},destinatario_id.eq.${currentUserId})`
        )
        .maybeSingle();
      return data;
    },
    enabled: !!currentUserId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['conexao-status', currentUserId, targetUserId] });
    queryClient.invalidateQueries({ queryKey: ['conexoes-count'] });
    queryClient.invalidateQueries({ queryKey: ['user-connections'] });
    queryClient.invalidateQueries({ queryKey: ['pending-connection-requests'] });
    queryClient.invalidateQueries({ queryKey: ['connection-suggestions-smart'] });
    queryClient.invalidateQueries({ queryKey: ['connection-suggestions'] });
    queryClient.invalidateQueries({ queryKey: ['profile-suggestions'] });
    queryClient.invalidateQueries({ queryKey: ['profile-connections-list'] });
    queryClient.invalidateQueries({ queryKey: ['connections-count'] });
    queryClient.invalidateQueries({ queryKey: ['my-connections-accepted'] });
  };

  const handleConectar = async () => {
    if (!currentUserId) {
      toast.error('Faça login para conectar');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('rede_conexoes').insert({
      solicitante_id: currentUserId,
      destinatario_id: targetUserId,
      status: 'pendente',
    } as any);
    if (error) {
      toast.error('Erro ao enviar solicitação');
    } else {
      toast.success('Solicitação enviada!');
      invalidate();
    }
    setLoading(false);
  };

  const handleAceitar = async () => {
    if (!conexao) return;
    setLoading(true);
    await supabase
      .from('rede_conexoes')
      .update({ status: 'aceita' } as any)
      .eq('id', conexao.id);
    toast.success('Conexão aceita!');
    invalidate();
    setLoading(false);
  };

  const handleRecusar = async () => {
    if (!conexao) return;
    setLoading(true);
    await supabase
      .from('rede_conexoes')
      .update({ status: 'rejeitada' } as any)
      .eq('id', conexao.id);
    toast.info('Solicitação recusada');
    invalidate();
    setLoading(false);
  };

  const handleDesconectar = async () => {
    if (!conexao) return;
    setLoading(true);
    await supabase
      .from('rede_conexoes')
      .delete()
      .eq('id', conexao.id);
    toast.info('Conexão desfeita');
    invalidate();
    setLoading(false);
  };

  if (loading || statusLoading) {
    return (
      <Button size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!conexao) {
    return (
      <Button size="sm" onClick={handleConectar} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm">
        <UserPlus className="w-4 h-4 mr-1" /> Conectar
      </Button>
    );
  }

  if (conexao.status === 'pendente' && conexao.solicitante_id === currentUserId) {
    return (
      <Button size="sm" variant="secondary" disabled>
        <Clock className="w-4 h-4 mr-1" /> Enviada
      </Button>
    );
  }

  if (conexao.status === 'pendente' && conexao.destinatario_id === currentUserId) {
    return (
      <div className="flex gap-1">
        <Button size="sm" onClick={handleAceitar}>
          Aceitar
        </Button>
        <Button size="sm" variant="outline" onClick={handleRecusar}>
          Recusar
        </Button>
      </div>
    );
  }

  if (conexao.status === 'aceita') {
    return (
      <Button size="sm" variant="secondary" onClick={handleDesconectar} className="group">
        <Check className="w-4 h-4 mr-1 group-hover:hidden" />
        <UserMinus className="w-4 h-4 mr-1 hidden group-hover:inline" />
        <span className="group-hover:hidden">Conectado</span>
        <span className="hidden group-hover:inline">Desconectar</span>
      </Button>
    );
  }

  // Rejected - allow re-connect
  return (
    <Button size="sm" onClick={handleConectar} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm">
      <UserPlus className="w-4 h-4 mr-1" /> Conectar
    </Button>
  );
}
