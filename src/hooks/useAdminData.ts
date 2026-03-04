import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EscolinhaStatus = 'em_teste' | 'ativa' | 'inativa' | 'suspensa';
export type StatusFinanceiro = 'em_dia' | 'atrasado' | 'suspenso';
export type EscolaStatusFinanceiro = 'NAO_CONFIGURADO' | 'EM_ANALISE' | 'APROVADO' | 'REPROVADO';

export interface PlanoSaas {
  id: string;
  nome: string;
  min_alunos: number;
  max_alunos: number | null;
  valor_mensal: number;
  ativo: boolean;
}

export interface EscolinhaFinanceiro {
  id: string;
  escolinha_id: string;
  plano_id: string | null;
  valor_mensal: number | null;
  data_inicio_cobranca: string | null;
  status: StatusFinanceiro;
  plano?: PlanoSaas;
}

export interface Escolinha {
  id: string;
  nome: string;
  tipo_documento: 'cpf' | 'cnpj' | null;
  documento: string | null;
  nome_responsavel: string | null;
  email: string | null;
  telefone: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  status: EscolinhaStatus;
  ativo: boolean;
  created_at: string;
  admin_user_id: string | null;
  senha_temporaria: string | null;
  senha_temporaria_ativa: boolean;
  // Second partner (sócio) fields
  nome_socio: string | null;
  email_socio: string | null;
  telefone_socio: string | null;
  socio_user_id: string | null;
  senha_temporaria_socio: string | null;
  senha_temporaria_socio_ativa: boolean;
  status_financeiro_escola: EscolaStatusFinanceiro;
  financeiro?: EscolinhaFinanceiro;
  alunos_ativos?: number;
}

export interface HistoricoCobranca {
  id: string;
  escolinha_id: string;
  plano_id: string | null;
  valor: number;
  mes_referencia: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  abacatepay_billing_id?: string | null;
  abacatepay_url?: string | null;
  data_vencimento?: string | null;
  metodo_pagamento?: string | null;
  plano?: PlanoSaas;
  escolinha?: {
    id: string;
    nome: string;
  };
}

export interface NotificacaoInadimplencia {
  id: string;
  escolinha_id: string;
  cobranca_id: string | null;
  tipo: 'lembrete' | 'aviso_atraso' | 'aviso_suspensao' | 'suspensao' | 'pagamento_confirmado';
  mensagem: string;
  lido: boolean;
  created_at: string;
}

export interface SaasConfig {
  id: string;
  chave: string;
  valor: string;
  descricao: string | null;
}

export interface ReceitaMensal {
  mes: string;
  mesLabel: string;
  valorRecebido: number;
  valorPendente: number;
  valorTotal: number;
  isPrevision: boolean;
}

export interface GrowthData {
  mes: string;
  mesLabel: string;
  alunos: number;
  receita: number;
}

export interface AdminStats {
  totalEscolinhasAtivas: number;
  totalEscolinhasInativas: number;
  totalEscolinhasEmTeste: number;
  totalEscolinhasSuspensas: number;
  totalAlunos: number;
  totalAlunosInativos: number;
  totalProfessores: number;
  receitaMensalEstimada: number;
  receitaUltimos3Meses: ReceitaMensal[];
  escolinhasPorPlano: { plano: string; quantidade: number }[];
  growthData: GrowthData[];
}

export const useAdminData = () => {
  const queryClient = useQueryClient();

  // Fetch all planos
  const { data: planos = [], isLoading: loadingPlanos } = useQuery({
    queryKey: ['planos-saas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_saas')
        .select('*')
        .eq('ativo', true)
        .order('min_alunos', { ascending: true });

      if (error) throw error;
      return data as PlanoSaas[];
    },
  });

  // Fetch all escolinhas with financial data and student counts
  const { data: escolinhas = [], isLoading: loadingEscolinhas, error: escolinhasError } = useQuery({
    queryKey: ['admin-escolinhas'],
    queryFn: async () => {
      const { data: escolinhasData, error: escolinhasError } = await supabase
        .from('escolinhas')
        .select('*')
        .order('created_at', { ascending: false });

      if (escolinhasError) throw escolinhasError;

      // Fetch financial data for each escolinha
      const { data: financeiroData, error: financeiroError } = await supabase
        .from('escolinha_financeiro')
        .select('*, plano:planos_saas(*)');

      if (financeiroError) throw financeiroError;

      // Fetch student counts per escolinha
      const { data: alunosData } = await supabase
        .from('crianca_escolinha')
        .select('escolinha_id, crianca:criancas(ativo)')
        .eq('ativo', true);

      // Calculate active students per escolinha
      const alunosPorEscolinha: Record<string, number> = {};
      alunosData?.forEach(ce => {
        const crianca = ce.crianca as { ativo: boolean } | null;
        if (crianca?.ativo) {
          alunosPorEscolinha[ce.escolinha_id] = (alunosPorEscolinha[ce.escolinha_id] || 0) + 1;
        }
      });

      // Fetch current month's paid historico_cobrancas for each escolinha
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentMesRef = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      
      const { data: historicoData } = await supabase
        .from('historico_cobrancas')
        .select('escolinha_id, valor, status, mes_referencia')
        .eq('status', 'pago');

      // Calculate total paid revenue per escolinha (from all historico_cobrancas)
      const receitaPorEscolinha: Record<string, number> = {};
      historicoData?.forEach(h => {
        receitaPorEscolinha[h.escolinha_id] = (receitaPorEscolinha[h.escolinha_id] || 0) + Number(h.valor);
      });

      // Map financial data to escolinhas
      const escolinhasWithFinanceiro = escolinhasData.map((escolinha) => {
        const financeiro = financeiroData?.find(f => f.escolinha_id === escolinha.id);
        const alunosAtivos = alunosPorEscolinha[escolinha.id] || 0;
        // Get the last paid amount for this escolinha
        const lastPaidAmount = historicoData
          ?.filter(h => h.escolinha_id === escolinha.id)
          ?.sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia))[0]?.valor || 0;
        
        return {
          ...escolinha,
          alunos_ativos: alunosAtivos,
          valor_mensal_escola: Number(lastPaidAmount), // What the school pays to the system
          financeiro: financeiro ? {
            ...financeiro,
            plano: financeiro.plano as PlanoSaas | undefined
          } : undefined
        };
      });

      return escolinhasWithFinanceiro as (Escolinha & { valor_mensal_escola?: number })[];
    },
    retry: 1,
  });

  // Fetch admin stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Count escolinhas by status
      const { data: escolinhasData } = await supabase
        .from('escolinhas')
        .select('status');

      const statusCounts = {
        em_teste: 0,
        ativa: 0,
        inativa: 0,
        suspensa: 0
      };

      escolinhasData?.forEach((e) => {
        const status = e.status as EscolinhaStatus;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      });

      // Count total active students
      const { count: totalAlunosAtivos } = await supabase
        .from('criancas')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);

      // Count total inactive students
      const { count: totalAlunosInativos } = await supabase
        .from('criancas')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', false);

      // Count total teachers
      const { count: totalProfessores } = await supabase
        .from('professores')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);

      // Get financial data for escolinhas by plan
      const { data: financeiroData } = await supabase
        .from('escolinha_financeiro')
        .select('valor_mensal, plano_id, plano:planos_saas(nome)');

      const planoCounts: Record<string, number> = {};
      financeiroData?.forEach((f) => {
        const planoNome = (f.plano as PlanoSaas | null)?.nome || 'Sem plano';
        planoCounts[planoNome] = (planoCounts[planoNome] || 0) + 1;
      });

      const escolinhasPorPlano = Object.entries(planoCounts).map(([plano, quantidade]) => ({
        plano,
        quantidade
      }));

      // Calculate revenue from historico_cobrancas (what schools pay) for last 3 months + next month forecast
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Get months: current, previous 2, and next 1 (forecast)
      const monthsToFetch: { mes: string; year: number; month: number; isPrevision: boolean }[] = [];
      
      // Previous 2 months + current
      for (let i = 2; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        monthsToFetch.push({
          mes: `${y}-${String(m).padStart(2, '0')}-01`,
          year: y,
          month: m,
          isPrevision: false
        });
      }
      
      // Next month (forecast)
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      monthsToFetch.push({
        mes: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
        year: nextYear,
        month: nextMonth,
        isPrevision: true
      });

      // Fetch all historico_cobrancas for these months (what schools pay to the system)
      const mesReferences = monthsToFetch.map(m => m.mes);
      const { data: historicoData } = await supabase
        .from('historico_cobrancas')
        .select('mes_referencia, valor, status')
        .in('mes_referencia', mesReferences);

      // Get last month's total paid to estimate next month
      const lastMonthRef = monthsToFetch.find(m => !m.isPrevision && m.month === currentMonth)?.mes;
      const lastMonthTotal = historicoData
        ?.filter(h => h.mes_referencia === lastMonthRef && h.status === 'pago')
        ?.reduce((acc, h) => acc + Number(h.valor), 0) || 0;

      const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      const receitaUltimos3Meses: ReceitaMensal[] = monthsToFetch.map(({ mes, month, isPrevision }) => {
        const historicoMes = historicoData?.filter(h => h.mes_referencia === mes) || [];
        
        if (isPrevision) {
          // For forecast: use last month's total as estimate
          return {
            mes,
            mesLabel: `${monthNames[month]} (Previsão)`,
            valorRecebido: 0,
            valorPendente: lastMonthTotal,
            valorTotal: lastMonthTotal,
            isPrevision: true
          };
        }

        const valorRecebido = historicoMes
          .filter(h => h.status === 'pago')
          .reduce((acc, h) => acc + Number(h.valor), 0);
        
        const valorPendente = historicoMes
          .filter(h => h.status !== 'pago')
          .reduce((acc, h) => acc + Number(h.valor), 0);

        return {
          mes,
          mesLabel: monthNames[month],
          valorRecebido,
          valorPendente,
          valorTotal: valorRecebido + valorPendente,
          isPrevision: false
        };
      });

      // Current month's total paid is the main estimate
      const receitaMensalEstimada = receitaUltimos3Meses.find(r => !r.isPrevision && r.mes === `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)?.valorRecebido || 0;

      // Build growth data for charts - last 6 months
      const growthMonths: { mes: string; year: number; month: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        growthMonths.push({
          mes: `${y}-${String(m).padStart(2, '0')}-01`,
          year: y,
          month: m
        });
      }

      // Fetch all historico_cobrancas for growth data
      const growthMesRefs = growthMonths.map(m => m.mes);
      const { data: growthHistorico } = await supabase
        .from('historico_cobrancas')
        .select('mes_referencia, valor, status')
        .in('mes_referencia', growthMesRefs);

      // Fetch students created by month for growth
      const { data: studentsByMonth } = await supabase
        .from('criancas')
        .select('created_at')
        .eq('ativo', true);

      const growthData: GrowthData[] = growthMonths.map(({ mes, month, year }) => {
        const historicoMes = growthHistorico?.filter(h => h.mes_referencia === mes && h.status === 'pago') || [];
        const receita = historicoMes.reduce((acc, h) => acc + Number(h.valor), 0);
        
        // Count students that were registered up to this month
        const endOfMonth = new Date(year, month, 0);
        const alunosAteMes = studentsByMonth?.filter(s => {
          const created = new Date(s.created_at);
          return created <= endOfMonth;
        }).length || 0;

        return {
          mes,
          mesLabel: monthNames[month],
          alunos: alunosAteMes,
          receita
        };
      });

      return {
        totalEscolinhasAtivas: statusCounts.ativa,
        totalEscolinhasInativas: statusCounts.inativa,
        totalEscolinhasEmTeste: statusCounts.em_teste,
        totalEscolinhasSuspensas: statusCounts.suspensa,
        totalAlunos: totalAlunosAtivos || 0,
        totalAlunosInativos: totalAlunosInativos || 0,
        totalProfessores: totalProfessores || 0,
        receitaMensalEstimada,
        receitaUltimos3Meses,
        escolinhasPorPlano,
        growthData
      } as AdminStats;
    },
  });

  // Create escolinha mutation
  const createEscolinha = useMutation({
    mutationFn: async (data: Partial<Escolinha> & { plano_id?: string }) => {
      const { plano_id, financeiro, alunos_ativos, ...escolinhaData } = data as any;
      
      const { data: newEscolinha, error } = await supabase
        .from('escolinhas')
        .insert(escolinhaData)
        .select()
        .single();

      if (error) throw error;

      // Create financial record if plano is provided
      if (plano_id) {
        const plano = planos.find(p => p.id === plano_id);
        const { error: financeiroError } = await supabase
          .from('escolinha_financeiro')
          .insert({
            escolinha_id: newEscolinha.id,
            plano_id,
            valor_mensal: plano?.valor_mensal || 0,
            data_inicio_cobranca: new Date().toISOString().split('T')[0]
          });

        if (financeiroError) throw financeiroError;
      }

      return newEscolinha;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Escolinha criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar escolinha: ' + error.message);
    },
  });

  // Update escolinha mutation
  const updateEscolinha = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Escolinha> & { plano_id?: string } }) => {
      const { plano_id, financeiro, alunos_ativos, ...escolinhaData } = data as any;

      const { error } = await supabase
        .from('escolinhas')
        .update(escolinhaData)
        .eq('id', id);

      if (error) throw error;

      // Update or create financial record if plano is provided
      if (plano_id !== undefined) {
        const plano = planos.find(p => p.id === plano_id);
        const { data: existingFinanceiro } = await supabase
          .from('escolinha_financeiro')
          .select('id')
          .eq('escolinha_id', id)
          .single();

        if (existingFinanceiro) {
          const { error: updateError } = await supabase
            .from('escolinha_financeiro')
            .update({
              plano_id,
              valor_mensal: plano?.valor_mensal || 0,
            })
            .eq('escolinha_id', id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('escolinha_financeiro')
            .insert({
              escolinha_id: id,
              plano_id,
              valor_mensal: plano?.valor_mensal || 0,
              data_inicio_cobranca: new Date().toISOString().split('T')[0]
            });

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Escolinha atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar escolinha: ' + error.message);
    },
  });

  // Update escolinha status mutation
  const updateEscolinhaStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EscolinhaStatus }) => {
      const { error } = await supabase
        .from('escolinhas')
        .update({ status, ativo: status === 'ativa' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  // Update financial status mutation
  const updateFinanceiroStatus = useMutation({
    mutationFn: async ({ escolinhaId, status }: { escolinhaId: string; status: StatusFinanceiro }) => {
      const { error } = await supabase
        .from('escolinha_financeiro')
        .update({ status })
        .eq('escolinha_id', escolinhaId);

      if (error) throw error;

      // If suspended, also suspend the escolinha
      if (status === 'suspenso') {
        await supabase
          .from('escolinhas')
          .update({ status: 'suspensa' })
          .eq('id', escolinhaId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Status financeiro atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status financeiro: ' + error.message);
    },
  });

  // Create escolinha admin user mutation
  const createEscolinhaAdmin = useMutation({
    mutationFn: async ({ escolinha_id, email, nome_responsavel }: { escolinha_id: string; email: string; nome_responsavel: string }) => {
      const { data, error } = await supabase.functions.invoke('create-escolinha-admin', {
        body: { escolinha_id, email, nome_responsavel }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      toast.success('Usuário administrador criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
  });

  // Reset escolinha password mutation
  const resetEscolinhaPassword = useMutation({
    mutationFn: async (escolinhaId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-escolinha-password', {
        body: { escolinha_id: escolinhaId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      toast.success('Senha resetada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao resetar senha: ' + error.message);
    },
  });

  // Create escolinha socio (partner) user mutation
  const createEscolinhaSocio = useMutation({
    mutationFn: async ({ escolinha_id, email_socio, nome_socio }: { escolinha_id: string; email_socio: string; nome_socio: string }) => {
      const { data, error } = await supabase.functions.invoke('create-escolinha-socio', {
        body: { escolinha_id, email_socio, nome_socio }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      toast.success('Usuário sócio criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário sócio: ' + error.message);
    },
  });

  // Reset escolinha socio password mutation
  const resetEscolinhaSocioPassword = useMutation({
    mutationFn: async (escolinhaId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-escolinha-socio-password', {
        body: { escolinha_id: escolinhaId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      toast.success('Senha do sócio resetada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao resetar senha do sócio: ' + error.message);
    },
  });

  // Register payment mutation
  const registerPayment = useMutation({
    mutationFn: async ({ escolinhaId, valor, mesReferencia }: { escolinhaId: string; valor: number; mesReferencia: string }) => {
      const { error } = await supabase
        .from('historico_cobrancas')
        .insert({
          escolinha_id: escolinhaId,
          valor,
          mes_referencia: mesReferencia,
          status: 'pago',
          data_pagamento: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Pagamento registrado!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });

  // Fetch historico de cobrancas (school payments to admin)
  const { data: historicoCobrancas = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['admin-historico-cobrancas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_cobrancas')
        .select('*, escolinha:escolinhas(id, nome), plano:planos_saas(*)')
        .order('mes_referencia', { ascending: false });

      if (error) throw error;
      return data as HistoricoCobranca[];
    },
  });

  // Fetch notificacoes de inadimplencia
  const { data: notificacoes = [], isLoading: loadingNotificacoes } = useQuery({
    queryKey: ['admin-notificacoes-inadimplencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes_inadimplencia')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as NotificacaoInadimplencia[];
    },
  });

  // Fetch saas config
  const { data: saasConfig = [], isLoading: loadingConfig } = useQuery({
    queryKey: ['saas-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_config')
        .select('*');

      if (error) throw error;
      return data as SaasConfig[];
    },
  });

  // Generate billing mutation
  const generateBilling = useMutation({
    mutationFn: async ({ escolinha_id, force_generate = false }: { escolinha_id?: string; force_generate?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('generate-billing', {
        body: { escolinha_id, force_generate }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-historico-cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas'] });
      toast.success(`Cobranças geradas: ${data.summary.created} criadas, ${data.summary.already_exists} já existentes`);
    },
    onError: (error) => {
      toast.error('Erro ao gerar cobranças: ' + error.message);
    },
  });

  // Update saas config mutation
  const updateSaasConfig = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase
        .from('saas_config')
        .update({ valor })
        .eq('chave', chave);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-config'] });
      toast.success('Configuração atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configuração: ' + error.message);
    },
  });

  // Mark notification as read
  const markNotificationRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notificacoes_inadimplencia')
        .update({ lido: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notificacoes-inadimplencia'] });
    },
  });

  return {
    escolinhas,
    planos,
    stats,
    historicoCobrancas,
    notificacoes,
    saasConfig,
    isLoading: loadingPlanos || loadingEscolinhas || loadingStats || loadingHistorico || loadingNotificacoes || loadingConfig,
    error: escolinhasError,
    createEscolinha,
    updateEscolinha,
    updateEscolinhaStatus,
    updateFinanceiroStatus,
    createEscolinhaAdmin,
    resetEscolinhaPassword,
    createEscolinhaSocio,
    resetEscolinhaSocioPassword,
    registerPayment,
    generateBilling,
    updateSaasConfig,
    markNotificationRead,
  };
};
