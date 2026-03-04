import { useState } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Trophy, 
  MapPin, 
  Calendar, 
  Clock, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  School,
  CalendarClock,
  FileText,
  Tag,
  Navigation,
  XCircle,
  Ban,
} from 'lucide-react';
import { 
  useGuardianAmistosoConvocacoes, 
  useCancelAmistosoParticipation,
  useConfirmExemptParticipation,
  ConvocacaoAmistoso 
} from '@/hooks/useGuardianConvocacoesData';
import { 
  useGuardianCampeonatoConvocacoes,
  useConfirmCampeonatoExemptParticipation,
  GuardianCampeonatoConvocacao,
} from '@/hooks/useCampeonatoConvocacoesData';
import { AmistosoPixCheckoutDialog } from './AmistosoPixCheckoutDialog';
import { CampeonatoPixCheckoutDialog } from './CampeonatoPixCheckoutDialog';
import { CampeonatoConvocacaoCard } from './CampeonatoConvocacaoCard';
import { toast } from 'sonner';

const getStatusBadge = (status: string, isento: boolean, valor: number | null, dataLimite: Date | null) => {
  // Check status first - most important
  if (status === 'recusado') {
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Recusado</Badge>;
  }

  if (status === 'confirmado' || status === 'pago') {
    return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmado</Badge>;
  }

  // No cost - auto confirmed
  if (!isento && (!valor || valor <= 0)) {
    return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmado</Badge>;
  }

  // Check if deadline has passed
  const isOverdue = dataLimite && isBefore(dataLimite, new Date());

  // Pending statuses (needs action)
  if (isOverdue) {
    return <Badge className="bg-red-100 text-red-700 border-red-200">Prazo Expirado</Badge>;
  }

  return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Pendente</Badge>;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface ConvocacaoCardProps {
  convocacao: ConvocacaoAmistoso;
  onPagar: (convocacao: ConvocacaoAmistoso) => void;
  onCancelar: (convocacao: ConvocacaoAmistoso) => void;
  onConfirmar: (convocacao: ConvocacaoAmistoso) => void;
  isCancelling: boolean;
  isConfirming: boolean;
}

function ConvocacaoCard({ convocacao, onPagar, onCancelar, onConfirmar, isCancelling, isConfirming }: ConvocacaoCardProps) {
  const { crianca, evento, valor, isento, status } = convocacao;
  
  const dataEvento = evento.data ? parseISO(evento.data) : null;
  const dataLimite = evento.data_limite_pagamento ? parseISO(evento.data_limite_pagamento) : null;
  const isPago = status === 'pago';
  const isRecusado = status === 'recusado';
  const isConfirmado = status === 'confirmado';
  const needsPayment = !isento && valor && valor > 0 && !isPago && !isRecusado && !isConfirmado;
  const isOverdue = dataLimite && isBefore(dataLimite, new Date());
  
  // Exempt athletes also need to confirm by the deadline
  const isentoPendente = isento && !isConfirmado && !isRecusado && !isPago;
  const isentoOverdue = isentoPendente && isOverdue;
  
  // Calculate fee breakdown
  const taxaParticipacao = evento.cobrar_taxa_participacao ? (evento.taxa_participacao || 0) : 0;
  const taxaJuiz = evento.cobrar_taxa_juiz ? (evento.taxa_juiz || 0) : 0;

  // Card styles based on payment status
  const cardBorderClass = isRecusado
    ? 'border-gray-300 bg-gray-50/50'
    : isPago || isConfirmado || (!isento && (!valor || valor <= 0))
      ? 'border-green-200' 
      : isentoOverdue || (isOverdue && needsPayment)
        ? 'border-red-300' 
        : isentoPendente
          ? 'border-blue-200'
          : 'border-orange-200';

  // Determine event type
  const isCampeonato = evento.campeonato_id || evento.tipo === 'campeonato';

  return (
    <Card className={`overflow-hidden ${cardBorderClass}`}>
      {/* Event Type Header - MORE PROMINENT for Amistoso */}
      <div className={`px-4 py-3 border-b ${
        isCampeonato 
          ? 'bg-gradient-to-r from-amber-100 to-amber-50' 
          : 'bg-gradient-to-r from-emerald-500 to-green-400'
      }`}>
        <div className="flex items-center gap-2">
          {isCampeonato ? (
            <Trophy className="h-5 w-5 text-amber-600" />
          ) : (
            <span className="text-xl">⚽</span>
          )}
          <span className={`font-bold text-base ${isCampeonato ? 'text-amber-700' : 'text-white'}`}>
            {isCampeonato ? 'JOGO DE CAMPEONATO' : 'AMISTOSO'}
          </span>
        </div>
        <p className={`text-xs mt-0.5 font-medium ${isCampeonato ? 'text-amber-600' : 'text-white/90'}`}>
          {evento.escolinha.nome}
        </p>
      </div>
      
      {/* Championship name sub-header if applicable */}
      {isCampeonato && evento.campeonato_nome && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">{evento.campeonato_nome}</span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className={`h-10 w-10 ${isRecusado ? 'opacity-60' : ''}`}>
            <AvatarImage src={crianca.foto_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {crianca.nome.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className={`text-base whitespace-nowrap ${isRecusado ? 'text-muted-foreground' : ''}`}>
              {crianca.nome}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(status, isento, valor, dataLimite)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Event Info */}
        <div className={`rounded-lg p-3 space-y-2 ${isRecusado ? 'bg-gray-50' : isPago || isConfirmado || (!isento && (!valor || valor <= 0)) ? 'bg-green-50' : isOverdue ? 'bg-red-50' : isCampeonato ? 'bg-amber-50' : 'bg-orange-50'}`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${isRecusado ? 'text-muted-foreground' : ''}`}>
            <Trophy className={`h-4 w-4 ${isRecusado ? 'text-muted-foreground' : isCampeonato ? 'text-amber-600' : 'text-primary'}`} />
            <span>{evento.nome}</span>
            {isCampeonato && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                Campeonato
              </Badge>
            )}
          </div>
          
          {/* Category */}
          {evento.categoria && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>{evento.categoria}</span>
            </div>
          )}
          
          {dataEvento && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(dataEvento, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
          )}
          
          {evento.horario_inicio && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{evento.horario_inicio.slice(0, 5)}</span>
            </div>
          )}
          
          {evento.local && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{evento.local}</span>
            </div>
          )}

          {evento.endereco && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4" />
              <span>{evento.endereco}</span>
            </div>
          )}

          {/* Observations */}
          {evento.observacoes && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="italic">{evento.observacoes}</span>
            </div>
          )}
          
          {dataLimite && needsPayment && (
            <div className={`flex items-center gap-2 text-sm font-medium pt-1 ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
              <CalendarClock className="h-4 w-4" />
              <span>{isOverdue ? 'Prazo vencido em:' : 'Pagar até:'} {format(dataLimite, "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>

        {/* Payment Info */}
        {needsPayment && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Taxas de Participação
              </h4>
              
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                {taxaParticipacao > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inscrição</span>
                    <span>{formatCurrency(taxaParticipacao)}</span>
                  </div>
                )}
                
                {taxaJuiz > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Arbitragem</span>
                    <span>{formatCurrency(taxaJuiz)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(valor || 0)}</span>
                </div>
              </div>
              
              {/* Payment Info Message */}
              <div className={`p-3 rounded-lg text-xs ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                <p>
                  Para confirmar a participação do atleta, favor efetue o pagamento através do PIX.
                  {dataLimite && !isOverdue && (
                    <> O prazo máximo para confirmação é <strong>{format(dataLimite, "dd/MM/yyyy")}</strong>.</>
                  )}
                  {isOverdue && (
                    <> O prazo para pagamento já expirou. Entre em contato com a escola para regularizar.</>
                  )}
                </p>
              </div>
              
              <Button 
                className="w-full" 
                variant={isOverdue ? "destructive" : "default"}
                onClick={() => onPagar(convocacao)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Pagar com PIX - {formatCurrency(valor || 0)}
              </Button>

              {/* Cancel Button */}
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => onCancelar(convocacao)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Cancelar Participação
              </Button>
            </div>
          </>
        )}

        {/* Paid Status */}
        {isPago && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Pagamento confirmado! Participação garantida.</span>
          </div>
        )}

        {/* Recusado (Declined) Status */}
        {isRecusado && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-100 p-3 rounded-lg">
            <Ban className="h-5 w-5" />
            <span className="text-sm font-medium">Participação recusada pelo responsável</span>
          </div>
        )}

        {/* Exempt Status - needs confirmation */}
        {isentoPendente && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className={`p-3 rounded-lg text-xs ${isentoOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Atleta isento de pagamento</span>
                </div>
                <p>
                  Para confirmar a participação, por favor confirme até a data limite.
                  {dataLimite && !isentoOverdue && (
                    <> O prazo máximo para confirmação é <strong>{format(dataLimite, "dd/MM/yyyy")}</strong>.</>
                  )}
                  {isentoOverdue && (
                    <> O prazo para confirmação já expirou. Entre em contato com a escola.</>
                  )}
                </p>
              </div>

              {dataLimite && !isentoOverdue && (
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <CalendarClock className="h-4 w-4" />
                  <span>Confirmar até: {format(dataLimite, "dd/MM/yyyy")}</span>
                </div>
              )}
              
              {/* Confirmation button for exempt athletes */}
              {!isentoOverdue && (
                <Button 
                  className="w-full" 
                  onClick={() => onConfirmar(convocacao)}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Participação
                </Button>
              )}

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => onCancelar(convocacao)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Cancelar Participação
              </Button>
            </div>
          </>
        )}

        {/* Exempt and confirmed */}
        {isento && isConfirmado && !isRecusado && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Participação confirmada (isento)</span>
          </div>
        )}

        {/* No cost - confirmed */}
        {!isento && !isRecusado && (!valor || valor <= 0) && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Participação confirmada (sem custo)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ConvocacoesAmistososTab() {
  const queryClient = useQueryClient();
  const { data: convocacoes = [], isLoading } = useGuardianAmistosoConvocacoes();
  const { data: campeonatoConvocacoes = [], isLoading: loadingCampeonato } = useGuardianCampeonatoConvocacoes();
  const cancelMutation = useCancelAmistosoParticipation();
  const confirmMutation = useConfirmExemptParticipation();
  const confirmCampeonatoMutation = useConfirmCampeonatoExemptParticipation();
  const [selectedConvocacao, setSelectedConvocacao] = useState<ConvocacaoAmistoso | null>(null);
  const [selectedCampeonatoConvocacao, setSelectedCampeonatoConvocacao] = useState<GuardianCampeonatoConvocacao | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [showCampeonatoPixDialog, setShowCampeonatoPixDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCampeonatoConfirmDialog, setShowCampeonatoConfirmDialog] = useState(false);
  const [showCampeonatoCancelDialog, setShowCampeonatoCancelDialog] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Filter pending campeonato inscriptions
  const pendingCampeonatoInscricoes = campeonatoConvocacoes.filter(c => 
    c.status !== 'pago' && c.status !== 'confirmado' && c.status !== 'recusado'
  );
  
  // Filter confirmed campeonato inscriptions
  const confirmedCampeonatoInscricoes = campeonatoConvocacoes.filter(c => 
    c.status === 'pago' || c.status === 'confirmado' || (!c.isento && (!c.valor || c.valor <= 0))
  );

  const handlePagarCampeonato = (convocacao: GuardianCampeonatoConvocacao) => {
    setSelectedCampeonatoConvocacao(convocacao);
    setShowCampeonatoPixDialog(true);
  };

  const handlePagar = (convocacao: ConvocacaoAmistoso) => {
    setSelectedConvocacao(convocacao);
    setShowPixDialog(true);
  };

  const handleCancelClick = (convocacao: ConvocacaoAmistoso) => {
    setSelectedConvocacao(convocacao);
    setShowCancelDialog(true);
  };

  const handleConfirmClick = (convocacao: ConvocacaoAmistoso) => {
    setSelectedConvocacao(convocacao);
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedConvocacao) return;
    
    setCancellingId(selectedConvocacao.id);
    try {
      await cancelMutation.mutateAsync(selectedConvocacao.id);
      toast.success('Participação cancelada com sucesso');
      setShowCancelDialog(false);
      setSelectedConvocacao(null);
    } catch (error) {
      toast.error('Erro ao cancelar participação');
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmParticipation = async () => {
    if (!selectedConvocacao) return;
    
    setConfirmingId(selectedConvocacao.id);
    try {
      await confirmMutation.mutateAsync(selectedConvocacao.id);
      toast.success('Participação confirmada com sucesso!');
      setShowConfirmDialog(false);
      setSelectedConvocacao(null);
    } catch (error) {
      toast.error('Erro ao confirmar participação');
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePaymentConfirmed = () => {
    // Invalidate all related queries to update the UI
    queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
    queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
    queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes'] });
    
    setShowPixDialog(false);
    setSelectedConvocacao(null);
  };

  const handleCampeonatoPaymentConfirmed = () => {
    queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
    queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
    queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
    
    setShowCampeonatoPixDialog(false);
    setSelectedCampeonatoConvocacao(null);
  };

  const handleCampeonatoCancelClick = (convocacao: GuardianCampeonatoConvocacao) => {
    setSelectedCampeonatoConvocacao(convocacao);
    setShowCampeonatoCancelDialog(true);
  };

  const handleCampeonatoConfirmClick = (convocacao: GuardianCampeonatoConvocacao) => {
    setSelectedCampeonatoConvocacao(convocacao);
    setShowCampeonatoConfirmDialog(true);
  };

  const handleConfirmCampeonatoCancel = async () => {
    if (!selectedCampeonatoConvocacao) return;
    
    setCancellingId(selectedCampeonatoConvocacao.id);
    try {
      // Update status to recusado
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('campeonato_convocacoes')
        .update({ status: 'recusado' })
        .eq('id', selectedCampeonatoConvocacao.id);
        
      // Invalidate all relevant queries to update both guardian and school views
      queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
      toast.success('Inscrição cancelada com sucesso');
      setShowCampeonatoCancelDialog(false);
      setSelectedCampeonatoConvocacao(null);
    } catch (error) {
      toast.error('Erro ao cancelar inscrição');
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmCampeonatoParticipation = async () => {
    if (!selectedCampeonatoConvocacao) return;
    
    setConfirmingId(selectedCampeonatoConvocacao.id);
    try {
      await confirmCampeonatoMutation.mutateAsync(selectedCampeonatoConvocacao.id);
      toast.success('Inscrição confirmada com sucesso!');
      setShowCampeonatoConfirmDialog(false);
      setSelectedCampeonatoConvocacao(null);
    } catch (error) {
      toast.error('Erro ao confirmar inscrição');
    } finally {
      setConfirmingId(null);
    }
  };

  if (isLoading || loadingCampeonato) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (convocacoes.length === 0 && campeonatoConvocacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhuma convocação</h3>
          <p className="text-sm text-muted-foreground">
            Quando seu filho for convocado para um amistoso ou jogo de campeonato, você verá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Helper to check if convocacao is expired
  const isExpired = (c: ConvocacaoAmistoso) => {
    if (!c.evento.data_limite_pagamento) return false;
    const dataLimite = parseISO(c.evento.data_limite_pagamento);
    return isBefore(dataLimite, new Date());
  };

  // Filter out expired and declined from view (only show in confirmed section if paid/confirmed)
  const activeConvocacoes = convocacoes.filter(c => {
    // Always hide recusado
    if (c.status === 'recusado') return false;
    // If expired and not paid/confirmed, hide it
    if (isExpired(c) && c.status !== 'pago' && c.status !== 'confirmado') return false;
    return true;
  });

  // Separate pending and confirmed convocations (no more recusados section)
  const pendingConvocacoes = activeConvocacoes.filter(c => {
    // Non-exempt with pending payment
    if (!c.isento && c.valor && c.valor > 0 && c.status !== 'pago' && c.status !== 'confirmado') {
      return true;
    }
    // Exempt but not yet confirmed
    if (c.isento && c.status !== 'confirmado' && c.status !== 'pago') {
      return true;
    }
    return false;
  });
  const confirmedConvocacoes = activeConvocacoes.filter(c => 
    c.status === 'confirmado' || c.status === 'pago' || (!c.isento && (!c.valor || c.valor <= 0))
  );

  return (
    <div className="space-y-6">
      {/* Pending Campeonato Inscriptions */}
      {pendingCampeonatoInscricoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Inscrições de Campeonato Pendentes ({pendingCampeonatoInscricoes.length})
          </h3>
          <div className="grid gap-4">
            {pendingCampeonatoInscricoes.map((convocacao) => (
              <CampeonatoConvocacaoCard 
                key={convocacao.id} 
                convocacao={convocacao} 
                onPagar={handlePagarCampeonato}
                onCancelar={handleCampeonatoCancelClick}
                onConfirmar={handleCampeonatoConfirmClick}
                isCancelling={cancellingId === convocacao.id}
                isConfirming={confirmingId === convocacao.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Amistoso Confirmations */}
      {pendingConvocacoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-500" />
            ⚽ Amistosos Pendentes ({pendingConvocacoes.length})
          </h3>
          <div className="grid gap-4">
            {pendingConvocacoes.map((convocacao) => (
              <ConvocacaoCard 
                key={convocacao.id} 
                convocacao={convocacao} 
                onPagar={handlePagar}
                onCancelar={handleCancelClick}
                onConfirmar={handleConfirmClick}
                isCancelling={cancellingId === convocacao.id}
                isConfirming={confirmingId === convocacao.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Campeonato Inscriptions */}
      {confirmedCampeonatoInscricoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Campeonatos Confirmados
          </h3>
          <div className="grid gap-4">
            {confirmedCampeonatoInscricoes.map((convocacao) => (
              <CampeonatoConvocacaoCard 
                key={convocacao.id} 
                convocacao={convocacao} 
                onPagar={handlePagarCampeonato}
                onCancelar={handleCampeonatoCancelClick}
                onConfirmar={handleCampeonatoConfirmClick}
                isCancelling={cancellingId === convocacao.id}
                isConfirming={confirmingId === convocacao.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Amistoso Convocations */}
      {confirmedConvocacoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            ⚽ Amistosos Confirmados
          </h3>
          <div className="grid gap-4">
            {confirmedConvocacoes.map((convocacao) => (
              <ConvocacaoCard 
                key={convocacao.id} 
                convocacao={convocacao} 
                onPagar={handlePagar}
                onCancelar={handleCancelClick}
                onConfirmar={handleConfirmClick}
                isCancelling={cancellingId === convocacao.id}
                isConfirming={confirmingId === convocacao.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Removed recusados section - hidden from view */}

      {/* PIX Checkout Dialog */}
      {selectedConvocacao && (
        <AmistosoPixCheckoutDialog
          open={showPixDialog}
          onOpenChange={setShowPixDialog}
          convocacao={selectedConvocacao}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Participação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a participação de{' '}
              <strong>{selectedConvocacao?.crianca.nome}</strong> neste amistoso?
              <br /><br />
              Esta ação cancelará a cobrança e o atleta não participará do jogo.
              A convocação ficará registrada no histórico como "recusada".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Participation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Participação</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar a participação de{' '}
              <strong>{selectedConvocacao?.crianca.nome}</strong> neste amistoso?
              <br /><br />
              O atleta está isento do pagamento e será confirmado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmParticipation}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campeonato PIX Checkout Dialog */}
      {selectedCampeonatoConvocacao && (
        <CampeonatoPixCheckoutDialog
          open={showCampeonatoPixDialog}
          onOpenChange={setShowCampeonatoPixDialog}
          convocacao={selectedCampeonatoConvocacao}
          onPaymentConfirmed={handleCampeonatoPaymentConfirmed}
        />
      )}

      {/* Campeonato Cancel Confirmation Dialog */}
      <AlertDialog open={showCampeonatoCancelDialog} onOpenChange={setShowCampeonatoCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Inscrição no Campeonato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a inscrição de{' '}
              <strong>{selectedCampeonatoConvocacao?.crianca?.nome}</strong> neste campeonato?
              <br /><br />
              Esta ação cancelará a cobrança e o atleta não participará do campeonato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingId !== null}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCampeonatoCancel}
              disabled={cancellingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campeonato Confirm Participation Dialog */}
      <AlertDialog open={showCampeonatoConfirmDialog} onOpenChange={setShowCampeonatoConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inscrição no Campeonato</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar a inscrição de{' '}
              <strong>{selectedCampeonatoConvocacao?.crianca?.nome}</strong> neste campeonato?
              <br /><br />
              O atleta está isento do pagamento e será inscrito automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmCampeonatoMutation.isPending}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCampeonatoParticipation}
              disabled={confirmCampeonatoMutation.isPending}
            >
              {confirmCampeonatoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
