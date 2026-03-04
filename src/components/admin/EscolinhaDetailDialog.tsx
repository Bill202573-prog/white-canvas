import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Escolinha, HistoricoCobranca, useAdminData, EscolinhaStatus, StatusFinanceiro, EscolaStatusFinanceiro } from '@/hooks/useAdminData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AsaasIntegrationSection from './AsaasIntegrationSection';
import { PwaInstallsSection } from './PwaInstallsSection';
import WebhookConfigSection from '@/components/school/WebhookConfigSection';

interface EscolinhaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolinha: Escolinha | null;
}

const statusLabels: Record<EscolinhaStatus, string> = {
  em_teste: 'Em Teste',
  ativa: 'Ativa',
  inativa: 'Inativa',
  suspensa: 'Suspensa'
};

const statusColors: Record<EscolinhaStatus, string> = {
  em_teste: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  ativa: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  inativa: 'bg-muted text-muted-foreground border-border',
  suspensa: 'bg-destructive/10 text-destructive border-destructive/20'
};

const financeiroLabels: Record<StatusFinanceiro, string> = {
  em_dia: 'Em Dia',
  atrasado: 'Atrasado',
  suspenso: 'Suspenso'
};

const financeiroColors: Record<StatusFinanceiro, string> = {
  em_dia: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  atrasado: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  suspenso: 'bg-destructive/10 text-destructive border-destructive/20'
};

const statusFinanceiroEscolaLabels: Record<EscolaStatusFinanceiro, string> = {
  NAO_CONFIGURADO: 'Não Configurado',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado'
};

const statusFinanceiroEscolaColors: Record<EscolaStatusFinanceiro, string> = {
  NAO_CONFIGURADO: 'bg-destructive/10 text-destructive border-destructive/20',
  EM_ANALISE: 'bg-destructive/10 text-destructive border-destructive/20',
  APROVADO: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REPROVADO: 'bg-destructive/10 text-destructive border-destructive/20'
};

const EscolinhaDetailDialog = ({ open, onOpenChange, escolinha }: EscolinhaDetailDialogProps) => {
  const { updateEscolinhaStatus, updateFinanceiroStatus } = useAdminData();
  const [historico, setHistorico] = useState<HistoricoCobranca[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [asaasMini, setAsaasMini] = useState<{ asaas_api_key: string | null; asaas_status: string | null } | null>(null);

  useEffect(() => {
    const fetchHistorico = async () => {
      if (!escolinha?.id) return;
      
      setLoadingHistorico(true);
      try {
        const { data, error } = await supabase
          .from('historico_cobrancas')
          .select('*, plano:planos_saas(*)')
          .eq('escolinha_id', escolinha.id)
          .order('mes_referencia', { ascending: false });
        
        if (error) throw error;
        setHistorico(data as HistoricoCobranca[]);
      } catch (err) {
        console.error('Error fetching historico:', err);
        setHistorico([]);
      } finally {
        setLoadingHistorico(false);
      }
    };

    if (escolinha && open) {
      fetchHistorico();
    }
  }, [escolinha, open]);

  useEffect(() => {
    const fetchAsaasMini = async () => {
      if (!escolinha?.id || !open) return;
      try {
        const { data, error } = await supabase
          .from('escola_cadastro_bancario')
          .select('asaas_api_key, asaas_status')
          .eq('escolinha_id', escolinha.id)
          .maybeSingle();

        if (error) throw error;
        setAsaasMini(data ?? null);
      } catch (err) {
        console.error('Error fetching Asaas mini data:', err);
        setAsaasMini(null);
      }
    };

    fetchAsaasMini();
  }, [escolinha?.id, open]);

  if (!escolinha) return null;

  const handleStatusChange = async (newStatus: EscolinhaStatus) => {
    await updateEscolinhaStatus.mutateAsync({ id: escolinha.id, status: newStatus });
  };

  const handleFinanceiroStatusChange = async (newStatus: StatusFinanceiro) => {
    await updateFinanceiroStatus.mutateAsync({ escolinhaId: escolinha.id, status: newStatus });
  };

  const endereco = [
    escolinha.rua,
    escolinha.numero && `nº ${escolinha.numero}`,
    escolinha.bairro,
    escolinha.cidade,
    escolinha.estado,
    escolinha.cep
  ].filter(Boolean).join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{escolinha.nome}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Cadastrada em {format(new Date(escolinha.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Status Control */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status da Escolinha</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Badge className={statusColors[escolinha.status]}>
                  {statusLabels[escolinha.status]}
                </Badge>
                <Select
                  value={escolinha.status}
                  onValueChange={(v) => handleStatusChange(v as EscolinhaStatus)}
                  disabled={updateEscolinhaStatus.isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_teste">Em Teste</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Responsável Legal</p>
                      <p className="font-medium">{escolinha.nome_responsavel || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{escolinha.tipo_documento?.toUpperCase() || 'Documento'}</p>
                      <p className="font-medium">{escolinha.documento || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{escolinha.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{escolinha.telefone || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {endereco && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      <p className="font-medium">{endereco}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PWA Installations */}
            <PwaInstallsSection escolinhaId={escolinha.id} />
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {/* Integração Asaas */}
            <AsaasIntegrationSection escolinhaId={escolinha.id} />

            {/* Configuração do Webhook - só aparece se tiver API key */}
            <WebhookConfigSection 
              escolinhaId={escolinha.id}
              hasApiKey={!!asaasMini?.asaas_api_key || escolinha.status_financeiro_escola === 'APROVADO'}
              asaasStatus={asaasMini?.asaas_status ?? (escolinha.status_financeiro_escola === 'APROVADO' ? 'approved' : null)}
            />

            {/* Status Financeiro da Escola - Campo independente */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Status Financeiro da Escola
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Este status controla a liberação de cobranças automáticas (não afeta o acesso ao sistema)
                </p>
              </CardHeader>
              <CardContent>
                <Badge 
                  className={`text-sm px-4 py-2 ${statusFinanceiroEscolaColors[escolinha.status_financeiro_escola]}`}
                >
                  {statusFinanceiroEscolaLabels[escolinha.status_financeiro_escola]}
                </Badge>
              </CardContent>
            </Card>

            {escolinha.financeiro ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Status do Plano SaaS</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Badge className={financeiroColors[escolinha.financeiro.status]}>
                      {financeiroLabels[escolinha.financeiro.status]}
                    </Badge>
                    <Select
                      value={escolinha.financeiro.status}
                      onValueChange={(v) => handleFinanceiroStatusChange(v as StatusFinanceiro)}
                      disabled={updateFinanceiroStatus.isPending}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_dia">Em Dia</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Plano</p>
                          <p className="font-semibold">{escolinha.financeiro.plano?.nome || 'Sem plano'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Mensal</p>
                          <p className="font-semibold">
                            R$ {escolinha.financeiro.valor_mensal?.toFixed(2) || '0,00'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Início Cobrança</p>
                          <p className="font-semibold">
                            {escolinha.financeiro.data_inicio_cobranca 
                              ? format(new Date(escolinha.financeiro.data_inicio_cobranca), 'dd/MM/yyyy')
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum plano associado a esta escolinha.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Cobranças</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistorico ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : historico.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma cobrança registrada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historico.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(item.mes_referencia), 'MMMM yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.plano?.nome || 'Plano não identificado'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">R$ {item.valor.toFixed(2)}</p>
                          <Badge variant={item.status === 'pago' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EscolinhaDetailDialog;
