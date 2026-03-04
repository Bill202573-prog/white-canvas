import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FinancialStatusBannerProps {
  statusFinanceiroEscola: string;
}

export function FinancialStatusBanner({ statusFinanceiroEscola }: FinancialStatusBannerProps) {
  const navigate = useNavigate();

  // Only show banner if status is NOT APROVADO (approved)
  if (statusFinanceiroEscola === 'APROVADO' || statusFinanceiroEscola === 'ATIVO') {
    return null;
  }

  const handleClick = () => {
    navigate('/dashboard/financeiro');
  };

  // Different messages based on status
  const getMessage = () => {
    switch (statusFinanceiroEscola) {
      case 'EM_ANALISE':
        return {
          icon: <Clock className="w-5 h-5 shrink-0" />,
          text: '⏳ Cadastro bancário em análise. Aguarde a aprovação do Asaas para emitir cobranças PIX.',
          buttonText: 'Ver status do cadastro',
          variant: 'warning' as const,
        };
      case 'REJEITADO':
        return {
          icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
          text: '❌ Cadastro bancário rejeitado. Verifique os dados e reenvie para análise.',
          buttonText: 'Corrigir cadastro',
          variant: 'destructive' as const,
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
          text: '⚠️ Cobranças automáticas desativadas. Para emitir cobranças PIX e receber pagamentos dos alunos, complete o cadastro bancário da escola.',
          buttonText: 'Completar cadastro bancário',
          variant: 'destructive' as const,
        };
    }
  };

  const { icon, text, buttonText, variant } = getMessage();

  const bgClass = variant === 'warning' 
    ? 'bg-amber-500 text-amber-950' 
    : 'bg-destructive text-destructive-foreground';

  const buttonClass = variant === 'warning'
    ? 'bg-amber-950 text-amber-50 hover:bg-amber-900 border-amber-950'
    : 'bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 border-destructive-foreground';

  return (
    <div className={`${bgClass} px-4 py-3 flex items-center justify-between gap-4 flex-wrap`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">
          {text}
        </span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleClick}
        className={`${buttonClass} shrink-0`}
      >
        {buttonText}
      </Button>
    </div>
  );
}
