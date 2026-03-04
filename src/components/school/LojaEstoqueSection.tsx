import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Package,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolPedidos } from '@/hooks/useLojaData';
import { format, parseISO, subDays } from 'date-fns';

interface LojaEstoqueSectionProps {
  escolinhaId: string;
}

interface ProdutoEstoque {
  id: string;
  nome: string;
  valor: number;
  ativo: boolean;
  foto_url: string | null;
  estoque: number;
  tamanhos: { id: string; tamanho: string; estoque: number }[];
  vendidos30d: number;
  despachados: number;
}

export function LojaEstoqueSection({ escolinhaId }: LojaEstoqueSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Buscar produtos com tamanhos
  const { data: produtos = [], isLoading: produtosLoading } = useQuery({
    queryKey: ['school-stock-products', escolinhaId],
    queryFn: async () => {
      const { data: produtosData, error } = await (supabase as any)
        .from('produtos')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .order('nome');

      if (error) throw error;

      const produtosComTamanhos = await Promise.all(
        (produtosData || []).map(async (produto: any) => {
          const { data: tamanhos } = await (supabase as any)
            .from('produto_tamanhos')
            .select('*')
            .eq('produto_id', produto.id)
            .order('tamanho');
          return { ...produto, tamanhos: tamanhos || [] };
        })
      );

      return produtosComTamanhos;
    },
    enabled: !!escolinhaId,
  });

  // Buscar pedidos para calcular vendas
  const { data: pedidos = [], isLoading: pedidosLoading } = useSchoolPedidos(escolinhaId);

  // Calcular estatísticas de estoque
  const produtosComStats: ProdutoEstoque[] = useMemo(() => {
    const data30diasAtras = subDays(new Date(), 30);

    return produtos.map((produto: any) => {
      // Contar itens vendidos nos últimos 30 dias
      let vendidos30d = 0;
      let despachados = 0;

      pedidos
        .filter(p => p.status === 'pago' || p.status === 'entregue')
        .forEach(p => {
          const pedidoDate = parseISO(p.created_at);
          p.itens?.forEach(item => {
            if (item.produto_id === produto.id) {
              if (pedidoDate >= data30diasAtras) {
                vendidos30d += item.quantidade;
              }
              if (p.status === 'entregue') {
                despachados += item.quantidade;
              }
            }
          });
        });

      const estoqueTotal = produto.tamanhos?.reduce(
        (acc: number, t: any) => acc + (t.estoque || 0),
        0
      ) || produto.estoque || 0;

      return {
        id: produto.id,
        nome: produto.nome,
        valor: produto.valor,
        ativo: produto.ativo,
        foto_url: produto.foto_url,
        estoque: estoqueTotal,
        tamanhos: produto.tamanhos || [],
        vendidos30d,
        despachados,
      };
    });
  }, [produtos, pedidos]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalProdutos = produtosComStats.length;
    const estoqueTotal = produtosComStats.reduce((acc, p) => acc + p.estoque, 0);
    const produtosSemEstoque = produtosComStats.filter(p => p.estoque === 0).length;
    const produtosEstoqueBaixo = produtosComStats.filter(p => p.estoque > 0 && p.estoque <= 5).length;
    const vendidos30d = produtosComStats.reduce((acc, p) => acc + p.vendidos30d, 0);

    return { totalProdutos, estoqueTotal, produtosSemEstoque, produtosEstoqueBaixo, vendidos30d };
  }, [produtosComStats]);

  // Filtrar produtos
  const filteredProdutos = produtosComStats.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStockStatus = (estoque: number) => {
    if (estoque === 0) {
      return { label: 'Sem Estoque', variant: 'destructive' as const, icon: <AlertTriangle className="w-3 h-3" /> };
    }
    if (estoque <= 5) {
      return { label: 'Estoque Baixo', variant: 'secondary' as const, icon: <TrendingDown className="w-3 h-3" /> };
    }
    return { label: 'Em Estoque', variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" /> };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isLoading = produtosLoading || pedidosLoading;

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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Produtos</p>
                <p className="text-2xl font-bold">{stats.totalProdutos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Total</p>
                <p className="text-2xl font-bold">{stats.estoqueTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-500">{stats.produtosSemEstoque}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <TrendingDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.produtosEstoqueBaixo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendidos (30d)</p>
                <p className="text-2xl font-bold text-green-600">{stats.vendidos30d}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Estoque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Controle de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredProdutos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProdutos.map((produto) => {
                const stockStatus = getStockStatus(produto.estoque);
                const isExpanded = expandedProducts.has(produto.id);
                const hasTamanhos = produto.tamanhos.length > 0;

                return (
                  <Collapsible
                    key={produto.id}
                    open={isExpanded}
                    onOpenChange={() => hasTamanhos && toggleExpand(produto.id)}
                  >
                    <div className={`border rounded-lg ${!produto.ativo ? 'opacity-60' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div
                          className={`flex items-center gap-4 p-4 ${hasTamanhos ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                        >
                          {/* Foto */}
                          {produto.foto_url ? (
                            <img
                              src={produto.foto_url}
                              alt={produto.nome}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{produto.nome}</p>
                              {!produto.ativo && (
                                <Badge variant="secondary" className="text-xs">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(produto.valor)}
                            </p>
                          </div>

                          {/* Estoque */}
                          <div className="text-center">
                            <p className="text-2xl font-bold">{produto.estoque}</p>
                            <p className="text-xs text-muted-foreground">em estoque</p>
                          </div>

                          {/* Vendidos 30d */}
                          <div className="text-center hidden sm:block">
                            <p className="text-lg font-semibold text-green-600">{produto.vendidos30d}</p>
                            <p className="text-xs text-muted-foreground">vendidos (30d)</p>
                          </div>

                          {/* Despachados */}
                          <div className="text-center hidden sm:block">
                            <p className="text-lg font-semibold text-blue-600">{produto.despachados}</p>
                            <p className="text-xs text-muted-foreground">despachados</p>
                          </div>

                          {/* Status */}
                          <Badge variant={stockStatus.variant} className="flex items-center gap-1">
                            {stockStatus.icon}
                            {stockStatus.label}
                          </Badge>

                          {/* Expand icon */}
                          {hasTamanhos && (
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      {hasTamanhos && (
                        <CollapsibleContent>
                          <div className="border-t px-4 py-3 bg-muted/30">
                            <p className="text-sm font-medium mb-2">Estoque por Tamanho</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                              {produto.tamanhos.map((tam) => {
                                const tamStatus = getStockStatus(tam.estoque);
                                return (
                                  <div
                                    key={tam.id}
                                    className="flex items-center justify-between bg-background p-2 rounded border"
                                  >
                                    <Badge variant="outline">{tam.tamanho}</Badge>
                                    <span className={`font-bold ${
                                      tam.estoque === 0 ? 'text-red-500' : 
                                      tam.estoque <= 5 ? 'text-yellow-600' : ''
                                    }`}>
                                      {tam.estoque}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
