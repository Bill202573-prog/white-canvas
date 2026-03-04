import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  FileText,
  Users,
  Loader2,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolChildren } from '@/hooks/useSchoolData';
import { toast } from 'sonner';
import GenerateIndividualBillingDialog from './GenerateIndividualBillingDialog';
import { useStudentRegistration } from '@/contexts/StudentRegistrationContext';

const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface StudentBillingStatus {
  criancaId: string;
  nome: string;
  status: 'emitida_paga' | 'emitida_pendente' | 'emitida_atrasada' | 'nao_emitida';
  statusFinanceiro: 'ativo' | 'suspenso' | 'isento';
  valorCadastrado?: number;
  mensalidadeId?: string;
  valor?: number;
  dataVencimento?: string;
  dataPagamento?: string;
}

const MonthlyBillingReport = () => {
  const { user } = useAuth();
  const { data: children = [], isLoading: loadingChildren } = useSchoolChildren();
  const { openEditDialog } = useStudentRegistration();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFinanceiro, setFilterFinanceiro] = useState<string>('all');
  
  // Individual billing dialog state
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [selectedStudentForBilling, setSelectedStudentForBilling] = useState<{ id: string; name: string } | null>(null);

  // Calculate month options: previous, current, next
  const monthOptions = useMemo(() => {
    const today = new Date();
    const options = [];

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
      const label = i === -1 ? 'Mês Anterior' : i === 0 ? 'Mês Atual' : 'Próximo Mês';
      options.push({
        value: mesRef,
        label: `${monthNames[month]}/${year}`,
        sublabel: label
      });
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[1]?.value || ''); // Default to current month

  const queryClient = useQueryClient();

  // Fetch mensalidades for the selected month
  const { data: mensalidades = [], isLoading: loadingMensalidades } = useQuery({
    queryKey: ['school-mensalidades-month-report', user?.escolinhaId, selectedMonth],
    queryFn: async () => {
      if (!user?.escolinhaId || !selectedMonth) return [];

      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          id,
          crianca_id,
          mes_referencia,
          valor,
          status,
          data_vencimento,
          data_pagamento
        `)
        .eq('escolinha_id', user.escolinhaId)
        .eq('mes_referencia', selectedMonth)
        .neq('status', 'cancelado'); // Exclude cancelled

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.escolinhaId && !!selectedMonth,
  });

  // Fetch cobrancas_entrada that have mes_referencia_primeira_mensalidade matching selected month
  const { data: cobrancasEntrada = [] } = useQuery({
    queryKey: ['school-cobrancas-entrada-month', user?.escolinhaId, selectedMonth],
    queryFn: async () => {
      if (!user?.escolinhaId || !selectedMonth) return [];

      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select('crianca_id, mes_referencia_primeira_mensalidade, status, data_pagamento')
        .eq('escolinha_id', user.escolinhaId)
        .eq('mes_referencia_primeira_mensalidade', selectedMonth)
        .eq('status', 'pago');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.escolinhaId && !!selectedMonth,
  });

  // Mutation for generating individual billing
  const generateBillingMutation = useMutation({
    mutationFn: async ({ criancaId, mesReferencia }: { criancaId: string; mesReferencia: string }) => {
      console.log('Gerando cobrança individual:', { escolinha_id: user?.escolinhaId, mes_referencia: mesReferencia, crianca_id: criancaId });
      const { data, error } = await supabase.functions.invoke('generate-student-billing-asaas', {
        body: { 
          escolinha_id: user?.escolinhaId, 
          mes_referencia: mesReferencia,
          crianca_id: criancaId // Pass specific student ID
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('Resultado da geração:', data);
      if (data?.results?.length > 0) {
        // Find the result for this specific student
        const result = data.results.find((r: any) => r.crianca_id === variables.criancaId);
        if (result) {
          if (result.status === 'created') {
            // Success is handled by the dialog
          } else if (result.status === 'already_exists') {
            toast.info('Mensalidade já existe para este mês');
            throw new Error('Mensalidade já existe para este mês');
          } else if (result.status === 'skipped') {
            toast.info(result.message || 'Aluno não elegível para cobrança');
            throw new Error(result.message || 'Aluno não elegível para cobrança');
          } else {
            toast.error(result.message || 'Erro ao gerar cobrança');
            throw new Error(result.message || 'Erro ao gerar cobrança');
          }
        } else {
          // No result for this student - check summary
          if (data.summary?.skipped > 0) {
            toast.info('Aluno não elegível para cobrança neste mês');
            throw new Error('Aluno não elegível para cobrança neste mês');
          } else {
            toast.error('Nenhum resultado retornado para este aluno');
            throw new Error('Nenhum resultado retornado para este aluno');
          }
        }
      } else if (data?.error) {
        toast.error(data.error);
        throw new Error(data.error);
      }
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-month-report'] });
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao gerar cobrança:', error);
      // Only show toast for actual errors, not for handled rejections
      if (!error.message.includes('já existe') && !error.message.includes('elegível')) {
        toast.error(`Erro ao gerar cobrança: ${error.message}`);
      }
    }
  });

  // Handler for opening the billing dialog
  const handleOpenBillingDialog = (studentId: string, studentName: string) => {
    setSelectedStudentForBilling({ id: studentId, name: studentName });
    setBillingDialogOpen(true);
  };

  // Handler for confirming billing generation
  const handleConfirmBilling = async (mesReferencia: string) => {
    if (!selectedStudentForBilling) return;
    await generateBillingMutation.mutateAsync({
      criancaId: selectedStudentForBilling.id,
      mesReferencia
    });
  };

  // Build student billing status list
  const studentBillingData = useMemo((): StudentBillingStatus[] => {
    // Include all active students (including isentos)
    const activeChildren = children.filter(c => c.ativo);

    // Create a set of crianca_ids that have paid via cobrancas_entrada for this month
    const paidViaEntradaSet = new Set(
      cobrancasEntrada.map(ce => ce.crianca_id)
    );

    return activeChildren.map(child => {
      const mensalidade = mensalidades.find(m => m.crianca_id === child.id);
      const statusFinanceiro = (child.status_financeiro || 'ativo') as 'ativo' | 'suspenso' | 'isento';
      const valorCadastrado = child.valor_mensalidade ?? 170;
      const paidViaEntrada = paidViaEntradaSet.has(child.id);

      // If paid via entrada (enrollment charge includes this month's tuition)
      if (paidViaEntrada && !mensalidade) {
        const entrada = cobrancasEntrada.find(ce => ce.crianca_id === child.id);
        return {
          criancaId: child.id,
          nome: child.nome,
          status: 'emitida_paga' as const,
          statusFinanceiro,
          valorCadastrado,
          valor: valorCadastrado,
          dataPagamento: entrada?.data_pagamento?.split('T')[0]
        };
      }

      if (!mensalidade) {
        return {
          criancaId: child.id,
          nome: child.nome,
          status: 'nao_emitida' as const,
          statusFinanceiro,
          valorCadastrado
        };
      }

      const status = mensalidade.status?.toLowerCase();
      let billingStatus: StudentBillingStatus['status'];

      if (status === 'pago') {
        billingStatus = 'emitida_paga';
      } else if (status === 'atrasado') {
        billingStatus = 'emitida_atrasada';
      } else {
        billingStatus = 'emitida_pendente';
      }

      return {
        criancaId: child.id,
        nome: child.nome,
        status: billingStatus,
        statusFinanceiro,
        valorCadastrado,
        mensalidadeId: mensalidade.id,
        valor: mensalidade.valor,
        dataVencimento: mensalidade.data_vencimento,
        dataPagamento: mensalidade.data_pagamento
      };
    });
  }, [children, mensalidades, cobrancasEntrada]);

  // Filter the data
  const filteredData = useMemo(() => {
    return studentBillingData.filter(student => {
      const matchesSearch = student.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
      const matchesFinanceiro = filterFinanceiro === 'all' || 
        (filterFinanceiro === 'isento' && student.statusFinanceiro === 'isento') ||
        (filterFinanceiro === 'pagante' && student.statusFinanceiro !== 'isento');
      return matchesSearch && matchesStatus && matchesFinanceiro;
    });
  }, [studentBillingData, searchTerm, filterStatus, filterFinanceiro]);

  // Summary counts
  const summary = useMemo(() => {
    const pagantes = studentBillingData.filter(s => s.statusFinanceiro !== 'isento');
    const isentos = studentBillingData.filter(s => s.statusFinanceiro === 'isento');
    const emitidaPaga = pagantes.filter(s => s.status === 'emitida_paga').length;
    const emitidaPendente = pagantes.filter(s => s.status === 'emitida_pendente').length;
    const emitidaAtrasada = pagantes.filter(s => s.status === 'emitida_atrasada').length;
    const naoEmitida = pagantes.filter(s => s.status === 'nao_emitida').length;
    const totalEmitida = emitidaPaga + emitidaPendente + emitidaAtrasada;

    return {
      emitidaPaga,
      emitidaPendente,
      emitidaAtrasada,
      naoEmitida,
      totalEmitida,
      totalPagantes: pagantes.length,
      totalIsentos: isentos.length,
      total: studentBillingData.length
    };
  }, [studentBillingData]);

  const getStatusBadge = (status: StudentBillingStatus['status']) => {
    switch (status) {
      case 'emitida_paga':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paga
          </Badge>
        );
      case 'emitida_pendente':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'emitida_atrasada':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Atrasada
          </Badge>
        );
      case 'nao_emitida':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Ban className="w-3 h-3 mr-1" />
            Não Emitida
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    // Handle both date-only (YYYY-MM-DD) and timestamp formats
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (!year || !month || !day) return '-';
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  };

  const isLoading = loadingChildren || loadingMensalidades;

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Relatório de Cobranças</CardTitle>
                <CardDescription>Status das cobranças por aluno</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.sublabel}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'emitida_paga' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'emitida_paga' ? 'all' : 'emitida_paga')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pagas</p>
                <p className="text-xl font-bold text-emerald-600">{summary.emitidaPaga}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'emitida_pendente' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'emitida_pendente' ? 'all' : 'emitida_pendente')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-blue-600">{summary.emitidaPendente}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'emitida_atrasada' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'emitida_atrasada' ? 'all' : 'emitida_atrasada')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className="text-xl font-bold text-destructive">{summary.emitidaAtrasada}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'nao_emitida' ? 'ring-2 ring-muted-foreground' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'nao_emitida' ? 'all' : 'nao_emitida')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Não Emitidas</p>
                <p className="text-xl font-bold text-muted-foreground">{summary.naoEmitida}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{summary.totalPagantes} pagantes</span>
              <span className="text-primary font-medium">{summary.totalIsentos} isentos</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {summary.totalEmitida} de {summary.totalPagantes} cobranças emitidas (pagantes)
            </span>
            <span className="text-sm font-medium">
              {summary.totalPagantes > 0 ? Math.round((summary.totalEmitida / summary.totalPagantes) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${summary.totalPagantes > 0 ? (summary.totalEmitida / summary.totalPagantes) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
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
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="emitida_paga">Pagas</SelectItem>
                <SelectItem value="emitida_pendente">Pendentes</SelectItem>
                <SelectItem value="emitida_atrasada">Atrasadas</SelectItem>
                <SelectItem value="nao_emitida">Não Emitidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFinanceiro} onValueChange={setFilterFinanceiro}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pagante">Pagantes</SelectItem>
                <SelectItem value="isento">Isentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor Cadastrado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Cobrado</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((student) => {
                    const valorDivergente = student.valor && student.valorCadastrado && student.valor !== student.valorCadastrado;
                    const canGenerate = student.status === 'nao_emitida' && student.statusFinanceiro !== 'isento';
                    const isGenerating = generateBillingMutation.isPending;
                    return (
                      <TableRow key={student.criancaId}>
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                            onClick={() => {
                              const child = children.find(c => c.id === student.criancaId);
                              if (child) openEditDialog(child as any, user?.escolinhaId, 'financeiro');
                            }}
                          >
                            {student.nome}
                          </button>
                        </TableCell>
                        <TableCell>
                          {student.statusFinanceiro === 'isento' ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">Isento</Badge>
                          ) : (
                            <Badge variant="outline">Pagante</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {student.statusFinanceiro === 'isento' ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="font-medium">
                              R$ {(student.valorCadastrado ?? 170).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell className="text-right">
                          {student.valor ? (
                            <span className={valorDivergente ? 'text-amber-600 font-semibold' : ''}>
                              R$ {student.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              {valorDivergente && <span className="ml-1 text-xs">⚠</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(student.dataVencimento)}</TableCell>
                        <TableCell>{formatDate(student.dataPagamento)}</TableCell>
                        <TableCell className="text-center">
                          {canGenerate ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-8"
                              disabled={isGenerating}
                              onClick={() => handleOpenBillingDialog(student.criancaId, student.nome)}
                            >
                              {isGenerating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                              Gerar
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Billing Dialog */}
      <GenerateIndividualBillingDialog
        open={billingDialogOpen}
        onOpenChange={(open) => {
          setBillingDialogOpen(open);
          if (!open) setSelectedStudentForBilling(null);
        }}
        onConfirm={handleConfirmBilling}
        isLoading={generateBillingMutation.isPending}
        studentName={selectedStudentForBilling?.name || ''}
      />
    </div>
  );
};

export default MonthlyBillingReport;
