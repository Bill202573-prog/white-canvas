import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Loader2,
  School,
  QrCode
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface MensalidadeHistoricoListProps {
  criancaId: string;
  canDelete?: boolean;
}

interface Mensalidade {
  id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  abacatepay_url: string | null;
  abacatepay_billing_id: string | null;
  escolinha: {
    nome: string;
  } | null;
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

const MensalidadeHistoricoList = ({ criancaId, canDelete = false }: MensalidadeHistoricoListProps) => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mensalidadeToDelete, setMensalidadeToDelete] = useState<Mensalidade | null>(null);

  // Fetch all mensalidades for the child - exclude cancelled ones
  const { data: mensalidades = [], isLoading } = useQuery({
    queryKey: ['mensalidades-historico', criancaId],
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
          abacatepay_url,
          abacatepay_billing_id,
          escolinha:escolinhas!mensalidades_escolinha_id_fkey(nome)
        `)
        .eq('crianca_id', criancaId)
        .neq('status', 'cancelado') // Don't show cancelled mensalidades
        .order('mes_referencia', { ascending: false });

      if (error) throw error;
      return data as unknown as Mensalidade[];
    },
    enabled: !!criancaId,
  });

  // Cancel mutation - cancels in Asaas and updates status to 'cancelado'
  const deleteMutation = useMutation({
    mutationFn: async (mensalidadeId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-mensalidade-payment', {
        body: { mensalidadeId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao cancelar cobrança');
      return data;
    },
    onSuccess: () => {
      toast.success('Cobrança cancelada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['mensalidades-historico', criancaId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-mensalidades', criancaId] });
      queryClient.invalidateQueries({ queryKey: ['school-mensalidades-detail'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      setDeleteDialogOpen(false);
      setMensalidadeToDelete(null);
    },
    onError: (error: Error) => {
      console.error('Error cancelling mensalidade:', error);
      toast.error('Erro ao cancelar cobrança: ' + error.message);
    },
  });

  const handleDeleteClick = (mensalidade: Mensalidade) => {
    setMensalidadeToDelete(mensalidade);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (mensalidadeToDelete) {
      deleteMutation.mutate(mensalidadeToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (mensalidades.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma cobrança encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Histórico de Cobranças
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mensalidades.map((mensalidade) => (
            <div
              key={mensalidade.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-full shrink-0 relative ${
                  mensalidade.status?.toLowerCase() === 'pago'
                    ? 'bg-emerald-500/10'
                    : mensalidade.status?.toLowerCase() === 'atrasado'
                    ? 'bg-destructive/10'
                    : 'bg-muted'
                }`}>
                  {mensalidade.status?.toLowerCase() === 'pago' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : mensalidade.status?.toLowerCase() === 'atrasado' ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500" />
                  )}
                  {/* PIX indicator */}
                  {mensalidade.abacatepay_url && mensalidade.status?.toLowerCase() !== 'pago' && (
                    <QrCode className="w-3 h-3 text-primary absolute -bottom-0.5 -right-0.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">
                      {formatMesReferencia(mensalidade.mes_referencia)}
                    </p>
                    {mensalidade.escolinha?.nome && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <School className="w-3 h-3" />
                        {mensalidade.escolinha.nome}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Venc: {format(parseISO(mensalidade.data_vencimento), "dd/MM/yyyy")}
                    {mensalidade.data_pagamento && (
                      <> • Pago em {format(parseISO(mensalidade.data_pagamento), "dd/MM/yyyy")}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    R$ {mensalidade.valor.toFixed(2).replace('.', ',')}
                  </p>
                  {getStatusBadge(mensalidade.status)}
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClick(mensalidade)}
                    title="Excluir cobrança"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cobrança de{' '}
              <strong>{mensalidadeToDelete && formatMesReferencia(mensalidadeToDelete.mes_referencia)}</strong>
              {' '}no valor de{' '}
              <strong>R$ {mensalidadeToDelete?.valor.toFixed(2).replace('.', ',')}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MensalidadeHistoricoList;
