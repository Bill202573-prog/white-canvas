import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { useSchoolChildrenWithRelations } from '@/hooks/useSchoolData';
import { useAddAlunoToTime, useEventoAlunosIds } from '@/hooks/useEventoTimesData';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddAlunosToTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeId: string;
  timeName: string;
  eventoId: string;
}

const AddAlunosToTimeDialog = ({
  open,
  onOpenChange,
  timeId,
  timeName,
  eventoId,
}: AddAlunosToTimeDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);

  const { data: allChildren = [], isLoading: loadingChildren } = useSchoolChildrenWithRelations();
  const { data: alunosJaNoEvento = [] } = useEventoAlunosIds(eventoId);
  const addAlunoMutation = useAddAlunoToTime();

  // Get unique categories and turmas for filters
  const { categorias, turmas } = useMemo(() => {
    const categoriasSet = new Set<string>();
    const turmasMap = new Map<string, string>();

    allChildren.forEach(child => {
      // Calculate category based on birth year
      const birthYear = new Date(child.data_nascimento).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      const categoria = `Sub-${age}`;
      categoriasSet.add(categoria);

      // Add turmas
      child.turmas?.forEach(t => {
        if (t.turma) {
          turmasMap.set(t.turma.id, t.turma.nome);
        }
      });
    });

    return {
      categorias: Array.from(categoriasSet).sort(),
      turmas: Array.from(turmasMap.entries()).map(([id, nome]) => ({ id, nome })),
    };
  }, [allChildren]);

  // Filter children
  const filteredChildren = useMemo(() => {
    return allChildren.filter(child => {
      // Only show active children
      if (!child.ativo) return false;

      // Exclude children already in any team of this event
      if (alunosJaNoEvento.includes(child.id)) return false;

      // Search filter
      if (searchTerm && !child.nome.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategoria !== 'all') {
        const birthYear = new Date(child.data_nascimento).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        const categoria = `Sub-${age}`;
        if (categoria !== selectedCategoria) return false;
      }

      // Turma filter
      if (selectedTurma !== 'all') {
        const hasTurma = child.turmas?.some(t => t.turma?.id === selectedTurma);
        if (!hasTurma) return false;
      }

      return true;
    });
  }, [allChildren, alunosJaNoEvento, searchTerm, selectedCategoria, selectedTurma]);

  const toggleAluno = (alunoId: string) => {
    setSelectedAlunos(prev =>
      prev.includes(alunoId)
        ? prev.filter(id => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  const handleAddAlunos = async () => {
    if (selectedAlunos.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }

    try {
      for (const alunoId of selectedAlunos) {
        await addAlunoMutation.mutateAsync({
          timeId,
          criancaId: alunoId,
          eventoId,
        });
      }
      toast.success(`${selectedAlunos.length} aluno(s) adicionado(s) ao time`);
      setSelectedAlunos([]);
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes('já está em outro time')) {
        toast.error('Um ou mais alunos já estão em outro time deste evento');
      } else {
        toast.error('Erro ao adicionar alunos');
      }
    }
  };

  const getCategoria = (dataNascimento: string) => {
    const birthYear = new Date(dataNascimento).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return `Sub-${age}`;
  };

  const getTurmaNames = (child: typeof allChildren[0]) => {
    return child.turmas?.map(t => t.turma?.nome).filter(Boolean).join(', ') || '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar alunos ao time: {timeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTurma} onValueChange={setSelectedTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas.map(turma => (
                  <SelectItem key={turma.id} value={turma.id}>{turma.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected count */}
          {selectedAlunos.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedAlunos.length} aluno(s) selecionado(s)
            </div>
          )}

          {/* Student list */}
          <ScrollArea className="h-[400px] border rounded-md">
            {loadingChildren ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChildren.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum aluno disponível
              </div>
            ) : (
              <div className="divide-y">
                {filteredChildren.map(child => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleAluno(child.id)}
                  >
                    <Checkbox
                      checked={selectedAlunos.includes(child.id)}
                      onCheckedChange={() => toggleAluno(child.id)}
                    />

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={child.foto_url || undefined} />
                      <AvatarFallback>
                        {child.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{child.nome}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {getTurmaNames(child)}
                      </div>
                    </div>

                    <Badge variant="outline" className="shrink-0">
                      {getCategoria(child.data_nascimento)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddAlunos}
              disabled={selectedAlunos.length === 0 || addAlunoMutation.isPending}
            >
              {addAlunoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar ({selectedAlunos.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlunosToTimeDialog;
