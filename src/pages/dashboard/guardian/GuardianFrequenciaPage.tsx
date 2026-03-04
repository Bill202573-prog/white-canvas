import { useState, useMemo } from 'react';
import { useGuardianChildren } from '@/hooks/useSchoolData';
import { useAulaHistorico } from '@/hooks/useAulaHistoricoData';
import { GuardianDashboardLayout } from '@/components/layout/GuardianDashboardLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Filter,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';

const MESES = [
  { value: 'all', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const GuardianFrequenciaPage = () => {
  const { data: children = [], isLoading: childrenLoading } = useGuardianChildren();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState('all');
  const [anoSelecionado, setAnoSelecionado] = useState('all');

  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);

  const { data: aulasData, isLoading: loadingAulas } = useAulaHistorico(currentChildId || undefined);

  const isLoading = childrenLoading || loadingAulas;

  // Get available years from data
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    aulasData?.aulas.forEach(a => {
      const ano = new Date(a.data).getFullYear().toString();
      anos.add(ano);
    });
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [aulasData?.aulas]);

  // Filter aulas
  const aulasFiltradas = useMemo(() => {
    if (!aulasData?.aulas) return [];
    return aulasData.aulas.filter(a => {
      const date = new Date(a.data);
      const matchMes = mesSelecionado === 'all' || (date.getMonth() + 1).toString() === mesSelecionado;
      const matchAno = anoSelecionado === 'all' || date.getFullYear().toString() === anoSelecionado;
      return matchMes && matchAno;
    });
  }, [aulasData?.aulas, mesSelecionado, anoSelecionado]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const presencas = aulasFiltradas.filter(a => a.presenca?.presente === true).length;
    const faltas = aulasFiltradas.filter(a => a.presenca?.presente === false).length;
    const pendentes = aulasFiltradas.filter(a => a.presenca?.presente === null || !a.presenca).length;
    const aulasConfirmadas = presencas + faltas;
    const taxaPresenca = aulasConfirmadas > 0 ? Math.round((presencas / aulasConfirmadas) * 100) : 0;
    
    return { presencas, faltas, pendentes, taxaPresenca, total: aulasFiltradas.length };
  }, [aulasFiltradas]);

  if (isLoading) {
    return (
      <GuardianDashboardLayout selectedChildId={currentChildId}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </GuardianDashboardLayout>
    );
  }

  return (
    <GuardianDashboardLayout selectedChildId={currentChildId}>
      <div className="space-y-4 animate-fade-in pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Frequência</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe as presenças nas aulas
          </p>
        </div>

        {/* Children Selection */}
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {children.map(child => (
              <Button
                key={child.id}
                variant={currentChildId === child.id ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-2 shrink-0"
                onClick={() => setSelectedChild(child.id)}
              >
                <Avatar className="w-5 h-5">
                  {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                  <AvatarFallback className="text-[10px]">{child.nome.charAt(0)}</AvatarFallback>
                </Avatar>
                {child.nome.split(' ')[0]}
              </Button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Resumo</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-background/80 rounded-lg p-2">
                <p className="text-xl font-bold text-success">{filteredStats.presencas}</p>
                <p className="text-[10px] text-muted-foreground">Presenças</p>
              </div>
              <div className="bg-background/80 rounded-lg p-2">
                <p className="text-xl font-bold text-destructive">{filteredStats.faltas}</p>
                <p className="text-[10px] text-muted-foreground">Faltas</p>
              </div>
              <div className="bg-background/80 rounded-lg p-2">
                <p className="text-xl font-bold text-muted-foreground">{filteredStats.pendentes}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
              <div className="bg-background/80 rounded-lg p-2">
                <p className="text-xl font-bold text-primary">{filteredStats.taxaPresenca}%</p>
                <p className="text-[10px] text-muted-foreground">Taxa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per School Stats */}
        {aulasData?.statsPorEscolinha && aulasData.statsPorEscolinha.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Por Escolinha</h3>
              <div className="space-y-2">
                {aulasData.statsPorEscolinha.map(escola => (
                  <div key={escola.escolinhaId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium">{escola.escolinhaNome}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success">{escola.stats.presencas} P</span>
                      <span className="text-destructive">{escola.stats.faltas} F</span>
                      <Badge variant="secondary">{escola.stats.taxaPresenca}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aulas List */}
        {aulasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma aula encontrada com os filtros selecionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {aulasFiltradas.map((aula) => {
              const isPresente = aula.presenca?.presente === true;
              const isFalta = aula.presenca?.presente === false;
              const isPendente = aula.presenca?.presente === null || !aula.presenca;

              return (
                <Card 
                  key={aula.id}
                  className={`${
                    isPresente 
                      ? 'bg-success/5 border-success/30' 
                      : isFalta 
                        ? 'bg-destructive/5 border-destructive/30'
                        : 'bg-muted/20 border-border'
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isPresente 
                            ? 'bg-success/20' 
                            : isFalta 
                              ? 'bg-destructive/20'
                              : 'bg-muted'
                        }`}>
                          {isPresente && <CheckCircle2 className="w-4 h-4 text-success" />}
                          {isFalta && <XCircle className="w-4 h-4 text-destructive" />}
                          {isPendente && <Clock className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{aula.turma.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(aula.data).toLocaleDateString('pt-BR')}
                            {aula.horario_inicio && (
                              <span>• {aula.horario_inicio.slice(0, 5)}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{aula.escolinha.nome}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={isPresente ? 'default' : isFalta ? 'destructive' : 'secondary'}
                        className={isPresente ? 'bg-success text-success-foreground' : ''}
                      >
                        {isPresente ? 'Presente' : isFalta ? 'Falta' : 'Pendente'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </GuardianDashboardLayout>
  );
};

export default GuardianFrequenciaPage;
