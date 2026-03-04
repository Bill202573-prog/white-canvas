import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useCampeonatosWithEventCount,
  useDeleteCampeonato,
  type CampeonatoWithEventos,
  type CampeonatoEvento,
} from '@/hooks/useCampeonatosData';
import { useCampeonatoConvocacoes } from '@/hooks/useCampeonatoConvocacoesData';
import { useEventosConvocacoesCounts } from '@/hooks/useAmistosoConvocacoesData';
import { CampeonatoFormDialog } from '@/components/school/CampeonatoFormDialog';
import { EventoFormDialog } from '@/components/school/EventoFormDialog';
import EventoDetailDialog from '@/components/school/EventoDetailDialog';
import { AmistosoConvocacoesDialog } from '@/components/school/AmistosoConvocacoesDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  Search,
  Trophy,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Target,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em Andamento',
  finalizado: 'Finalizado',
};

const STATUS_COLORS: Record<string, string> = {
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

const EVENTO_STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  finalizado: 'Finalizado',
};

const EVENTO_STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  realizado: 'bg-green-500/10 text-green-600 border-green-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

interface CampeonatoRowProps {
  campeonato: CampeonatoWithEventos;
  isOpen: boolean;
  onToggle: () => void;
  onViewDetail: (campeonato: CampeonatoWithEventos) => void;
  onEdit: (campeonato: CampeonatoWithEventos) => void;
  onDelete: (campeonato: CampeonatoWithEventos) => void;
  onAddJogo: (campeonato: CampeonatoWithEventos) => void;
  onViewJogo: (eventoId: string) => void;
  onConvocarJogo: (evento: CampeonatoEvento, campeonato: CampeonatoWithEventos) => void;
  eventosConvocacoesCounts: Record<string, number>;
}

function CampeonatoRow({
  campeonato,
  isOpen,
  onToggle,
  onViewDetail,
  onEdit,
  onDelete,
  onAddJogo,
  onViewJogo,
  onConvocarJogo,
  eventosConvocacoesCounts,
}: CampeonatoRowProps) {
  const navigate = useNavigate();
  const hasEventos = campeonato.eventos && campeonato.eventos.length > 0;

  // Check if has convocados
  const { data: convocacoes } = useCampeonatoConvocacoes(campeonato.id);
  const hasConvocados = convocacoes && convocacoes.length > 0;

  // Get team name from championship (nome_time field only)
  const nomeTimeEscola = campeonato.nome_time || 'Escolinha';

  const handleJogoClick = (evento: CampeonatoEvento) => {
    onViewJogo(evento.id);
  };

  // Format score with team names (school team first)
  const formatPlacar = (evento: CampeonatoEvento) => {
    if (evento.placar_time1 === null || evento.placar_time2 === null) {
      return null;
    }
    const adversario = evento.adversario || 'Adversário';
    return `${nomeTimeEscola} ${evento.placar_time1} x ${evento.placar_time2} ${adversario}`;
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Trophy className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium truncate">{campeonato.nome}</span>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap">{campeonato.ano}</TableCell>
        <TableCell className="whitespace-nowrap">{campeonato.categoria || '-'}</TableCell>
        <TableCell className="whitespace-nowrap">
          <Badge variant="secondary">{campeonato.eventos_count || 0} jogos</Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <Badge variant="outline" className={STATUS_COLORS[campeonato.status]}>
            {STATUS_LABELS[campeonato.status]}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={hasConvocados ? 'default' : 'outline'}
            className={
              hasConvocados
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-primary border-primary/30 hover:bg-primary/10'
            }
            onClick={() => navigate(`/dashboard/campeonatos/${campeonato.id}?tab=convocacao`)}
          >
            {hasConvocados ? (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Convocados ({convocacoes.length})
              </>
            ) : (
              <>
                <Users className="w-3 h-3 mr-1" />
                Convocar
              </>
            )}
          </Button>
        </TableCell>
        <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetail(campeonato)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddJogo(campeonato)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Jogo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(campeonato)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(campeonato)}
                className="text-destructive focus:text-destructive"
                disabled={campeonato.eventos_count && campeonato.eventos_count > 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="p-0">
            <div className="bg-muted/30 border-t">
              {hasEventos ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Jogos do Campeonato
                    </h4>
                    <Button size="sm" variant="outline" onClick={() => onAddJogo(campeonato)}>
                      <Plus className="w-3 h-3 mr-1" />
                      Novo Jogo
                    </Button>
                  </div>
                  <div className="rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jogo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Fase</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Placar</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Convocação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campeonato.eventos?.map((evento) => {
                          const convocacoesCount = eventosConvocacoesCounts[evento.id] || 0;
                          const hasConvocacoes = convocacoesCount > 0;
                          const adversario = evento.adversario || 'Adversário';
                          const matchTitle = `${nomeTimeEscola} x ${adversario}`;
                          return (
                            <TableRow
                              key={evento.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleJogoClick(evento)}
                            >
                              <TableCell className="font-medium">{matchTitle}</TableCell>
                              <TableCell>
                                {format(new Date(evento.data), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                {evento.fase ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-500/10 text-purple-600 border-purple-500/20"
                                  >
                                    {evento.fase}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {evento.horario_inicio
                                  ? `${evento.horario_inicio.slice(0, 2)}h`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {evento.local ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                    <span className="truncate max-w-[120px]">{evento.local}</span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>{campeonato.categoria || '-'}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {evento.placar_time1 !== null && evento.placar_time2 !== null ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-semibold">
                                    {evento.placar_time1} x {evento.placar_time2}
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: open finalizar dialog
                                    }}
                                  >
                                    Lançar Placar
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={EVENTO_STATUS_COLORS[evento.status]}>
                                  {EVENTO_STATUS_LABELS[evento.status]}
                                </Badge>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant={hasConvocacoes ? 'default' : 'outline'}
                                  className={
                                    hasConvocacoes
                                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                      : 'text-primary border-primary/30 hover:bg-primary/10'
                                  }
                                  onClick={() => onConvocarJogo(evento, campeonato)}
                                >
                                  {hasConvocacoes ? (
                                    <>
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      {convocacoesCount}
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3 h-3 mr-1" />
                                      Convocar
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum jogo cadastrado neste campeonato
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onAddJogo(campeonato)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Jogo
                  </Button>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
export default function CampeonatosManagement() {
  const navigate = useNavigate();
  const { data: campeonatos, isLoading } = useCampeonatosWithEventCount();
  const deleteCampeonato = useDeleteCampeonato();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCampeonato, setSelectedCampeonato] = useState<CampeonatoWithEventos | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campeonatoToDelete, setCampeonatoToDelete] = useState<CampeonatoWithEventos | null>(null);
  
  // Estado para adicionar jogo
  const [eventoFormOpen, setEventoFormOpen] = useState(false);
  const [selectedCampeonatoForJogo, setSelectedCampeonatoForJogo] = useState<CampeonatoWithEventos | null>(null);
  
  // Estado para visualizar jogo (detail dialog)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);
  const [expandedCampeonatoId, setExpandedCampeonatoId] = useState<string | null>(null);

  // Estado para convocação de jogo
  const [convocacaoDialogOpen, setConvocacaoDialogOpen] = useState(false);
  const [selectedEventoForConvocacao, setSelectedEventoForConvocacao] = useState<CampeonatoEvento | null>(null);
  const [selectedCampeonatoForConvocacao, setSelectedCampeonatoForConvocacao] = useState<CampeonatoWithEventos | null>(null);

  // Get all evento IDs for counting convocations
  const allEventoIds = useMemo(() => {
    if (!campeonatos) return [];
    return campeonatos.flatMap(c => c.eventos?.map(e => e.id) || []);
  }, [campeonatos]);

  const { data: eventosConvocacoesCounts = {} } = useEventosConvocacoesCounts(allEventoIds);

  const filteredCampeonatos = useMemo(() => {
    if (!campeonatos) return [];

    return campeonatos.filter((camp) => {
      const matchesSearch = camp.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || camp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campeonatos, searchTerm, statusFilter]);

  const handleViewDetail = (campeonato: CampeonatoWithEventos) => {
    navigate(`/dashboard/campeonatos/${campeonato.id}`);
  };

  const handleEdit = (campeonato: CampeonatoWithEventos) => {
    setSelectedCampeonato(campeonato);
    setFormOpen(true);
  };

  const handleDelete = (campeonato: CampeonatoWithEventos) => {
    if (campeonato.eventos_count && campeonato.eventos_count > 0) {
      toast.error('Não é possível excluir um campeonato com jogos vinculados');
      return;
    }
    setCampeonatoToDelete(campeonato);
    setDeleteDialogOpen(true);
  };

  const handleAddJogo = (campeonato: CampeonatoWithEventos) => {
    setSelectedCampeonatoForJogo(campeonato);
    setEventoFormOpen(true);
  };

  const handleViewJogo = (eventoId: string) => {
    setSelectedEventoId(eventoId);
    setDetailDialogOpen(true);
  };

  const handleConvocarJogo = (evento: CampeonatoEvento, campeonato: CampeonatoWithEventos) => {
    setSelectedEventoForConvocacao(evento);
    setSelectedCampeonatoForConvocacao(campeonato);
    setConvocacaoDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!campeonatoToDelete) return;

    try {
      await deleteCampeonato.mutateAsync(campeonatoToDelete.id);
      toast.success('Campeonato excluído com sucesso!');
      setDeleteDialogOpen(false);
      setCampeonatoToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir campeonato');
    }
  };

  const handleNewCampeonato = () => {
    setSelectedCampeonato(null);
    setFormOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (!campeonatos) return { total: 0, emAndamento: 0, finalizados: 0 };
    return {
      total: campeonatos.length,
      emAndamento: campeonatos.filter((c) => c.status === 'em_andamento').length,
      finalizados: campeonatos.filter((c) => c.status === 'finalizado').length,
    };
  }, [campeonatos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campeonatos</h1>
            <p className="text-muted-foreground">
              Gerencie campeonatos e torneios da escolinha
            </p>
          </div>
        </div>
        <Button onClick={handleNewCampeonato}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Campeonato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Campeonatos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Finalizados</p>
                <p className="text-2xl font-bold">{stats.finalizados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campeonatos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campeonatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table with Collapsible Rows */}
          <div className="rounded-md border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Campeonato</TableHead>
                  <TableHead className="w-[80px]">Ano</TableHead>
                  <TableHead className="w-[100px]">Categoria</TableHead>
                  <TableHead className="w-[100px]">Jogos</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[160px]">Atletas</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampeonatos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {campeonatos?.length === 0
                        ? 'Nenhum campeonato cadastrado'
                        : 'Nenhum campeonato encontrado com os filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampeonatos.map((campeonato) => (
                    <CampeonatoRow
                      key={campeonato.id}
                      campeonato={campeonato}
                      isOpen={expandedCampeonatoId === campeonato.id}
                      onToggle={() =>
                        setExpandedCampeonatoId((prev) => (prev === campeonato.id ? null : campeonato.id))
                      }
                      onViewDetail={handleViewDetail}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onAddJogo={handleAddJogo}
                      onViewJogo={handleViewJogo}
                      onConvocarJogo={handleConvocarJogo}
                      eventosConvocacoesCounts={eventosConvocacoesCounts}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <CampeonatoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campeonato={selectedCampeonato}
      />

      {/* Evento Form Dialog for adding games */}
      <EventoFormDialog
        open={eventoFormOpen}
        onOpenChange={setEventoFormOpen}
        lockedCampeonatoId={selectedCampeonatoForJogo?.id}
        lockedCampeonatoNome={selectedCampeonatoForJogo?.nome}
      />

      {/* Evento Detail Dialog */}
      <EventoDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        eventoId={selectedEventoId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campeonato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o campeonato "{campeonatoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampeonato.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convocação de Jogo Dialog */}
      {selectedEventoForConvocacao && (
        <AmistosoConvocacoesDialog
          open={convocacaoDialogOpen}
          onOpenChange={setConvocacaoDialogOpen}
          eventoId={selectedEventoForConvocacao.id}
          eventoNome={selectedEventoForConvocacao.nome}
          categoria={selectedEventoForConvocacao.categoria || selectedCampeonatoForConvocacao?.categoria || null}
          taxaParticipacao={null}
          taxaJuiz={selectedEventoForConvocacao.taxa_juiz}
          cobrarTaxaParticipacao={false}
          cobrarTaxaJuiz={selectedEventoForConvocacao.cobrar_taxa_juiz}
        />
      )}
    </div>
  );
}
