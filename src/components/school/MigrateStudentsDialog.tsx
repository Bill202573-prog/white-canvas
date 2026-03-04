import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolTurmas, getTurmaDisplayName, type TurmaWithRelations, type Crianca } from '@/hooks/useSchoolData';

interface MigrateStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: TurmaWithRelations;
}

interface StudentSelection {
  crianca: Crianca;
  selected: boolean;
}

const MigrateStudentsDialog = ({ open, onOpenChange, turma }: MigrateStudentsDialogProps) => {
  const [targetTurmaId, setTargetTurmaId] = useState('');
  const [students, setStudents] = useState<StudentSelection[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const { data: allTurmas } = useSchoolTurmas();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filter out current turma and inactive turmas
  const availableTurmas = allTurmas?.filter(t => 
    t.id !== turma.id && t.ativo
  ) || [];

  useEffect(() => {
    if (open && turma.criancas) {
      // Initialize all students as selected
      setStudents(
        turma.criancas
          .filter(c => c.crianca)
          .map(c => ({
            crianca: c.crianca!,
            selected: true,
          }))
      );
      setTargetTurmaId('');
    }
  }, [open, turma]);

  const toggleStudent = (criancaId: string) => {
    setStudents(prev => 
      prev.map(s => 
        s.crianca.id === criancaId 
          ? { ...s, selected: !s.selected }
          : s
      )
    );
  };

  const toggleAll = (checked: boolean) => {
    setStudents(prev => prev.map(s => ({ ...s, selected: checked })));
  };

  const selectedCount = students.filter(s => s.selected).length;

  const handleMigrate = async () => {
    if (!targetTurmaId) {
      toast.error('Selecione a turma de destino');
      return;
    }

    const selectedStudents = students.filter(s => s.selected);
    if (selectedStudents.length === 0) {
      toast.error('Selecione pelo menos um aluno para migrar');
      return;
    }

    setIsMigrating(true);
    try {
      // For each selected student:
      // 1. Deactivate current turma link
      // 2. Create new turma link (or reactivate if exists)
      
      for (const student of selectedStudents) {
        // Deactivate current link
        await supabase
          .from('crianca_turma')
          .update({ ativo: false })
          .eq('crianca_id', student.crianca.id)
          .eq('turma_id', turma.id);

        // Check if link already exists in target turma
        const { data: existingLink } = await supabase
          .from('crianca_turma')
          .select('id')
          .eq('crianca_id', student.crianca.id)
          .eq('turma_id', targetTurmaId)
          .single();

        if (existingLink) {
          // Reactivate existing link
          await supabase
            .from('crianca_turma')
            .update({ ativo: true })
            .eq('id', existingLink.id);
        } else {
          // Create new link
          await supabase
            .from('crianca_turma')
            .insert({
              crianca_id: student.crianca.id,
              turma_id: targetTurmaId,
              ativo: true,
            });
        }
      }

      toast.success(`${selectedStudents.length} aluno(s) migrado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error migrating students:', error);
      toast.error('Erro ao migrar alunos');
    } finally {
      setIsMigrating(false);
    }
  };

  const targetTurma = availableTurmas.find(t => t.id === targetTurmaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Migrar Alunos - {getTurmaDisplayName(turma)}
          </DialogTitle>
          <DialogDescription>
            Selecione os alunos e a turma de destino para realizar a migração.
            O histórico de presenças será preservado.
          </DialogDescription>
        </DialogHeader>

        {students.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-muted/50 border rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Esta turma não possui alunos para migrar.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Turma de destino</Label>
              <Select value={targetTurmaId} onValueChange={setTargetTurmaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {availableTurmas.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alunos ({selectedCount} de {students.length} selecionados)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedCount === students.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer">
                    Selecionar todos
                  </label>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                {students.map(({ crianca, selected }) => (
                  <div 
                    key={crianca.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleStudent(crianca.id)}
                  >
                    <Checkbox checked={selected} />
                    <Avatar className="h-8 w-8">
                      {crianca.foto_url && <AvatarImage src={crianca.foto_url} />}
                      <AvatarFallback>{crianca.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">{crianca.nome}</span>
                  </div>
                ))}
              </div>
            </div>

            {targetTurma && selectedCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <span className="font-medium">{getTurmaDisplayName(turma)}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium">{getTurmaDisplayName(targetTurma)}</span>
                <span className="text-muted-foreground ml-auto">
                  {selectedCount} aluno(s)
                </span>
              </div>
            )}

            <Button 
              onClick={handleMigrate} 
              disabled={isMigrating || !targetTurmaId || selectedCount === 0}
              className="w-full"
            >
              {isMigrating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Migrar {selectedCount} Aluno(s)
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MigrateStudentsDialog;
