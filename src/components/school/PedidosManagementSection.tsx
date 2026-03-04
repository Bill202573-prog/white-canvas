import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  Search,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import { useSchoolPedidos, useUpdatePedidoStatus, Pedido } from '@/hooks/useLojaData';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface PedidosManagementSectionProps {
  escolinhaId: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
  aguardando_pagamento: { label: 'Aguardando Pagamento', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
  pago: { label: 'Pago', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
  entregue: { label: 'Entregue', variant: 'default', icon: <Truck className="w-3 h-3" /> },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
};

export function PedidosManagementSection({ escolinhaId }: PedidosManagementSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const { data: pedidos = [], isLoading } = useSchoolPedidos(escolinhaId);
  const updateStatus = useUpdatePedidoStatus();

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = 
      String(pedido.numero_pedido || '').includes(searchTerm) ||
      pedido.responsavel?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.crianca?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || pedido.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (pedidoId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ pedidoId, status: newStatus });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Calcular estatísticas
  const stats = {
    total: pedidos.length,
    pendentes: pedidos.filter(p => p.status === 'pendente' || p.status === 'aguardando_pagamento').length,
    pagos: pedidos.filter(p => p.status === 'pago').length,
    entregues: pedidos.filter(p => p.status === 'entregue').length,
    receita: pedidos.filter(p => p.status === 'pago' || p.status === 'entregue').reduce((acc, p) => acc + p.valor_total, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagos/Entregues</p>
                <p className="text-2xl font-bold">{stats.pagos + stats.entregues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(stats.receita)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Gestão de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, responsável ou criança..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">
                        #{pedido.numero_pedido || pedido.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(pedido.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pedido.responsavel?.nome || '-'}</p>
                          {pedido.crianca?.nome && (
                            <p className="text-xs text-muted-foreground">{pedido.crianca.nome}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(pedido.valor_total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPedido(pedido)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {pedido.status === 'pago' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(pedido.id, 'entregue')}
                              disabled={updateStatus.isPending}
                            >
                              <Truck className="w-4 h-4 mr-1" />
                              Entregar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes do pedido */}
      <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Pedido #{selectedPedido?.numero_pedido || selectedPedido?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPedido.responsavel?.nome}</p>
                  {selectedPedido.crianca?.nome && (
                    <p className="text-sm text-muted-foreground">Atleta: {selectedPedido.crianca.nome}</p>
                  )}
                </div>
                {getStatusBadge(selectedPedido.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {format(parseISO(selectedPedido.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                {selectedPedido.data_pagamento && (
                  <div>
                    <p className="text-muted-foreground">Data do Pagamento</p>
                    <p className="font-medium">
                      {format(parseISO(selectedPedido.data_pagamento), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {selectedPedido.itens?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {item.quantidade}x {(item as any).produto?.nome || 'Produto'}
                        </span>
                        {(item as any).tamanho && (
                          <Badge variant="outline" className="text-xs">
                            Tam: {(item as any).tamanho}
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{formatCurrency(item.valor_total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(selectedPedido.valor_total)}
                </span>
              </div>

              {selectedPedido.observacoes && (
                <div className="bg-muted/50 p-3 rounded">
                  <p className="text-sm text-muted-foreground">Observações:</p>
                  <p className="text-sm">{selectedPedido.observacoes}</p>
                </div>
              )}

              {/* Ações rápidas */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedPedido.status === 'pago' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusChange(selectedPedido.id, 'entregue');
                      setSelectedPedido(null);
                    }}
                    disabled={updateStatus.isPending}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Marcar como Entregue
                  </Button>
                )}
                {(selectedPedido.status === 'pendente' || selectedPedido.status === 'aguardando_pagamento') && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      handleStatusChange(selectedPedido.id, 'cancelado');
                      setSelectedPedido(null);
                    }}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}