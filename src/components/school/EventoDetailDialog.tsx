import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Tag,
  FileText,
  Users,
  Plus,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Flag,
  Lock,
} from 'lucide-react';
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
import type { EventoEsportivo } from '@/hooks/useEventosData';
import { useEncerrarEvento, useEventoById } from '@/hooks/useEventosData';
import {
  useEventoTimes,
  useCreateEventoTime,
  useUpdateEventoTime,
  useDeleteEventoTime,
  useRemoveAlunoFromTime,
  useAddAlunoToTime,
} from '@/hooks/useEventoTimesData';
import { useCampeonatoConvocacoes } from '@/hooks/useCampeonatoConvocacoesData';
import { useCampeonatoDetail } from '@/hooks/useCampeonatosData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AddAlunosToTimeDialog from './AddAlunosToTimeDialog';
import FinalizarEventoDialog from './FinalizarEventoDialog';
import EventoGolsSection from './EventoGolsSection';
import EventoPremiacoesSection from './EventoPremiacoesSection';
import EventoConquistaSection from './EventoConquistaSection';

export interface EventoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: EventoEsportivo | null;
  eventoId?: string | null;
}

const EventoDetailDialog = ({ open, onOpenChange, evento: eventoProp, eventoId }: EventoDetailDialogProps) => {
  const { user } = useAuth();
  
  // Fetch evento by ID if not provided directly
  const { data: fetchedEvento } = useEventoById(eventoProp ? null : eventoId || null);
  const evento = eventoProp || fetchedEvento || null;
  const [newTimeName, setNewTimeName] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTimeName, setEditingTimeName] = useState('');
  const [deleteTimeId, setDeleteTimeId] = useState<string | null>(null);
  const [deleteAlunoId, setDeleteAlunoId] = useState<string | null>(null);
  const [addAlunosTimeId, setAddAlunosTimeId] = useState<string | null>(null);
  const [addAlunosTimeName, setAddAlunosTimeName] = useState<string>('');
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [encerrarDialogOpen, setEncerrarDialogOpen] = useState(false);
  const [autoSetupDone, setAutoSetupDone] = useState(false);

  const { data: times = [], isLoading: loadingTimes } = useEventoTimes(evento?.id);
  const { data: campeonato } = useCampeonatoDetail(evento?.campeonato_id ?? null);
  const { data: convocacoes = [] } = useCampeonatoConvocacoes(evento?.campeonato_id ?? null);
  
  const createTimeMutation = useCreateEventoTime();
  const updateTimeMutation = useUpdateEventoTime();
  const deleteTimeMutation = useDeleteEventoTime();
  const removeAlunoMutation = useRemoveAlunoFromTime();
  const addAlunoMutation = useAddAlunoToTime();
  const encerrarMutation = useEncerrarEvento();

  // Auto-create team with convocados for championship events
  useEffect(() => {
    const setupTeamFromConvocations = async () => {
      if (!evento?.id || !evento.campeonato_id || !campeonato || autoSetupDone) return;
      if (loadingTimes || times.length > 0) return;
      if (convocacoes.length === 0) return;

      setAutoSetupDone(true);

      try {
        // Create team with championship name
        const teamName = campeonato.nome || 'Time da Escola';
        const newTime = await createTimeMutation.mutateAsync({
          eventoId: evento.id,
          nome: teamName,
        });

        // Add all convocados to the team
        for (const conv of convocacoes) {
          await addAlunoMutation.mutateAsync({
            timeId: newTime.id,
            criancaId: conv.crianca_id,
            eventoId: evento.id,
          });
        }

        toast.success(`Time criado com ${convocacoes.length} atleta(s) convocado(s)`);
      } catch (error) {
        console.error('Error auto-creating team:', error);
      }
    };

    setupTeamFromConvocations();
  }, [evento?.id, evento?.campeonato_id, campeonato, convocacoes, times, loadingTimes, autoSetupDone]);

  // Reset autoSetupDone when evento changes
  useEffect(() => {
    setAutoSetupDone(false);
  }, [evento?.id]);

  if (!evento) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    return timeStr.slice(0, 5);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendado':
        return <Badge variant="secondary">Agendado</Badge>;
      case 'realizado':
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Realizado</Badge>;
      case 'finalizado':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'amistoso':
        return <Badge className="bg-violet-500/20 text-violet-700 border-violet-500/30">Amistoso</Badge>;
      case 'campeonato':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Campeonato</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const handleCreateTime = async () => {
    if (!newTimeName.trim()) {
      toast.error('Digite o nome do time');
      return;
    }

    try {
      await createTimeMutation.mutateAsync({
        eventoId: evento.id,
        nome: newTimeName.trim(),
      });
      toast.success('Time criado com sucesso');
      setNewTimeName('');
    } catch {
      toast.error('Erro ao criar time');
    }
  };

  const handleUpdateTime = async (timeId: string) => {
    if (!editingTimeName.trim()) {
      toast.error('Digite o nome do time');
      return;
    }

    try {
      await updateTimeMutation.mutateAsync({
        id: timeId,
        nome: editingTimeName.trim(),
        eventoId: evento.id,
      });
      toast.success('Time atualizado');
      setEditingTimeId(null);
    } catch {
      toast.error('Erro ao atualizar time');
    }
  };

  const handleDeleteTime = async () => {
    if (!deleteTimeId) return;

    try {
      await deleteTimeMutation.mutateAsync({
        id: deleteTimeId,
        eventoId: evento.id,
      });
      toast.success('Time removido');
      setDeleteTimeId(null);
    } catch {
      toast.error('Erro ao remover time');
    }
  };

  const handleRemoveAluno = async () => {
    if (!deleteAlunoId) return;

    try {
      await removeAlunoMutation.mutateAsync({
        id: deleteAlunoId,
        eventoId: evento.id,
      });
      toast.success('Aluno removido do time');
      setDeleteAlunoId(null);
    } catch {
      toast.error('Erro ao remover aluno');
    }
  };

  const openAddAlunos = (timeId: string, timeName: string) => {
    setAddAlunosTimeId(timeId);
    setAddAlunosTimeName(timeName);
  };

  const totalAlunos = times.reduce((acc, time) => acc + time.alunos.length, 0);

  // Get team names for score display
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return null;
    const team = times.find((t) => t.id === teamId);
    return team?.nome || null;
  };

  const hasScore = evento.placar_time1 !== null && evento.placar_time2 !== null;
  // Use nome_time from campeonato if available, otherwise use team name from evento_times
  const time1Name = campeonato?.nome_time || getTeamName(evento.time1_id);
  const adversarioName = evento.adversario;
  const canFinalize = times.length >= 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-violet-600" />
              {evento.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event info */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getTipoBadge(evento.tipo)}
                {getStatusBadge(evento.status)}
              </div>

              {/* Score display */}
              {hasScore && time1Name && adversarioName && (
                <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center space-y-2">
                  {evento.categoria && (
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {evento.categoria}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 text-lg font-semibold">
                    <span className="flex-1 text-right truncate">{time1Name}</span>
                    <span className="text-2xl font-bold text-emerald-600 px-3 py-1 bg-emerald-500/10 rounded-lg">
                      {evento.placar_time1} x {evento.placar_time2}
                    </span>
                    <span className="flex-1 text-left truncate">{adversarioName}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">{formatDate(evento.data)}</span>
                </div>

                {(evento.horario_inicio || evento.horario_fim) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatTime(evento.horario_inicio)}
                      {evento.horario_fim && ` - ${formatTime(evento.horario_fim)}`}
                    </span>
                  </div>
                )}

                {evento.local && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{evento.local}</span>
                  </div>
                )}

                {evento.categoria && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span>{evento.categoria}</span>
                  </div>
                )}

                {evento.observacoes && (
                  <div className="flex items-start gap-3 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{evento.observacoes}</span>
                  </div>
                )}
              </div>

              {/* Finalize button */}
              {canFinalize && evento.status !== 'finalizado' && (
                <Button 
                  onClick={() => setFinalizarDialogOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {hasScore ? 'Editar Placar' : 'Finalizar Jogo'}
                </Button>
              )}
            </div>

            <Separator />

            {/* Goals section - only show for realized events */}
            {hasScore && (
              <>
                <EventoGolsSection
                  evento={evento}
                  times={times}
                  isReadOnly={evento.status === 'finalizado'}
                  escolaTeamName={campeonato?.nome_time}
                />
                <Separator />

                {/* Awards section */}
                <EventoPremiacoesSection
                  evento={evento}
                  times={times}
                  isReadOnly={evento.status === 'finalizado'}
                />
                <Separator />

                {/* Collective achievement for championships */}
                {evento.tipo === 'campeonato' && (
                  <>
                    <EventoConquistaSection
                      evento={evento}
                      escolinhaId={evento.escolinha_id}
                      isReadOnly={evento.status === 'finalizado'}
                    />
                    <Separator />
                  </>
                )}

                {/* Encerrar button */}
                {evento.status === 'realizado' && (
                  <Button
                    onClick={() => setEncerrarDialogOpen(true)}
                    variant="outline"
                    className="w-full border-blue-500/30 text-blue-700 hover:bg-blue-500/10"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Encerrar Jogo Definitivamente
                  </Button>
                )}
              </>
            )}

            {/* Athletes list - simplified view */}
            {times.length > 0 && times[0].alunos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Atletas Escalados
                    <Badge variant="secondary" className="ml-2">
                      {totalAlunos} atleta(s)
                    </Badge>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {times[0].alunos.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={aluno.crianca?.foto_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {aluno.crianca?.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{aluno.crianca?.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete time confirmation */}
      <AlertDialog open={!!deleteTimeId} onOpenChange={() => setDeleteTimeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover time?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o time e todos os alunos vinculados a ele. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTime}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete aluno confirmation */}
      <AlertDialog open={!!deleteAlunoId} onOpenChange={() => setDeleteAlunoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno do time?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno será removido deste time e poderá ser adicionado novamente posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAluno}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add alunos dialog */}
      {addAlunosTimeId && (
        <AddAlunosToTimeDialog
          open={!!addAlunosTimeId}
          onOpenChange={(open) => !open && setAddAlunosTimeId(null)}
          timeId={addAlunosTimeId}
          timeName={addAlunosTimeName}
          eventoId={evento.id}
        />
      )}

      {/* Finalizar evento dialog */}
      <FinalizarEventoDialog
        open={finalizarDialogOpen}
        onOpenChange={setFinalizarDialogOpen}
        evento={evento}
      />

      {/* Encerrar jogo confirmation */}
      <AlertDialog open={encerrarDialogOpen} onOpenChange={setEncerrarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar jogo definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Após encerrar, nenhum dado do jogo poderá ser alterado. O jogo ficará disponível apenas para consulta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await encerrarMutation.mutateAsync(evento.id);
                  toast.success('Jogo encerrado com sucesso');
                  setEncerrarDialogOpen(false);
                } catch {
                  toast.error('Erro ao encerrar jogo');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {encerrarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Encerrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EventoDetailDialog;
