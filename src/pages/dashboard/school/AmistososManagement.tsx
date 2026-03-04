import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  useSchoolEventos,
  useDeleteEvento,
  type EventoEsportivo,
  type EventoStatus,
} from '@/hooks/useEventosData';
import { useAmistosoConvocacoesCount } from '@/hooks/useAmistosoConvocacoesData';
import { EventoFormDialog } from '@/components/school/EventoFormDialog';
import EventoDetailDialog from '@/components/school/EventoDetailDialog';
import { AmistosoConvocacoesDialog } from '@/components/school/AmistosoConvocacoesDialog';
import FinalizarAmistosoDialog from '@/components/school/FinalizarAmistosoDialog';
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
  Swords,
  Users,
  Calendar,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  UserPlus,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

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

// Convocation button component with count
function ConvocacaoButton({ evento, onClick }: { evento: EventoEsportivo; onClick: () => void }) {
  const { data: count } = useAmistosoConvocacoesCount(evento.id);
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-7 text-xs gap-1"
    >
      <UserPlus className="w-3 h-3" />
      {count && count > 0 ? `Convocados (${count})` : 'Convocar'}
    </Button>
  );
}

export default function AmistososManagement() {
  const navigate = useNavigate();
  const { data: allEventos, isLoading } = useSchoolEventos();
  const deleteEvento = useDeleteEvento();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoEsportivo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvento, setDetailEvento] = useState<EventoEsportivo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<EventoEsportivo | null>(null);
  const [convocacoesOpen, setConvocacoesOpen] = useState(false);
  const [convocacoesEvento, setConvocacoesEvento] = useState<EventoEsportivo | null>(null);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizarEvento, setFinalizarEvento] = useState<EventoEsportivo | null>(null);

  // Filter only amistosos (events without campeonato_id)
  const amistosos = useMemo(() => {
    if (!allEventos) return [];
    return allEventos.filter((evento) => !evento.campeonato_id);
  }, [allEventos]);

  const filteredAmistosos = useMemo(() => {
    return amistosos.filter((evento) => {
      const matchesSearch = evento.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || evento.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [amistosos, searchTerm, statusFilter]);

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
      toast.success('Amistoso excluído com sucesso!');
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir amistoso');
    }
  };

  const handleNewAmistoso = () => {
    setSelectedEvento(null);
    setFormOpen(true);
  };

  const handleConvocar = (evento: EventoEsportivo) => {
    setConvocacoesEvento(evento);
    setConvocacoesOpen(true);
  };

  const handleFinalizar = (evento: EventoEsportivo) => {
    setFinalizarEvento(evento);
    setFinalizarOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: amistosos.length,
      agendados: amistosos.filter((e) => e.status === 'agendado').length,
      realizados: amistosos.filter((e) => e.status === 'realizado' || e.status === 'finalizado').length,
    };
  }, [amistosos]);

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
            <h1 className="text-2xl font-bold">Amistosos</h1>
            <p className="text-muted-foreground">
              Gerencie jogos amistosos da escolinha
            </p>
          </div>
        </div>
        <Button onClick={handleNewAmistoso}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Amistoso
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Swords className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Amistosos</p>
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
          <CardTitle className="text-lg">Amistosos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar amistosos..."
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
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Placar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Convocação</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAmistosos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {amistosos.length === 0
                        ? 'Nenhum amistoso cadastrado'
                        : 'Nenhum amistoso encontrado com os filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAmistosos.map((evento) => (
                    <TableRow
                      key={evento.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(evento)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Swords className="w-4 h-4 text-orange-500" />
                          {evento.nome}
                        </div>
                      </TableCell>
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
                            onClick={() => handleFinalizar(evento)}
                          >
                            <Flag className="w-3 h-3" />
                            Lançar Placar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[evento.status]}>
                          {STATUS_LABELS[evento.status]}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <ConvocacaoButton evento={evento} onClick={() => handleConvocar(evento)} />
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <EventoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        evento={detailEvento}
      />

      {/* Form Dialog - force amistoso type */}
      <EventoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        evento={selectedEvento}
        forceAmistoso
      />

      {/* Convocações Dialog */}
      {convocacoesEvento && (
        <AmistosoConvocacoesDialog
          open={convocacoesOpen}
          onOpenChange={setConvocacoesOpen}
          eventoId={convocacoesEvento!.id}
          eventoNome={convocacoesEvento!.nome}
          categoria={convocacoesEvento!.categoria}
          taxaParticipacao={convocacoesEvento!.taxa_participacao}
          taxaJuiz={convocacoesEvento!.taxa_juiz}
          cobrarTaxaParticipacao={convocacoesEvento!.cobrar_taxa_participacao ?? false}
          cobrarTaxaJuiz={convocacoesEvento!.cobrar_taxa_juiz ?? false}
        />
      )}

      {/* Finalizar Amistoso Dialog */}
      <FinalizarAmistosoDialog
        open={finalizarOpen}
        onOpenChange={setFinalizarOpen}
        evento={finalizarEvento}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Amistoso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o amistoso "{eventoToDelete?.nome}"?
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
