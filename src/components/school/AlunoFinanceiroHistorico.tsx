import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  CreditCard,
  Ban,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  QrCode,
  Trash2,
  RefreshCw,
  Loader2,
  GraduationCap,
  Shirt,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface MensalidadeDetail {
  id: string;
  crianca_id: string;
  crianca_nome: string;
  mes_referencia: string;
  valor: number;
  valor_pago: number | null;
  status: string;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  abacatepay_url: string | null;
  abacatepay_billing_id: string | null;
}

interface CobrancaEntrada {
  id: string;
  crianca_id: string;
  crianca_nome: string;
  valor_matricula: number;
  valor_uniforme: number;
  valor_mensalidade: number;
  status: string;
  data_pagamento: string | null;
  created_at: string;
}

interface AlunoFinanceiroHistoricoProps {
  mensalidades: MensalidadeDetail[];
  onMarkAsPaid: (mensalidade: MensalidadeDetail) => void;
  onMarkAsExempt: (mensalidade: MensalidadeDetail) => void;
}

const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const monthNamesFull = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatMesReferencia = (mes: string) => {
  const [year, month] = mes.split('-');
  return `${monthNamesFull[parseInt(month)]}/${year}`;
};

const formatMesShort = (mes: string) => {
  const [year, month] = mes.split('-');
  return `${monthNames[parseInt(month)]}/${year.slice(2)}`;
};

const AlunoFinanceiroHistorico = ({ 
  mensalidades, 
  onMarkAsPaid, 
  onMarkAsExempt 
}: AlunoFinanceiroHistoricoProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mensalidadeToDelete, setMensalidadeToDelete] = useState<MensalidadeDetail | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Fetch cobrancas_entrada for matricula/uniforme
  const { data: cobrancasEntrada = [] } = useQuery({
    queryKey: ['school-cobrancas-entrada', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select(`
          id,
          crianca_id,
          valor_matricula,
          valor_uniforme,
          valor_mensalidade,
          status,
          data_pagamento,
          created_at,
          crianca:criancas(nome)
        `)
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');

      if (error) throw error;
      
      return (data || []).map(c => ({
        id: c.id,
        crianca_id: c.crianca_id,
        crianca_nome: (c.crianca as any)?.nome || 'Desconhecido',
        valor_matricula: Number(c.valor_matricula) || 0,
        valor_uniforme: Number(c.valor_uniforme) || 0,
        valor_mensalidade: Number(c.valor_mensalidade) || 0,
        status: c.status,
        data_pagamento: c.data_pagamento,
        created_at: c.created_at,
      })) as CobrancaEntrada[];
    },
    enabled: !!user?.escolinhaId,
  });
  // Cancel mutation - cancels in Asaas and updates status to 'cancelado'
  const deleteMutation = useMutation({
    mutationFn: async (mensalidadeId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-mensalidade-payment', {
        body: { mensalidadeId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao cancelar cobrança');
      return data;
    },
    onSuccess: () => {
      toast.success('Cobrança cancelada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-detail'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-mensalidades'] });
      queryClient.invalidateQueries({ queryKey: ['mensalidades-historico'] });
      setDeleteDialogOpen(false);
      setMensalidadeToDelete(null);
    },
    onError: (error: Error) => {
      console.error('Error cancelling mensalidade:', error);
      toast.error('Erro ao cancelar cobrança: ' + error.message);
    },
  });

  // Regenerate PIX mutation
  const regeneratePixMutation = useMutation({
    mutationFn: async (mensalidadeId: string) => {
      setRegeneratingId(mensalidadeId);
      const { data, error } = await supabase.functions.invoke('generate-mensalidade-pix', {
        body: { mensalidade_id: mensalidadeId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar PIX');
      return data;
    },
    onSuccess: () => {
      toast.success('PIX gerado com sucesso! Link disponível.');
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-detail'] });
      setRegeneratingId(null);
    },
    onError: (error: Error) => {
      console.error('Error regenerating PIX:', error);
      toast.error('Erro ao gerar PIX: ' + error.message);
      setRegeneratingId(null);
    },
  });

  const handleDeleteClick = (mensalidade: MensalidadeDetail) => {
    setMensalidadeToDelete(mensalidade);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (mensalidadeToDelete) {
      deleteMutation.mutate(mensalidadeToDelete.id);
    }
  };

  const handleRegeneratePix = (mensalidade: MensalidadeDetail) => {
    regeneratePixMutation.mutate(mensalidade.id);
  };

  // Group mensalidades by student and add cobrancas_entrada
  // IMPORTANTE: Exclui mensalidades canceladas para evitar mostrar cobranças inválidas
  const alunosMensalidades = useMemo(() => {
    // Filtra mensalidades canceladas antes de agrupar
    const mensalidadesAtivas = mensalidades.filter(m => m.status !== 'cancelado');
    
    const grouped = mensalidadesAtivas.reduce((acc, m) => {
      if (!acc[m.crianca_id]) {
        acc[m.crianca_id] = {
          id: m.crianca_id,
          nome: m.crianca_nome,
          mensalidades: [],
          cobrancaEntrada: null as CobrancaEntrada | null,
        };
      }
      acc[m.crianca_id].mensalidades.push(m);
      return acc;
    }, {} as Record<string, { id: string; nome: string; mensalidades: MensalidadeDetail[]; cobrancaEntrada: CobrancaEntrada | null }>);

    // Add cobrancas entrada for students who only have enrollment (no mensalidades yet)
    cobrancasEntrada.forEach(c => {
      if (!grouped[c.crianca_id]) {
        grouped[c.crianca_id] = {
          id: c.crianca_id,
          nome: c.crianca_nome,
          mensalidades: [],
          cobrancaEntrada: c,
        };
      } else {
        grouped[c.crianca_id].cobrancaEntrada = c;
      }
    });

    return grouped;
  }, [mensalidades, cobrancasEntrada]);

  // Convert to array and calculate stats
  const alunosArray = useMemo(() => Object.values(alunosMensalidades).map(aluno => {
    // Sort mensalidades by date (newest first)
    aluno.mensalidades.sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));
    
    // Count mensalidades - include 1ª mensalidade from cobranca_entrada if exists
    const primeiraMensalidadePaga = aluno.cobrancaEntrada && aluno.cobrancaEntrada.valor_mensalidade > 0 ? 1 : 0;
    const totalMensalidades = aluno.mensalidades.length + primeiraMensalidadePaga;
    const pagas = aluno.mensalidades.filter(m => m.status === 'pago').length + primeiraMensalidadePaga;
    const aVencer = aluno.mensalidades.filter(m => m.status === 'a_vencer').length;
    const atrasadas = aluno.mensalidades.filter(m => m.status === 'atrasado').length;
    const isentas = aluno.mensalidades.filter(m => m.status === 'isento').length;
    
    // Include matricula/uniforme/mensalidade inicial in totalPago
    const entradaPago = aluno.cobrancaEntrada 
      ? (aluno.cobrancaEntrada.valor_matricula || 0) + (aluno.cobrancaEntrada.valor_uniforme || 0) + (aluno.cobrancaEntrada.valor_mensalidade || 0)
      : 0;
    
    const totalPago = aluno.mensalidades
      .filter(m => m.status === 'pago')
      .reduce((acc, m) => acc + Number(m.valor_pago || m.valor), 0) + entradaPago;
    
    const totalPendente = aluno.mensalidades
      .filter(m => m.status !== 'pago' && m.status !== 'isento')
      .reduce((acc, m) => acc + Number(m.valor), 0);

    // Calculate payment rate
    const mensalidadesCobraveis = totalMensalidades - isentas;
    const taxaAdimplencia = mensalidadesCobraveis > 0 
      ? Math.round((pagas / mensalidadesCobraveis) * 100) 
      : 100;

    return {
      ...aluno,
      stats: {
        total: totalMensalidades,
        pagas,
        aVencer,
        atrasadas,
        isentas,
        totalPago,
        totalPendente,
        taxaAdimplencia
      }
    };
  }), [alunosMensalidades]);

  // Filter students
  const filteredAlunos = alunosArray.filter(aluno => {
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'em_dia') return matchesSearch && aluno.stats.atrasadas === 0 && aluno.stats.aVencer === 0;
    if (filterStatus === 'a_vencer') return matchesSearch && aluno.stats.aVencer > 0;
    if (filterStatus === 'atrasado') return matchesSearch && aluno.stats.atrasadas > 0;
    
    return matchesSearch;
  });

  // Sort by name
  filteredAlunos.sort((a, b) => a.nome.localeCompare(b.nome));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'atrasado':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'isento':
        return <Minus className="w-4 h-4 text-blue-500" />;
      case 'a_vencer':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pago: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      atrasado: 'bg-destructive/10 text-destructive border-destructive/20',
      isento: 'bg-muted text-muted-foreground border-muted',
      a_vencer: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
    const labels = { pago: 'Pago', atrasado: 'Atrasado', isento: 'Isento', a_vencer: 'A Vencer' };
    
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.a_vencer}>
        {labels[status as keyof typeof labels] || 'A Vencer'}
      </Badge>
    );
  };

  const getAdimplenciaIndicator = (taxa: number) => {
    if (taxa >= 90) return { icon: TrendingUp, color: 'text-emerald-500', label: 'Excelente' };
    if (taxa >= 70) return { icon: Minus, color: 'text-amber-500', label: 'Regular' };
    return { icon: TrendingDown, color: 'text-destructive', label: 'Atenção' };
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Histórico por Aluno
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Visão mensal de pagamentos de cada aluno</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em_dia">Em dia</SelectItem>
                  <SelectItem value="a_vencer">A vencer</SelectItem>
                  <SelectItem value="atrasado">Com atrasos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlunos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aluno encontrado.
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredAlunos.map((aluno) => {
                const adimplencia = getAdimplenciaIndicator(aluno.stats.taxaAdimplencia);
                const AdimplenciaIcon = adimplencia.icon;
                
                return (
                  <AccordionItem 
                    key={aluno.id} 
                    value={aluno.id}
                    className="border rounded-lg bg-secondary/20 px-3 sm:px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3 sm:py-4">
                      <div className="flex flex-1 items-center justify-between pr-2 sm:pr-4 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left min-w-0">
                            <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">{aluno.nome}</h4>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>{aluno.stats.total} mensalidades</span>
                              <span className="hidden sm:inline">•</span>
                              <span className={`${adimplencia.color}`}>
                                {aluno.stats.taxaAdimplencia}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile summary badges */}
                        <div className="flex sm:hidden items-center gap-1 flex-shrink-0">
                          {aluno.stats.atrasadas > 0 && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs px-1.5">
                              {aluno.stats.atrasadas}
                            </Badge>
                          )}
                          {aluno.stats.aVencer > 0 && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs px-1.5">
                              {aluno.stats.aVencer}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Desktop summary badges */}
                        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                          {aluno.stats.pagas > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-600">{aluno.stats.pagas}</span>
                            </div>
                          )}
                          {aluno.stats.aVencer > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600">{aluno.stats.aVencer}</span>
                            </div>
                          )}
                          {aluno.stats.atrasadas > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-destructive">{aluno.stats.atrasadas}</span>
                            </div>
                          )}
                          
                          {aluno.stats.totalPendente > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              R$ {aluno.stats.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pb-3 sm:pb-4">
                      {/* Summary cards */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-4">
                        <div className="p-2 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs text-muted-foreground">Total Pago</p>
                          <p className="text-sm sm:text-lg font-bold text-emerald-600">
                            R$ {aluno.stats.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-2 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs text-muted-foreground">Pendente</p>
                          <p className="text-sm sm:text-lg font-bold text-amber-600">
                            R$ {aluno.stats.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-2 sm:p-3 rounded-lg bg-secondary/50 border border-border/50">
                          <p className="text-xs text-muted-foreground">Mensalidades</p>
                          <p className="text-sm sm:text-lg font-bold text-foreground">{aluno.stats.total}</p>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg border ${
                          aluno.stats.taxaAdimplencia >= 90 
                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                            : aluno.stats.taxaAdimplencia >= 70 
                              ? 'bg-amber-500/10 border-amber-500/20'
                              : 'bg-destructive/10 border-destructive/20'
                        }`}>
                          <p className="text-xs text-muted-foreground">Adimplência</p>
                          <div className="flex items-center gap-1">
                            <AdimplenciaIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${adimplencia.color}`} />
                            <p className={`text-sm sm:text-lg font-bold ${adimplencia.color}`}>
                              {aluno.stats.taxaAdimplencia}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Monthly timeline */}
                      <div className="space-y-2">
                        <h5 className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          Histórico de Mensalidades
                        </h5>
                        <div className="space-y-1">
                          {aluno.mensalidades.map((m) => (
                            <div 
                              key={m.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg bg-background/50 border border-border/30 gap-2"
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                {/* PIX indicator when URL exists */}
                                {m.abacatepay_url && m.status !== 'pago' && m.status !== 'isento' ? (
                                  <div className="relative flex-shrink-0">
                                    {getStatusIcon(m.status)}
                                    <QrCode className="w-3 h-3 text-primary absolute -bottom-1 -right-1" />
                                  </div>
                                ) : (
                                  <span className="flex-shrink-0">{getStatusIcon(m.status)}</span>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-xs sm:text-sm text-foreground truncate">
                                    {formatMesReferencia(m.mes_referencia)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    Venc: {format(parseLocalDate(m.data_vencimento), 'dd/MM/yy')}
                                    {m.data_pagamento && (
                                      <span className="hidden sm:inline"> • Pago em {format(parseLocalDate(m.data_pagamento), 'dd/MM/yy')}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                                <div className="text-right">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground">
                                    R$ {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  {m.valor_pago && m.valor_pago !== m.valor && (
                                    <p className="text-xs text-muted-foreground hidden sm:block">
                                      Pago: R$ {Number(m.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                </div>
                                
                                {getStatusBadge(m.status)}
                                
                                {m.status !== 'pago' && m.status !== 'isento' && (
                                  <div className="flex gap-1">
                                    {/* PIX Link - if exists */}
                                    {m.abacatepay_url && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 gap-1"
                                        asChild
                                      >
                                        <a 
                                          href={m.abacatepay_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          title="Abrir link de pagamento PIX"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <QrCode className="w-3 h-3" />
                                        </a>
                                      </Button>
                                    )}
                                    
                                    {/* Regenerate PIX */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegeneratePix(m);
                                      }}
                                      disabled={regeneratingId === m.id}
                                      title={m.abacatepay_url ? "Regenerar PIX" : "Gerar PIX"}
                                    >
                                      {regeneratingId === m.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" />
                                      )}
                                    </Button>
                                    
                                    {/* Mark as paid */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsPaid(m);
                                      }}
                                      title="Marcar como Pago"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                    </Button>
                                    
                                    {/* Mark as exempt */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsExempt(m);
                                      }}
                                      title="Marcar como Isento"
                                    >
                                      <Ban className="w-3 h-3" />
                                    </Button>
                                    
                                    {/* Delete */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(m);
                                      }}
                                      title="Excluir cobrança"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Matrícula, Uniforme e 1ª Mensalidade section */}
                      {aluno.cobrancaEntrada && (aluno.cobrancaEntrada.valor_matricula > 0 || aluno.cobrancaEntrada.valor_uniforme > 0 || aluno.cobrancaEntrada.valor_mensalidade > 0) && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-border/30">
                          <h5 className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                            Matrícula e Uniforme
                          </h5>
                          <div className="space-y-1">
                            {aluno.cobrancaEntrada.valor_matricula > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm text-foreground">Matrícula</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {aluno.cobrancaEntrada.data_pagamento && (
                                        <>Pago em {format(new Date(aluno.cobrancaEntrada.data_pagamento), 'dd/MM/yy')}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground">
                                    R$ {aluno.cobrancaEntrada.valor_matricula.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    Pago
                                  </Badge>
                                </div>
                              </div>
                            )}
                            {aluno.cobrancaEntrada.valor_uniforme > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <Shirt className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm text-foreground">Uniforme</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {aluno.cobrancaEntrada.data_pagamento && (
                                        <>Pago em {format(new Date(aluno.cobrancaEntrada.data_pagamento), 'dd/MM/yy')}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground">
                                    R$ {aluno.cobrancaEntrada.valor_uniforme.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    Pago
                                  </Badge>
                                </div>
                              </div>
                            )}
                            {aluno.cobrancaEntrada.valor_mensalidade > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm text-foreground">1ª Mensalidade</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {aluno.cobrancaEntrada.data_pagamento && (
                                        <>Pago em {format(new Date(aluno.cobrancaEntrada.data_pagamento), 'dd/MM/yy')}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground">
                                    R$ {aluno.cobrancaEntrada.valor_mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    Pago
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cobrança de{' '}
              <strong>{mensalidadeToDelete && formatMesReferencia(mensalidadeToDelete.mes_referencia)}</strong>
              {' '}no valor de{' '}
              <strong>R$ {mensalidadeToDelete?.valor.toFixed(2).replace('.', ',')}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Se houver uma cobrança PIX gerada no Asaas, ela será cancelada automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AlunoFinanceiroHistorico;
