import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Webhook, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookConfigSectionProps {
  escolinhaId: string;
  hasApiKey: boolean;
  asaasStatus: string | null;
}

interface WebhookEvent {
  name: string;
  label: string;
  description: string;
}

const WEBHOOK_EVENTS: WebhookEvent[] = [
  { name: 'PAYMENT_RECEIVED', label: 'Pagamento Recebido', description: 'Quando um pagamento é recebido' },
  { name: 'PAYMENT_CONFIRMED', label: 'Pagamento Confirmado', description: 'Quando um pagamento é confirmado' },
  { name: 'PAYMENT_OVERDUE', label: 'Pagamento Vencido', description: 'Quando um pagamento vence' },
  { name: 'PAYMENT_DELETED', label: 'Pagamento Excluído', description: 'Quando um pagamento é excluído' },
  { name: 'PAYMENT_UPDATED', label: 'Pagamento Atualizado', description: 'Quando um pagamento é atualizado' },
  { name: 'PAYMENT_REFUNDED', label: 'Pagamento Estornado', description: 'Quando um pagamento é estornado' },
];

interface ConfigureWebhookResult {
  success: boolean;
  message?: string;
  error?: string;
  events?: string[];
  status?: string;
  webhookId?: string;
  url?: string;
  enabled?: boolean;
}

export default function WebhookConfigSection({ 
  escolinhaId, 
  hasApiKey, 
  asaasStatus 
}: WebhookConfigSectionProps) {
  const [configuredEvents, setConfiguredEvents] = useState<string[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<'not_configured' | 'active' | 'inactive' | 'error'>('not_configured');
  const [lastConfigResult, setLastConfigResult] = useState<ConfigureWebhookResult | null>(null);

  const configureWebhookMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-configure-webhook', {
        body: { escolinha_id: escolinhaId }
      });

      if (error) throw error;
      return data as ConfigureWebhookResult;
    },
    onSuccess: (data) => {
      setLastConfigResult(data);
      
      if (data.success) {
        setConfiguredEvents(data.events || WEBHOOK_EVENTS.map(e => e.name));
        setWebhookStatus(data.status === 'active' ? 'active' : 'inactive');
        toast.success(data.message || 'Webhook configurado com sucesso!');
      } else {
        setWebhookStatus('error');
        toast.error(data.error || 'Erro ao configurar webhook');
      }
    },
    onError: (error: Error) => {
      setWebhookStatus('error');
      setLastConfigResult({ success: false, error: error.message });
      toast.error(`Erro ao configurar webhook: ${error.message}`);
    }
  });

  // Don't show if no API key yet
  if (!hasApiKey) {
    return null;
  }

  // Show warning if account not fully approved
  const isApproved = asaasStatus === 'approved';

  const getStatusBadge = () => {
    switch (webhookStatus) {
      case 'active':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
            <CheckCircle className="w-3 h-3" />
            Ativo
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
            <AlertTriangle className="w-3 h-3" />
            Inativo
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
            <XCircle className="w-3 h-3" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Não configurado
          </Badge>
        );
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configuração do Webhook</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Configure o webhook para receber notificações automáticas de pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isApproved && (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              A subconta Asaas ainda não foi totalmente aprovada. O webhook pode ser configurado, 
              mas só funcionará após a aprovação completa da conta.
            </AlertDescription>
          </Alert>
        )}

        {/* Events Grid */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Eventos do Webhook:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {WEBHOOK_EVENTS.map((event) => {
              const isConfigured = configuredEvents.includes(event.name);
              return (
                <div
                  key={event.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    isConfigured 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-secondary/50 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isConfigured ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${isConfigured ? 'text-emerald-700' : 'text-foreground'}`}>
                      {event.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {event.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last config result */}
        {lastConfigResult && (
          <Alert className={lastConfigResult.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'}>
            {lastConfigResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <AlertDescription className={lastConfigResult.success ? 'text-emerald-700' : 'text-destructive'}>
              {lastConfigResult.success 
                ? `${lastConfigResult.message} ${lastConfigResult.events?.length || 0} eventos configurados.`
                : lastConfigResult.error
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Configure Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => configureWebhookMutation.mutate()}
            disabled={configureWebhookMutation.isPending}
            className="gap-2"
          >
            {configureWebhookMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : webhookStatus === 'active' ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {webhookStatus === 'active' ? 'Reconfigurar Webhook' : 'Configurar Webhook'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
