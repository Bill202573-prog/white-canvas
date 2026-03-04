import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  Copy, 
  Check, 
  AlertCircle,
  CreditCard,
  Shirt,
  GraduationCap,
  User,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useGuardianPendingEnrollment, useCheckEnrollmentPayment } from '@/hooks/useEnrollmentData';
import { useAuth } from '@/contexts/AuthContext';

interface EnrollmentPaymentBlockerProps {
  children: React.ReactNode;
}

/**
 * This component BLOCKS all app access for guardians with pending enrollment payments.
 * It renders a full-screen overlay that cannot be dismissed until payment is confirmed.
 * This is a security measure to ensure new students pay before accessing any features.
 */
const EnrollmentPaymentBlocker = ({ children }: EnrollmentPaymentBlockerProps) => {
  const { data: pendingEnrollments, isLoading, refetch } = useGuardianPendingEnrollment();
  const checkPayment = useCheckEnrollmentPayment();
  const { logout } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  // Current enrollment to display
  const currentEnrollment = pendingEnrollments?.[0];
  const hasPendingPayment = !!currentEnrollment;

  // Auto-check payment every 30 seconds when there's a pending enrollment
  useEffect(() => {
    if (!hasPendingPayment) return;

    const interval = setInterval(() => {
      handleCheckPayment(true); // Silent check
    }, 30000);

    return () => clearInterval(interval);
  }, [hasPendingPayment, currentEnrollment?.id]);

  const copyPixCode = async () => {
    if (currentEnrollment?.pix_payload) {
      await navigator.clipboard.writeText(currentEnrollment.pix_payload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckPayment = async (silent = false) => {
    if (!currentEnrollment?.id) return;

    if (!silent) setChecking(true);
    try {
      const result = await checkPayment.mutateAsync(currentEnrollment.id);
      
      if (result.status === 'pago') {
        toast.success('Pagamento confirmado! Matrícula concluída.');
        refetch();
      } else if (!silent) {
        toast.info('Pagamento ainda não confirmado. Tente novamente em alguns instantes.');
      }
    } catch (err) {
      if (!silent) {
        toast.error('Erro ao verificar pagamento');
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // While loading, show a spinner - DO NOT render children to prevent any other UI from showing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only if we have CONFIRMED no pending payments, render children normally
  if (!hasPendingPayment) {
    return <>{children}</>;
  }

  // Block everything and show payment screen
  const escolinha = currentEnrollment.escolinha as { id: string; nome: string } | undefined;
  const crianca = currentEnrollment.crianca as { id: string; nome: string } | undefined;
  const descricao = currentEnrollment.descricao_itens as { matricula?: number; mensalidade?: number; uniforme?: number } | undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6" />
          <span className="font-semibold">Atleta ID</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Alert */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Pagamento Obrigatório</p>
                <p>
                  Para acessar o aplicativo e acompanhar a jornada de <strong>{crianca?.nome}</strong> na{' '}
                  <strong>{escolinha?.nome}</strong>, é necessário efetuar o pagamento da matrícula.
                </p>
              </div>
            </div>
          </div>

          {/* Student info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{crianca?.nome}</p>
                  <p className="text-sm text-muted-foreground">{escolinha?.nome}</p>
                </div>
              </div>

              <Separator />

              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                {descricao?.matricula && descricao.matricula > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Taxa de Matrícula
                    </span>
                    <span>R$ {descricao.matricula.toFixed(2)}</span>
                  </div>
                )}
                {descricao?.mensalidade && descricao.mensalidade > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Primeira Mensalidade
                    </span>
                    <span>R$ {descricao.mensalidade.toFixed(2)}</span>
                  </div>
                )}
                {descricao?.uniforme && descricao.uniforme > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Uniforme
                    </span>
                    <span>R$ {descricao.uniforme.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-primary">R$ {currentEnrollment.valor_total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {currentEnrollment.pix_qrcode_url && (
            <div className="flex justify-center">
              <img 
                src={currentEnrollment.pix_qrcode_url} 
                alt="QR Code PIX" 
                className="w-48 h-48 border rounded-lg bg-white"
              />
            </div>
          )}

          {/* PIX Code */}
          {currentEnrollment.pix_payload && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código PIX (copia e cola)</Label>
              <div className="flex gap-2">
                <Input 
                  value={currentEnrollment.pix_payload} 
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
          )}

          {currentEnrollment.pix_expires_at && (
            <p className="text-xs text-center text-muted-foreground">
              Expira em: {new Date(currentEnrollment.pix_expires_at).toLocaleString('pt-BR')}
            </p>
          )}

          {/* Check Payment Button */}
          <Button 
            onClick={() => handleCheckPayment(false)} 
            className="w-full"
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Verificar Pagamento
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Após efetuar o pagamento via PIX, clique no botão acima para confirmar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentPaymentBlocker;
