import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useSchoolPedidos } from '@/hooks/useLojaData';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface LojaRelatorioSectionProps {
  escolinhaId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function LojaRelatorioSection({ escolinhaId }: LojaRelatorioSectionProps) {
  const [periodoFilter, setPeriodoFilter] = useState<string>('mes_atual');
  const { data: pedidos = [], isLoading } = useSchoolPedidos(escolinhaId);

  const getDateRange = () => {
    const now = new Date();
    switch (periodoFilter) {
      case 'mes_atual':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'mes_anterior':
        const mesAnterior = subMonths(now, 1);
        return { start: startOfMonth(mesAnterior), end: endOfMonth(mesAnterior) };
      case 'ultimos_3_meses':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'ultimos_6_meses':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const filteredPedidos = useMemo(() => {
    const { start, end } = getDateRange();
    return pedidos.filter(p => {
      const pedidoDate = parseISO(p.created_at);
      return isWithinInterval(pedidoDate, { start, end });
    });
  }, [pedidos, periodoFilter]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const pagosEntregues = filteredPedidos.filter(p => p.status === 'pago' || p.status === 'entregue');
    const receita = pagosEntregues.reduce((acc, p) => acc + p.valor_total, 0);
    const totalPedidos = filteredPedidos.length;
    const ticketMedio = totalPedidos > 0 ? receita / pagosEntregues.length : 0;
    
    // Calcular quantidade de itens vendidos
    const itensVendidos = pagosEntregues.reduce((acc, p) => {
      return acc + (p.itens?.reduce((sum, item) => sum + item.quantidade, 0) || 0);
    }, 0);

    return { receita, totalPedidos, ticketMedio, itensVendidos };
  }, [filteredPedidos]);

  // Dados para gráfico de faturamento por dia
  const faturamentoDiario = useMemo(() => {
    const { start, end } = getDateRange();
    const dias = eachDayOfInterval({ start, end });
    
    return dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const pedidosDia = filteredPedidos.filter(p => {
        const pedidoDate = format(parseISO(p.created_at), 'yyyy-MM-dd');
        return pedidoDate === diaStr && (p.status === 'pago' || p.status === 'entregue');
      });
      
      return {
        data: format(dia, 'dd/MM'),
        valor: pedidosDia.reduce((acc, p) => acc + p.valor_total, 0),
        pedidos: pedidosDia.length,
      };
    });
  }, [filteredPedidos, periodoFilter]);

  // Produtos mais vendidos
  const produtosMaisVendidos = useMemo(() => {
    const produtosMap = new Map<string, { nome: string; quantidade: number; valor: number }>();
    
    filteredPedidos
      .filter(p => p.status === 'pago' || p.status === 'entregue')
      .forEach(p => {
        p.itens?.forEach(item => {
          const produtoNome = (item as any).produto?.nome || 'Produto';
          const existing = produtosMap.get(produtoNome) || { nome: produtoNome, quantidade: 0, valor: 0 };
          produtosMap.set(produtoNome, {
            nome: produtoNome,
            quantidade: existing.quantidade + item.quantidade,
            valor: existing.valor + item.valor_total,
          });
        });
      });
    
    return Array.from(produtosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [filteredPedidos]);

  // Distribuição por status
  const statusDistribuicao = useMemo(() => {
    const statusMap = new Map<string, number>();
    filteredPedidos.forEach(p => {
      statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
    });
    
    const statusLabels: Record<string, string> = {
      pendente: 'Pendente',
      aguardando_pagamento: 'Aguardando',
      pago: 'Pago',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    };
    
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      status,
    }));
  }, [filteredPedidos]);

  // Faturamento mensal (para gráfico de linha)
  const faturamentoMensal = useMemo(() => {
    const mesesMap = new Map<string, number>();
    
    pedidos
      .filter(p => p.status === 'pago' || p.status === 'entregue')
      .forEach(p => {
        const mes = format(parseISO(p.created_at), 'MMM/yy', { locale: ptBR });
        mesesMap.set(mes, (mesesMap.get(mes) || 0) + p.valor_total);
      });
    
    return Array.from(mesesMap.entries())
      .map(([mes, valor]) => ({ mes, valor }))
      .slice(-6);
  }, [pedidos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartConfig = {
    valor: { label: 'Faturamento', color: 'hsl(var(--primary))' },
    quantidade: { label: 'Quantidade', color: 'hsl(var(--chart-2))' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relatório de Vendas</h2>
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes_atual">Mês Atual</SelectItem>
            <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
            <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
            <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.receita)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold">{stats.totalPedidos}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.ticketMedio || 0)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Itens Vendidos</p>
                <p className="text-2xl font-bold">{stats.itensVendidos}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Package className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Faturamento Diário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={faturamentoDiario}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis 
                  tickFormatter={(v) => `R$${v}`} 
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <LineChart data={faturamentoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis 
                  tickFormatter={(v) => `R$${v}`} 
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {produtosMaisVendidos.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p>Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="space-y-3">
                {produtosMaisVendidos.map((produto, index) => (
                  <div key={produto.nome} className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold"
                    >
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{produto.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {produto.quantidade} un. vendidas
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {formatCurrency(produto.valor)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status dos Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribuicao.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p>Nenhum pedido no período</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <PieChart>
                  <Pie
                    data={statusDistribuicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusDistribuicao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
