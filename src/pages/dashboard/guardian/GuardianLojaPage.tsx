import { useState, useMemo } from 'react';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';
import { useGuardianProducts, useGuardianPedidos, useCreatePedido, Produto, ProdutoTamanho } from '@/hooks/useLojaData';
import { useGuardianChildren } from '@/hooks/useSchoolData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShoppingCart, Package, History, Plus, Minus, Trash2, Loader2, User, School } from 'lucide-react';
import { toast } from 'sonner';
import { PedidoPixCheckoutDialog } from '@/components/guardian/PedidoPixCheckoutDialog';

interface CartItem {
  produto: Produto;
  quantidade: number;
  tamanho?: string;
}

export default function GuardianLojaPage() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutPedidoId, setCheckoutPedidoId] = useState<string | null>(null);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [selectedTamanho, setSelectedTamanho] = useState<string>('');
  
  const { data: produtos = [], isLoading: loadingProdutos } = useGuardianProducts();
  const { data: pedidos = [], isLoading: loadingPedidos } = useGuardianPedidos();
  const { data: children = [] } = useGuardianChildren();
  const createPedido = useCreatePedido();

  // Group products by school
  const produtosPorEscola = useMemo(() => {
    const grouped = new Map<string, { nome: string; produtos: Produto[] }>();
    produtos.forEach(produto => {
      const escolaKey = produto.escolinha_id;
      const escolaNome = produto.escolinha_nome || 'Escola';
      if (!grouped.has(escolaKey)) {
        grouped.set(escolaKey, { nome: escolaNome, produtos: [] });
      }
      grouped.get(escolaKey)!.produtos.push(produto);
    });
    return Array.from(grouped.entries());
  }, [produtos]);

  const handleAddToCart = (produto: Produto) => {
    const tamanhos = produto.tamanhos || [];
    
    if (tamanhos.length > 0) {
      // Has sizes - show size selection dialog
      setSelectedProduto(produto);
      setSelectedTamanho('');
      setSizeDialogOpen(true);
    } else {
      // No sizes - add directly
      addToCartWithSize(produto, undefined);
    }
  };

  const addToCartWithSize = (produto: Produto, tamanho?: string) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.produto.id === produto.id && item.tamanho === tamanho
      );
      if (existing) {
        return prev.map(item =>
          item.produto.id === produto.id && item.tamanho === tamanho
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1, tamanho }];
    });
    toast.success(`${produto.nome}${tamanho ? ` (Tam. ${tamanho})` : ''} adicionado ao carrinho`);
    setSizeDialogOpen(false);
    setSelectedProduto(null);
  };

  const confirmSizeSelection = () => {
    if (selectedProduto && selectedTamanho) {
      addToCartWithSize(selectedProduto, selectedTamanho);
    }
  };

  const updateQuantity = (produtoId: string, tamanho: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.produto.id === produtoId && item.tamanho === tamanho) {
          const newQty = item.quantidade + delta;
          if (newQty <= 0) return null;
          return { ...item, quantidade: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (produtoId: string, tamanho: string | undefined) => {
    setCart(prev => prev.filter(item => 
      !(item.produto.id === produtoId && item.tamanho === tamanho)
    ));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.produto.valor * item.quantidade, 0);

  // Get current child
  const currentChildId = selectedChildId || (children.length === 1 ? children[0]?.id : null);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    if (!currentChildId) {
      toast.error('Selecione o atleta para a compra');
      return;
    }

    const escolinhaId = cart[0].produto.escolinha_id;

    try {
      const pedido = await createPedido.mutateAsync({
        escolinha_id: escolinhaId,
        crianca_id: currentChildId,
        itens: cart.map(item => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          valor_unitario: item.produto.valor,
          tamanho: item.tamanho,
        })),
      });

      setCart([]);
      setCheckoutPedidoId(pedido.id);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      aguardando_pagamento: { label: 'Aguardando Pagamento', variant: 'outline' },
      pago: { label: 'Pago', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loadingProdutos) {
    return (
      <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChildId}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileGuardianLayout>
    );
  }

  return (
    <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChildId}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Loja</h1>
        </div>

        <Tabs defaultValue="produtos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="produtos" className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="carrinho" className="flex items-center gap-1 relative">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Carrinho</span>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
          </TabsList>

          {/* Produtos */}
          <TabsContent value="produtos" className="mt-4">
            {produtosPorEscola.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto disponível no momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {produtosPorEscola.map(([escolaId, { nome: escolaNome, produtos: escolaProdutos }]) => (
                  <div key={escolaId}>
                    {/* School header - only show if more than 1 school */}
                    {produtosPorEscola.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <School className="w-4 h-4 text-muted-foreground" />
                        <h2 className="font-semibold text-sm text-muted-foreground">{escolaNome}</h2>
                      </div>
                    )}
                    <div className="grid gap-4 grid-cols-2">
                      {escolaProdutos.map(produto => {
                        const tamanhos = produto.tamanhos || [];
                        const hasStock = produto.estoque === null || produto.estoque > 0 || tamanhos.length > 0;
                        
                        return (
                          <Card key={produto.id} className="overflow-hidden">
                            {produto.foto_url && (
                              <div className="aspect-square bg-muted">
                                <img
                                  src={produto.foto_url}
                                  alt={produto.nome}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardContent className="p-3">
                              <h3 className="font-medium text-sm line-clamp-2">{produto.nome}</h3>
                              {produto.descricao && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {produto.descricao}
                                </p>
                              )}
                              {tamanhos.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tamanhos.slice(0, 4).map(t => (
                                    <Badge key={t.tamanho} variant="outline" className="text-[10px] px-1.5 py-0">
                                      {t.tamanho}
                                    </Badge>
                                  ))}
                                  {tamanhos.length > 4 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      +{tamanhos.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">
                                  {formatCurrency(produto.valor)}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddToCart(produto)}
                                  disabled={!hasStock}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              {!hasStock && (
                                <Badge variant="destructive" className="mt-2 text-xs">
                                  Esgotado
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Carrinho */}
          <TabsContent value="carrinho" className="mt-4">
            {cart.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Seu carrinho está vazio</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <Card key={`${item.produto.id}-${item.tamanho || idx}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {item.produto.foto_url && (
                          <img
                            src={item.produto.foto_url}
                            alt={item.produto.nome}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-1">{item.produto.nome}</h3>
                          {item.tamanho && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Tam: {item.tamanho}
                            </Badge>
                          )}
                          <p className="text-sm text-primary font-bold mt-1">
                            {formatCurrency(item.produto.valor)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.produto.id, item.tamanho, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantidade}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.produto.id, item.tamanho, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(item.produto.id, item.tamanho)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Seleção do atleta */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Compra para:</span>
                    </div>
                    {children.length === 1 ? (
                      <p className="font-semibold text-foreground">{children[0].nome}</p>
                    ) : (
                      <Select 
                        value={currentChildId || ''} 
                        onValueChange={setSelectedChildId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o atleta" />
                        </SelectTrigger>
                        <SelectContent>
                          {children.map(child => (
                            <SelectItem key={child.id} value={child.id}>
                              {child.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={createPedido.isPending || (!currentChildId && children.length > 1)}
                    >
                      {createPedido.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Finalizar Compra
                    </Button>
                    {!currentChildId && children.length > 1 && (
                      <p className="text-xs text-destructive mt-2 text-center">
                        Selecione o atleta para finalizar
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Pedidos */}
          <TabsContent value="pedidos" className="mt-4">
            {loadingPedidos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : pedidos.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Você ainda não fez nenhum pedido</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pedidos.map(pedido => (
                  <Card key={pedido.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Pedido #{pedido.numero_pedido || pedido.id.slice(0, 8)}
                        </CardTitle>
                        {getStatusBadge(pedido.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {pedido.crianca && (
                        <p className="text-xs text-muted-foreground">
                          Atleta: {pedido.crianca.nome}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {pedido.itens?.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span>
                              {item.quantidade}x {(item as any).produto?.nome || 'Produto'}
                              {item.tamanho && <span className="text-muted-foreground"> (Tam. {item.tamanho})</span>}
                            </span>
                            <span className="text-muted-foreground">
                              {formatCurrency(item.valor_total)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t font-medium">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(pedido.valor_total)}</span>
                        </div>
                      </div>

                      {pedido.status === 'pago' && (
                        <div className="mt-3 p-2 bg-green-500/10 rounded text-center">
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Aguardando entrega pela escola
                          </p>
                        </div>
                      )}

                      {pedido.status === 'entregue' && (
                        <div className="mt-3 p-2 bg-primary/10 rounded text-center">
                          <p className="text-sm text-primary font-medium">
                            ✓ Pedido entregue
                          </p>
                        </div>
                      )}

                      {(pedido.status === 'pendente' || pedido.status === 'aguardando_pagamento') && (
                        <Button
                          className="w-full mt-3"
                          onClick={() => setCheckoutPedidoId(pedido.id)}
                        >
                          Pagar com PIX
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de seleção de tamanho */}
      <Dialog open={sizeDialogOpen} onOpenChange={setSizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o tamanho</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedProduto.foto_url && (
                  <img
                    src={selectedProduto.foto_url}
                    alt={selectedProduto.nome}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{selectedProduto.nome}</p>
                  <p className="text-primary font-bold">{formatCurrency(selectedProduto.valor)}</p>
                </div>
              </div>
              
              <Select value={selectedTamanho} onValueChange={setSelectedTamanho}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedProduto.tamanhos || []).map(t => (
                    <SelectItem key={t.tamanho} value={t.tamanho}>
                      {t.tamanho} ({t.estoque} disponível{t.estoque !== 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSizeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSizeSelection} disabled={!selectedTamanho}>
              Adicionar ao Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de checkout PIX */}
      <PedidoPixCheckoutDialog
        open={!!checkoutPedidoId}
        onOpenChange={open => !open && setCheckoutPedidoId(null)}
        pedidoId={checkoutPedidoId || ''}
        onPaymentConfirmed={() => setCheckoutPedidoId(null)}
      />
    </MobileGuardianLayout>
  );
}