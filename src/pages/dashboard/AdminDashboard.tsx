import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/shared/StatsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  School, 
  Users, 
  GraduationCap, 
  Eye, 
  Power,
  DollarSign,
  Search,
  Plus,
  Loader2,
  Edit,
  UserX,
  TrendingUp,
  Calendar,
  Activity,
  Clock
} from 'lucide-react';
import { useAdminData, EscolinhaStatus } from '@/hooks/useAdminData';
import { useAccessLogData } from '@/hooks/useAccessLogData';
import EscolinhaFormDialog from '@/components/admin/EscolinhaFormDialog';
import EscolinhaDetailDialog from '@/components/admin/EscolinhaDetailDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

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

const AdminDashboard = () => {
  const { user } = useAuth();
  const { escolinhas, planos, stats, isLoading, error } = useAdminData();
  const { acessosPorEscola, acessosPorDia, totalAcessos, acessosHoje, acessos7Dias, isLoading: loadingAcessos } = useAccessLogData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEscolinha, setSelectedEscolinha] = useState<typeof escolinhas[0] | null>(null);

  const filteredEscolinhas = escolinhas.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewEscolinha = (escolinha: typeof escolinhas[0]) => {
    setSelectedEscolinha(escolinha);
    setDetailDialogOpen(true);
  };

  const handleEditEscolinha = (escolinha: typeof escolinhas[0]) => {
    setSelectedEscolinha(escolinha);
    setFormDialogOpen(true);
  };

  const handleNewEscolinha = () => {
    setSelectedEscolinha(null);
    setFormDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <School className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || 'Não foi possível carregar os dados. Tente novamente.'}
            </p>
            {(error as any)?.code === '42P17' && (
              <Badge variant="destructive" className="mb-4">
                Erro de recursão RLS - Acesse Diagnóstico
              </Badge>
            )}
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Painel administrativo do sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Escolinhas Ativas"
          value={stats?.totalEscolinhasAtivas || 0}
          icon={<School className="w-6 h-6" />}
          description="Com acesso ao sistema"
          trend="up"
          trendValue={`${stats?.totalEscolinhasEmTeste || 0} em teste`}
        />
        <StatsCard
          title="Escolinhas Inativas"
          value={(stats?.totalEscolinhasInativas || 0) + (stats?.totalEscolinhasSuspensas || 0)}
          icon={<Power className="w-6 h-6" />}
          description={`${stats?.totalEscolinhasSuspensas || 0} suspensas`}
        />
        <StatsCard
          title="Alunos Ativos"
          value={stats?.totalAlunos || 0}
          icon={<Users className="w-6 h-6" />}
          description="Em todas as escolinhas"
        />
        <StatsCard
          title="Alunos Inativos"
          value={stats?.totalAlunosInativos || 0}
          icon={<UserX className="w-6 h-6" />}
          description="Desligados do sistema"
        />
        <StatsCard
          title="Professores"
          value={stats?.totalProfessores || 0}
          icon={<GraduationCap className="w-6 h-6" />}
          description="Cadastrados"
        />
      </div>

      {/* Financial Overview - 3 months + forecast */}
      <div className="grid gap-4 lg:grid-cols-4">
        {stats?.receitaUltimos3Meses?.map((receita) => (
          <Card 
            key={receita.mes} 
            className={`${receita.isPrevision 
              ? 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20' 
              : 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                  receita.isPrevision ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                }`}>
                  <DollarSign className={`w-6 h-6 ${
                    receita.isPrevision ? 'text-blue-500' : 'text-emerald-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{receita.mesLabel}</p>
                  <p className="text-xl font-bold text-foreground">
                    R$ {receita.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {!receita.isPrevision && receita.valorPendente > 0 && (
                    <p className="text-xs text-amber-600">
                      + R$ {receita.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente
                    </p>
                  )}
                  {receita.isPrevision && (
                    <p className="text-xs text-blue-600">
                      Estimativa: R$ {receita.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Charts */}
      {stats?.growthData && stats.growthData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base">Crescimento Financeiro</CardTitle>
              </div>
              <CardDescription>Receita das escolas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.growthData}>
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
                  <LineChart data={stats.growthData}>
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

      {/* Access Metrics Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Métricas de Acesso por Escola</CardTitle>
          </div>
          <CardDescription>
            Acompanhe a movimentação e quantidade de acessos das escolas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Access Stats Summary */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Acessos</p>
                <p className="text-2xl font-bold text-foreground">{totalAcessos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                <Clock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-foreground">{acessosHoje}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                <p className="text-2xl font-bold text-foreground">{acessos7Dias}</p>
              </div>
            </div>
          </div>

          {/* Access Chart */}
          {acessosPorDia.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">Acessos por Dia (Últimos 30 dias)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acessosPorDia}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="data" 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                    />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), "dd 'de' MMMM", { locale: ptBR })}
                      formatter={(value: number) => [value, 'Acessos']}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Access per School Table */}
          {loadingAcessos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : acessosPorEscola.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum acesso registrado ainda.</p>
              <p className="text-xs mt-1">Os acessos serão registrados a partir de agora.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Detalhamento por Escola</h4>
              {acessosPorEscola.map((escola) => (
                <div 
                  key={escola.escolinha_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <School className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{escola.escolinha_nome}</h4>
                      {escola.ultimo_acesso && (
                        <p className="text-xs text-muted-foreground">
                          Último acesso: {formatDistanceToNow(new Date(escola.ultimo_acesso), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{escola.acessos_hoje}</p>
                      <p className="text-xs text-muted-foreground">Hoje</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{escola.acessos_7_dias}</p>
                      <p className="text-xs text-muted-foreground">7 dias</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{escola.acessos_30_dias}</p>
                      <p className="text-xs text-muted-foreground">30 dias</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {escola.total_acessos} total
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.escolinhasPorPlano && stats.escolinhasPorPlano.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Escolinhas por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.escolinhasPorPlano.map(({ plano, quantidade }) => (
                <div
                  key={plano}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50"
                >
                  <span className="font-medium">{plano}</span>
                  <Badge variant="secondary">{quantidade}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schools List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Escolinhas Cadastradas</CardTitle>
              <CardDescription>Gerencie todas as escolinhas do sistema</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar escolinha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={handleNewEscolinha}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Escolinha
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEscolinhas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma escolinha encontrada.' : 'Nenhuma escolinha cadastrada.'}
            </div>
          ) : (
            <div className="space-y-3">
            {filteredEscolinhas.map((escolinha, index) => (
                <div 
                  key={escolinha.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in gap-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                      <School className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{escolinha.nome}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {escolinha.nome_responsavel && (
                          <span className="font-medium text-foreground/80">{escolinha.nome_responsavel}</span>
                        )}
                        {escolinha.telefone && (
                          <>
                            <span>•</span>
                            <span>{escolinha.telefone}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{escolinha.email || 'Sem e-mail'}</span>
                        {escolinha.alunos_ativos !== undefined && escolinha.alunos_ativos > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">{escolinha.alunos_ativos} alunos ativos</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(escolinha.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={statusColors[escolinha.status]}>
                      {statusLabels[escolinha.status]}
                    </Badge>
                    {/* Show monthly value from historico_cobrancas (what school pays to system) */}
                    {(escolinha as any).valor_mensal_escola > 0 && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        R$ {((escolinha as any).valor_mensal_escola).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </Badge>
                    )}
                    {escolinha.financeiro?.plano && (
                      <Badge variant="secondary" className="text-xs">
                        {escolinha.financeiro.plano.nome}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleViewEscolinha(escolinha)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditEscolinha(escolinha)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EscolinhaFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        escolinha={selectedEscolinha}
        planos={planos}
      />

      <EscolinhaDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        escolinha={selectedEscolinha}
      />
    </div>
  );
};

export default AdminDashboard;
