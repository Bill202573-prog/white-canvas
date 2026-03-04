import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Loader2, 
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  PartyPopper,
  School
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import MensalidadePixCheckoutDialog from './MensalidadePixCheckoutDialog';
import FinanceiroHistoricoUnificado from '@/components/shared/FinanceiroHistoricoUnificado';

interface FinanceiroTabProps {
  criancaId: string;
  childName: string;
}

interface Mensalidade {
  id: string;
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

const FinanceiroTab = ({ criancaId, childName }: FinanceiroTabProps) => {
  const queryClient = useQueryClient();
  const [selectedMensalidade, setSelectedMensalidade] = useState<Mensalidade | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [recentlyPaidId, setRecentlyPaidId] = useState<string | null>(null);

  // Buscar o responsavel_id associado a essa criança
  const { data: responsavelId } = useQuery({
    queryKey: ['responsavel-id-from-crianca', criancaId],
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

  // Fetch mensalidades for the child - exclude cancelled ones
  const { data: mensalidades = [], isLoading, refetch } = useQuery({
    queryKey: ['guardian-mensalidades', criancaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mensalidades')
        .select(`
          id,
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
        .eq('crianca_id', criancaId)
        .neq('status', 'cancelado') // Don't show cancelled mensalidades to guardians
        .order('mes_referencia', { ascending: false });

      if (error) throw error;
      return data as Mensalidade[];
    },
  });

  // Separate pending payments only (for payment section)
  const pendingMensalidades = mensalidades.filter(m => {
    const status = m.status?.toLowerCase();
    return (status === 'a_vencer' || status === 'atrasado') && m.id !== recentlyPaidId;
  });

  const handleOpenPixDialog = (mensalidade: Mensalidade) => {
    setSelectedMensalidade(mensalidade);
    setPixDialogOpen(true);
  };

  const handlePaymentConfirmed = () => {
    if (selectedMensalidade) {
      setRecentlyPaidId(selectedMensalidade.id);
      
      // After 10 seconds, refresh data
      setTimeout(() => {
        setRecentlyPaidId(null);
        refetch();
        queryClient.invalidateQueries({ queryKey: ['mensalidades-historico', criancaId] });
      }, 10000);
    }
  };

  // When dialog closes after success, update the data
  useEffect(() => {
    if (!pixDialogOpen && recentlyPaidId) {
      queryClient.invalidateQueries({ queryKey: ['guardian-mensalidades', criancaId] });
      queryClient.invalidateQueries({ queryKey: ['mensalidades-historico', criancaId] });
    }
  }, [pixDialogOpen, recentlyPaidId, criancaId, queryClient]);

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
            <CreditCard className="w-4 h-4 text-primary" />
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
                    <div className="flex items-center gap-2 flex-wrap">
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

      {/* Payment History - Using unified component with mensalidades + events */}
      <FinanceiroHistoricoUnificado criancaId={criancaId} canDelete={false} responsavelId={responsavelId || undefined} />

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

export default FinanceiroTab;
