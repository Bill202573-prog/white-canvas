import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp,
  Search,
  Loader2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  School,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Settings,
  Bell,
  ExternalLink,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react';
import { useAdminData, EscolinhaStatus, StatusFinanceiro, HistoricoCobranca } from '@/hooks/useAdminData';
import { format, parseISO } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

const statusCobrancaLabels: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado'
};

const statusCobrancaColors: Record<string, string> = {
  pago: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pendente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  atrasado: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground border-muted'
};

interface MesCobrancas {
  mes: string;
  mesLabel: string;
  cobrancas: HistoricoCobranca[];
  totalPago: number;
  totalPendente: number;
  total: number;
}

const AdminFinanceiroPage = () => {
  const { 
    escolinhas, 
    planos, 
    stats, 
    historicoCobrancas, 
    notificacoes,
    saasConfig,
    isLoading, 
    updateFinanceiroStatus, 
    generateBilling,
    updateSaasConfig,
    markNotificationRead
  } = useAdminData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [openMonths, setOpenMonths] = useState<string[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);

  // Config values state - initialize from saasConfig
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  // Sync config values when saasConfig changes
  useEffect(() => {
    if (saasConfig.length > 0) {
      const values: Record<string, string> = {};
      saasConfig.forEach(c => {
        values[c.chave] = c.valor;
      });
      setConfigValues(values);
    }
  }, [saasConfig]);

  const escolinhasComFinanceiro = escolinhas.filter(e => e.financeiro);
  
  const filteredEscolinhas = escolinhasComFinanceiro.filter(e => {
    const matchesSearch = e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || e.financeiro?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Financial stats
  const totalEmDia = escolinhasComFinanceiro.filter(e => e.financeiro?.status === 'em_dia').length;
  const totalAtrasado = escolinhasComFinanceiro.filter(e => e.financeiro?.status === 'atrasado').length;
  const totalSuspenso = escolinhasComFinanceiro.filter(e => e.financeiro?.status === 'suspenso').length;

  const receitaPorPlano = planos.map(plano => {
    const escolinhasPlano = escolinhasComFinanceiro.filter(e => e.financeiro?.plano_id === plano.id);
    const receita = escolinhasPlano.reduce((sum, e) => sum + (e.financeiro?.valor_mensal || 0), 0);
    return { plano: plano.nome, quantidade: escolinhasPlano.length, receita };
  }).filter(p => p.quantidade > 0);

  // Total expected monthly revenue from all plans
  const totalReceitaEsperada = receitaPorPlano.reduce((sum, p) => sum + p.receita, 0);

  // Unread notifications count
  const unreadNotifications = notificacoes.filter(n => !n.lido).length;

  // Group historico by month
  const cobrancasPorMes = useMemo(() => {
    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const grouped: Record<string, HistoricoCobranca[]> = {};
    
    historicoCobrancas.forEach(h => {
      const mes = h.mes_referencia;
      if (!grouped[mes]) {
        grouped[mes] = [];
      }
      grouped[mes].push(h);
    });

    const result: MesCobrancas[] = Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
      .map(([mes, cobrancas]) => {
        const date = parseISO(mes);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const totalPago = cobrancas
          .filter(c => c.status === 'pago')
          .reduce((sum, c) => sum + Number(c.valor), 0);
        
        const totalPendente = cobrancas
          .filter(c => c.status !== 'pago')
          .reduce((sum, c) => sum + Number(c.valor), 0);

        return {
          mes,
          mesLabel: `${monthNames[month]} ${year}`,
          cobrancas: cobrancas.sort((a, b) => {
            const nomeA = (a.escolinha as any)?.nome || '';
            const nomeB = (b.escolinha as any)?.nome || '';
            return nomeA.localeCompare(nomeB);
          }),
          totalPago,
          totalPendente,
          total: totalPago + totalPendente
        };
      });

    return result;
  }, [historicoCobrancas]);

  const toggleMonth = (mes: string) => {
    setOpenMonths(prev => 
      prev.includes(mes) 
        ? prev.filter(m => m !== mes) 
        : [...prev, mes]
    );
  };

  const handleGenerateBilling = async () => {
    try {
      await generateBilling.mutateAsync({});
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const handleSaveConfig = async () => {
    try {
      for (const [chave, valor] of Object.entries(configValues)) {
        await updateSaasConfig.mutateAsync({ chave, valor });
      }
      setShowConfigDialog(false);
      toast.success('Configurações salvas!');
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Centro de controle financeiro do SaaS</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowNotificationsDialog(true)}
            className="relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowConfigDialog(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleGenerateBilling}
            disabled={generateBilling.isPending}
            className="gap-2"
          >
            {generateBilling.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Gerar Cobranças
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats?.receitaMensalEstimada?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Dia</p>
                <p className="text-2xl font-bold text-foreground">{totalEmDia}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atrasados</p>
                <p className="text-2xl font-bold text-foreground">{totalAtrasado}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/20">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspensos</p>
                <p className="text-2xl font-bold text-foreground">{totalSuspenso}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mensal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="escolinhas">Escolinhas</TabsTrigger>
          <TabsTrigger value="planos">Por Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Histórico Mensal de Cobranças
              </CardTitle>
              <CardDescription>Pagamentos das escolinhas organizados por mês (PIX via Asaas)</CardDescription>
            </CardHeader>
            <CardContent>
              {cobrancasPorMes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum histórico de cobrança encontrado.</p>
                  <p className="text-sm mt-2">Clique em "Gerar Cobranças" para criar cobranças PIX.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cobrancasPorMes.map((mesData) => (
                    <Collapsible 
                      key={mesData.mes} 
                      open={openMonths.includes(mesData.mes)}
                      onOpenChange={() => toggleMonth(mesData.mes)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                              <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{mesData.mesLabel}</h3>
                              <p className="text-sm text-muted-foreground">
                                {mesData.cobrancas.length} {mesData.cobrancas.length === 1 ? 'escolinha' : 'escolinhas'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Recebido</p>
                              <p className="font-semibold text-emerald-500">
                                R$ {mesData.totalPago.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Pendente</p>
                              <p className="font-semibold text-amber-500">
                                R$ {mesData.totalPendente.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Total</p>
                              <p className="font-bold text-foreground">
                                R$ {mesData.total.toFixed(2)}
                              </p>
                            </div>
                            {openMonths.includes(mesData.mes) ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="mt-2 border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Escolinha</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Vencimento</TableHead>
                                <TableHead className="text-right">Pago em</TableHead>
                                <TableHead className="text-center">PIX</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mesData.cobrancas.map((cobranca) => (
                                <TableRow key={cobranca.id}>
                                  <TableCell className="font-medium">
                                    {(cobranca.escolinha as any)?.nome || 'Escolinha não encontrada'}
                                  </TableCell>
                                  <TableCell>
                                    {(cobranca.plano as any)?.nome || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    R$ {Number(cobranca.valor).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={statusCobrancaColors[cobranca.status] || ''}>
                                      {statusCobrancaLabels[cobranca.status] || cobranca.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center text-muted-foreground">
                                    {cobranca.data_vencimento 
                                      ? format(parseLocalDate(cobranca.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'
                                    }
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {cobranca.data_pagamento 
                                      ? format(parseLocalDate(cobranca.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'
                                    }
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {cobranca.abacatepay_url ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(cobranca.abacatepay_url!, '_blank')}
                                        className="gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Link
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escolinhas">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Escolinhas</CardTitle>
                  <CardDescription>Status financeiro de cada escolinha</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="em_dia">Em Dia</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEscolinhas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma escolinha encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEscolinhas.map((escolinha) => (
                    <div 
                      key={escolinha.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                          <School className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{escolinha.nome}</h3>
                          <p className="text-sm text-muted-foreground">
                            {escolinha.financeiro?.plano?.nome || 'Sem plano'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            R$ {escolinha.financeiro?.valor_mensal?.toFixed(2) || '0,00'}
                          </p>
                          <p className="text-xs text-muted-foreground">por mês</p>
                        </div>
                        
                        <Select
                          value={escolinha.financeiro?.status || 'em_dia'}
                          onValueChange={(v) => updateFinanceiroStatus.mutate({ 
                            escolinhaId: escolinha.id, 
                            status: v as StatusFinanceiro 
                          })}
                          disabled={updateFinanceiroStatus.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_dia">Em Dia</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>

                        <Badge className={financeiroColors[escolinha.financeiro?.status || 'em_dia']}>
                          {financeiroLabels[escolinha.financeiro?.status || 'em_dia']}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Plano</CardTitle>
              <CardDescription>Distribuição de escolinhas e receita por plano</CardDescription>
            </CardHeader>
            <CardContent>
              {receitaPorPlano.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma escolinha com plano ativo.
                </div>
              ) : (
                <div className="space-y-4">
                  {receitaPorPlano.map(({ plano, quantidade, receita }) => (
                    <div 
                      key={plano}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                          <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{plano}</h3>
                          <p className="text-sm text-muted-foreground">
                            {quantidade} {quantidade === 1 ? 'escolinha' : 'escolinhas'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-500">
                          R$ {receita.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">receita mensal</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-emerald-500">
                        R$ {totalReceitaEsperada.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de Cobrança
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros de cobrança automática
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dias_vencimento">Dia do Vencimento</Label>
              <Input
                id="dias_vencimento"
                type="number"
                min="1"
                max="28"
                value={configValues.dias_vencimento || '10'}
                onChange={(e) => setConfigValues(prev => ({ ...prev, dias_vencimento: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Dia do mês para vencimento das cobranças (1-28)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dias_carencia">Dias para Suspensão</Label>
              <Input
                id="dias_carencia"
                type="number"
                min="1"
                max="60"
                value={configValues.dias_carencia_suspensao || '15'}
                onChange={(e) => setConfigValues(prev => ({ ...prev, dias_carencia_suspensao: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Dias de atraso antes de suspender a escolinha
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificar_dias">Dias para Notificação</Label>
              <Input
                id="notificar_dias"
                value={configValues.notificar_atraso_dias || '5,10,15'}
                onChange={(e) => setConfigValues(prev => ({ ...prev, notificar_atraso_dias: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Dias de atraso para enviar notificações (separados por vírgula)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateSaasConfig.isPending}>
              {updateSaasConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações de Inadimplência
            </DialogTitle>
            <DialogDescription>
              Alertas de atrasos e suspensões
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {notificacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-4 rounded-lg border ${notif.lido ? 'bg-secondary/20' : 'bg-secondary/50 border-primary/30'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {notif.tipo === 'pagamento_confirmado' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      ) : notif.tipo === 'suspensao' ? (
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm text-foreground">{notif.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notif.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {!notif.lido && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationRead.mutate(notif.id)}
                      >
                        Marcar lida
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinanceiroPage;
