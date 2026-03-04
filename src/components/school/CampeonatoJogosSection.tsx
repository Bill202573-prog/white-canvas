import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Calendar, 
  MapPin, 
  Plus, 
  Trophy, 
  Users, 
  Loader2, 
  MoreVertical,
  Flag,
  Swords,
  Pencil,
  Trash2,
  Eye,
  Send,
  ClipboardList,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { EventoFormDialog } from '@/components/school/EventoFormDialog';
import EventoDetailDialog from '@/components/school/EventoDetailDialog';
import { AmistosoConvocacoesDialog } from '@/components/school/AmistosoConvocacoesDialog';
import FinalizarAmistosoDialog from '@/components/school/FinalizarAmistosoDialog';
import { useDeleteEvento, type EventoEsportivo, type EventoStatus } from '@/hooks/useEventosData';
import { useAmistosoConvocacoes } from '@/hooks/useAmistosoConvocacoesData';
import { useAuth } from '@/contexts/AuthContext';
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

interface CampeonatoJogosSectionProps {
  campeonatoId: string;
  campeonatoNome: string;
  escolinhaId: string;
  escolaNome?: string;
  eventos: EventoEsportivo[];
  isLoading?: boolean;
  /** List of confirmed athlete IDs from the championship registration */
  atletasConfirmadosIds?: string[];
}

export function CampeonatoJogosSection({
  campeonatoId,
  campeonatoNome,
  escolinhaId,
  escolaNome,
  eventos,
  isLoading = false,
  atletasConfirmadosIds = [],
}: CampeonatoJogosSectionProps) {
  const { user } = useAuth();
  const deleteEvento = useDeleteEvento();
  
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoEsportivo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvento, setDetailEvento] = useState<EventoEsportivo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<EventoEsportivo | null>(null);
  const [convocacoesDialogOpen, setConvocacoesDialogOpen] = useState(false);
  const [convocacoesEvento, setConvocacoesEvento] = useState<EventoEsportivo | null>(null);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [finalizarEvento, setFinalizarEvento] = useState<EventoEsportivo | null>(null);

  // Get escola name for display
  const nomeEscola = escolaNome || user?.escolinhaNome || 'Time da Escola';

  const sortedEventos = useMemo(() => {
    return [...eventos].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [eventos]);

  const stats = useMemo(() => ({
    total: eventos.length,
    agendados: eventos.filter(e => e.status === 'agendado').length,
    realizados: eventos.filter(e => e.status === 'realizado' || e.status === 'finalizado').length,
  }), [eventos]);

  const handleNewJogo = () => {
    setSelectedEvento(null);
    setFormOpen(true);
  };

  const handleEdit = (evento: EventoEsportivo) => {
    setSelectedEvento(evento);
    setFormOpen(true);
  };

  const handleViewDetail = (evento: EventoEsportivo) => {
    setDetailEvento(evento);
    setDetailOpen(true);
  };

  const handleDelete = (evento: EventoEsportivo) => {
    setEventoToDelete(evento);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventoToDelete) return;

    try {
      await deleteEvento.mutateAsync(eventoToDelete.id);
      toast.success('Jogo excluído com sucesso!');
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir jogo');
    }
  };

  const handleConvocacoes = (evento: EventoEsportivo) => {
    setConvocacoesEvento(evento);
    setConvocacoesDialogOpen(true);
  };

  const handleLancarPlacar = (evento: EventoEsportivo) => {
    setFinalizarEvento(evento);
    setFinalizarDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jogos do Campeonato
              </CardTitle>
              <CardDescription>
                Gerencie os jogos e convocações para cada partida
                {atletasConfirmadosIds.length > 0 && (
                  <span className="font-medium ml-1">
                    • {atletasConfirmadosIds.length} atletas confirmados
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={handleNewJogo}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Jogo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-purple-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 text-sm">
                <Trophy className="w-4 h-4" />
                Total de Jogos
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <Calendar className="w-4 h-4" />
                Agendados
              </div>
              <p className="text-2xl font-bold mt-1">{stats.agendados}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Users className="w-4 h-4" />
                Realizados
              </div>
              <p className="text-2xl font-bold mt-1">{stats.realizados}</p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEventos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum jogo cadastrado para este campeonato
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEventos.map((evento) => (
                    <JogoRow
                      key={evento.id}
                      evento={evento}
                      nomeEscola={nomeEscola}
                      onViewDetail={handleViewDetail}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onConvocacoes={handleConvocacoes}
                      onLancarPlacar={handleLancarPlacar}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Helper text */}
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              💡 <strong>Convocações:</strong> Ao convocar atletas para um jogo, apenas os atletas confirmados no campeonato estarão disponíveis. A taxa de arbitragem será cobrada dos convocados.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog for new/edit games */}
      <EventoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        evento={selectedEvento}
        lockedCampeonatoId={campeonatoId}
        lockedCampeonatoNome={campeonatoNome}
      />

      {/* Detail Dialog */}
      {detailEvento && (
        <EventoDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          evento={detailEvento}
        />
      )}

      {/* Convocações Dialog - Uses amistoso dialog which works similarly */}
      {convocacoesEvento && (
        <AmistosoConvocacoesDialog
          open={convocacoesDialogOpen}
          onOpenChange={setConvocacoesDialogOpen}
          eventoId={convocacoesEvento.id}
          eventoNome={`${nomeEscola} x ${convocacoesEvento.adversario || 'Adversário'}`}
          categoria={convocacoesEvento.categoria}
          taxaParticipacao={null}
          taxaJuiz={(convocacoesEvento as any).taxa_juiz}
          cobrarTaxaParticipacao={false}
          cobrarTaxaJuiz={(convocacoesEvento as any).cobrar_taxa_juiz ?? false}
          allowedAtletaIds={atletasConfirmadosIds}
        />
      )}

      {/* Finalizar/Lançar Placar Dialog */}
      <FinalizarAmistosoDialog
        open={finalizarDialogOpen}
        onOpenChange={setFinalizarDialogOpen}
        evento={finalizarEvento}
        onSuccess={() => setFinalizarDialogOpen(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Jogo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o jogo "{eventoToDelete?.nome}"?
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
    </>
  );
}

// Row component to handle convocation count per game
interface JogoRowProps {
  evento: EventoEsportivo;
  nomeEscola: string;
  onViewDetail: (evento: EventoEsportivo) => void;
  onEdit: (evento: EventoEsportivo) => void;
  onDelete: (evento: EventoEsportivo) => void;
  onConvocacoes: (evento: EventoEsportivo) => void;
  onLancarPlacar: (evento: EventoEsportivo) => void;
}

function JogoRow({
  evento,
  nomeEscola,
  onViewDetail,
  onEdit,
  onDelete,
  onConvocacoes,
  onLancarPlacar,
}: JogoRowProps) {
  const { data: convocacoes = [] } = useAmistosoConvocacoes(evento.id);
  
  const convocacoesCount = convocacoes.length;
  const confirmadosCount = convocacoes.filter(c => c.status === 'pago' || c.status === 'confirmado').length;
  
  const matchTitle = `${nomeEscola} x ${evento.adversario || 'Adversário'}`;
  
  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewDetail(evento)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-purple-500" />
          {matchTitle}
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(evento.data), "dd/MM/yyyy", { locale: ptBR })}
      </TableCell>
      <TableCell>
        {evento.fase ? (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
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
            onClick={() => onLancarPlacar(evento)}
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
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onConvocacoes(evento)}
        >
          <Users className="w-3 h-3" />
          {convocacoesCount > 0 ? (
            <span>Convocados ({convocacoesCount})</span>
          ) : (
            <span>Convocar</span>
          )}
        </Button>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetail(evento)}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConvocacoes(evento)}>
              <Send className="w-4 h-4 mr-2" />
              Convocações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLancarPlacar(evento)}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Lançar Placar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(evento)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(evento)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
