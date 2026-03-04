import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Calendar, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface GenerateIndividualBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mesReferencia: string) => Promise<void>;
  isLoading: boolean;
  studentName: string;
}

const GenerateIndividualBillingDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  studentName,
}: GenerateIndividualBillingDialogProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedMonth, setGeneratedMonth] = useState('');

  // Calculate month options: previous, current, next
  const monthOptions = useMemo(() => {
    const today = new Date();
    const options = [];

    for (let i = -1; i <= 1; i++) {
      let month = today.getMonth() + 1 + i;
      let year = today.getFullYear();
      if (month <= 0) {
        month += 12;
        year -= 1;
      } else if (month > 12) {
        month -= 12;
        year += 1;
      }
      const mesRef = `${year}-${String(month).padStart(2, '0')}-01`;
      const label = i === -1 ? 'Mês Anterior' : i === 0 ? 'Mês Atual' : 'Próximo Mês';
      options.push({
        value: mesRef,
        label: `${monthNames[month]}/${year}`,
        sublabel: label
      });
    }
    return options;
  }, []);

  // Set default to current month on initial render
  const defaultMonth = monthOptions[1]?.value || monthOptions[0]?.value || '';

  const handleConfirm = async () => {
    if (!selectedMonth) return;
    
    try {
      await onConfirm(selectedMonth);
      const option = monthOptions.find(o => o.value === selectedMonth);
      setGeneratedMonth(option?.label || selectedMonth);
      setShowSuccess(true);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setSelectedMonth('');
    onOpenChange(false);
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedMonth(defaultMonth);
    }
    onOpenChange(newOpen);
  };

  // Set default month when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !selectedMonth) {
      setSelectedMonth(defaultMonth);
    }
    handleDialogClose(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Gerar Cobrança Individual
            </DialogTitle>
            <DialogDescription>
              Selecione o mês de referência para gerar a cobrança PIX.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Student info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{studentName}</span>
            </div>

            {/* Month selection */}
            <RadioGroup
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              className="space-y-3"
            >
              {monthOptions.map((option) => (
                <div 
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.sublabel}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !selectedMonth}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Gerar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-2 py-1">
                ✓
              </Badge>
              Cobrança Gerada com Sucesso
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                A cobrança PIX para <strong>{studentName}</strong> referente ao mês de <strong>{generatedMonth}</strong> foi gerada com sucesso.
              </p>
              <p className="text-sm text-muted-foreground">
                O responsável poderá visualizar e pagar a cobrança pelo aplicativo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessClose}>
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GenerateIndividualBillingDialog;
