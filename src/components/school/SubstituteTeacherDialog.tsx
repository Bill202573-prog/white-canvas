import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolTeachers, type Professor } from '@/hooks/useSchoolData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SubstituteTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aulaId: string;
  aulaData: string;
  turmaNome: string;
  currentProfessorId?: string | null;
  currentProfessorNome?: string;
  currentSubstitutoId?: string | null;
}

const SubstituteTeacherDialog = ({
  open,
  onOpenChange,
  aulaId,
  aulaData,
  turmaNome,
  currentProfessorId,
  currentProfessorNome,
  currentSubstitutoId,
}: SubstituteTeacherDialogProps) => {
  const { data: teachers = [] } = useSchoolTeachers();
  const queryClient = useQueryClient();
  const [selectedProfessorId, setSelectedProfessorId] = useState(currentSubstitutoId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the current professor from available substitutes
  const availableTeachers = teachers.filter(
    (t: Professor) => t.ativo && t.id !== currentProfessorId
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('aulas')
        .update({
          professor_substituto_id: selectedProfessorId || null,
        })
        .eq('id', aulaId);

      if (error) throw error;

      toast.success(
        selectedProfessorId 
          ? 'Professor substituto definido' 
          : 'Substituição removida'
      );
      
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error setting substitute:', error);
      toast.error('Erro ao definir substituto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubstitute = async () => {
    setSelectedProfessorId('');
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('aulas')
        .update({ professor_substituto_id: null })
        .eq('id', aulaId);

      if (error) throw error;

      toast.success('Substituição removida');
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['week-aulas'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing substitute:', error);
      toast.error('Erro ao remover substituto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long' 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Substituir Professor
          </DialogTitle>
          <DialogDescription>
            Defina um professor substituto para esta aula específica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aula Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-sm"><strong>Turma:</strong> {turmaNome}</p>
            <p className="text-sm"><strong>Data:</strong> {formatDate(aulaData)}</p>
            {currentProfessorNome && (
              <p className="text-sm"><strong>Professor Titular:</strong> {currentProfessorNome}</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>A substituição é válida apenas para esta aula.</p>
              <p>O substituto terá acesso para marcar presença dos alunos.</p>
            </div>
          </div>

          {/* Professor Select */}
          <div className="space-y-2">
            <Label>Professor Substituto</Label>
            {availableTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum outro professor disponível. Cadastre mais professores primeiro.
              </p>
            ) : (
              <Select 
                value={selectedProfessorId || "none"} 
                onValueChange={(v) => setSelectedProfessorId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um professor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem substituto</SelectItem>
                  {availableTeachers.map((teacher: Professor) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {currentSubstitutoId && (
              <Button 
                variant="outline" 
                onClick={handleRemoveSubstitute}
                disabled={isSubmitting}
                className="flex-1"
              >
                Remover Substituto
              </Button>
            )}
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || availableTeachers.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubstituteTeacherDialog;