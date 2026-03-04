import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Trophy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoEsportivo } from '@/hooks/useEventosData';
import {
  useConquistaByEvento,
  useCreateConquista,
  useUpdateConquista,
  useDeleteConquista,
  COLOCACOES,
  type Colocacao,
} from '@/hooks/useConquistasData';

interface EventoConquistaSectionProps {
  evento: EventoEsportivo;
  escolinhaId: string;
  isReadOnly?: boolean;
}

const EventoConquistaSection = ({ evento, escolinhaId, isReadOnly = false }: EventoConquistaSectionProps) => {
  const [selectedColocacao, setSelectedColocacao] = useState<Colocacao | ''>('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: conquista, isLoading } = useConquistaByEvento(evento.id);
  const createMutation = useCreateConquista();
  const updateMutation = useUpdateConquista();
  const deleteMutation = useDeleteConquista();

  // Only show for campeonatos
  if (evento.tipo !== 'campeonato') {
    return null;
  }

  const handleSave = async () => {
    if (!selectedColocacao) {
      toast.error('Selecione a colocação');
      return;
    }

    try {
      if (conquista) {
        await updateMutation.mutateAsync({
          id: conquista.id,
          eventoId: evento.id,
          escolinhaId,
          colocacao: selectedColocacao,
        });
        toast.success('Conquista atualizada');
      } else {
        await createMutation.mutateAsync({
          eventoId: evento.id,
          escolinhaId,
          colocacao: selectedColocacao,
          nomeCampeonato: evento.nome,
          categoria: evento.categoria,
          ano: new Date(evento.data).getFullYear(),
        });
        toast.success('Conquista registrada');
      }
      setSelectedColocacao('');
    } catch {
      toast.error('Erro ao salvar conquista');
    }
  };

  const handleDelete = async () => {
    if (!conquista) return;

    try {
      await deleteMutation.mutateAsync({
        id: conquista.id,
        eventoId: evento.id,
        escolinhaId,
      });
      toast.success('Conquista removida');
      setDeleteOpen(false);
    } catch {
      toast.error('Erro ao remover conquista');
    }
  };

  const getColocacaoInfo = (colocacao: Colocacao) => {
    return COLOCACOES.find((c) => c.value === colocacao);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Conquista Coletiva
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : conquista ? (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getColocacaoInfo(conquista.colocacao)?.emoji}</span>
              <div>
                <div className="font-semibold text-lg">
                  {getColocacaoInfo(conquista.colocacao)?.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {conquista.nome_campeonato} {conquista.ano}
                </div>
                {conquista.categoria && (
                  <Badge variant="outline" className="mt-1">
                    {conquista.categoria}
                  </Badge>
                )}
              </div>
            </div>
            {!isReadOnly && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ) : !isReadOnly ? (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
          <div className="flex gap-3">
            <Select value={selectedColocacao} onValueChange={(v) => setSelectedColocacao(v as Colocacao)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Colocação obtida" />
              </SelectTrigger>
              <SelectContent>
                {COLOCACOES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSave}
              disabled={!selectedColocacao || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Registrar'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Nenhuma conquista registrada.
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conquista?</AlertDialogTitle>
            <AlertDialogDescription>
              A conquista será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default EventoConquistaSection;
