import React from 'react';
import { CheckCircle2, Clock, Send, AlertTriangle, XCircle, FileText, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AsaasStatusTimelineProps {
  hasCadastro: boolean;
  hasRequiredDocs: boolean;
  asaasStatus: string | null;
  submittedAt: string | null;
  asaasAccountId: string | null;
  lastJob?: {
    status: string;
    error: string | null;
    createdAt: string | null;
  } | null;
}

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending' | 'error';
}

export default function AsaasStatusTimeline({
  hasCadastro,
  hasRequiredDocs,
  asaasStatus,
  submittedAt,
  asaasAccountId,
  lastJob,
}: AsaasStatusTimelineProps) {
  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  };

  const extractJobError = (raw: string | null) => {
    if (!raw) return null;
    // Common shapes:
    // {"errors":[{"description":"..."}]}
    // {"message":"..."}
    // "..."
    try {
      const parsed = JSON.parse(raw);
      const desc = parsed?.errors?.[0]?.description;
      if (typeof desc === 'string' && desc.trim()) return desc;
      const msg = parsed?.message;
      if (typeof msg === 'string' && msg.trim()) return msg;
      return raw;
    } catch {
      return raw;
    }
  };

  const jobStatus = lastJob?.status || null;
  const jobError = extractJobError(lastJob?.error ?? null);
  const hasAttempt = Boolean(submittedAt || lastJob?.createdAt);
  const isProcessing = jobStatus === 'processando';
  const isErro = jobStatus === 'erro';

  // Determine steps based on current state
  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [];

    // Step 1: Cadastro preenchido
    steps.push({
      id: 'cadastro',
      title: 'Cadastro Preenchido',
      description: hasCadastro 
        ? 'Dados bancários salvos com sucesso' 
        : 'Preencha os dados bancários da escola',
      icon: <FileText className="w-4 h-4" />,
      status: hasCadastro ? 'completed' : 'current',
    });

    // Step 2: Documentos enviados
    steps.push({
      id: 'documentos',
      title: 'Documentos Anexados',
      description: hasRequiredDocs 
        ? 'Todos os documentos obrigatórios anexados' 
        : 'Anexe os documentos obrigatórios',
      icon: <FileText className="w-4 h-4" />,
      status: !hasCadastro 
        ? 'pending' 
        : hasRequiredDocs 
          ? 'completed' 
          : 'current',
    });

    // Step 3: Enviado para análise
    steps.push({
      id: 'enviado',
      title: 'Enviado para Análise',
      description: submittedAt
        ? `Confirmado em ${formatDateTime(submittedAt)}`
        : lastJob?.createdAt
          ? `Última tentativa em ${formatDateTime(lastJob.createdAt)}${isProcessing ? ' (processando)' : isErro ? ' (erro)' : ''}`
          : 'Clique em "Enviar para Análise" quando estiver pronto',
      icon: <Send className="w-4 h-4" />,
      status: !hasCadastro || !hasRequiredDocs
        ? 'pending'
        : isErro
          ? 'error'
          : hasAttempt
            ? 'completed'
            : 'current',
    });

    // Step 4: Processamento / Em análise / Resultado
    if (!hasCadastro || !hasRequiredDocs) {
      steps.push({
        id: 'resultado',
        title: 'Aguardando Requisitos',
        description: 'Complete cadastro e documentos para prosseguir.',
        icon: <Building2 className="w-4 h-4" />,
        status: 'pending',
      });
    } else if (asaasAccountId) {
      // Subconta já criada: agora é fase de análise/resultado
      if (asaasStatus === 'approved') {
        steps.push({
          id: 'resultado',
          title: 'Conta Aprovada',
          description: 'Sua conta foi aprovada! Você já pode receber pagamentos.',
          icon: <CheckCircle2 className="w-4 h-4" />,
          status: 'completed',
        });
      } else if (asaasStatus === 'rejected') {
        steps.push({
          id: 'resultado',
          title: 'Cadastro Rejeitado',
          description: 'Verifique os dados e documentos enviados. Você pode corrigir e reenviar.',
          icon: <XCircle className="w-4 h-4" />,
          status: 'error',
        });
      } else if (asaasStatus === 'awaiting_action') {
        steps.push({
          id: 'resultado',
          title: 'Ação Necessária',
          description: 'O Asaas solicitou informações adicionais. Verifique seu email.',
          icon: <AlertTriangle className="w-4 h-4" />,
          status: 'current',
        });
      } else {
        steps.push({
          id: 'resultado',
          title: 'Em Análise',
          description: 'Subconta criada. Aguardando análise/aprovação do Asaas.',
          icon: <Clock className="w-4 h-4" />,
          status: 'current',
        });
      }
    } else if (isProcessing) {
      steps.push({
        id: 'resultado',
        title: 'Processando Envio',
        description: 'Estamos criando a subconta e enviando informações para o Asaas.',
        icon: <Clock className="w-4 h-4" />,
        status: 'current',
      });
    } else if (isErro) {
      steps.push({
        id: 'resultado',
        title: 'Erro no Envio',
        description: jobError || 'Ocorreu um erro ao enviar. Revise os dados e tente novamente.',
        icon: <XCircle className="w-4 h-4" />,
        status: 'error',
      });
    } else if (hasAttempt) {
      steps.push({
        id: 'resultado',
        title: 'Aguardando Processamento',
        description: 'Envio registrado. Aguarde a criação da subconta.',
        icon: <Clock className="w-4 h-4" />,
        status: 'current',
      });
    } else {
      steps.push({
        id: 'resultado',
        title: 'Aguardando Envio',
        description: 'Complete os passos anteriores e envie para validação.',
        icon: <Building2 className="w-4 h-4" />,
        status: 'pending',
      });
    }

    return steps;
  };

  const steps = getSteps();

  const getStepStyles = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-primary text-primary-foreground border-primary',
          line: 'bg-primary',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
        };
      case 'current':
        return {
          circle: 'bg-background text-primary border-primary ring-2 ring-primary/20',
          line: 'bg-border',
          title: 'text-primary font-semibold',
          description: 'text-foreground',
        };
      case 'error':
        return {
          circle: 'bg-destructive text-destructive-foreground border-destructive',
          line: 'bg-destructive',
          title: 'text-destructive font-medium',
          description: 'text-destructive/80',
        };
      case 'pending':
      default:
        return {
          circle: 'bg-muted text-muted-foreground border-border',
          line: 'bg-border',
          title: 'text-muted-foreground',
          description: 'text-muted-foreground/70',
        };
    }
  };

  return (
    <div className="py-4">
      <h4 className="text-sm font-semibold text-foreground mb-4">Status do Cadastro</h4>
      <div className="relative">
        {steps.map((step, index) => {
          const styles = getStepStyles(step.status);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                    styles.circle
                  )}
                >
                  {step.icon}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 mt-2 transition-all duration-300',
                      styles.line
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1 pb-2">
                <p className={cn('text-sm transition-all duration-300', styles.title)}>
                  {step.title}
                </p>
                <p className={cn('text-xs mt-0.5 transition-all duration-300', styles.description)}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
