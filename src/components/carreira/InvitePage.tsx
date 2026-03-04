import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Check, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';

interface Props {
  userId: string;
  onSkip: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  professor: 'Professor',
  tecnico: 'Técnico',
  dono_escola: 'Dono de Escola',
  preparador_fisico: 'Preparador Físico',
  empresario: 'Empresário',
  influenciador: 'Influenciador',
  pai_responsavel: 'Pai/Responsável',
  scout: 'Scout',
  agente_clube: 'Agente de Clube',
  fotografo: 'Fotógrafo',
};

export function InvitePage({ userId, onSkip }: Props) {
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: myProfile } = useQuery({
    queryKey: ['my-perfil-rede', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('perfis_rede')
        .select('convite_codigo')
        .eq('user_id', userId)
        .single();
      return data;
    },
  });

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['rede-suggestions', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('perfis_rede')
        .select('id, user_id, nome, tipo, foto_url')
        .neq('user_id', userId)
        .limit(20);
      return data || [];
    },
  });

  const { data: existingConnections } = useQuery({
    queryKey: ['my-connections-check', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rede_conexoes')
        .select('solicitante_id, destinatario_id')
        .or(`solicitante_id.eq.${userId},destinatario_id.eq.${userId}`);
      return new Set(data?.map(c => c.solicitante_id === userId ? c.destinatario_id : c.solicitante_id) || []);
    },
  });

  const inviteLink = myProfile?.convite_codigo
    ? `${window.location.origin}${carreiraPath('/cadastro')}?convite=${myProfile.convite_codigo}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async (targetUserId: string) => {
    setConnecting(targetUserId);
    try {
      const { error } = await supabase.from('rede_conexoes').insert({
        solicitante_id: userId,
        destinatario_id: targetUserId,
        status: 'pendente',
      } as any);
      if (error) throw error;
      toast.success('Convite enviado!');
    } catch {
      toast.error('Erro ao conectar');
    }
    setConnecting(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎉</div>
        <h1 className="text-xl font-bold text-foreground">Perfil criado!</h1>
        <p className="text-sm text-muted-foreground mt-1">Convide pessoas para sua rede</p>
      </div>

      <Card className="p-4 mb-6">
        <p className="text-sm text-muted-foreground mb-3">
          Compartilhe este link com técnicos, preparadores, atletas e profissionais do esporte. Ao se cadastrarem, vocês ficarão automaticamente conectados!
        </p>
        <div className="flex gap-2">
          <Input
            value={inviteLink}
            readOnly
            className="text-xs flex-1"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button size="sm" onClick={handleCopy} variant={copied ? 'default' : 'outline'}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Pessoas já na rede:</h2>
          <div className="space-y-2">
            {suggestions.map((person) => {
              const isConnected = existingConnections?.has(person.user_id);
              return (
                <Card key={person.id} className="flex items-center gap-3 p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(carreiraPath(`/perfil/${person.user_id}`))}>
                  {person.foto_url ? (
                    <img src={person.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {person.nome?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.nome}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[person.tipo] || person.tipo}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isConnected ? 'secondary' : 'outline'}
                    disabled={isConnected || connecting === person.user_id}
                    onClick={() => handleConnect(person.user_id)}
                  >
                    {connecting === person.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isConnected ? (
                      'Conectado'
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5 mr-1" /> Conectar</>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <p>Você é um dos primeiros! Convide pessoas usando o link acima.</p>
        </div>
      )}

      <Button className="w-full mt-6" size="lg" onClick={onSkip}>
        Ir para o Feed <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
