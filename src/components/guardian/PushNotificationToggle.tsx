import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Notificações desativadas');
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Notificações ativadas! Você receberá lembretes importantes.');
      } else if (permission === 'denied') {
        toast.error('Permissão negada. Ative as notificações nas configurações do navegador.');
      }
    }
  };

  return (
    <Card className={isSubscribed ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
              {isSubscribed ? (
                <BellRing className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">
                {isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed 
                  ? 'Você receberá lembretes de cobranças e avisos' 
                  : 'Receba lembretes de vencimento e avisos da escola'}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading ? '...' : isSubscribed ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
