import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolChildren } from '@/hooks/useSchoolData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  Ban,
  List,
  User,
  Building2,
  ExternalLink,
  Clock,
  RefreshCw,
  Send,
  Landmark,
  FileBarChart
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import MensalidadeActionsDialog from '@/components/school/MensalidadeActionsDialog';
import AlunoFinanceiroHistorico from '@/components/school/AlunoFinanceiroHistorico';
import PixCheckoutDialog from '@/components/school/PixCheckoutDialog';
import CadastroBancarioForm from '@/components/school/CadastroBancarioForm';
import GenerateBillingDialog from '@/components/school/GenerateBillingDialog';
import FinancialReportSection from '@/components/school/FinancialReportSection';
import MonthlyBillingReport from '@/components/school/MonthlyBillingReport';
import { ClipboardList } from 'lucide-react';
import { useStudentRegistration } from '@/contexts/StudentRegistrationContext';

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

interface GrowthData {
  mes: string;
  mesLabel: string;
  alunos: number;
  receita: number;
}

const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatMesReferencia = (mes: string) => {
  const [year, month] = mes.split('-');
  return `${monthNames[parseInt(month)]}/${year}`;
};

// SaaS billing types
interface HistoricoCobrancaSaas {
  id: string;
  escolinha_id: string;
  mes_referencia: string;
  valor: number;
  status: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  abacatepay_url: string | null;
  plano?: { nome: string } | null;
}

interface EscolinhaFinanceiro {
  id: string;
  escolinha_id: string;
  plano_id: string | null;
  valor_mensal: number | null;
  status: string;
  data_inicio_cobranca: string | null;
  plano?: { nome: string; valor_mensal: number } | null;
}

const statusCobrancaLabels: Record<string, string> = {
  pago: 'Pago',
  a_vencer: 'A Vencer',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado'
};

const statusCobrancaColors: Record<string, string> = {
  pago: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  a_vencer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  atrasado: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground border-muted'
};

const SchoolFinanceiroPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  
  // Action dialog state
  const [selectedMensalidade, setSelectedMensalidade] = useState<MensalidadeDetail | null>(null);
  const [actionType, setActionType] = useState<'pagar' | 'isentar' | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  // PIX Checkout state
  const [pixCheckoutOpen, setPixCheckoutOpen] = useState(false);
  const [selectedCobranca, setSelectedCobranca] = useState<HistoricoCobrancaSaas | null>(null);

  // Generate billing dialog state
  const [generateBillingDialogOpen, setGenerateBillingDialogOpen] = useState(false);

  const { data: children = [] } = useSchoolChildren();
  const { openEditDialog } = useStudentRegistration();

  // Fetch escola status for tab styling AND cadastro bancario for API key check
  const { data: escolinha } = useQuery({
    queryKey: ['escola-status-financeiro', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;
      
      // Fetch escola status
      const { data: escolaData, error: escolaError } = await supabase
        .from('escolinhas')
        .select('status_financeiro_escola')
        .eq('id', user.escolinhaId)
        .single();
      if (escolaError) throw escolaError;
      
      // Fetch cadastro bancario to check for API key
      const { data: cadastroData } = await supabase
        .from('escola_cadastro_bancario')
        .select('asaas_api_key, asaas_status')
        .eq('escolinha_id', user.escolinhaId)
        .maybeSingle();
      
      return {
        status_financeiro_escola: escolaData?.status_financeiro_escola,
        hasAsaasApiKey: !!cadastroData?.asaas_api_key,
        asaasStatus: cadastroData?.asaas_status
      };
    },
    enabled: !!user?.escolinhaId,
  });

  const statusFinanceiroEscola = escolinha?.status_financeiro_escola || 'NAO_CONFIGURADO';
  // Allow billing generation if:
  // 1. status_financeiro_escola is APROVADO, OR
  // 2. There's an asaas_api_key available (even if status is EM_ANALISE - this handles edge cases)
  const isCadastroBancarioAprovado = statusFinanceiroEscola === 'APROVADO' || 
    (escolinha?.hasAsaasApiKey && (escolinha?.asaasStatus === 'approved' || statusFinanceiroEscola === 'EM_ANALISE'));

  // Fetch SaaS subscription info
  const { data: escolinhaFinanceiro } = useQuery({
    queryKey: ['escola-financeiro', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;

      const { data, error } = await supabase
        .from('escolinha_financeiro')
        .select(`
          id,
          escolinha_id,
          plano_id,
          valor_mensal,
          status,
          data_inicio_cobranca,
          plano:planos_saas(nome, valor_mensal)
        `)
        .eq('escolinha_id', user.escolinhaId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EscolinhaFinanceiro | null;
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch SaaS billing history
  const { data: historicoSaas = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['escola-historico-saas', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('historico_cobrancas')
        .select(`
          id,
          escolinha_id,
          mes_referencia,
          valor,
          status,
          data_vencimento,
          data_pagamento,
          metodo_pagamento,
          abacatepay_url,
          plano:planos_saas(nome)
        `)
        .eq('escolinha_id', user.escolinhaId)
        .order('mes_referencia', { ascending: false });

      if (error) throw error;
      return (data || []) as HistoricoCobrancaSaas[];
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch detailed mensalidades
  const { data: mensalidades = [], isLoading: loadingMensalidades } = useQuery({
    queryKey: ['school-mensalidades-detail', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          id,
          crianca_id,
          mes_referencia,
          valor,
          valor_pago,
          status,
          data_vencimento,
          data_pagamento,
          forma_pagamento,
          observacoes,
          abacatepay_url,
          abacatepay_billing_id
        `)
        .eq('escolinha_id', user.escolinhaId)
        .order('mes_referencia', { ascending: false });

      if (error) throw error;

      // Map crianca names
      const result = data?.map(m => {
        const crianca = children.find(c => c.id === m.crianca_id);
        return {
          ...m,
          crianca_nome: crianca?.nome || 'Aluno não encontrado'
        } as MensalidadeDetail;
      }) || [];

      return result;
    },
    enabled: !!user?.escolinhaId && children.length > 0,
  });

  // Fetch cobrancas_entrada (enrollment/uniform payments) for total revenue calculations
  const { data: cobrancasEntrada = [] } = useQuery({
    queryKey: ['escola-cobrancas-entrada', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select(`
          id,
          status,
          valor_total,
          valor_matricula,
          valor_uniforme,
          valor_mensalidade,
          data_pagamento,
          created_at
        `)
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch growth data for charts (includes mensalidades + cobrancas_entrada)
  const { data: growthData = [] } = useQuery({
    queryKey: ['school-growth-data', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const months: { mes: string; year: number; month: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push({
          mes: `${y}-${String(m).padStart(2, '0')}-01`,
          year: y,
          month: m
        });
      }

      const mesReferences = months.map(m => m.mes);

      // Fetch mensalidades for these months
      const { data: mensalidadesData } = await supabase
        .from('mensalidades')
        .select('mes_referencia, valor_pago, status, data_pagamento')
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');

      // Fetch cobrancas_entrada pagas
      const { data: entradasData } = await supabase
        .from('cobrancas_entrada')
        .select('valor_matricula, valor_uniforme, valor_mensalidade, data_pagamento')
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');

      // Fetch students with data_inicio
      const { data: criancaEscolinhas } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id, data_inicio')
        .eq('escolinha_id', user.escolinhaId)
        .eq('ativo', true);

      const result: GrowthData[] = months.map(({ mes, month, year }) => {
        // Receita de mensalidades – agora usa MÊS DE REFERÊNCIA (competência), não data de pagamento
        const mensalidadesMes = mensalidadesData?.filter(m => {
          if (!m.mes_referencia) return false;
          const [refY, refM] = m.mes_referencia.split('-').map(Number);
          return refY === year && refM === month;
        }) || [];
        const receitaMensalidades = mensalidadesMes.reduce((acc, m) => acc + Number(m.valor_pago || 0), 0);

        // Receita de matrículas/uniformes pagas neste mês – ainda por caixa (data pagamento)
        // TODO: quando implementar mes_referencia_primeira_mensalidade, ajustar também
        const entradasMes = entradasData?.filter(e => {
          if (!e.data_pagamento) return false;
          const payDate = new Date(e.data_pagamento);
          return payDate.getFullYear() === year && (payDate.getMonth() + 1) === month;
        }) || [];
        const receitaEntradas = entradasMes.reduce((acc, e) => {
          return acc + Number(e.valor_matricula || 0) + Number(e.valor_uniforme || 0) + Number(e.valor_mensalidade || 0);
        }, 0);

        const receita = receitaMensalidades + receitaEntradas;

        // Count students that were enrolled up to this month
        const endOfMonth = new Date(year, month, 0);
        const alunosAteMes = criancaEscolinhas?.filter(ce => {
          const dataInicio = new Date(ce.data_inicio);
          return dataInicio <= endOfMonth;
        }).length || 0;

        return {
          mes,
          mesLabel: monthNames[month],
          alunos: alunosAteMes,
          receita
        };
      });

      return result;
    },
    enabled: !!user?.escolinhaId,
  });

  // Mutation for updating mensalidade
  const updateMensalidade = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      dataPagamento, 
      valorPago, 
      observacao 
    }: { 
      id: string; 
      status: string; 
      dataPagamento?: string; 
      valorPago?: number; 
      observacao?: string; 
    }) => {
      // First, get the mensalidade to check if it has an Asaas payment
      const { data: mensalidade, error: fetchError } = await supabase
        .from('mensalidades')
        .select('abacatepay_billing_id')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // If marking as paid and there's an Asaas payment, cancel it first
      if (status === 'pago' && mensalidade?.abacatepay_billing_id) {
        try {
          // Call edge function to cancel the Asaas payment
          const { data: cancelResult, error: cancelError } = await supabase.functions.invoke(
            'cancel-asaas-payment-only',
            { body: { mensalidadeId: id } }
          );
          
          if (cancelError) {
            console.warn('Could not cancel Asaas payment, proceeding anyway:', cancelError);
          } else {
            console.log('Asaas payment cancelled:', cancelResult);
          }
        } catch (cancelErr) {
          console.warn('Error cancelling Asaas payment, proceeding anyway:', cancelErr);
        }
      }
      
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'pago') {
        updateData.data_pagamento = dataPagamento;
        updateData.valor_pago = valorPago;
        updateData.forma_pagamento = 'manual';
        // Clear Asaas payment data since we cancelled/paid manually
        updateData.abacatepay_billing_id = null;
        updateData.abacatepay_url = null;
      }
      
      if (observacao) {
        updateData.observacoes = observacao;
      }

      const { error } = await supabase
        .from('mensalidades')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-detail'] });
      queryClient.invalidateQueries({ queryKey: ['school-growth-data'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
      // Only show toast if it's not a manual payment with Asaas (dialog handles that)
      if (variables.status !== 'pago') {
        toast.success('Mensalidade atualizada com sucesso!');
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar mensalidade: ' + error.message);
    },
  });

  // Mutation for generating student billings via Asaas
  const generateStudentBilling = useMutation({
    mutationFn: async (mesReferencia: string) => {
      const { data, error } = await supabase.functions.invoke('generate-student-billing-asaas', {
        body: { 
          escolinha_id: user?.escolinhaId,
          mes_referencia: mesReferencia 
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar cobranças');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-detail'] });
      setGenerateBillingDialogOpen(false);
      if (data?.summary) {
        const { created, already_exists, skipped, errors } = data.summary;
        toast.success(`Cobranças geradas: ${created} novas, ${already_exists} já existentes, ${skipped} ignoradas, ${errors} erros`);
      } else {
        toast.success('Cobranças geradas com sucesso!');
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar cobranças: ' + error.message);
    },
  });

  const handleGenerateBilling = async (mesReferencia: string) => {
    await generateStudentBilling.mutateAsync(mesReferencia);
  };

  // Handle action dialog confirm
  const handleActionConfirm = async (data: { dataPagamento?: string; valorPago?: number; observacao?: string }) => {
    if (!selectedMensalidade || !actionType) return;

    await updateMensalidade.mutateAsync({
      id: selectedMensalidade.id,
      status: actionType === 'pagar' ? 'pago' : 'isento',
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago,
      observacao: data.observacao,
    });

    setActionDialogOpen(false);
    setSelectedMensalidade(null);
    setActionType(null);
  };

  const openActionDialog = (mensalidade: MensalidadeDetail, action: 'pagar' | 'isentar') => {
    setSelectedMensalidade(mensalidade);
    setActionType(action);
    setActionDialogOpen(true);
  };

  // Get unique months for filter
  const uniqueMonths = [...new Set(mensalidades.map(m => m.mes_referencia))].sort().reverse();

  const filteredMensalidades = mensalidades.filter(m => {
    const matchesSearch = m.crianca_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchesMonth = filterMonth === 'all' || m.mes_referencia === filterMonth;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  // Calculate totals from mensalidades + cobrancas_entrada (enrollment payments)
  const totalRecebidoMensalidades = mensalidades
    .filter(m => m.status === 'pago')
    .reduce((acc, m) => acc + Number(m.valor_pago || m.valor), 0);
  
  // Add enrollment payments (matrículas, uniformes, first mensalidade)
  const totalRecebidoEntradas = cobrancasEntrada.reduce((acc, ce) => {
    // Soma matrícula + uniforme + mensalidade da entrada
    return acc + Number(ce.valor_matricula || 0) + Number(ce.valor_uniforme || 0) + Number(ce.valor_mensalidade || 0);
  }, 0);
  
  const totalRecebido = totalRecebidoMensalidades + totalRecebidoEntradas;
    
  const totalPendente = mensalidades
    .filter(m => m.status === 'a_vencer' || m.status === 'atrasado')
    .reduce((acc, m) => acc + Number(m.valor), 0);

  const alunosAtivos = children.filter(c => c.ativo && c.status_financeiro === 'ativo').length;
  
  const currentMonthDate = new Date();
  const currentMonthNum = currentMonthDate.getMonth() + 1;
  const currentYearNum = currentMonthDate.getFullYear();
  const currentMonth = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}-01`;
  const nextMonthNum = currentMonthNum === 12 ? 1 : currentMonthNum + 1;
  const nextYearNum = currentMonthNum === 12 ? currentYearNum + 1 : currentYearNum;
  const nextMonth = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01`;
  
  const mensalidadesMesAtual = mensalidades.filter(m => m.mes_referencia === currentMonth).length;

  // Calculate billing status by month for the dialog
  const billingStatusByMonth = useMemo(() => {
    const statusMap: Record<string, { total: number; pending: number; paid: number }> = {};
    
    [currentMonth, nextMonth].forEach(mes => {
      const mesMensalidades = mensalidades.filter(m => m.mes_referencia === mes);
      const paid = mesMensalidades.filter(m => m.status === 'pago').length;
      const pending = mesMensalidades.filter(m => m.status !== 'pago' && m.status !== 'isento').length;
      
      statusMap[mes] = {
        total: mesMensalidades.length,
        pending,
        paid
      };
    });
    
    return statusMap;
  }, [mensalidades, currentMonth, nextMonth]);

  // Monthly summary: previous month, current month, next month (projection)
  const getMonthlySummary = () => {
    const today = new Date();
    const months = [];
    
    // Calcular previsão de receita baseada em alunos ativos pagantes
    const alunosPagantes = children.filter(c => 
      c.ativo && c.status_financeiro === 'ativo'
    );
    const previsaoReceita = alunosPagantes.reduce((acc, c) => 
      acc + Number(c.valor_mensalidade || 170), 0
    );
    
    // Previous month (-1), Current month (0), Next month (+1)
    for (let i = -1; i <= 1; i++) {
      let month = today.getMonth() + 1 + i;
      let year = today.getFullYear();
      if (month <= 0) {
        month += 12;
        year -= 1;
      } else if (month > 12) {
        month -= 12;
        year += 1;
      }
      const mesRef = `${year}-${String(month).padStart(2, '0')}-01`;
      const mesMensalidades = mensalidades.filter(m => m.mes_referencia === mesRef && m.status !== 'cancelado');
      
      const pagos = mesMensalidades.filter(m => m.status === 'pago');
      const pendentes = mesMensalidades.filter(m => m.status !== 'pago' && m.status !== 'isento');
      
      const periodLabel = i === -1 ? 'Mês Anterior' : i === 0 ? 'Mês Atual' : 'Próximo Mês';
      const isProjection = i === 1;
      
      // Para próximo mês, mostrar previsão se não há cobranças geradas
      const hasCobranças = mesMensalidades.length > 0;
      
      months.push({
        mes: mesRef,
        mesLabel: `${monthNames[month]}/${year}`,
        periodLabel,
        isProjection,
        qtdPagos: pagos.length,
        totalPago: pagos.reduce((acc, m) => acc + Number(m.valor_pago || m.valor), 0),
        qtdPendentes: pendentes.length,
        totalPendente: pendentes.reduce((acc, m) => acc + Number(m.valor), 0),
        totalAlunos: mesMensalidades.length,
        // Adicionar previsão para próximo mês
        previsaoReceita: isProjection && !hasCobranças ? previsaoReceita : undefined,
        qtdAlunosPagantes: isProjection && !hasCobranças ? alunosPagantes.length : undefined
      });
    }
    
    return months;
  };

  const monthlySummary = getMonthlySummary();

  if (loadingMensalidades) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground">Controle de mensalidades dos alunos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alunos Ativos</p>
                <p className="text-2xl font-bold text-foreground">{alunosAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensalidades (Mês Atual)</p>
                <p className="text-2xl font-bold text-foreground">{mensalidadesMesAtual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      {monthlySummary.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resumo Mensal</CardTitle>
              <CardDescription>Mês anterior, mês atual e projeção do próximo mês</CardDescription>
            </div>
            <Button
              onClick={() => setGenerateBillingDialogOpen(true)}
              disabled={generateStudentBilling.isPending || !isCadastroBancarioAprovado}
              className="gap-2"
              title={!isCadastroBancarioAprovado ? 'Complete o cadastro bancário primeiro' : ''}
            >
              {generateStudentBilling.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Gerar Cobranças PIX</span>
              <span className="sm:hidden">Cobranças</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {monthlySummary.map((mes) => (
                <div
                  key={mes.mes}
                  className={`p-4 rounded-lg border transition-all ${
                    mes.isProjection 
                      ? 'bg-blue-500/5 border-blue-500/20' 
                      : 'bg-secondary/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{mes.mesLabel}</h4>
                    <Badge variant="outline" className={`text-xs ${
                      mes.isProjection ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''
                    }`}>
                      {mes.periodLabel}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-muted-foreground">Pagos</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {mes.qtdPagos} alunos
                        </Badge>
                        <p className="text-sm font-medium text-emerald-600 mt-1">
                          R$ {mes.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-muted-foreground">Pendentes</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {mes.qtdPendentes} alunos
                        </Badge>
                        <p className="text-sm font-medium text-amber-600 mt-1">
                          R$ {mes.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {mes.totalAlunos === 0 && mes.isProjection && (
                      <div className="pt-2 border-t border-border/50 mt-2">
                        {(mes as any).previsaoReceita ? (
                          <div className="text-center space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Previsão baseada em {(mes as any).qtdAlunosPagantes} alunos pagantes
                            </p>
                            <p className="text-sm font-semibold text-blue-600">
                              Receita estimada: R$ {((mes as any).previsaoReceita as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center">
                            Cobranças ainda não geradas
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Charts */}
      {growthData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base">Crescimento Financeiro</CardTitle>
              </div>
              <CardDescription>Receita nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mesLabel" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                    />
                    <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Crescimento de Alunos</CardTitle>
              </div>
              <CardDescription>Total de alunos nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mesLabel" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Alunos']}
                    />
                    <Line
                      type="monotone"
                      dataKey="alunos"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mensalidades Section with Tabs */}
      <Tabs defaultValue="por-aluno" className="space-y-4">
        <div className="flex items-center justify-between overflow-x-auto">
          <TabsList className="flex-wrap h-auto gap-1 sm:flex-nowrap">
            <TabsTrigger value="por-aluno" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Por Aluno</span>
              <span className="sm:hidden">Alunos</span>
            </TabsTrigger>
            <TabsTrigger value="todas" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Todas as Mensalidades</span>
              <span className="sm:hidden">Todas</span>
            </TabsTrigger>
            <TabsTrigger value="assinatura" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Minha Assinatura</span>
              <span className="sm:hidden">Assinatura</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cadastro-bancario" 
              className={`flex items-center gap-2 ${!isCadastroBancarioAprovado ? 'text-destructive data-[state=active]:text-destructive data-[state=active]:border-destructive' : ''}`}
            >
              <Landmark className={`w-4 h-4 ${!isCadastroBancarioAprovado ? 'text-destructive' : ''}`} />
              <span className={`hidden sm:inline ${!isCadastroBancarioAprovado ? 'text-destructive' : ''}`}>Cadastro Bancário</span>
              <span className={`sm:hidden ${!isCadastroBancarioAprovado ? 'text-destructive' : ''}`}>Bancário</span>
            </TabsTrigger>
            <TabsTrigger value="cobrancas-mes" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Cobranças por Mês</span>
              <span className="sm:hidden">Cobranças</span>
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="flex items-center gap-2">
              <FileBarChart className="w-4 h-4" />
              <span className="hidden sm:inline">Relatório</span>
              <span className="sm:hidden">Relatório</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Por Aluno (Histórico) */}
        <TabsContent value="por-aluno">
          <AlunoFinanceiroHistorico
            mensalidades={mensalidades}
            onMarkAsPaid={(m) => openActionDialog(m, 'pagar')}
            onMarkAsExempt={(m) => openActionDialog(m, 'isentar')}
          />
        </TabsContent>

        {/* Tab: Todas as Mensalidades */}
        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Mensalidades</CardTitle>
                  <CardDescription>Lista detalhada de todas as mensalidades</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="a_vencer">A Vencer</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="isento">Isento</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {uniqueMonths.map(mes => (
                        <SelectItem key={mes} value={mes}>
                          {formatMesReferencia(mes)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMensalidades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensalidade encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMensalidades.map((mensalidade) => (
                    <div
                      key={mensalidade.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3"
                    >
                      <div>
                        <h3
                          className="font-semibold text-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                          onClick={() => {
                            const child = children.find(c => c.id === mensalidade.crianca_id);
                            if (child) openEditDialog(child as any, user?.escolinhaId, 'financeiro');
                          }}
                        >
                          {mensalidade.crianca_nome}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatMesReferencia(mensalidade.mes_referencia)} • Venc: {format(parseLocalDate(mensalidade.data_vencimento), 'dd/MM/yyyy')}
                        </p>
                        {mensalidade.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{mensalidade.observacoes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            R$ {Number(mensalidade.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {mensalidade.data_pagamento && (
                            <p className="text-xs text-muted-foreground">
                              Pago em {format(new Date(mensalidade.data_pagamento), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={
                            mensalidade.status === 'pago'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : mensalidade.status === 'atrasado'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : mensalidade.status === 'isento'
                                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                  : mensalidade.status === 'cancelado'
                                    ? 'bg-muted text-muted-foreground border-muted'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }
                        >
                          {mensalidade.status === 'pago' ? 'Pago' : 
                           mensalidade.status === 'atrasado' ? 'Atrasado' : 
                           mensalidade.status === 'isento' ? 'Isento' : 
                           mensalidade.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                        </Badge>
                        
                        {/* Actions */}
                        {mensalidade.status !== 'pago' && mensalidade.status !== 'isento' && mensalidade.status !== 'cancelado' && (
                          <div className="flex gap-1">
                            {mensalidade.abacatepay_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 gap-1"
                                asChild
                              >
                                <a 
                                  href={mensalidade.abacatepay_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Abrir link de pagamento PIX"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span className="hidden sm:inline">PIX</span>
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => openActionDialog(mensalidade, 'pagar')}
                              title="Marcar como Pago"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => openActionDialog(mensalidade, 'isentar')}
                              title="Marcar como Isento"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Minha Assinatura (SaaS) */}
        <TabsContent value="assinatura">
          <div className="space-y-6">
            {/* Subscription Info Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Minha Assinatura</CardTitle>
                </div>
                <CardDescription>Informações do seu plano e cobranças da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                {escolinhaFinanceiro ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Plano Atual</p>
                      <p className="text-xl font-bold text-foreground">
                        {(escolinhaFinanceiro.plano as any)?.nome || 'Não definido'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
                      <p className="text-xl font-bold text-foreground">
                        R$ {(escolinhaFinanceiro.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <Badge className={
                        escolinhaFinanceiro.status === 'em_dia' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : escolinhaFinanceiro.status === 'atrasado'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                      }>
                        {escolinhaFinanceiro.status === 'em_dia' ? 'Em Dia' : 
                         escolinhaFinanceiro.status === 'atrasado' ? 'Atrasado' : 'Suspenso'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Nenhuma informação de assinatura encontrada.</p>
                    <p className="text-sm mt-1">Entre em contato com o administrador.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle>Histórico de Cobranças</CardTitle>
                </div>
                <CardDescription>Suas faturas e pagamentos via PIX</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistorico ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : historicoSaas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma cobrança encontrada.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historicoSaas.map((cobranca) => {
                      const mesDate = parseISO(cobranca.mes_referencia);
                      const mesLabel = `${monthNames[mesDate.getMonth() + 1]} ${mesDate.getFullYear()}`;
                      
                      return (
                        <div
                          key={cobranca.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                              <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{mesLabel}</h4>
                              <p className="text-sm text-muted-foreground">
                                {cobranca.data_vencimento 
                                  ? `Vencimento: ${format(parseLocalDate(cobranca.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}`
                                  : 'Sem vencimento definido'
                                }
                              </p>
                              {cobranca.data_pagamento && (
                                <p className="text-xs text-emerald-600">
                                  Pago em {format(parseLocalDate(cobranca.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-foreground">
                                R$ {Number(cobranca.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              {(cobranca.plano as any)?.nome && (
                                <p className="text-xs text-muted-foreground">{(cobranca.plano as any).nome}</p>
                              )}
                            </div>
                            
                            <Badge className={statusCobrancaColors[cobranca.status] || ''}>
                              {statusCobrancaLabels[cobranca.status] || cobranca.status}
                            </Badge>

                            {cobranca.status === 'pendente' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                  setSelectedCobranca(cobranca);
                                  setPixCheckoutOpen(true);
                                }}
                              >
                                <CreditCard className="w-4 h-4" />
                                Pagar PIX
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Cadastro Bancário */}
        <TabsContent value="cadastro-bancario">
          <CadastroBancarioForm />
        </TabsContent>

        {/* Tab: Cobranças por Mês */}
        <TabsContent value="cobrancas-mes">
          <MonthlyBillingReport />
        </TabsContent>

        {/* Tab: Relatório Financeiro */}
        <TabsContent value="relatorio">
          <FinancialReportSection />
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <MensalidadeActionsDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        mensalidade={selectedMensalidade}
        action={actionType}
        onConfirm={handleActionConfirm}
        isLoading={updateMensalidade.isPending}
      />

      {/* PIX Checkout Dialog */}
      {selectedCobranca && (
        <PixCheckoutDialog
          open={pixCheckoutOpen}
          onOpenChange={setPixCheckoutOpen}
          cobrancaId={selectedCobranca.id}
          valor={selectedCobranca.valor}
          mesReferencia={selectedCobranca.mes_referencia}
          onPaymentConfirmed={() => {
            queryClient.invalidateQueries({ queryKey: ['escola-historico-saas'] });
            queryClient.invalidateQueries({ queryKey: ['escola-financeiro'] });
          }}
        />
      )}

      {/* Generate Billing Dialog */}
      <GenerateBillingDialog
        open={generateBillingDialogOpen}
        onOpenChange={setGenerateBillingDialogOpen}
        onConfirm={handleGenerateBilling}
        isLoading={generateStudentBilling.isPending}
        billingStatusByMonth={billingStatusByMonth}
      />
    </div>
  );
};

export default SchoolFinanceiroPage;
