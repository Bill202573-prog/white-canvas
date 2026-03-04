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
import { Loader2, Send, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';

const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface BillingStatus {
  total: number;
  pending: number;
  paid: number;
}

interface GenerateBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mesReferencia: string) => Promise<void>;
  isLoading: boolean;
  billingStatusByMonth?: Record<string, BillingStatus>;
}

const GenerateBillingDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  billingStatusByMonth = {},
}: GenerateBillingDialogProps) => {
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'next'>('current');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Next month calculation
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const currentMonthLabel = `${monthNames[currentMonth]}/${currentYear}`;
  const nextMonthLabel = `${monthNames[nextMonth]}/${nextYear}`;

  const currentMonthRef = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const nextMonthRef = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const currentMonthStatus = billingStatusByMonth[currentMonthRef];
  const nextMonthStatus = billingStatusByMonth[nextMonthRef];

  const getStatusBadge = (status: BillingStatus | undefined) => {
    if (!status || status.total === 0) {
      return (
        <Badge variant="outline" className="text-xs bg-muted/50">
          Não gerada
        </Badge>
      );
    }

    if (status.pending > 0) {
      return (
        <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {status.total} geradas ({status.pending} pendentes)
        </Badge>
      );
    }

    return (
      <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {status.total} geradas (todas pagas)
      </Badge>
    );
  };

  const handleConfirm = async () => {
    const mesReferencia = selectedMonth === 'current' ? currentMonthRef : nextMonthRef;
    await onConfirm(mesReferencia);
  };

  const selectedStatus = selectedMonth === 'current' ? currentMonthStatus : nextMonthStatus;
  const hasExistingBillings = selectedStatus && selectedStatus.total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Gerar Cobranças PIX
          </DialogTitle>
          <DialogDescription>
            Selecione o mês de referência para gerar as cobranças PIX dos alunos via Asaas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedMonth}
            onValueChange={(value) => setSelectedMonth(value as 'current' | 'next')}
            className="space-y-3"
          >
            <div 
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                currentMonthStatus?.total ? 'border-amber-500/30 bg-amber-500/5' : 'border-border hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="current" id="current" />
              <Label htmlFor="current" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">Mês Atual</div>
                    <div className="text-sm text-muted-foreground">{currentMonthLabel}</div>
                  </div>
                  {getStatusBadge(currentMonthStatus)}
                </div>
              </Label>
            </div>
            <div 
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                nextMonthStatus?.total ? 'border-amber-500/30 bg-amber-500/5' : 'border-border hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="next" id="next" />
              <Label htmlFor="next" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">Próximo Mês</div>
                    <div className="text-sm text-muted-foreground">{nextMonthLabel}</div>
                  </div>
                  {getStatusBadge(nextMonthStatus)}
                </div>
              </Label>
            </div>
          </RadioGroup>

          {hasExistingBillings && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Cobranças já existem para este mês</p>
                  <p className="text-amber-600/80 mt-1">
                    Ao gerar novamente, apenas alunos sem cobrança receberão novas. Cobranças existentes não serão duplicadas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
            variant={hasExistingBillings ? 'secondary' : 'default'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {hasExistingBillings ? 'Gerar Restantes' : 'Gerar Cobranças'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateBillingDialog;
