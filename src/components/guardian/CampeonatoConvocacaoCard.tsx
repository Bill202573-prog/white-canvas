import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  XCircle,
  Ban,
} from 'lucide-react';
import { GuardianCampeonatoConvocacao } from '@/hooks/useCampeonatoConvocacoesData';

interface CampeonatoConvocacaoCardProps {
  convocacao: GuardianCampeonatoConvocacao;
  onPagar: (convocacao: GuardianCampeonatoConvocacao) => void;
  onCancelar: (convocacao: GuardianCampeonatoConvocacao) => void;
  onConfirmar: (convocacao: GuardianCampeonatoConvocacao) => void;
  isCancelling: boolean;
  isConfirming: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getStatusBadge = (status: string, isento: boolean, valor: number | null) => {
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

  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>;
};

export function CampeonatoConvocacaoCard({ 
  convocacao, 
  onPagar, 
  onCancelar, 
  onConfirmar, 
  isCancelling, 
  isConfirming 
}: CampeonatoConvocacaoCardProps) {
  const { crianca, campeonato, valor, isento, status } = convocacao;
  
  const isPago = status === 'pago';
  const isRecusado = status === 'recusado';
  const isConfirmado = status === 'confirmado';
  const needsPayment = !isento && valor && valor > 0 && !isPago && !isRecusado && !isConfirmado;
  
  // Exempt athletes also need to confirm
  const isentoPendente = isento && !isConfirmado && !isRecusado && !isPago;

  // Card styles based on payment status
  const cardBorderClass = isRecusado
    ? 'border-gray-300 bg-gray-50/50'
    : isPago || isConfirmado || (!isento && (!valor || valor <= 0))
      ? 'border-green-200' 
      : isentoPendente
        ? 'border-blue-200'
        : 'border-amber-200';

  // Get full campeonato name
  const campeonatoNome = campeonato?.nome 
    ? `${campeonato.nome}${campeonato.ano ? ` ${campeonato.ano}` : ''}`
    : 'Campeonato';

  return (
    <Card className={`overflow-hidden ${cardBorderClass}`}>
      {/* Event Type Header - Championship style with single trophy */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-500 to-yellow-400">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-white" />
          <span className="font-bold text-base text-white">CAMPEONATO</span>
        </div>
        <p className="text-xs text-white/90 mt-0.5 font-medium">
          {campeonato?.escolinha?.nome || 'Escola'}
        </p>
      </div>
      
      {/* Championship name - Full name displayed in yellow band */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-amber-800 flex-1 truncate">
          🏆 {campeonatoNome}
        </span>
        {campeonato?.categoria && (
          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200 shrink-0">
            {campeonato.categoria}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-3">
          <Avatar className={`h-12 w-12 ${isRecusado ? 'opacity-60' : ''}`}>
            <AvatarImage src={crianca?.foto_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {crianca?.nome?.charAt(0).toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold leading-tight whitespace-nowrap ${isRecusado ? 'text-muted-foreground' : ''}`}>
              {crianca?.nome || 'Atleta'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(status, isento, valor)}
              {campeonato?.nome_time && (
                <span className="text-xs text-muted-foreground">
                  Time: {campeonato.nome_time}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {/* Payment Info */}
        {needsPayment && (
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800">
                <Wallet className="h-4 w-4" />
                Taxa de Inscrição
              </h4>
              
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground text-sm">Valor</span>
                <span className="text-amber-700 text-lg">{formatCurrency(valor || 0)}</span>
              </div>
            </div>
            
            {/* Payment Info Message */}
            <div className="p-3 rounded-lg text-xs bg-amber-100 text-amber-700">
              <p>
                Para confirmar a inscrição do atleta no campeonato, efetue o pagamento via PIX.
              </p>
            </div>
            
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white" 
              onClick={() => onPagar(convocacao)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pagar Inscrição - {formatCurrency(valor || 0)}
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
              Recusar Inscrição
            </Button>
          </div>
        )}

        {/* Paid Status */}
        {isPago && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Inscrição confirmada! Boa sorte no campeonato!</span>
          </div>
        )}

        {/* Recusado (Declined) Status */}
        {isRecusado && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-100 p-3 rounded-lg">
            <Ban className="h-5 w-5" />
            <span className="text-sm font-medium">Inscrição recusada pelo responsável</span>
          </div>
        )}

        {/* Exempt Status - needs confirmation */}
        {isentoPendente && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg text-xs bg-blue-100 text-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Atleta isento de pagamento</span>
              </div>
              <p>
                Para confirmar a inscrição no campeonato, por favor confirme a participação.
              </p>
            </div>
            
            {/* Confirmation button for exempt athletes */}
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
              Confirmar Inscrição
            </Button>

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
              Recusar Inscrição
            </Button>
          </div>
        )}

        {/* Exempt and confirmed */}
        {isento && isConfirmado && !isRecusado && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Inscrição confirmada (sem custo)</span>
          </div>
        )}

        {/* No cost - confirmed */}
        {!isento && !isRecusado && (!valor || valor <= 0) && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Inscrição confirmada (sem custo)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CampeonatoConvocacaoCard;
