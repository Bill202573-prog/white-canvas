import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  CalendarClock,
  Key,
  Wallet,
  FileWarning,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AsaasIntegrationSectionProps {
  escolinhaId: string;
}

interface AsaasData {
  id: string;
  asaas_account_id: string | null;
  asaas_api_key: string | null;
  asaas_wallet_id: string | null;
  asaas_status: string | null;
  asaas_enviado_em: string | null;
  asaas_atualizado_em: string | null;
}

interface StatusCheckResult {
  success: boolean;
  status?: string;
  statusLabel?: string;
  statusDescription?: string;
  issues?: string[];
  pendingDocuments?: Array<{
    type: string;
    title: string;
    description: string;
    status: string;
    onboardingUrl?: string;
    responsibleName?: string | null;
  }>;
  detailedStatus?: {
    general: string;
    commercialInfo: string;
    bankAccountInfo: string;
    documentation: string;
  };
  accountEmail?: string;
  actionRequired?: boolean;
  actionInstructions?: string;
  updatedAt?: string;
  error?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  approved: { 
    label: 'Aprovado', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', 
    icon: CheckCircle 
  },
  pending: { 
    label: 'Em Análise', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', 
    icon: Clock 
  },
  rejected: { 
    label: 'Rejeitado', 
    color: 'bg-destructive/10 text-destructive border-destructive/30', 
    icon: XCircle 
  },
  awaiting_action: { 
    label: 'Ação Necessária', 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', 
    icon: AlertTriangle 
  },
};

export default function AsaasIntegrationSection({ escolinhaId }: AsaasIntegrationSectionProps) {
  const { toast } = useToast();
  const [data, setData] = useState<AsaasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<StatusCheckResult | null>(null);

  const fetchData = async () => {
    try {
      const { data: cadastro, error } = await supabase
        .from('escola_cadastro_bancario')
        .select('id, asaas_account_id, asaas_api_key, asaas_wallet_id, asaas_status, asaas_enviado_em, asaas_atualizado_em')
        .eq('escolinha_id', escolinhaId)
        .maybeSingle();

      if (error) throw error;
      setData(cadastro);
    } catch (err) {
      console.error('Error fetching Asaas data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [escolinhaId]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('asaas-check-account-status', {
        body: { escolinha_id: escolinhaId }
      });

      if (error) throw error;

      setLastCheckResult(result);

      if (result?.success) {
        toast({
          title: 'Status atualizado',
          description: result.statusDescription || `Status atual: ${result.statusLabel || 'Verificado'}`,
        });
      } else {
        toast({
          title: 'Erro ao verificar status',
          description: result?.error || 'Tente novamente mais tarde',
          variant: 'destructive',
        });
      }

      // Refresh data
      await fetchData();
    } catch (err: any) {
      toast({
        title: 'Erro ao verificar status',
        description: err.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copiado!`,
      description: 'O valor foi copiado para a área de transferência.',
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 20) return key;
    return key.substring(0, 15) + '************************';
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No cadastro found
  if (!data) {
    return (
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Integração Asaas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 text-amber-700">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Subconta Asaas ainda não configurada</p>
              <p className="text-sm text-amber-600/80">
                Esta escola não enviou o cadastro bancário ou o envio ainda não foi processado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has cadastro but no account yet
  if (!data.asaas_account_id) {
    return (
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Integração Asaas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 text-amber-700">
            <Clock className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Aguardando criação da subconta</p>
              <p className="text-sm text-amber-600/80">
                O cadastro bancário foi preenchido mas a subconta ainda não foi criada no Asaas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = data.asaas_status || 'pending';
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Integração Asaas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status da Conta:</span>
          <Badge className={`${config.color} flex items-center gap-1.5 px-3 py-1`}>
            <StatusIcon className="w-4 h-4" />
            {config.label}
          </Badge>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account ID */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Account ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm font-mono truncate">
                {data.asaas_account_id}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(data.asaas_account_id!, 'Account ID')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Wallet ID */}
          {data.asaas_wallet_id && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Wallet ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm font-mono truncate">
                  {data.asaas_wallet_id}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(data.asaas_wallet_id!, 'Wallet ID')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* API Key - Full Width with mask */}
        {data.asaas_api_key && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              API Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm font-mono truncate">
                {showApiKey ? data.asaas_api_key : maskApiKey(data.asaas_api_key)}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(data.asaas_api_key!, 'API Key')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              Mantenha esta chave em segurança. Use apenas no backend.
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span>Enviado em: <strong>{formatDateTime(data.asaas_enviado_em)}</strong></span>
          </div>
          {data.asaas_atualizado_em && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Atualizado em: <strong>{formatDateTime(data.asaas_atualizado_em)}</strong></span>
            </div>
          )}
        </div>

        {/* Issues and Pending Documents from last check */}
        {lastCheckResult?.success && (
          <>
            {/* Action Instructions Alert */}
            {lastCheckResult.actionInstructions && (
              <Alert className="border-blue-500/30 bg-blue-500/5">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium mb-1">Ação necessária:</p>
                  <p className="text-sm">{lastCheckResult.actionInstructions}</p>
                  {lastCheckResult.accountEmail && (
                    <p className="text-sm mt-2">
                      <strong>Email da conta Asaas:</strong> {lastCheckResult.accountEmail}
                      <br />
                      <span className="text-muted-foreground text-xs">
                        O Asaas envia instruções e links de onboarding para este email.
                      </span>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Status */}
            {lastCheckResult.detailedStatus && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Status Detalhado:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2 rounded ${lastCheckResult.detailedStatus.general === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-secondary'}`}>
                    <span className="text-muted-foreground">Geral:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-1 text-xs ${lastCheckResult.detailedStatus.general === 'APPROVED' ? 'border-emerald-500 text-emerald-600' : ''}`}
                    >
                      {lastCheckResult.detailedStatus.general === 'APPROVED' ? '✓ Aprovado' :
                       lastCheckResult.detailedStatus.general === 'PENDING' ? 'Pendente' : 
                       lastCheckResult.detailedStatus.general}
                    </Badge>
                  </div>
                  <div className={`p-2 rounded ${lastCheckResult.detailedStatus.commercialInfo === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-secondary'}`}>
                    <span className="text-muted-foreground">Comercial:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-1 text-xs ${lastCheckResult.detailedStatus.commercialInfo === 'APPROVED' ? 'border-emerald-500 text-emerald-600' : ''}`}
                    >
                      {lastCheckResult.detailedStatus.commercialInfo === 'APPROVED' ? '✓ Aprovado' :
                       lastCheckResult.detailedStatus.commercialInfo === 'PENDING' ? 'Pendente' : 
                       lastCheckResult.detailedStatus.commercialInfo}
                    </Badge>
                  </div>
                  <div className={`p-2 rounded ${lastCheckResult.detailedStatus.bankAccountInfo === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-secondary'}`}>
                    <span className="text-muted-foreground">Bancário:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-1 text-xs ${lastCheckResult.detailedStatus.bankAccountInfo === 'APPROVED' ? 'border-emerald-500 text-emerald-600' : ''}`}
                    >
                      {lastCheckResult.detailedStatus.bankAccountInfo === 'APPROVED' ? '✓ Aprovado' :
                       lastCheckResult.detailedStatus.bankAccountInfo === 'PENDING' ? 'Pendente' : 
                       lastCheckResult.detailedStatus.bankAccountInfo}
                    </Badge>
                  </div>
                  <div className={`p-2 rounded ${lastCheckResult.detailedStatus.documentation === 'APPROVED' ? 'bg-emerald-500/10' : 'bg-secondary'}`}>
                    <span className="text-muted-foreground">Docs:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-1 text-xs ${lastCheckResult.detailedStatus.documentation === 'APPROVED' ? 'border-emerald-500 text-emerald-600' : ''}`}
                    >
                      {lastCheckResult.detailedStatus.documentation === 'APPROVED' ? '✓ Aprovado' :
                       lastCheckResult.detailedStatus.documentation === 'PENDING' ? 'Pendente' : 
                       lastCheckResult.detailedStatus.documentation}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Issues */}
            {lastCheckResult.issues && lastCheckResult.issues.length > 0 && (
              <Alert variant="destructive" className="border-orange-500/30 bg-orange-500/5">
                <FileWarning className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Pendências identificadas:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {lastCheckResult.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Pending Documents */}
            {lastCheckResult.pendingDocuments && lastCheckResult.pendingDocuments.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-orange-500" />
                  Documentos Pendentes ({lastCheckResult.pendingDocuments.length}):
                </p>
                <div className="space-y-2">
                  {lastCheckResult.pendingDocuments.map((doc, index) => (
                    <div key={index} className="p-3 bg-secondary/50 rounded-lg border border-orange-500/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                          {doc.responsibleName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Responsável: <strong>{doc.responsibleName}</strong>
                            </p>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-xs ${
                              doc.status === 'REJECTED' 
                                ? 'border-destructive/50 text-destructive' 
                                : doc.status === 'NOT_SENT'
                                ? 'border-amber-500/50 text-amber-600'
                                : 'border-orange-500/50 text-orange-600'
                            }`}
                          >
                            {doc.status === 'REJECTED' ? 'Rejeitado' : 
                             doc.status === 'AWAITING_APPROVAL' ? 'Em Análise' : 
                             doc.status === 'NOT_SENT' ? 'Não Enviado' : 'Pendente'}
                          </Badge>
                        </div>
                        {doc.onboardingUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(doc.onboardingUrl, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  💡 <strong>Como enviar os documentos:</strong> O responsável da conta deve acessar o aplicativo Asaas 
                  ou clicar no link de onboarding enviado para o email <strong>{lastCheckResult.accountEmail || 'cadastrado'}</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCheckStatus}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verificar Status no Asaas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
