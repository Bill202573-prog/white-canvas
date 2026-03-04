import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlunoHistorico } from '@/hooks/useAlunoHistoricoData';
import { useAulaHistorico } from '@/hooks/useAulaHistoricoData';
import { 
  Calendar,
  Target,
  Trophy,
  Loader2,
  History,
  Users,
  Filter,
  Gamepad2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  School,
  RefreshCw,
} from 'lucide-react';

interface HistoricoTabProps {
  criancaId: string;
  childName: string;
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

const HistoricoTab = ({ criancaId, childName }: HistoricoTabProps) => {
  const { data: eventosData, isLoading: loadingEventos } = useAlunoHistorico(criancaId);
  const { data: aulasData, isLoading: loadingAulas } = useAulaHistorico(criancaId);
  
  const [mesSelecionado, setMesSelecionado] = useState('all');
  const [anoSelecionado, setAnoSelecionado] = useState('all');
  const [escolaSelecionada, setEscolaSelecionada] = useState('all');
  const [tipoEvento, setTipoEvento] = useState<'all' | 'amistoso' | 'campeonato'>('all');
  const [historicoTab, setHistoricoTab] = useState('eventos');

  // Get available years from data
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    eventosData?.eventos.forEach(e => {
      const ano = new Date(e.data).getFullYear().toString();
      anos.add(ano);
    });
    aulasData?.aulas.forEach(a => {
      const ano = new Date(a.data).getFullYear().toString();
      anos.add(ano);
    });
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [eventosData?.eventos, aulasData?.aulas]);

  // Get available schools from data (eventos + aulas)
  const escolasDisponiveis = useMemo(() => {
    const escolas = new Map<string, string>();
    eventosData?.eventos.forEach(e => {
      if (e.escolinhaId && e.escolinhaNome) {
        escolas.set(e.escolinhaId, e.escolinhaNome);
      }
    });
    aulasData?.aulas.forEach(a => {
      if (a.escolinha?.id && a.escolinha?.nome) {
        escolas.set(a.escolinha.id, a.escolinha.nome);
      }
    });
    return Array.from(escolas.entries()).map(([id, nome]) => ({ id, nome }));
  }, [eventosData?.eventos, aulasData?.aulas]);

  // Filter eventos
  const eventosFiltrados = useMemo(() => {
    if (!eventosData?.eventos) return [];
    return eventosData.eventos.filter(e => {
      const date = new Date(e.data);
      const matchMes = mesSelecionado === 'all' || (date.getMonth() + 1).toString() === mesSelecionado;
      const matchAno = anoSelecionado === 'all' || date.getFullYear().toString() === anoSelecionado;
      const matchTipo = tipoEvento === 'all' || e.tipo === tipoEvento;
      const matchEscola = escolaSelecionada === 'all' || e.escolinhaId === escolaSelecionada;
      return matchMes && matchAno && matchTipo && matchEscola;
    });
  }, [eventosData?.eventos, mesSelecionado, anoSelecionado, tipoEvento, escolaSelecionada]);

  // Filter aulas
  const aulasFiltradas = useMemo(() => {
    if (!aulasData?.aulas) return [];
    return aulasData.aulas.filter(a => {
      const date = new Date(a.data);
      const matchMes = mesSelecionado === 'all' || (date.getMonth() + 1).toString() === mesSelecionado;
      const matchAno = anoSelecionado === 'all' || date.getFullYear().toString() === anoSelecionado;
      const matchEscola = escolaSelecionada === 'all' || a.escolinha?.id === escolaSelecionada;
      return matchMes && matchAno && matchEscola;
    });
  }, [aulasData?.aulas, mesSelecionado, anoSelecionado, escolaSelecionada]);

  if (loadingEventos || loadingAulas) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const eventos = eventosData?.eventos || [];
  const aulas = aulasData?.aulas || [];

  if (eventos.length === 0 && aulas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhum histórico ainda</h3>
          <p className="text-sm text-muted-foreground">
            {childName.split(' ')[0]} ainda não possui histórico registrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
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
          {escolasDisponiveis.length >= 1 && (
            <Select value={escolaSelecionada} onValueChange={setEscolaSelecionada}>
              <SelectTrigger className="h-9">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Escola" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {escolasDisponiveis.map(escola => (
                  <SelectItem key={escola.id} value={escola.id}>
                    {escola.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Sub-tabs for Eventos vs Aulas */}
      <Tabs value={historicoTab} onValueChange={setHistoricoTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="eventos" className="flex items-center gap-2 py-2">
            <Gamepad2 className="w-4 h-4" />
            <span className="text-xs">Jogos ({eventosFiltrados.length})</span>
          </TabsTrigger>
          <TabsTrigger value="aulas" className="flex items-center gap-2 py-2">
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs">Aulas ({aulasFiltradas.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="mt-4 space-y-4">
          {/* Tipo filter for eventos */}
          <div className="flex gap-2">
            <Badge 
              variant={tipoEvento === 'all' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTipoEvento('all')}
            >
              Todos
            </Badge>
            <Badge 
              variant={tipoEvento === 'amistoso' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTipoEvento('amistoso')}
            >
              Amistosos
            </Badge>
            <Badge 
              variant={tipoEvento === 'campeonato' ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => setTipoEvento('campeonato')}
            >
              Campeonatos
            </Badge>
          </div>

          {eventosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum jogo encontrado com os filtros selecionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventosFiltrados.map((evento) => {
                const isVitoria = evento.resultado === 'vitoria';
                const isDerrota = evento.resultado === 'derrota';
                const isEmpate = evento.resultado === 'empate';

                return (
                  <Card 
                    key={evento.id}
                    className={`overflow-hidden ${
                      isVitoria 
                        ? 'border-success/30' 
                        : isDerrota 
                          ? 'border-destructive/30'
                          : 'border-border'
                    }`}
                  >
                    {/* School Header - Premium Style */}
                    <div className={`px-4 py-2 ${
                      evento.tipo === 'campeonato'
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10'
                        : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10'
                    }`}>
                      <div className="flex items-center gap-2">
                        <School className={`w-4 h-4 ${
                          evento.tipo === 'campeonato' ? 'text-amber-600' : 'text-emerald-600'
                        }`} />
                        <span className={`text-sm font-semibold ${
                          evento.tipo === 'campeonato' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {evento.escolinhaNome}
                        </span>
                      </div>
                    </div>
                    
                    <CardContent className={`p-4 ${
                      isVitoria 
                        ? 'bg-success/5' 
                        : isDerrota 
                          ? 'bg-destructive/5'
                          : 'bg-muted/30'
                    }`}>
                      <div className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{evento.nome}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${
                                evento.tipo === 'campeonato' 
                                  ? 'border-amber-500/50 text-amber-700 bg-amber-50' 
                                  : 'border-emerald-500/50 text-emerald-700 bg-emerald-50'
                              }`}>
                                {evento.tipo === 'campeonato' ? '🏆 Campeonato' : '⚽ Amistoso'}
                              </Badge>
                              {evento.categoria && (
                                <Badge variant="secondary" className="text-xs">
                                  {evento.categoria}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(evento.data).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        {/* Placar */}
                        {evento.placarTime1 !== null && evento.placarTime2 !== null && (
                          <div className="flex items-center justify-center gap-4 py-2">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{evento.timeNome}</p>
                              <p className="text-2xl font-bold">{evento.placarTime1}</p>
                            </div>
                            <span className="text-muted-foreground text-lg">×</span>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{evento.adversario || 'Adversário'}</p>
                              <p className="text-2xl font-bold">{evento.placarTime2}</p>
                            </div>
                          </div>
                        )}

                        {/* Resultado badge */}
                        <div className="flex items-center justify-center">
                          {isVitoria && (
                            <Badge className="bg-success text-success-foreground">
                              Vitória
                            </Badge>
                          )}
                          {isDerrota && (
                            <Badge variant="destructive">
                              Derrota
                            </Badge>
                          )}
                          {isEmpate && (
                            <Badge variant="secondary">
                              Empate
                            </Badge>
                          )}
                        </div>

                        {/* Gols e Premiações */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {evento.golsMarcados > 0 && (
                            <div className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                              <Target className="w-3 h-3" />
                              {evento.golsMarcados} gol(s)
                            </div>
                          )}
                          {evento.premiacoes.map((p) => (
                            <div key={p.id} className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full">
                              <Trophy className="w-3 h-3" />
                              {p.tipo}
                              <span className="text-purple-400">•</span>
                              <span className="text-purple-500">{evento.escolinhaNome}</span>
                            </div>
                          ))}
                        </div>

                        {/* Time info */}
                        {evento.timeNome && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Users className="w-3 h-3" />
                            Time: {evento.timeNome}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aulas" className="mt-4 space-y-3">
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
            <>
              {/* Summary with attendance stats */}
              {(() => {
                const presencas = aulasFiltradas.filter(a => a.presenca?.presente === true).length;
                const faltas = aulasFiltradas.filter(a => a.presenca?.presente === false).length;
                const pendentes = aulasFiltradas.filter(a => a.presenca?.presente === null || !a.presenca).length;
                const aulasConfirmadas = presencas + faltas;
                const taxaPresenca = aulasConfirmadas > 0 ? Math.round((presencas / aulasConfirmadas) * 100) : 0;
                
                return (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex justify-around text-center">
                        <div>
                          <p className="text-lg font-bold text-success">{presencas}</p>
                          <p className="text-xs text-muted-foreground">Presenças</p>
                        </div>
                        <div className="border-l border-border" />
                        <div>
                          <p className="text-lg font-bold text-destructive">{faltas}</p>
                          <p className="text-xs text-muted-foreground">Faltas</p>
                        </div>
                        <div className="border-l border-border" />
                        <div>
                          <p className="text-lg font-bold text-muted-foreground">{pendentes}</p>
                          <p className="text-xs text-muted-foreground">Pendentes</p>
                        </div>
                        <div className="border-l border-border" />
                        <div>
                          <p className="text-lg font-bold text-primary">{taxaPresenca}%</p>
                          <p className="text-xs text-muted-foreground">Frequência</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Aulas List */}
              <div className="space-y-2">
              {aulasFiltradas.map((aula) => {
                  const isPresente = aula.presenca?.presente === true;
                  const isFalta = aula.presenca?.presente === false;
                  const isPendente = aula.presenca?.presente === null || !aula.presenca;
                  // Check if guardian said "não irei" but student was marked present
                  const isPresencaAtualizada = isPresente && aula.presenca?.confirmado_responsavel === false;

                  return (
                    <Card 
                      key={aula.id}
                      className={`${
                        isPresencaAtualizada
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : isPresente 
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
                              <p className="text-[11px] text-muted-foreground/80 font-medium">{aula.escolinha?.nome}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {new Date(aula.data).toLocaleDateString('pt-BR')}
                                {aula.horario_inicio && (
                                  <span>• {aula.horario_inicio.slice(0, 5)}</span>
                                )}
                              </div>
                              {isPendente && (
                                <p className="text-[10px] text-amber-600 mt-0.5">Chamada não realizada</p>
                              )}
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricoTab;
