import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  useSchoolEventos,
  useDeleteEvento,
  type EventoEsportivo,
  type EventoTipo,
  type EventoStatus,
} from '@/hooks/useEventosData';
import { useSchoolCampeonatos } from '@/hooks/useCampeonatosData';
import { EventoFormDialog } from '@/components/school/EventoFormDialog';
import EventoDetailDialog from '@/components/school/EventoDetailDialog';
import { EventoTimesCollapsible } from '@/components/school/EventoTimesCollapsible';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Plus,
  Search,
  Trophy,
  Users,
  Calendar,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const TIPO_LABELS: Record<EventoTipo, string> = {
  amistoso: 'Amistoso',
  campeonato: 'Campeonato',
};

const STATUS_LABELS: Record<EventoStatus, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  finalizado: 'Finalizado',
};

const STATUS_COLORS: Record<EventoStatus, string> = {
  agendado: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  realizado: 'bg-green-500/10 text-green-600 border-green-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

const TIPO_COLORS: Record<EventoTipo, string> = {
  amistoso: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  campeonato: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export default function EventosManagement() {
  const navigate = useNavigate();
  const { data: eventos, isLoading } = useSchoolEventos();
  const { data: campeonatos } = useSchoolCampeonatos();
  const deleteEvento = useDeleteEvento();

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campeonatoFilter, setCampeonatoFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoEsportivo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvento, setDetailEvento] = useState<EventoEsportivo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<EventoEsportivo | null>(null);
  const [expandedCampeonatos, setExpandedCampeonatos] = useState<Set<string>>(new Set(['amistosos']));

  const filteredEventos = useMemo(() => {
    if (!eventos) return [];

    return eventos.filter((evento) => {
      const matchesSearch = evento.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesTipo = tipoFilter === 'all' || evento.tipo === tipoFilter;
      const matchesStatus = statusFilter === 'all' || evento.status === statusFilter;
      const matchesCampeonato = campeonatoFilter === 'all' || 
        (campeonatoFilter === 'amistosos' && !evento.campeonato_id) ||
        evento.campeonato_id === campeonatoFilter;

      return matchesSearch && matchesTipo && matchesStatus && matchesCampeonato;
    });
  }, [eventos, searchTerm, tipoFilter, statusFilter, campeonatoFilter]);

  // Group events by campeonato
  const groupedEventos = useMemo(() => {
    const groups: { id: string; nome: string; eventos: EventoEsportivo[] }[] = [];
    const campeonatoMap = new Map<string, EventoEsportivo[]>();
    const amistosos: EventoEsportivo[] = [];

    filteredEventos.forEach((evento) => {
      if (evento.campeonato_id) {
        const existing = campeonatoMap.get(evento.campeonato_id) || [];
        existing.push(evento);
        campeonatoMap.set(evento.campeonato_id, existing);
      } else {
        amistosos.push(evento);
      }
    });

    // Add campeonato groups
    campeonatoMap.forEach((eventosGroup, campeonatoId) => {
      const campeonato = campeonatos?.find((c) => c.id === campeonatoId);
      groups.push({
        id: campeonatoId,
        nome: campeonato ? `${campeonato.nome} (${campeonato.ano})` : 'Campeonato',
        eventos: eventosGroup.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
      });
    });

    // Sort campeonatos by name
    groups.sort((a, b) => a.nome.localeCompare(b.nome));

    // Add amistosos at the end
    if (amistosos.length > 0) {
      groups.push({
        id: 'amistosos',
        nome: 'Amistosos',
        eventos: amistosos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
      });
    }

    return groups;
  }, [filteredEventos, campeonatos]);

  const toggleCampeonato = (id: string) => {
    setExpandedCampeonatos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleViewDetail = (evento: EventoEsportivo) => {
    setDetailEvento(evento);
    setDetailOpen(true);
  };

  const handleEdit = (evento: EventoEsportivo) => {
    setSelectedEvento(evento);
    setFormOpen(true);
  };

  const handleDelete = (evento: EventoEsportivo) => {
    setEventoToDelete(evento);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventoToDelete) return;

    try {
      await deleteEvento.mutateAsync(eventoToDelete.id);
      toast.success('Evento excluído com sucesso!');
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir evento');
    }
  };

  const handleNewEvento = () => {
    setSelectedEvento(null);
    setFormOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (!eventos) return { total: 0, agendados: 0, realizados: 0 };
    return {
      total: eventos.length,
      agendados: eventos.filter((e) => e.status === 'agendado').length,
      realizados: eventos.filter((e) => e.status === 'realizado').length,
    };
  }, [eventos]);

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
            <h1 className="text-2xl font-bold">Eventos Esportivos</h1>
            <p className="text-muted-foreground">
              Gerencie amistosos e campeonatos da escolinha
            </p>
          </div>
        </div>
        <Button onClick={handleNewEvento}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
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
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agendados</p>
                <p className="text-2xl font-bold">{stats.agendados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realizados</p>
                <p className="text-2xl font-bold">{stats.realizados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="amistoso">Amistoso</SelectItem>
                <SelectItem value="campeonato">Campeonato</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={campeonatoFilter} onValueChange={setCampeonatoFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Campeonato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campeonatos</SelectItem>
                <SelectItem value="amistosos">Apenas amistosos</SelectItem>
                {campeonatos?.map((camp) => (
                  <SelectItem key={camp.id} value={camp.id}>
                    {camp.nome} ({camp.ano})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Events */}
          <div className="space-y-4">
            {groupedEventos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                {eventos?.length === 0
                  ? 'Nenhum evento cadastrado'
                  : 'Nenhum evento encontrado com os filtros aplicados'}
              </div>
            ) : (
              groupedEventos.map((group) => (
                <Collapsible
                  key={group.id}
                  open={expandedCampeonatos.has(group.id)}
                  onOpenChange={() => toggleCampeonato(group.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer border">
                      <div className="flex items-center gap-3">
                        {expandedCampeonatos.has(group.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <Trophy className={`w-5 h-5 ${group.id === 'amistosos' ? 'text-orange-500' : 'text-purple-500'}`} />
                        <span className="font-semibold">{group.nome}</span>
                        <Badge variant="secondary" className="ml-2">
                          {group.eventos.length} {group.eventos.length === 1 ? 'jogo' : 'jogos'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md border mt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Evento</TableHead>
                            {group.id !== 'amistosos' && <TableHead>Fase</TableHead>}
                            <TableHead>Data</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead>Local</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Placar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.eventos.map((evento) => (
                            <>
                              <TableRow 
                                key={evento.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleViewDetail(evento)}
                              >
                                <TableCell className="font-medium">{evento.nome}</TableCell>
                                {group.id !== 'amistosos' && (
                                  <TableCell>
                                    {evento.fase ? (
                                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                                        {evento.fase}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell>
                                  {format(new Date(evento.data), "dd 'de' MMM, yyyy", {
                                    locale: ptBR,
                                  })}
                                </TableCell>
                                <TableCell>
                                  {evento.horario_inicio
                                    ? `${evento.horario_inicio.slice(0, 5)}${
                                        evento.horario_fim ? ` - ${evento.horario_fim.slice(0, 5)}` : ''
                                      }`
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {evento.local ? (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-muted-foreground" />
                                      <span className="truncate max-w-[150px]">{evento.local}</span>
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>{evento.categoria || '-'}</TableCell>
                                <TableCell>
                                  {evento.placar_time1 !== null && evento.placar_time2 !== null ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-semibold">
                                      {evento.placar_time1} x {evento.placar_time2}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={STATUS_COLORS[evento.status]}>
                                    {STATUS_LABELS[evento.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewDetail(evento)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Detalhes
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleEdit(evento)}>
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(evento)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                              <TableRow key={`${evento.id}-times`} className="hover:bg-transparent border-b">
                                <TableCell 
                                  colSpan={group.id !== 'amistosos' ? 9 : 8} 
                                  className="pt-0 pb-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <EventoTimesCollapsible
                                    eventoId={evento.id}
                                    onEscalarClick={() => handleViewDetail(evento)}
                                  />
                                </TableCell>
                              </TableRow>
                            </>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog (Times/Escalação) */}
      <EventoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        evento={detailEvento}
      />

      {/* Form Dialog */}
      <EventoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        evento={selectedEvento}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{eventoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEvento.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
