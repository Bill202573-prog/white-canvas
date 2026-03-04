import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  Calendar,
  MapPin,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGenerateAmistosoPix, ConvocacaoAmistoso } from '@/hooks/useGuardianConvocacoesData';
import { supabase } from '@/integrations/supabase/client';

interface AmistosoPixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocacao: ConvocacaoAmistoso;
  onPaymentConfirmed: () => void;
}

interface PixData {
  pixId: string;
  brCode: string;
  qrCodeUrl: string;
  expiresAt: string;
  valor: number;
  taxaParticipacao: number;
  taxaJuiz: number;
}

type Step = 'loading' | 'qrcode' | 'checking' | 'success' | 'error';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function AmistosoPixCheckoutDialog({
  open,
  onOpenChange,
  convocacao,
  onPaymentConfirmed,
}: AmistosoPixCheckoutDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('loading');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePixMutation = useGenerateAmistosoPix();

  // Generate PIX when dialog opens
  useEffect(() => {
    if (open && convocacao) {
      // Check if already has PIX data
      if (convocacao.pix_br_code && convocacao.pix_qr_code_url) {
        setPixData({
          pixId: convocacao.asaas_payment_id || '',
          brCode: convocacao.pix_br_code,
          qrCodeUrl: convocacao.pix_qr_code_url,
          expiresAt: convocacao.pix_expires_at || '',
          valor: convocacao.valor || 0,
          taxaParticipacao: convocacao.evento.cobrar_taxa_participacao ? (convocacao.evento.taxa_participacao || 0) : 0,
          taxaJuiz: convocacao.evento.cobrar_taxa_juiz ? (convocacao.evento.taxa_juiz || 0) : 0,
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
      setError(err.message || 'Erro ao gerar PIX');
      setStep('error');
    }
  };

  const copyBrCode = async () => {
    if (!pixData?.brCode) return;
    
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar código');
    }
  };

  const checkPaymentStatus = async () => {
    setStep('checking');
    
    try {
      const { data, error } = await supabase.functions.invoke('check-amistoso-payment', {
        body: { 
          convocacao_id: convocacao.id,
          payment_id: pixData?.pixId || convocacao.asaas_payment_id 
        },
      });

      if (error) throw error;

      if (data?.isPaid) {
        setStep('success');
        toast.success('Pagamento confirmado!');
        
        // Invalidate all related queries immediately
        queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
        queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes'] });
        queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
        
        setTimeout(() => {
          onPaymentConfirmed();
        }, 2000);
      } else {
        toast.info('Pagamento ainda não confirmado. Tente novamente em alguns instantes.');
        setStep('qrcode');
      }
    } catch (err: any) {
      console.error('Error checking payment:', err);
      toast.error('Erro ao verificar pagamento');
      setStep('qrcode');
    }
  };

  const { evento, crianca } = convocacao;
  const dataEvento = evento.data ? parseISO(evento.data) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>

        {/* Event Summary */}
        <div className={`rounded-lg p-3 space-y-2 ${
          evento.campeonato_id || evento.tipo === 'campeonato' 
            ? 'bg-amber-50' 
            : 'bg-muted/50'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy className={`h-4 w-4 ${
              evento.campeonato_id || evento.tipo === 'campeonato' 
                ? 'text-amber-600' 
                : 'text-primary'
            }`} />
            <span>{evento.nome}</span>
            {(evento.campeonato_id || evento.tipo === 'campeonato') && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Campeonato
              </Badge>
            )}
          </div>
          {evento.campeonato_nome && (
            <p className="text-xs text-amber-600 font-medium">{evento.campeonato_nome}</p>
          )}
          <p className="text-sm text-muted-foreground">Atleta: {crianca.nome}</p>
          {dataEvento && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(dataEvento, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
          {evento.local && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{evento.local}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Gerando PIX...</p>
          </div>
        )}

        {/* QR Code State */}
        {step === 'qrcode' && pixData && (
          <div className="space-y-4">
            {/* Fee Breakdown */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
              {pixData.taxaParticipacao > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de inscrição</span>
                  <span>{formatCurrency(pixData.taxaParticipacao)}</span>
                </div>
              )}
              {pixData.taxaJuiz > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de arbitragem</span>
                  <span>{formatCurrency(pixData.taxaJuiz)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(pixData.valor)}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <img 
                  src={pixData.qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                />
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                Escaneie o QR Code com o app do seu banco
              </p>
            </div>

            {/* Copy BR Code */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Ou copie o código PIX:</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted p-2 rounded text-xs font-mono truncate">
                  {pixData.brCode.substring(0, 40)}...
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyBrCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Check Payment Button */}
            <Button 
              className="w-full" 
              onClick={checkPaymentStatus}
            >
              Já paguei, verificar pagamento
            </Button>
          </div>
        )}

        {/* Checking State */}
        {step === 'checking' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando pagamento...</p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-green-700">Pagamento Confirmado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Presença confirmada no amistoso
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-red-700">Erro ao gerar PIX</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={generatePix}>
              Tentar novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
