import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Star, Zap, Trophy, Copy, CheckCircle, Loader2, CreditCard, QrCode } from 'lucide-react';
import { CarreiraLimitResult } from '@/hooks/useCarreiraFreemium';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CarreiraPaywallProps {
  limitResult: CarreiraLimitResult;
  childName?: string;
  criancaId?: string;
  onClose?: () => void;
  onSubscribed?: () => void;
}

type PaywallStep = 'info' | 'loading' | 'pix' | 'checking' | 'success';
type PaymentMethod = 'pix' | 'cartao';

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export function CarreiraPaywall({ limitResult, childName, criancaId, onClose, onSubscribed }: CarreiraPaywallProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<PaywallStep>('info');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cartao');
  const [cpfInput, setCpfInput] = useState('');
  const [pixData, setPixData] = useState<{
    paymentId: string;
    subscriptionId: string;
    brCode: string;
    qrCodeImage: string;
    expiresAt: string;
    valor: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const cpfDigits = cpfInput.replace(/\D/g, '');
  const cpfValid = cpfDigits.length === 11;

  // Debug: log render state
  console.log('[CarreiraPaywall] render state:', { 
    step, cpfInput, cpfDigits: cpfDigits.length, cpfValid, 
    hasUser: !!user, criancaId, paymentMethod,
    buttonDisabled: step === 'loading' || !cpfValid
  });

  const generatePix = async () => {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    
    // Always get session directly to avoid stale useAuth context in dialogs
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    const resolvedUser = user || (sessionUser ? { id: sessionUser.id, name: sessionUser.user_metadata?.nome || sessionUser.user_metadata?.full_name || 'Usuário', email: sessionUser.email || '' } : null);
    
    if (!resolvedUser || !criancaId || cleanCpf.length !== 11) {
      console.error('[CarreiraPaywall] generatePix blocked:', { hasUser: !!resolvedUser, criancaId, cpfLen: cleanCpf.length });
      toast.error(!criancaId ? 'Atleta não identificado' : !resolvedUser ? 'Sessão expirada. Faça login novamente.' : 'Informe um CPF válido para gerar o pagamento');
      return;
    }

    setStep('loading');

    try {
      const userId = resolvedUser.id;

      const { data, error } = await supabase.functions.invoke('generate-carreira-pix', {
        body: {
          user_id: userId,
          crianca_id: criancaId,
          cpf: cleanCpf,
          nome: resolvedUser.name,
          email: resolvedUser.email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixData(data.data);
      setStep('pix');
    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err);
      toast.error(err.message || 'Erro ao gerar pagamento PIX');
      setStep('info');
    }
  };

  const generateCheckout = async () => {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    
    // Always get session directly to avoid stale useAuth context in dialogs
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    const resolvedUser = user || (sessionUser ? { id: sessionUser.id, name: sessionUser.user_metadata?.nome || sessionUser.user_metadata?.full_name || 'Usuário', email: sessionUser.email || '' } : null);
    
    if (!resolvedUser || !criancaId || cleanCpf.length !== 11) {
      console.error('[CarreiraPaywall] generateCheckout blocked:', { hasUser: !!resolvedUser, criancaId, cpfLen: cleanCpf.length });
      toast.error(!criancaId ? 'Atleta não identificado' : !resolvedUser ? 'Sessão expirada. Faça login novamente.' : 'Informe um CPF válido');
      return;
    }

    setStep('loading');

    try {
      const userId = resolvedUser.id;

      const { data, error } = await supabase.functions.invoke('create-carreira-checkout', {
        body: {
          user_id: userId,
          crianca_id: criancaId,
          cpf: cleanCpf,
          nome: resolvedUser.name,
          email: resolvedUser.email,
          callback_url: window.location.href,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const checkoutUrl = data.data?.checkoutUrl;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        toast.success('Checkout aberto! Complete o pagamento na nova aba.');
        setStep('info');
      } else {
        throw new Error('URL de checkout não gerada');
      }
    } catch (err: any) {
      console.error('Erro ao gerar checkout:', err);
      toast.error(err.message || 'Erro ao gerar checkout');
      setStep('info');
    }
  };

  const handleSubscribe = () => {
    console.log('[CarreiraPaywall] handleSubscribe called', { paymentMethod, cpfValid, cpfInput, criancaId, step });
    if (paymentMethod === 'pix') {
      generatePix();
    } else {
      generateCheckout();
    }
  };

  const checkPayment = useCallback(async () => {
    if (!pixData) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-carreira-payment', {
        body: {
          payment_id: pixData.paymentId,
          subscription_id: pixData.subscriptionId,
        },
      });

      if (error) throw error;

      if (data?.data?.isPaid) {
        setStep('success');
        toast.success('Pagamento confirmado! Assinatura ativada.');
        onSubscribed?.();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
      return false;
    }
  }, [pixData, onSubscribed]);

  // Poll for payment
  useEffect(() => {
    if (step !== 'pix' || !pixData) return;

    const interval = setInterval(async () => {
      setPollCount(prev => prev + 1);
      const paid = await checkPayment();
      if (paid) clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [step, pixData, checkPayment]);

  const copyBrCode = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (step === 'success') {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold">Assinatura ativada! 🎉</h3>
        <p className="text-sm text-muted-foreground">
          Agora você pode registrar atividades ilimitadas{childName && <> para <strong>{childName}</strong></>}.
        </p>
        {onClose && (
          <Button className="w-full" onClick={onClose}>
            Continuar
          </Button>
        )}
      </div>
    );
  }

  if (step === 'pix' && pixData) {
    return (
      <div className="space-y-4 py-2">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold">Pague via PIX</h3>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code ou copie o código abaixo
          </p>
        </div>

        <div className="flex justify-center">
          <img
            src={pixData.qrCodeImage}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-lg border"
          />
        </div>

        <div className="text-center">
          <span className="text-2xl font-bold text-primary">
            R$ {pixData.valor.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-sm text-muted-foreground block">pagamento único • 30 dias de acesso</span>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={copyBrCode}>
          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar código PIX'}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Aguardando pagamento...
        </div>

        <Button variant="ghost" size="sm" className="w-full" onClick={() => checkPayment()}>
          Já paguei, verificar agora
        </Button>

        {onClose && (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cancelar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-bold">Limite atingido</h3>
        <p className="text-sm text-muted-foreground">
          Você já registrou <strong>{limitResult.count}</strong> de <strong>{limitResult.limit}</strong> atividades gratuitas
          {childName && <> para <strong>{childName}</strong></>}.
        </p>
      </div>

      {/* Upgrade Card */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              PRO
            </Badge>
            <span className="text-sm font-medium">Carreira ID Pro</span>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Atividades externas <strong>ilimitadas</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Currículo esportivo completo</span>
            </li>
            <li className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Perfil público turbinado</span>
            </li>
          </ul>

          {/* CPF Input */}
          <div className="space-y-1.5">
            <Label htmlFor="cpf-paywall" className="text-xs font-medium">CPF do responsável</Label>
            <Input
              id="cpf-paywall"
              placeholder="000.000.000-00"
              value={cpfInput}
              onChange={(e) => setCpfInput(formatCpf(e.target.value))}
              maxLength={14}
              className="text-sm"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                  paymentMethod === 'cartao'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                    : 'border-border hover:border-amber-300'
                }`}
              >
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div>Cartão</div>
                  <div className="text-[10px] font-normal text-muted-foreground">Recorrente</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                    : 'border-border hover:border-amber-300'
                }`}
              >
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div>PIX</div>
                  <div className="text-[10px] font-normal text-muted-foreground">30 dias</div>
                </div>
              </button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubscribe();
            }}
            disabled={step === 'loading' || !cpfValid}
          >
            {step === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : paymentMethod === 'cartao' ? (
              <CreditCard className="w-4 h-4" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            {step === 'loading'
              ? 'Processando...'
              : paymentMethod === 'cartao'
                ? 'Assinar por R$ 19,90/mês'
                : 'Pagar R$ 19,90 via PIX'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {paymentMethod === 'cartao'
              ? 'Cartão de crédito • Cobrança mensal automática • Cancele quando quiser'
              : 'Pagamento via PIX • 30 dias de acesso • Cancele quando quiser'}
          </p>
        </CardContent>
      </Card>

      {onClose && (
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Voltar
        </Button>
      )}
    </div>
  );
}
