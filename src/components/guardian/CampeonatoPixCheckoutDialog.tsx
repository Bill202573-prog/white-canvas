import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  GuardianCampeonatoConvocacao,
  useGenerateCampeonatoPix,
  useCheckCampeonatoPayment,
} from '@/hooks/useCampeonatoConvocacoesData';

interface CampeonatoPixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocacao: GuardianCampeonatoConvocacao;
  onPaymentConfirmed: () => void;
}

interface PixData {
  pixId: string;
  brCode: string;
  qrCodeUrl: string;
  expiresAt: string;
  valor: number;
}

type Step = 'loading' | 'qrcode' | 'checking' | 'success' | 'error';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CampeonatoPixCheckoutDialog({
  open,
  onOpenChange,
  convocacao,
  onPaymentConfirmed,
}: CampeonatoPixCheckoutDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('loading');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePixMutation = useGenerateCampeonatoPix();
  const checkPaymentMutation = useCheckCampeonatoPayment();

  // Generate PIX when dialog opens
  useEffect(() => {
    if (open && convocacao) {
      // Check if already has PIX data
      if (convocacao.pix_br_code && convocacao.pix_qr_code_url) {
        const valorTotal = convocacao.valor ?? convocacao.campeonato?.valor ?? 0;
        setPixData({
          pixId: convocacao.asaas_payment_id || '',
          brCode: convocacao.pix_br_code,
          qrCodeUrl: convocacao.pix_qr_code_url,
          expiresAt: convocacao.pix_expires_at || '',
          valor: valorTotal,
        });
        setStep('qrcode');
      } else {
        generatePix();
      }
    }
  }, [open, convocacao]);

  const generatePix = async () => {
    setStep('loading');
    setError(null);

    try {
      const result = await generatePixMutation.mutateAsync(convocacao.id);
      
      if (result.success && result.data) {
        setPixData(result.data);
        setStep('qrcode');
      } else {
        throw new Error(result.error || 'Erro ao gerar PIX');
      }
    } catch (err: any) {
      console.error('Error generating PIX:', err);
      setError(err.message || 'Erro ao gerar cobrança PIX');
      setStep('error');
    }
  };

  const handleCopyCode = async () => {
    if (!pixData?.brCode) return;
    
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const handleCheckPayment = async () => {
    if (!convocacao.id) return;
    
    setStep('checking');

    try {
      const result = await checkPaymentMutation.mutateAsync(convocacao.id);
      
      if (result.success && result.status === 'pago') {
        setStep('success');
        toast.success('Pagamento confirmado!');
        
        // Invalidate queries and close
        setTimeout(() => {
          onPaymentConfirmed();
        }, 2000);
      } else {
        setStep('qrcode');
        toast.info('Pagamento ainda não identificado. Aguarde alguns instantes.');
      }
    } catch (err: any) {
      console.error('Error checking payment:', err);
      setStep('qrcode');
      toast.error('Erro ao verificar pagamento');
    }
  };

  const handleClose = () => {
    setStep('loading');
    setPixData(null);
    setError(null);
    setCopied(false);
    onOpenChange(false);
  };

  const valorTotal = convocacao.valor ?? convocacao.campeonato?.valor ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Inscrição no Campeonato
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Gerando cobrança PIX...</p>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="mt-4 font-medium text-red-600">Erro ao gerar PIX</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button onClick={generatePix} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* QR Code State */}
        {step === 'qrcode' && pixData && (
          <div className="space-y-4">
            {/* Campeonato Info */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">{convocacao.campeonato?.nome}</p>
                  <p className="text-sm text-amber-700">
                    {convocacao.campeonato?.categoria} • {convocacao.campeonato?.ano}
                  </p>
                </div>
              </div>
            </div>

            {/* Athlete */}
            <div className="text-center">
              <Badge variant="secondary">
                {convocacao.crianca?.nome}
              </Badge>
            </div>

            <Separator />

            {/* Value */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Inscrição
              </span>
              <span className="font-semibold text-lg">
                {formatCurrency(valorTotal)}
              </span>
            </div>

            <Separator />

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <img 
                  src={pixData.qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Escaneie o QR Code com seu app de banco
              </p>
            </div>

            {/* Copy Code Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Código copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar código PIX
                </>
              )}
            </Button>

            {/* Check Payment Button */}
            <Button
              className="w-full"
              onClick={handleCheckPayment}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Já paguei, verificar
            </Button>
          </div>
        )}

        {/* Checking State */}
        {step === 'checking' && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Verificando pagamento...</p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <p className="mt-4 font-medium text-green-600">Pagamento confirmado!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Inscrição de {convocacao.crianca?.nome} no campeonato confirmada.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
