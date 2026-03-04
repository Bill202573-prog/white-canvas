import { useAuth } from '@/contexts/AuthContext';
import { 
  useSchoolChildren,
  useSchoolTeachers,
  useSchoolTurmas,
  useSchoolResponsaveis,
  useTodaysAulas,
  isBirthdayToday,
  isBirthdayThisMonth,
  calculateAge,
  useSchoolMensalidades,
} from '@/hooks/useSchoolData';
import { useSchoolIndicacoes } from '@/hooks/useIndicacoesData';
import StatsCard from '@/components/shared/StatsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  UserPlus,
  Cake,
  Clock,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import { Link } from 'react-router-dom';
import MuralAvisosSchool from '@/components/school/MuralAvisosSchool';
import { ParentAccessAnalyticsCard } from '@/components/school/ParentAccessAnalyticsCard';


const SchoolDashboard = () => {
  const { user } = useAuth();
  const { data: children = [], isLoading: loadingChildren, isFetching: fetchingChildren, error: childrenError } = useSchoolChildren();
  const { data: teachers = [], isLoading: loadingTeachers } = useSchoolTeachers();
  const { data: turmas = [], isLoading: loadingTurmas } = useSchoolTurmas();
  const { data: responsaveis = [] } = useSchoolResponsaveis();
  const { data: todaysAulas = [] } = useTodaysAulas();
  const { data: mensalidadesSummary = [] } = useSchoolMensalidades();
  const { data: indicacoes = [] } = useSchoolIndicacoes();

  // Only show loading on initial load (no cached data), not on background refetch
  const isInitialLoading = (loadingChildren && children.length === 0) || 
                           (loadingTeachers && teachers.length === 0) || 
                           (loadingTurmas && turmas.length === 0);
  const error = childrenError;

  const activeChildren = children.filter(c => c.ativo);
  const activeTeachers = teachers.filter(t => t.ativo);
  const birthdaysToday = activeChildren.filter(c => isBirthdayToday(c.data_nascimento));
  const birthdaysThisMonth = activeChildren.filter(c => isBirthdayThisMonth(c.data_nascimento) && !isBirthdayToday(c.data_nascimento));
  const novasIndicacoes = indicacoes.filter(i => i.status === 'novo').length;

  if (isInitialLoading) {
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
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || 'Não foi possível carregar os dados da escolinha.'}
            </p>
            {(error as any)?.code === '42P17' && (
              <Badge variant="destructive" className="mb-4">
                Erro de recursão RLS - Contate o administrador
              </Badge>
            )}
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bem-vindo, {user?.name}! ⚽
        </h1>
        <p className="text-muted-foreground">Painel de gestão da escolinha</p>
      </div>

      {/* Mural de Avisos do Sistema */}
      {user?.escolinhaId && (
        <MuralAvisosSchool escolinhaId={user.escolinhaId} />
      )}

      {/* Indicador de novas indicações */}
      {user?.escolinhaId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Indicações</p>
              <p className="text-sm text-muted-foreground">
                Você tem{' '}
                <span className="font-semibold text-foreground">{novasIndicacoes}</span>
                {' '}nova{novasIndicacoes === 1 ? '' : 's'} indicaç{novasIndicacoes === 1 ? 'ão' : 'ões'}
              </p>
            </div>
            <Link to="/dashboard/indicacoes">
              <Button variant="default">Ver indicações</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Alunos Ativos" value={activeChildren.length} icon={<Users className="w-6 h-6" />} description="Matriculados" />
        <StatsCard title="Professores" value={activeTeachers.length} icon={<GraduationCap className="w-6 h-6" />} description="Na equipe" />
        <StatsCard title="Turmas" value={turmas.filter(t => t.ativo).length} icon={<CalendarCheck className="w-6 h-6" />} description="Ativas" />
        <StatsCard title="Responsáveis" value={responsaveis.length} icon={<UserPlus className="w-6 h-6" />} description="Cadastrados" />
      </div>

      {/* Financial Summary - Mensalidades */}
      {mensalidadesSummary.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <CardTitle>Mensalidades dos Alunos</CardTitle>
            </div>
            <CardDescription>Resumo de pagamentos dos últimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {mensalidadesSummary.map((mes) => (
                <div 
                  key={mes.mes}
                  className="p-4 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <h4 className="font-semibold text-foreground mb-3">{mes.mesLabel}</h4>
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Access Analytics */}
      {user?.escolinhaId && (
        <ParentAccessAnalyticsCard escolinhaId={user.escolinhaId} />
      )}


      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Cadastros e gestão</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { to: '/dashboard/children', icon: Users, label: 'Gerenciar Alunos', desc: 'Cadastrar, editar e vincular', color: 'primary' },
              { to: '/dashboard/teachers', icon: GraduationCap, label: 'Gerenciar Professores', desc: 'Equipe técnica', color: 'accent' },
              { to: '/dashboard/classes', icon: CalendarCheck, label: 'Gerenciar Turmas', desc: 'Horários e alunos', color: 'success' },
              { to: '/dashboard/aulas', icon: Clock, label: 'Aulas', desc: 'Hoje e da semana', color: 'primary' },
            ].map((item) => (
              <Link key={item.to} to={item.to}>
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-${item.color}/10 text-${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className={birthdaysToday.length > 0 ? 'border-warning/50' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-warning" />
              <CardTitle>Aniversariantes</CardTitle>
            </div>
            <CardDescription>
              {birthdaysToday.length > 0 ? `${birthdaysToday.length} aniversariante(s) hoje!` : 'Próximos aniversários do mês'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {birthdaysToday.length === 0 && birthdaysThisMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aniversariante este mês</p>
            ) : (
              <div className="space-y-3">
                {birthdaysToday.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 rounded-lg gradient-birthday">
                    <Avatar>
                      {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                      <AvatarFallback>{child.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-warning-foreground">{child.nome}</p>
                      <p className="text-xs text-warning-foreground/80">Completa {calculateAge(child.data_nascimento)} anos hoje! 🎉</p>
                    </div>
                  </div>
                ))}
                {birthdaysThisMonth.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Avatar>
                      {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                      <AvatarFallback>{child.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{child.nome}</p>
                      <p className="text-xs text-muted-foreground">Dia {new Date(child.data_nascimento).getDate()} - {calculateAge(child.data_nascimento)} anos</p>
                    </div>
                    <BirthdayBadge isThisMonth showLabel={false} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle>Aulas de Hoje</CardTitle>
          </div>
          <CardDescription>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {todaysAulas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula programada para hoje</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {todaysAulas.map((aula) => (
                <Link key={aula.id} to="/dashboard/aulas">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{aula.turma?.nome}</h4>
                      <p className="text-sm text-muted-foreground">{aula.horario_inicio?.slice(0,5)} - {aula.horario_fim?.slice(0,5)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolDashboard;
