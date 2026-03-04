import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useAulaHistorico } from '@/hooks/useAulaHistoricoData';

interface AlunoAulasSectionProps {
  criancaId: string;
}

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

const AlunoAulasSection = ({ criancaId }: AlunoAulasSectionProps) => {
  const { data, isLoading } = useAulaHistorico(criancaId);
  const [mesSelecionado, setMesSelecionado] = useState('all');
  const [anoSelecionado, setAnoSelecionado] = useState('all');

  // Get available years from data - must be before any conditional returns
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    data?.aulas?.forEach(a => {
      const ano = new Date(a.data).getFullYear().toString();
      anos.add(ano);
    });
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [data?.aulas]);

  // Filter aulas - must be before any conditional returns
  const aulasFiltradas = useMemo(() => {
    if (!data?.aulas) return [];
    return data.aulas.filter(a => {
      const date = new Date(a.data);
      const matchMes = mesSelecionado === 'all' || (date.getMonth() + 1).toString() === mesSelecionado;
      const matchAno = anoSelecionado === 'all' || date.getFullYear().toString() === anoSelecionado;
      return matchMes && matchAno;
    });
  }, [data?.aulas, mesSelecionado, anoSelecionado]);

  // Calculate stats for filtered data - must be before any conditional returns
  const filteredStats = useMemo(() => {
    const presencas = aulasFiltradas.filter(a => a.presenca?.presente === true).length;
    const faltas = aulasFiltradas.filter(a => a.presenca?.presente === false).length;
    const pendentes = aulasFiltradas.filter(a => a.presenca?.presente === null || !a.presenca).length;
    // "Presença atualizada" - guardian said "não irei" but student attended
    const presencaAtualizada = aulasFiltradas.filter(a => 
      a.presenca?.presente === true && a.presenca?.confirmado_responsavel === false
    ).length;
    const aulasConfirmadas = presencas + faltas;
    const taxaPresenca = aulasConfirmadas > 0 ? Math.round((presencas / aulasConfirmadas) * 100) : 0;
    
    return { presencas, faltas, pendentes, presencaAtualizada, taxaPresenca, total: aulasFiltradas.length };
  }, [aulasFiltradas]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Histórico de Aulas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const aulas = data?.aulas || [];

  if (aulas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Histórico de Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma aula registrada ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Histórico de Aulas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-[140px] h-8">
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
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {anosDisponiveis.map(ano => (
                <SelectItem key={ano} value={ano}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-xl font-bold text-primary">{filteredStats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 bg-success/10 rounded-lg text-center">
            <div className="text-xl font-bold text-success">{filteredStats.presencas}</div>
            <div className="text-xs text-muted-foreground">Presenças</div>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <div className="text-xl font-bold text-destructive">{filteredStats.faltas}</div>
            <div className="text-xs text-muted-foreground">Faltas</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-xl font-bold text-muted-foreground">{filteredStats.pendentes}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <div className="text-xl font-bold text-primary">{filteredStats.taxaPresenca}%</div>
            <div className="text-xs text-muted-foreground">Frequência</div>
          </div>
        </div>

        {/* Aulas List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {aulasFiltradas.map((aula) => {
            const isPresente = aula.presenca?.presente === true;
            const isFalta = aula.presenca?.presente === false;
            const isPendente = aula.presenca?.presente === null || !aula.presenca;
            // Check if guardian said "não irei" but student was marked present
            const isPresencaAtualizada = isPresente && aula.presenca?.confirmado_responsavel === false;

            return (
              <div 
                key={aula.id}
                className={`p-3 rounded-lg border ${
                  isPresencaAtualizada
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : isPresente 
                      ? 'bg-success/5 border-success/30' 
                      : isFalta 
                        ? 'bg-destructive/5 border-destructive/30'
                        : 'bg-muted/20 border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isPresencaAtualizada
                        ? 'bg-blue-500/20'
                        : isPresente 
                          ? 'bg-success/20' 
                          : isFalta 
                            ? 'bg-destructive/20'
                            : 'bg-muted'
                    }`}>
                      {isPresencaAtualizada && <RefreshCw className="w-4 h-4 text-blue-600" />}
                      {isPresente && !isPresencaAtualizada && <CheckCircle2 className="w-4 h-4 text-success" />}
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
                      <p className="text-xs text-muted-foreground">{aula.escolinha.nome}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={isPresente ? 'default' : isFalta ? 'destructive' : 'secondary'}
                    className={
                      isPresencaAtualizada 
                        ? 'bg-blue-500 text-white' 
                        : isPresente 
                          ? 'bg-success text-success-foreground' 
                          : ''
                    }
                  >
                    {isPresencaAtualizada 
                      ? 'Atualizada' 
                      : isPresente 
                        ? 'Presente' 
                        : isFalta 
                          ? 'Falta' 
                          : 'Pendente'}
                  </Badge>
                </div>
                {aula.presenca?.motivo_ausencia && (
                  <p className="text-xs text-muted-foreground mt-2 pl-11">
                    Motivo: {aula.presenca.motivo_ausencia}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlunoAulasSection;
