import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, Calendar, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface DeactivateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    nome: string;
  };
  escolinhaId: string;
}

const DeactivateStudentDialog = ({
  open,
  onOpenChange,
  student,
  escolinhaId,
}: DeactivateStudentDialogProps) => {
  const queryClient = useQueryClient();
  const [keepUntilEndOfMonth, setKeepUntilEndOfMonth] = useState<'yes' | 'no'>('no');
  const [motivoInativacao, setMotivoInativacao] = useState('');
  const [observacoesInativacao, setObservacoesInativacao] = useState('');

  // Get the end of current month
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const endOfMonthStr = endOfMonth.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const keepUntilEnd = keepUntilEndOfMonth === 'yes';
      const deactivationDate = keepUntilEnd
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
        : today.toISOString().split('T')[0];
      
      // Get turmas the student is enrolled in at this school
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escolinha_id', escolinhaId);
      
      const turmaIds = turmas?.map(t => t.id) || [];
      
      // Update crianca_escolinha with deactivation info
      const updateData: Record<string, unknown> = {
        ativo: false,
        data_fim: deactivationDate,
        motivo_inativacao: motivoInativacao || null,
        observacoes_inativacao: observacoesInativacao || null,
        inativado_em: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('crianca_escolinha')
        .update(updateData)
        .eq('crianca_id', student.id)
        .eq('escolinha_id', escolinhaId);
      
      if (updateError) throw updateError;

      if (!keepUntilEnd) {
        // Immediate deactivation - deactivate turma links and remove future presencas
        if (turmaIds.length > 0) {
          const { error: turmaError } = await supabase
            .from('crianca_turma')
            .update({ ativo: false })
            .eq('crianca_id', student.id)
            .in('turma_id', turmaIds);
          
          if (turmaError) throw turmaError;
        }
        
        // Remove pending presence confirmations for future aulas
        const { data: futureAulas } = await supabase
          .from('aulas')
          .select('id')
          .in('turma_id', turmaIds)
          .gte('data', today.toISOString().split('T')[0]);
        
        const futureAulaIds = futureAulas?.map(a => a.id) || [];
        
        if (futureAulaIds.length > 0) {
          await supabase
            .from('presencas')
            .delete()
            .eq('crianca_id', student.id)
            .in('aula_id', futureAulaIds);
        }
      }
      
      return { keepUntilEnd };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-next-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-children'] });
      
      if (result.keepUntilEnd) {
        toast.success(
          `${student.nome} será desativado após ${endOfMonthStr}. As aulas deste mês serão mantidas.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`${student.nome} foi desativado desta escola.`);
      }
      
      resetAndClose();
    },
    onError: (error: any) => {
      console.error('Error deactivating student:', error);
      toast.error('Erro ao desativar aluno: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const resetAndClose = () => {
    setMotivoInativacao('');
    setObservacoesInativacao('');
    setKeepUntilEndOfMonth('no');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!motivoInativacao.trim()) {
      toast.error('Informe o motivo da inativação');
      return;
    }
    deactivateMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Desativar Aluno
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Você está prestes a desativar <strong>{student.nome}</strong> desta escola.
            <br /><br />
            <span className="text-muted-foreground">
              O histórico esportivo (jogos, gols, prêmios) será preservado permanentemente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Motivo - obrigatório */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo da Inativação <span className="text-destructive">*</span>
            </Label>
            <Input
              id="motivo"
              placeholder="Ex: Mudou de cidade, Questões financeiras, etc."
              value={motivoInativacao}
              onChange={(e) => setMotivoInativacao(e.target.value)}
            />
          </div>

          {/* Observações - opcional */}
          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Pendências, combinados, informações adicionais..."
              value={observacoesInativacao}
              onChange={(e) => setObservacoesInativacao(e.target.value)}
              rows={3}
            />
          </div>

          {/* Timing */}
          <div>
            <p className="text-sm font-medium mb-3">
              Deseja manter as aulas do aluno até o final deste mês?
            </p>
            
            <RadioGroup
              value={keepUntilEndOfMonth}
              onValueChange={(value) => setKeepUntilEndOfMonth(value as 'yes' | 'no')}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="no" id="deactivate-now" className="mt-0.5" />
                <Label htmlFor="deactivate-now" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <UserMinus className="w-4 h-4 text-destructive" />
                    Desativar imediatamente
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove o aluno das turmas e cancela presenças pendentes agora.
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="yes" id="keep-until-end" className="mt-0.5" />
                <Label htmlFor="keep-until-end" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    Manter aulas até {endOfMonthStr}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mantém turmas e aulas visíveis até o último dia do mês.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivateMutation.isPending} onClick={resetAndClose}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Confirmar Desativação
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeactivateStudentDialog;
