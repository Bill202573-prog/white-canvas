import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Shirt, 
  Receipt, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface MonthlyData {
  mes: string;
  mesLabel: string;
  matriculas: number;
  uniformes: number;
  mensalidades: number;
  total: number;
}

const FinancialReportSection = () => {
  const { user } = useAuth();

  // Fetch cobrancas_entrada (enrollment charges)
  const { data: cobrancasEntrada = [], isLoading: loadingEntrada } = useQuery({
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

  // Fetch mensalidades pagas
  const { data: mensalidadesPagas = [], isLoading: loadingMensalidades } = useQuery({
    queryKey: ['escola-mensalidades-pagas-report', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          id,
          valor_pago,
          valor,
          data_pagamento,
          mes_referencia,
          status
        `)
        .eq('escolinha_id', user.escolinhaId)
        .eq('status', 'pago');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.escolinhaId,
  });

  // Calculate monthly data for the last 6 months
  const monthlyData = useMemo(() => {
    const today = new Date();
    const months: MonthlyData[] = [];

    for (let i = 5; i >= 0; i--) {
      let m = today.getMonth() + 1 - i;
      let y = today.getFullYear();
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const mesKey = `${y}-${String(m).padStart(2, '0')}`;
      
      // Calculate enrollment values for this month
      const entriesThisMonth = cobrancasEntrada.filter(ce => {
        if (!ce.data_pagamento) return false;
        const payDate = new Date(ce.data_pagamento);
        return payDate.getFullYear() === y && (payDate.getMonth() + 1) === m;
      });

      const matriculasTotal = entriesThisMonth.reduce((sum, ce) => sum + Number(ce.valor_matricula || 0), 0);
      const uniformesTotal = entriesThisMonth.reduce((sum, ce) => sum + Number(ce.valor_uniforme || 0), 0);
      const mensalidadesEntrada = entriesThisMonth.reduce((sum, ce) => sum + Number(ce.valor_mensalidade || 0), 0);

      // Calculate regular mensalidades paid this month
      const mensalidadesThisMonth = mensalidadesPagas.filter(mens => {
        if (!mens.data_pagamento) return false;
        const payDate = new Date(mens.data_pagamento);
        return payDate.getFullYear() === y && (payDate.getMonth() + 1) === m;
      });

      const mensalidadesRegular = mensalidadesThisMonth.reduce((sum, mens) => sum + Number(mens.valor_pago || mens.valor || 0), 0);

      const mensalidadesTotal = mensalidadesEntrada + mensalidadesRegular;

      months.push({
        mes: mesKey,
        mesLabel: `${monthNames[m].substring(0, 3)}/${y.toString().slice(-2)}`,
        matriculas: matriculasTotal,
        uniformes: uniformesTotal,
        mensalidades: mensalidadesTotal,
        total: matriculasTotal + uniformesTotal + mensalidadesTotal
      });
    }

    return months;
  }, [cobrancasEntrada, mensalidadesPagas]);

  // Calculate totals
  const totals = useMemo(() => {
    const matriculas = cobrancasEntrada.reduce((sum, ce) => sum + Number(ce.valor_matricula || 0), 0);
    const uniformes = cobrancasEntrada.reduce((sum, ce) => sum + Number(ce.valor_uniforme || 0), 0);
    const mensalidadesEntrada = cobrancasEntrada.reduce((sum, ce) => sum + Number(ce.valor_mensalidade || 0), 0);
    const mensalidadesRegular = mensalidadesPagas.reduce((sum, m) => sum + Number(m.valor_pago || m.valor || 0), 0);

    return {
      matriculas,
      uniformes,
      mensalidades: mensalidadesEntrada + mensalidadesRegular,
      total: matriculas + uniformes + mensalidadesEntrada + mensalidadesRegular
    };
  }, [cobrancasEntrada, mensalidadesPagas]);

  const isLoading = loadingEntrada || loadingMensalidades;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/20">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matrículas</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totals.matriculas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20">
                <Shirt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uniformes</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totals.uniformes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20">
                <Receipt className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensalidades</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totals.mensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Receitas por Categoria</CardTitle>
          </div>
          <CardDescription>Detalhamento mensal dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="mesLabel" 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                />
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
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    name === 'matriculas' ? 'Matrículas' : 
                    name === 'uniformes' ? 'Uniformes' : 'Mensalidades'
                  ]}
                />
                <Legend 
                  formatter={(value) => 
                    value === 'matriculas' ? 'Matrículas' : 
                    value === 'uniformes' ? 'Uniformes' : 'Mensalidades'
                  }
                />
                <Bar dataKey="matriculas" stackId="a" fill="hsl(142, 76%, 36%)" name="matriculas" />
                <Bar dataKey="uniformes" stackId="a" fill="hsl(217, 91%, 60%)" name="uniformes" />
                <Bar dataKey="mensalidades" stackId="a" fill="hsl(271, 91%, 65%)" name="mensalidades" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
          <CardDescription>Valores recebidos por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <GraduationCap className="w-4 h-4" />
                      Matrículas
                    </div>
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <Shirt className="w-4 h-4" />
                      Uniformes
                    </div>
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <Receipt className="w-4 h-4" />
                      Mensalidades
                    </div>
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month) => (
                  <tr key={month.mes} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-2 font-medium">{month.mesLabel}</td>
                    <td className="py-3 px-2 text-right">
                      {month.matriculas > 0 ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          R$ {month.matriculas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {month.uniformes > 0 ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          R$ {month.uniformes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {month.mensalidades > 0 ? (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                          R$ {month.mensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      R$ {month.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-3 px-2">Total</td>
                  <td className="py-3 px-2 text-right text-green-600">
                    R$ {totals.matriculas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right text-blue-600">
                    R$ {totals.uniformes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right text-purple-600">
                    R$ {totals.mensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-right">
                    R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReportSection;
