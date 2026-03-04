import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoEsportivo } from '@/hooks/useEventosData';
import { useEventoTimes } from '@/hooks/useEventoTimesData';
import { useFinalizarEvento } from '@/hooks/useEventosData';
import { useCampeonatoDetail } from '@/hooks/useCampeonatosData';

interface FinalizarEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: EventoEsportivo | null;
  onSuccess?: () => void;
}

const FinalizarEventoDialog = ({ open, onOpenChange, evento, onSuccess }: FinalizarEventoDialogProps) => {
  const [adversario, setAdversario] = useState<string>('');
  const [placarTime1, setPlacarTime1] = useState<string>('');
  const [placarTime2, setPlacarTime2] = useState<string>('');

  const { data: times = [], isLoading: loadingTimes } = useEventoTimes(evento?.id);
  const { data: campeonato, isLoading: loadingCampeonato } = useCampeonatoDetail(evento?.campeonato_id || null);
  const finalizarMutation = useFinalizarEvento();

  // Auto-select the first team (should be the school team)
  const time1 = times[0];
  const time1Id = time1?.id || '';
  
  // Use nome_time from campeonato if available, otherwise use team name
  const escolaTeamName = campeonato?.nome_time || time1?.nome || 'Escola';

  // Reset form when dialog opens with new event
  useEffect(() => {
    if (evento && open) {
      setAdversario(evento.adversario || '');
      setPlacarTime1(evento.placar_time1?.toString() || '');
      setPlacarTime2(evento.placar_time2?.toString() || '');
    }
  }, [evento, open]);

  if (!evento) return null;

  const canFinalize = times.length >= 1;

  const handleSubmit = async () => {
    if (!time1Id) {
      toast.error('É necessário ter pelo menos um time cadastrado');
      return;
    }

    if (placarTime1 === '' || placarTime2 === '') {
      toast.error('Informe o placar dos dois times');
      return;
    }

    const placar1 = parseInt(placarTime1, 10);
    const placar2 = parseInt(placarTime2, 10);

    if (isNaN(placar1) || isNaN(placar2) || placar1 < 0 || placar2 < 0) {
      toast.error('Placar inválido');
      return;
    }

    try {
      await finalizarMutation.mutateAsync({
        id: evento.id,
        time1_id: time1Id,
        adversario: adversario.trim() || null,
        placar_time1: placar1,
        placar_time2: placar2,
        status: 'realizado',
      });
      toast.success('Jogo finalizado com sucesso');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao finalizar jogo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            Finalizar Jogo
          </DialogTitle>
          <DialogDescription>
            Registre o placar final da partida.
          </DialogDescription>
        </DialogHeader>

        {loadingTimes || loadingCampeonato ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !canFinalize ? (
          <div className="py-6 text-center text-muted-foreground">
            <p className="mb-2">Para finalizar o jogo, é necessário:</p>
            <ul className="text-sm space-y-1">
              <li>• Pelo menos 1 time da escola cadastrado</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Placar preview */}
            {placarTime1 !== '' && placarTime2 !== '' && (
              <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
                {evento.categoria && (
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {evento.categoria}
                  </div>
                )}
                <div className="flex items-center justify-center gap-4 text-lg font-semibold">
                  <span className="flex-1 text-right truncate">{escolaTeamName}</span>
                  <span className="text-2xl font-bold text-primary px-2">
                    {placarTime1} x {placarTime2}
                  </span>
                  <span className="flex-1 text-left truncate">{adversario || 'Adversário'}</span>
                </div>
              </div>
            )}

            {/* Time info - read only */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Time da Escola</Label>
              <div className="p-3 bg-muted/50 rounded-md font-medium">
                {escolaTeamName} ({time1?.alunos?.length || 0} atletas)
              </div>
            </div>

            {/* Adversário - optional */}
            <div className="space-y-2">
              <Label>Adversário (opcional)</Label>
              <Input
                placeholder="Nome do time adversário..."
                value={adversario}
                onChange={(e) => setAdversario(e.target.value)}
              />
            </div>

            {/* Placar inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gols {escolaTeamName}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={placarTime1}
                  onChange={(e) => setPlacarTime1(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Gols {adversario || 'Adversário'}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={placarTime2}
                  onChange={(e) => setPlacarTime2(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canFinalize || finalizarMutation.isPending}
          >
            {finalizarMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Placar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizarEventoDialog;
