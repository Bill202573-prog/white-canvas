import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  CreditCard, 
  Loader2, 
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  PartyPopper,
  School,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import MensalidadePixCheckoutDialog from './MensalidadePixCheckoutDialog';
import FinanceiroHistoricoUnificado from '@/components/shared/FinanceiroHistoricoUnificado';

interface FinanceiroConsolidadoProps {
  children: Array<{
    id: string;
    nome: string;
    foto_url: string | null;
  }>;
}

interface MensalidadeWithChild {
  id: string;
  crianca_id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  abacatepay_billing_id: string | null;
  abacatepay_url: string | null;
  escolinha: {
    nome: string;
  };
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
}

const formatMesReferencia = (mes: string) => {
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [year, month] = mes.split('-');
  return `${monthNames[parseInt(month)]}/${year}`;
};

const getStatusBadge = (status: string) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'pago':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
    case 'a_vencer':
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />A Vencer</Badge>;
    case 'atrasado':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
    case 'isento':
      return <Badge variant="secondary">Isento</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Child avatar badge component
const ChildBadge = ({ crianca }: { crianca: { id: string; nome: string; foto_url: string | null } }) => (
  <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-0.5">
    <Avatar className="w-5 h-5">
      {crianca.foto_url && <AvatarImage src={crianca.foto_url} />}
      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
        {crianca.nome.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
      {crianca.nome.split(' ')[0]}
    </span>
  </div>
);

const FinanceiroConsolidado = ({ children }: FinanceiroConsolidadoProps) => {
  const queryClient = useQueryClient();
  const [selectedMensalidade, setSelectedMensalidade] = useState<MensalidadeWithChild | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [recentlyPaidId, setRecentlyPaidId] = useState<string | null>(null);

  const childIds = children.map(c => c.id);
  const childrenMap = new Map(children.map(c => [c.id, c]));

  // Buscar o responsavel_id 
  const { data: responsavelId } = useQuery({
    queryKey: ['responsavel-id-consolidated'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data } = await supabase
        .from('responsaveis')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();
      
      return data?.id || null;
    },
  });

  // Fetch mensalidades for ALL children
  const { data: mensalidades = [], isLoading, refetch } = useQuery({
    queryKey: ['guardian-mensalidades-consolidated', childIds],
    queryFn: async () => {
      if (childIds.length === 0) return [];

      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          id,
          crianca_id,
          mes_referencia,
          valor,
          data_vencimento,
          data_pagamento,
          status,
          forma_pagamento,
          abacatepay_billing_id,
          abacatepay_url,
          escolinha:escolinhas!mensalidades_escolinha_id_fkey(nome)
        `)
        .in('crianca_id', childIds)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      
      // Enrich with child data
      return (data || []).map(m => ({
        ...m,
        crianca: childrenMap.get(m.crianca_id) || { id: m.crianca_id, nome: 'Aluno', foto_url: null },
      })) as unknown as MensalidadeWithChild[];
    },
    enabled: childIds.length > 0,
  });

  // Separate pending payments only (for payment section)
  const pendingMensalidades = mensalidades.filter(m => {
    const status = m.status?.toLowerCase();
    return (status === 'a_vencer' || status === 'atrasado') && m.id !== recentlyPaidId;
  });

  const handleOpenPixDialog = (mensalidade: MensalidadeWithChild) => {
    setSelectedMensalidade(mensalidade);
    setPixDialogOpen(true);
  };

  const handlePaymentConfirmed = () => {
    if (selectedMensalidade) {
      setRecentlyPaidId(selectedMensalidade.id);
      
      setTimeout(() => {
        setRecentlyPaidId(null);
        refetch();
        childIds.forEach(id => {
          queryClient.invalidateQueries({ queryKey: ['mensalidades-historico', id] });
        });
      }, 10000);
    }
  };

  useEffect(() => {
    if (!pixDialogOpen && recentlyPaidId) {
      queryClient.invalidateQueries({ queryKey: ['guardian-mensalidades-consolidated'] });
      childIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ['mensalidades-historico', id] });
      });
    }
  }, [pixDialogOpen, recentlyPaidId, childIds, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recently Paid - Success Message */}
      {recentlyPaidId && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10 animate-pulse">
                <PartyPopper className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-emerald-600">Pagamento Confirmado!</p>
                <p className="text-sm text-muted-foreground">
                  O comprovante será atualizado no histórico em alguns segundos...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Cobranças Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingMensalidades.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">Nenhuma cobrança pendente!</p>
            </div>
          ) : (
            pendingMensalidades.map((mensalidade) => (
              <Card key={mensalidade.id} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Child badge + month + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <ChildBadge crianca={mensalidade.crianca} />
                      <span className="font-medium">
                        {formatMesReferencia(mensalidade.mes_referencia)}
                      </span>
                      {getStatusBadge(mensalidade.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p className="font-semibold text-primary">
                          R$ {mensalidade.valor.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vencimento:</span>
                        <p className="font-medium">
                          {format(parseISO(mensalidade.data_vencimento), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    
                    {mensalidade.escolinha?.nome && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <School className="w-3 h-3" />
                        {mensalidade.escolinha.nome}
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => handleOpenPixDialog(mensalidade)}
                      className="w-full mt-2"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Pagar com PIX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payment History - Show unified for each child */}
      {children.map(child => (
        <FinanceiroHistoricoUnificado 
          key={child.id}
          criancaId={child.id} 
          canDelete={false} 
          responsavelId={responsavelId || undefined}
          childName={child.nome}
        />
      ))}

      {/* PIX Checkout Dialog */}
      {selectedMensalidade && (
        <MensalidadePixCheckoutDialog
          open={pixDialogOpen}
          onOpenChange={setPixDialogOpen}
          mensalidadeId={selectedMensalidade.id}
          valor={selectedMensalidade.valor}
          mesReferencia={selectedMensalidade.mes_referencia}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </div>
  );
};

export default FinanceiroConsolidado;
