import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Medal, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoEsportivo } from '@/hooks/useEventosData';
import type { EventoTimeWithAlunos } from '@/hooks/useEventoTimesData';
import {
  useEventoPremiacoes,
  useCreateEventoPremiacao,
  useDeleteEventoPremiacao,
  TIPOS_PREMIACAO,
} from '@/hooks/useEventoPremiacoesData';

interface EventoPremiacoesSectionProps {
  evento: EventoEsportivo;
  times: EventoTimeWithAlunos[];
  isReadOnly?: boolean;
}

const EventoPremiacoesSection = ({ evento, times, isReadOnly = false }: EventoPremiacoesSectionProps) => {
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: premiacoes = [], isLoading } = useEventoPremiacoes(evento.id);
  const createMutation = useCreateEventoPremiacao();
  const deleteMutation = useDeleteEventoPremiacao();

  // Get all students from all teams
  const allAlunos = useMemo(() => {
    const alunos: { id: string; nome: string; fotoUrl: string | null }[] = [];
    times.forEach((time) => {
      time.alunos.forEach((aluno) => {
        if (aluno.crianca) {
          alunos.push({
            id: aluno.crianca_id,
            nome: aluno.crianca.nome,
            fotoUrl: aluno.crianca.foto_url,
          });
        }
      });
    });
    return alunos;
  }, [times]);

  // Get available award types (not yet assigned)
  const availableTipos = useMemo(() => {
    const usedTipos = premiacoes.map((p) => p.tipo_premiacao);
    return TIPOS_PREMIACAO.filter((t) => !usedTipos.includes(t.value));
  }, [premiacoes]);

  const handleAdd = async () => {
    if (!selectedTipo || !selectedAlunoId) {
      toast.error('Selecione o tipo de premiação e o aluno');
      return;
    }

    try {
      await createMutation.mutateAsync({
        eventoId: evento.id,
        criancaId: selectedAlunoId,
        tipoPremiacao: selectedTipo,
      });
      toast.success('Premiação registrada');
      setSelectedTipo('');
      setSelectedAlunoId('');
    } catch {
      toast.error('Erro ao registrar premiação');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync({
        id: deleteId,
        eventoId: evento.id,
      });
      toast.success('Premiação removida');
      setDeleteId(null);
    } catch {
      toast.error('Erro ao remover premiação');
    }
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_PREMIACAO.find((t) => t.value === tipo)?.label || tipo;
  };

  const getTipoEmoji = (tipo: string) => {
    switch (tipo) {
      case 'melhor_jogador': return '🏆';
      case 'melhor_goleiro': return '🧤';
      case 'artilheiro': return '⚽';
      case 'melhor_defesa': return '🛡️';
      case 'destaque': return '⭐';
      default: return '🏅';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Medal className="w-4 h-4" />
          Premiações Individuais
        </h3>
        {premiacoes.length > 0 && (
          <Badge variant="outline">
            {premiacoes.length} premiação(ões)
          </Badge>
        )}
      </div>

      {/* Add form */}
      {!isReadOnly && availableTipos.length > 0 && allAlunos.length > 0 && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de premiação" />
              </SelectTrigger>
              <SelectContent>
                {availableTipos.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {getTipoEmoji(tipo.value)} {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAlunoId} onValueChange={setSelectedAlunoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {allAlunos.map((aluno) => (
                  <SelectItem key={aluno.id} value={aluno.id}>
                    {aluno.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!selectedTipo || !selectedAlunoId || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Premiação
              </>
            )}
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : premiacoes.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Nenhuma premiação registrada.
        </div>
      ) : (
        <div className="space-y-2">
          {premiacoes.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
            >
              <span className="text-xl">{getTipoEmoji(p.tipo_premiacao)}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.crianca?.foto_url || undefined} />
                <AvatarFallback className="text-xs">
                  {p.crianca?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{p.crianca?.nome}</div>
                <div className="text-xs text-muted-foreground">{getTipoLabel(p.tipo_premiacao)}</div>
              </div>
              {!isReadOnly && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setDeleteId(p.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover premiação?</AlertDialogTitle>
            <AlertDialogDescription>
              A premiação será removida do evento.
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

export default EventoPremiacoesSection;
