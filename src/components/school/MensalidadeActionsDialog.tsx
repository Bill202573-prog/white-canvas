import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Mensalidade {
  id: string;
  crianca_nome: string;
  mes_referencia: string;
  valor: number;
  status: string;
  abacatepay_billing_id?: string | null;
}

interface MensalidadeActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mensalidade: Mensalidade | null;
  action: 'pagar' | 'isentar' | null;
  onConfirm: (data: { dataPagamento?: string; valorPago?: number; observacao?: string }) => Promise<void>;
  isLoading: boolean;
}

const MensalidadeActionsDialog = ({
  open,
  onOpenChange,
  mensalidade,
  action,
  onConfirm,
  isLoading
}: MensalidadeActionsDialogProps) => {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState(mensalidade?.valor?.toString() || '');
  const [observacao, setObservacao] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingData, setPendingData] = useState<{ dataPagamento?: string; valorPago?: number; observacao?: string } | null>(null);

  const hasAsaasPayment = !!mensalidade?.abacatepay_billing_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      dataPagamento: action === 'pagar' ? dataPagamento : undefined,
      valorPago: action === 'pagar' ? parseFloat(valorPago) : undefined,
      observacao: observacao || (action === 'isentar' ? 'Mensalidade isenta' : 'Pagamento manual'),
    };

    // If there's an Asaas payment, show confirmation dialog
    if (hasAsaasPayment && action === 'pagar') {
      setPendingData(data);
      setShowConfirmation(true);
    } else {
      // No Asaas payment, proceed directly
      await executeConfirm(data);
    }
  };

  const executeConfirm = async (data: { dataPagamento?: string; valorPago?: number; observacao?: string }) => {
    try {
      await onConfirm(data);
      
      // Show success message if there was an Asaas payment that was cancelled
      if (hasAsaasPayment && action === 'pagar') {
        setShowSuccess(true);
      } else {
        // Reset and close
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error confirming action:', error);
    }
  };

  const handleConfirmAsaasCancellation = async () => {
    setShowConfirmation(false);
    if (pendingData) {
      await executeConfirm(pendingData);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setObservacao('');
    setPendingData(null);
  };

  if (!mensalidade) return null;

  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const formatMesReferencia = (mes: string) => {
    const [year, month] = mes.split('-');
    return `${monthNames[parseInt(month)]}/${year}`;
  };

  return (
    <>
      <Dialog open={open && !showConfirmation && !showSuccess} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'pagar' ? 'Registrar Pagamento' : 'Marcar como Isento'}
            </DialogTitle>
            <DialogDescription>
              {mensalidade.crianca_nome} - {formatMesReferencia(mensalidade.mes_referencia)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {action === 'pagar' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dataPagamento">Data do Pagamento</Label>
                  <Input
                    id="dataPagamento"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorPago">Valor Pago</Label>
                  <Input
                    id="valorPago"
                    type="number"
                    step="0.01"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    placeholder={`R$ ${mensalidade.valor.toFixed(2)}`}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={action === 'pagar' ? 'Ex: Pagamento via PIX, dinheiro, etc.' : 'Ex: Aluno bolsista'}
                rows={3}
              />
            </div>

            {hasAsaasPayment && action === 'pagar' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Esta mensalidade possui uma cobrança ativa no Asaas. Ao dar baixa manual, a cobrança será cancelada automaticamente.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : action === 'pagar' ? (
                  'Confirmar Pagamento'
                ) : (
                  'Confirmar Isenção'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Asaas Cancellation */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Baixa Manual
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ao confirmar a baixa manual desta mensalidade, a cobrança existente no <strong>Asaas será cancelada automaticamente</strong>.
              </p>
              <p className="text-muted-foreground">
                {mensalidade.crianca_nome} - {formatMesReferencia(mensalidade.mes_referencia)}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAsaasCancellation}
              disabled={isLoading}
              className="bg-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar e Cancelar Cobrança'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              Operação Concluída
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ✓ Cobrança no Asaas cancelada com sucesso
              </p>
              <p>
                ✓ Recebimento manual registrado
              </p>
              <p className="text-muted-foreground pt-2">
                {mensalidade.crianca_nome} - {formatMesReferencia(mensalidade.mes_referencia)}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessClose} className="bg-emerald-600 hover:bg-emerald-700">
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MensalidadeActionsDialog;
