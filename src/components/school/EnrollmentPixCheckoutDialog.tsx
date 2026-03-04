import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  Copy, 
  Check, 
  QrCode, 
  AlertCircle, 
  PartyPopper,
  CreditCard,
  Shirt,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { useGenerateEnrollmentPix, useCheckEnrollmentPayment, useChildEnrollmentCharge } from '@/hooks/useEnrollmentData';
import { useSchoolProducts } from '@/hooks/useEnrollmentData';

interface EnrollmentPixCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
  criancaNome: string;
  escolinhaId: string;
  valorMensalidade: number;
  onSuccess?: () => void;
}

type CheckoutStep = 'config' | 'loading' | 'qrcode' | 'checking' | 'success' | 'error';

const EnrollmentPixCheckoutDialog = ({
  open,
  onOpenChange,
  criancaId,
  criancaNome,
  escolinhaId,
  valorMensalidade,
  onSuccess,
}: EnrollmentPixCheckoutDialogProps) => {
  const [step, setStep] = useState<CheckoutStep>('config');
  const [valorMatricula, setValorMatricula] = useState('100');
  const [valorUniforme, setValorUniforme] = useState('0');
  const [selectedUniforme, setSelectedUniforme] = useState<string>('');
  const [pixData, setPixData] = useState<{
    pixPayload: string;
    pixQrCodeUrl: string;
    expiresAt: string;
    valorTotal: number;
    cobrancaId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePix = useGenerateEnrollmentPix();
  const checkPayment = useCheckEnrollmentPayment();
  const { data: existingCharge } = useChildEnrollmentCharge(criancaId, escolinhaId);
  const { data: produtos = [] } = useSchoolProducts(escolinhaId);

  const uniformes = produtos.filter(p => p.tipo === 'uniforme');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (existingCharge && existingCharge.status === 'pendente') {
        // Show existing charge
        setPixData({
          pixPayload: existingCharge.pix_payload || '',
          pixQrCodeUrl: existingCharge.pix_qrcode_url || '',
          expiresAt: existingCharge.pix_expires_at || '',
          valorTotal: existingCharge.valor_total,
          cobrancaId: existingCharge.id,
        });
        setStep('qrcode');
      } else if (existingCharge && existingCharge.status === 'pago') {
        setStep('success');
      } else {
        setStep('config');
        setError(null);
      }
    } else {
      setStep('config');
      setError(null);
      setPixData(null);
      setCopied(false);
    }
  }, [open, existingCharge]);

  // Handle uniform selection
  useEffect(() => {
    if (selectedUniforme) {
      const uniforme = uniformes.find(u => u.id === selectedUniforme);
      if (uniforme) {
        setValorUniforme(String(uniforme.valor));
      }
    }
  }, [selectedUniforme, uniformes]);

  const handleGeneratePix = async () => {
    setStep('loading');
    setError(null);

    try {
      const result = await generatePix.mutateAsync({
        criancaId,
        escolinhaId,
        valorMatricula: parseFloat(valorMatricula) || 0,
        valorMensalidade: valorMensalidade || 0,
        valorUniforme: parseFloat(valorUniforme) || 0,
      });

      setPixData({
        pixPayload: result.pixPayload,
        pixQrCodeUrl: result.pixQrCodeUrl,
        expiresAt: result.expiresAt,
        valorTotal: result.valorTotal,
        cobrancaId: result.cobrancaId,
      });
      setStep('qrcode');
      toast.success('Cobrança PIX gerada com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cobrança');
      setStep('error');
    }
  };

  const copyPixCode = async () => {
    if (pixData?.pixPayload) {
      await navigator.clipboard.writeText(pixData.pixPayload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckPayment = async () => {
    if (!pixData?.cobrancaId) return;

    setStep('checking');
    try {
      const result = await checkPayment.mutateAsync(pixData.cobrancaId);
      
      if (result.status === 'pago') {
        setStep('success');
        toast.success('Pagamento confirmado! Matrícula concluída.');
        onSuccess?.();
      } else {
        setStep('qrcode');
        toast.info('Pagamento ainda não confirmado. Tente novamente em alguns instantes.');
      }
    } catch (err) {
      setStep('qrcode');
      toast.error('Erro ao verificar pagamento');
    }
  };

  const valorTotal = (parseFloat(valorMatricula) || 0) + valorMensalidade + (parseFloat(valorUniforme) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Cobrança de Matrícula
          </DialogTitle>
        </DialogHeader>

        <div className="text-center text-sm text-muted-foreground mb-4">
          {criancaNome}
        </div>

        {/* Config Step */}
        {step === 'config' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="matricula" className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Taxa de Matrícula
                  </Label>
                  <Input
                    id="matricula"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorMatricula}
                    onChange={(e) => setValorMatricula(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Primeira Mensalidade
                  </Label>
                  <Input
                    type="number"
                    value={valorMensalidade}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uniforme" className="flex items-center gap-2">
                    <Shirt className="w-4 h-4" />
                    Uniforme
                  </Label>
                  {uniformes.length > 0 ? (
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={selectedUniforme}
                      onChange={(e) => setSelectedUniforme(e.target.value)}
                    >
                      <option value="">Sem uniforme</option>
                      {uniformes.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} - R$ {u.valor.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="uniforme"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorUniforme}
                      onChange={(e) => setValorUniforme(e.target.value)}
                      placeholder="0.00"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span className="text-primary">R$ {valorTotal.toFixed(2)}</span>
            </div>

            <Button 
              onClick={handleGeneratePix} 
              className="w-full"
              disabled={valorTotal <= 0}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Gerar Cobrança PIX
            </Button>
          </div>
        )}

        {/* Loading Step */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Gerando cobrança PIX...</p>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Erro ao gerar cobrança</p>
            <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => setStep('config')} variant="outline">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* QR Code Step */}
        {step === 'qrcode' && pixData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              {pixData.pixQrCodeUrl && (
                <img 
                  src={pixData.pixQrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 border rounded-lg"
                />
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                R$ {pixData.valorTotal.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Expira em: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Código PIX (copia e cola)</Label>
              <div className="flex gap-2">
                <Input 
                  value={pixData.pixPayload} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyPixCode}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleCheckPayment} 
              className="w-full"
              variant="secondary"
            >
              <Check className="w-4 h-4 mr-2" />
              Verificar Pagamento
            </Button>
          </div>
        )}

        {/* Checking Step */}
        {step === 'checking' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando pagamento...</p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Matrícula Confirmada!
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              O pagamento foi confirmado e o aluno está ativo no sistema.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentPixCheckoutDialog;
