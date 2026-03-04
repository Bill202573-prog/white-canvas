import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, PartyPopper, AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useGeneratePedidoPix, useCheckPedidoPayment } from '@/hooks/useLojaData';
import { useQueryClient } from '@tanstack/react-query';

interface PedidoPixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  numeroPedido?: number;
  onPaymentConfirmed?: () => void;
}

interface PixData {
  pixId: string;
  brCode: string;
  qrCodeUrl: string;
  expiresAt: string;
  valor: number;
  numero_pedido?: number;
}

type CheckoutStep = 'loading' | 'qrcode' | 'checking' | 'success' | 'error';

export function PedidoPixCheckoutDialog({
  open,
  onOpenChange,
  pedidoId,
  numeroPedido,
  onPaymentConfirmed,
}: PedidoPixCheckoutDialogProps) {
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generatePix = useGeneratePedidoPix();
  const checkPayment = useCheckPedidoPayment();

  useEffect(() => {
    if (open && pedidoId) {
      generatePixQrCode();
    }
    if (!open) {
      setStep('loading');
      setPixData(null);
      setError(null);
      setCopied(false);
    }
  }, [open, pedidoId]);

  const generatePixQrCode = async () => {
    setStep('loading');
    setError(null);

    try {
      const data = await generatePix.mutateAsync(pedidoId);
      setPixData(data);
      setStep('qrcode');
    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err);
      setError(err.message || 'Erro ao gerar código PIX');
      setStep('error');
    }
  };

  const copyBrCode = async () => {
    if (pixData?.brCode) {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const checkPaymentStatus = async () => {
    setStep('checking');

    try {
      const result = await checkPayment.mutateAsync(pedidoId);
      if (result.status === 'pago' || result.status === 'RECEIVED' || result.status === 'CONFIRMED') {
        setStep('success');
        // Invalidar queries para atualizar dados em toda a aplicação
        queryClient.invalidateQueries({ queryKey: ['guardian-pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['school-pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
        toast.success('Pagamento confirmado!');
        setTimeout(() => {
          onPaymentConfirmed?.();
        }, 2000);
      } else {
        toast.info('Pagamento ainda não confirmado. Tente novamente em alguns segundos.');
        setStep('qrcode');
      }
    } catch (err: any) {
      console.error('Erro ao verificar pagamento:', err);
      toast.error('Erro ao verificar pagamento');
      setStep('qrcode');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const displayNumeroPedido = pixData?.numero_pedido || numeroPedido;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Pagamento PIX
            {displayNumeroPedido && (
              <span className="text-sm font-normal text-muted-foreground">
                - Pedido #{displayNumeroPedido}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Gerando código PIX...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-destructive text-center">{error}</p>
              <Button onClick={generatePixQrCode} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {step === 'qrcode' && pixData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(pixData.valor)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Válido até {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Código PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.brCode}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs bg-muted rounded-md truncate"
                  />
                  <Button variant="outline" size="icon" onClick={copyBrCode}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={checkPaymentStatus}
                disabled={checkPayment.isPending}
              >
                Já paguei, verificar pagamento
              </Button>
            </div>
          )}

          {step === 'checking' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando pagamento...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <PartyPopper className="w-16 h-16 text-primary animate-bounce" />
              <h3 className="text-xl font-bold text-center">Compra Confirmada!</h3>
              {displayNumeroPedido && (
                <div className="bg-primary/10 px-4 py-2 rounded-lg">
                  <p className="text-lg font-semibold text-primary">
                    Pedido #{displayNumeroPedido}
                  </p>
                </div>
              )}
              <p className="text-muted-foreground text-center">
                Seu pedido foi recebido com sucesso. Aguarde a entrega pela escola.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
