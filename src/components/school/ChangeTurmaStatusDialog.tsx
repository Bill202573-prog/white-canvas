import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { TurmaWithRelations } from '@/hooks/useSchoolData';

interface ChangeTurmaStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: TurmaWithRelations;
}

type TurmaStatus = 'ativa' | 'inativa' | 'encerrada';

const STATUS_OPTIONS: { value: TurmaStatus; label: string; description: string }[] = [
  { value: 'ativa', label: 'Ativa', description: 'Turma funcionando normalmente' },
  { value: 'inativa', label: 'Inativa', description: 'Turma pausada temporariamente' },
  { value: 'encerrada', label: 'Encerrada', description: 'Turma finalizada permanentemente' },
];

const ChangeTurmaStatusDialog = ({ open, onOpenChange, turma }: ChangeTurmaStatusDialogProps) => {
  const currentStatus = (turma as any).status as TurmaStatus || 'ativa';
  const [newStatus, setNewStatus] = useState<TurmaStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleUpdateStatus = async () => {
    if (newStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);
    try {
      // Update turma status
      const { error: updateError } = await supabase
        .from('turmas')
        .update({ status: newStatus, ativo: newStatus === 'ativa' })
        .eq('id', turma.id);

      if (updateError) throw updateError;

      // If inactivating or closing, cancel all future classes
      if (newStatus === 'inativa' || newStatus === 'encerrada') {
        const today = new Date().toISOString().split('T')[0];
        
        // Get the "Turma encerrada" motivo
        const { data: motivos } = await supabase
          .from('motivos_cancelamento')
          .select('id')
          .eq('nome', 'Turma encerrada')
          .eq('escolinha_id', turma.escolinha_id)
          .single();

        if (motivos) {
          // Cancel all future normal classes
          const { error: cancelError } = await supabase
            .from('aulas')
            .update({
              status: 'cancelada',
              motivo_cancelamento_id: motivos.id,
              cancelado_em: new Date().toISOString(),
            })
            .eq('turma_id', turma.id)
            .eq('status', 'normal')
            .gte('data', today);

          if (cancelError) {
            console.error('Error cancelling future classes:', cancelError);
          }
        }
      }

      toast.success(`Status da turma alterado para ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
      queryClient.invalidateQueries({ queryKey: ['school-turmas'] });
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations'] });
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating turma status:', error);
      toast.error('Erro ao alterar status da turma');
    } finally {
      setIsUpdating(false);
    }
  };

  const showWarning = newStatus !== 'ativa' && newStatus !== currentStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Status - {turma.nome}</DialogTitle>
          <DialogDescription>
            Altere o status da turma. Turmas inativas ou encerradas terão suas aulas futuras canceladas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status da turma</Label>
            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as TurmaStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">- {opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showWarning && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">Atenção</p>
                <p className="text-muted-foreground">
                  Ao {newStatus === 'inativa' ? 'inativar' : 'encerrar'} esta turma, todas as aulas futuras serão 
                  automaticamente canceladas com o motivo "Turma encerrada".
                  {newStatus === 'encerrada' && ' Esta ação não poderá ser desfeita.'}
                </p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpdateStatus} 
            disabled={isUpdating || newStatus === currentStatus}
            className="w-full"
            variant={newStatus === 'encerrada' ? 'destructive' : 'default'}
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Alteração'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeTurmaStatusDialog;
