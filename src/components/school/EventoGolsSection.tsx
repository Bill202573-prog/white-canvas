import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Goal, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoEsportivo } from '@/hooks/useEventosData';
import type { EventoTimeWithAlunos } from '@/hooks/useEventoTimesData';
import {
  useEventoGols,
  useCreateEventoGol,
  useUpdateEventoGol,
  useDeleteEventoGol,
  type EventoGol,
} from '@/hooks/useEventoGolsData';

interface EventoGolsSectionProps {
  evento: EventoEsportivo;
  times: EventoTimeWithAlunos[];
  isReadOnly?: boolean;
  escolaTeamName?: string | null;
}

const EventoGolsSection = ({ evento, times, isReadOnly = false, escolaTeamName }: EventoGolsSectionProps) => {
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [deleteGolId, setDeleteGolId] = useState<string | null>(null);

  const { data: gols = [], isLoading } = useEventoGols(evento.id);
  const createGolMutation = useCreateEventoGol();
  const updateGolMutation = useUpdateEventoGol();
  const deleteGolMutation = useDeleteEventoGol();

  // Calculate totals
  const totalGolsTime1 = useMemo(() => {
    if (!evento.time1_id) return 0;
    return gols
      .filter((g) => g.time_id === evento.time1_id)
      .reduce((acc, g) => acc + g.quantidade, 0);
  }, [gols, evento.time1_id]);

  const maxGolsTime1 = evento.placar_time1 ?? 0;
  const remainingGolsTime1 = maxGolsTime1 - totalGolsTime1;

  // Get the school team (time1)
  const schoolTeam = times.find((t) => t.id === evento.time1_id);

  // Get available students for school team (already on the team, not yet registered goals)
  const availableAlunos = useMemo(() => {
    if (!schoolTeam) return [];

    // Filter out students who already have goals registered
    const registeredAlunoIds = gols.map((g) => g.crianca_id);
    return schoolTeam.alunos.filter((a) => !registeredAlunoIds.includes(a.crianca_id));
  }, [schoolTeam, gols]);

  // Get team name - use escolaTeamName if provided
  const getTimeName = (timeId: string) => {
    if (timeId === evento.time1_id && escolaTeamName) {
      return escolaTeamName;
    }
    const time = times.find((t) => t.id === timeId);
    return time?.nome || '';
  };

  // Group goals by team
  const golsByTime = useMemo(() => {
    const grouped: Record<string, EventoGol[]> = {};
    gols.forEach((gol) => {
      if (!grouped[gol.time_id]) {
        grouped[gol.time_id] = [];
      }
      grouped[gol.time_id].push(gol);
    });
    return grouped;
  }, [gols]);

  const handleAddGol = async () => {
    if (!schoolTeam || !selectedAlunoId) {
      toast.error('Selecione o jogador');
      return;
    }

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    // Validate against remaining goals
    if (qtd > remainingGolsTime1) {
      toast.error(`Máximo de ${remainingGolsTime1} gol(s) restante(s)`);
      return;
    }

    try {
      await createGolMutation.mutateAsync({
        eventoId: evento.id,
        timeId: schoolTeam.id,
        criancaId: selectedAlunoId,
        quantidade: qtd,
      });
      toast.success('Gol registrado');
      setSelectedAlunoId('');
      setQuantidade('1');
    } catch {
      toast.error('Erro ao registrar gol');
    }
  };

  const handleUpdateGol = async (gol: EventoGol, newQuantidade: number) => {
    if (newQuantidade <= 0) {
      setDeleteGolId(gol.id);
      return;
    }

    // Validate against remaining goals
    const otherGolsTotal = gols
      .filter((g) => g.time_id === gol.time_id && g.id !== gol.id)
      .reduce((acc, g) => acc + g.quantidade, 0);

    if (gol.time_id === evento.time1_id) {
      const maxAllowed = maxGolsTime1 - otherGolsTotal;
      if (newQuantidade > maxAllowed) {
        toast.error(`Máximo de ${maxAllowed} gol(s) para este jogador`);
        return;
      }
    }

    try {
      await updateGolMutation.mutateAsync({
        id: gol.id,
        eventoId: evento.id,
        quantidade: newQuantidade,
      });
    } catch {
      toast.error('Erro ao atualizar gol');
    }
  };

  const handleDeleteGol = async () => {
    if (!deleteGolId) return;

    try {
      await deleteGolMutation.mutateAsync({
        id: deleteGolId,
        eventoId: evento.id,
      });
      toast.success('Gol removido');
      setDeleteGolId(null);
    } catch {
      toast.error('Erro ao remover gol');
    }
  };

  // Only show for events that have a score registered
  if (evento.placar_time1 === null || evento.placar_time2 === null) {
    return null;
  }

  // Display team name
  const displayTeamName = escolaTeamName || schoolTeam?.nome || 'Time da Escola';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Goal className="w-4 h-4" />
          Gols da Partida
        </h3>
        {evento.time1_id && (
          <Badge variant="outline" className={remainingGolsTime1 === 0 ? 'bg-emerald-500/10 text-emerald-700' : ''}>
            {totalGolsTime1}/{maxGolsTime1} gols registrados
          </Badge>
        )}
      </div>

      {/* Warning if goals exceed score */}
      {totalGolsTime1 > maxGolsTime1 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Total de gols excede o placar final!</span>
        </div>
      )}

      {/* Add goal form - only for school's team */}
      {!isReadOnly && schoolTeam && remainingGolsTime1 > 0 && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jogador ({displayTeamName})</Label>
              <Select
                value={selectedAlunoId}
                onValueChange={setSelectedAlunoId}
                disabled={availableAlunos.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={availableAlunos.length === 0 ? 'Todos já registrados' : 'Selecione o jogador'} />
                </SelectTrigger>
                <SelectContent>
                  {availableAlunos.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.crianca_id}>
                      {aluno.crianca?.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gols</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max={remainingGolsTime1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-20"
                />
                <Button
                  onClick={handleAddGol}
                  disabled={!selectedAlunoId || createGolMutation.isPending}
                  className="flex-1"
                >
                  {createGolMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : gols.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Nenhum gol registrado ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {/* School team goals */}
          {evento.time1_id && golsByTime[evento.time1_id] && golsByTime[evento.time1_id].length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                {getTimeName(evento.time1_id)}
              </div>
              <div className="space-y-2">
                {golsByTime[evento.time1_id].map((gol) => (
                  <div
                    key={gol.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-lg">⚽</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={gol.crianca?.foto_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {gol.crianca?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">{gol.crianca?.nome}</span>
                    {!isReadOnly ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => handleUpdateGol(gol, gol.quantidade - 1)}
                          disabled={updateGolMutation.isPending}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-semibold">{gol.quantidade}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => handleUpdateGol(gol, gol.quantidade + 1)}
                          disabled={updateGolMutation.isPending || (totalGolsTime1 >= maxGolsTime1)}
                        >
                          +
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setDeleteGolId(gol.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">
                        {gol.quantidade} {gol.quantidade === 1 ? 'gol' : 'gols'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteGolId} onOpenChange={() => setDeleteGolId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro de gol?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro de gol será removido. Esta ação pode ser refeita depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGol}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventoGolsSection;
