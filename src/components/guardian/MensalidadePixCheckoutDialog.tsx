import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle2, QrCode, RefreshCw, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MensalidadePixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mensalidadeId: string;
  valor: number;
  mesReferencia: string;
  onPaymentConfirmed?: () => void;
}

interface PixData {
  pixId: string;
  brCode: string;
  qrCodeUrl: string;
  expiresAt: string;
  valor: number;
  mesReferencia: string;
}

type CheckoutStep = 'loading' | 'qrcode' | 'checking' | 'success' | 'error';

const formatMesReferencia = (mes: string) => {
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [year, month] = mes.split('-');
  return `${monthNames[parseInt(month)]}/${year}`;
};

export default function MensalidadePixCheckoutDialog({
  open,
  onOpenChange,
  mensalidadeId,
  valor,
  mesReferencia,
  onPaymentConfirmed
}: MensalidadePixCheckoutDialogProps) {
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGenerated = useRef(false);

  const generatePixQrCode = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setStep('loading');
    setError(null);

    console.log('Generating PIX for mensalidade:', mensalidadeId);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-mensalidade-pix', {
        body: { mensalidade_id: mensalidadeId }
      });

      console.log('PIX response:', data, 'Error:', fnError);

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.data) {
        setPixData(data.data);
        setStep('qrcode');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err: any) {
      console.error('Error generating PIX:', err);
      setError(err.message || 'Erro ao gerar QR Code PIX');
      setStep('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate QR code when dialog opens
  useEffect(() => {
    if (open && !hasGenerated.current && !pixData) {
      hasGenerated.current = true;
      generatePixQrCode();
    }
    
    // Reset when dialog closes
    if (!open) {
      hasGenerated.current = false;
      setStep('loading');
      setPixData(null);
      setError(null);
      setIsGenerating(false);
    }
  }, [open]);

  const checkPaymentStatus = async () => {
    if (!pixData) return;

    setStep('checking');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-mensalidade-payment', {
        body: { 
          pix_id: pixData.pixId,
          mensalidade_id: mensalidadeId
        }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.data?.isPaid) {
        setStep('success');
        onPaymentConfirmed?.();
      } else {
        toast.info('Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.');
        setStep('qrcode');
      }
    } catch (err: any) {
      console.error('Error checking payment:', err);
      toast.error('Erro ao verificar pagamento');
      setStep('qrcode');
    }
  };

  const copyBrCode = async () => {
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

  const handleRetry = () => {
    hasGenerated.current = false;
    generatePixQrCode();
    hasGenerated.current = true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Mensalidade de {formatMesReferencia(mesReferencia)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Gerando QR Code PIX...</p>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <QrCode className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive text-center">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* QR Code Display */}
          {(step === 'qrcode' || step === 'checking') && pixData && (
            <div className="space-y-4">
              {/* Value */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor a pagar</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {pixData.valor.toFixed(2).replace('.', ',')}
                  </p>
                </CardContent>
              </Card>

              {/* QR Code Image */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border">
                  <img 
                    src={pixData.qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* PIX Code */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Ou copie o código PIX:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all max-h-20 overflow-y-auto">
                    {pixData.brCode}
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={copyBrCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Check Payment Button */}
              <Button 
                onClick={checkPaymentStatus} 
                className="w-full"
                disabled={step === 'checking'}
              >
                {step === 'checking' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando pagamento...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Já efetuei o pagamento
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Após o pagamento, a confirmação pode levar alguns instantes.
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="p-4 rounded-full bg-emerald-500/10 animate-pulse">
                <PartyPopper className="w-12 h-12 text-emerald-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-emerald-600">
                  Pagamento Confirmado!
                </h3>
                <p className="text-muted-foreground">
                  Obrigado por efetuar o pagamento da mensalidade.
                </p>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {formatMesReferencia(mesReferencia)}
                </Badge>
              </div>
              <Button onClick={() => onOpenChange(false)} className="mt-4">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
