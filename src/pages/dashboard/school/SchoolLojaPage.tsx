import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Package, Loader2, Upload, Trash2, X, ShoppingBag, BarChart3, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { PedidosManagementSection } from '@/components/school/PedidosManagementSection';
import { LojaRelatorioSection } from '@/components/school/LojaRelatorioSection';
import { LojaEstoqueSection } from '@/components/school/LojaEstoqueSection';

interface Tamanho {
  id?: string;
  tamanho: string;
  estoque: number;
}

interface ProdutoForm {
  id?: string;
  nome: string;
  descricao: string;
  valor: number;
  ativo: boolean;
  foto_url?: string | null;
  tamanhos: Tamanho[];
}

const emptyForm: ProdutoForm = {
  nome: '',
  descricao: '',
  valor: 0,
  ativo: true,
  foto_url: null,
  tamanhos: [],
};

// Tamanhos comuns para uniformes infantis (por idade)
const TAMANHOS_SUGERIDOS = ['4', '6', '8', '10', '12', '14', '16', 'P', 'M', 'G', 'GG'];

export default function SchoolLojaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  // Buscar escolinha_id da escola logada
  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-for-loja', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });
  
  const escolinhaId = escolinha?.id;
  
  // Buscar produtos com tamanhos usando RPC para evitar problemas de tipo
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['school-products-with-sizes', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];
      
      // Buscar produtos
      const { data: produtos, error } = await (supabase as any)
        .from('produtos')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .order('nome');
      
      if (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
      }
      
      // Buscar tamanhos de cada produto
      const produtosComTamanhos = await Promise.all(
        (produtos || []).map(async (produto: any) => {
          const { data: tamanhos } = await (supabase as any)
            .from('produto_tamanhos')
            .select('*')
            .eq('produto_id', produto.id)
            .order('tamanho');
          return { ...produto, produto_tamanhos: tamanhos || [] };
        })
      );
      
      return produtosComTamanhos;
    },
    enabled: !!escolinhaId,
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProdutoForm>(emptyForm);

  const handleOpenNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (produto: any) => {
    setForm({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao || '',
      valor: produto.valor,
      ativo: produto.ativo,
      foto_url: produto.foto_url,
      tamanhos: produto.produto_tamanhos?.map((t: any) => ({
        id: t.id,
        tamanho: t.tamanho,
        estoque: t.estoque,
      })) || [],
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !escolinhaId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${escolinhaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, foto_url: publicUrl }));
      toast.success('Foto enviada!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addTamanho = (tamanho: string) => {
    if (form.tamanhos.some(t => t.tamanho === tamanho)) {
      toast.error('Tamanho já adicionado');
      return;
    }
    setForm(prev => ({
      ...prev,
      tamanhos: [...prev.tamanhos, { tamanho, estoque: 0 }],
    }));
  };

  const updateTamanhoEstoque = (index: number, estoque: number) => {
    setForm(prev => ({
      ...prev,
      tamanhos: prev.tamanhos.map((t, i) => 
        i === index ? { ...t, estoque: Math.max(0, estoque) } : t
      ),
    }));
  };

  const removeTamanho = (index: number) => {
    setForm(prev => ({
      ...prev,
      tamanhos: prev.tamanhos.filter((_, i) => i !== index),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ProdutoForm) => {
      if (!escolinhaId) throw new Error('Escolinha não identificada');
      
      let produtoId = formData.id;
      
      if (produtoId) {
        // Update existing product
        const { error } = await (supabase as any)
          .from('produtos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            valor: formData.valor,
            ativo: formData.ativo,
            foto_url: formData.foto_url,
            estoque: formData.tamanhos.reduce((acc: number, t: Tamanho) => acc + t.estoque, 0),
          })
          .eq('id', produtoId);
        if (error) throw error;
      } else {
        // Create new product
        const { data, error } = await (supabase as any)
          .from('produtos')
          .insert({
            escolinha_id: escolinhaId,
            nome: formData.nome,
            descricao: formData.descricao || null,
            tipo: 'uniforme',
            valor: formData.valor,
            ativo: formData.ativo,
            foto_url: formData.foto_url,
            estoque: formData.tamanhos.reduce((acc: number, t: Tamanho) => acc + t.estoque, 0),
          })
          .select()
          .single();
        if (error) throw error;
        produtoId = data.id;
      }
      
      // Delete existing sizes and recreate
      await (supabase as any)
        .from('produto_tamanhos')
        .delete()
        .eq('produto_id', produtoId);
      
      // Insert new sizes
      if (formData.tamanhos.length > 0) {
        const { error: sizesError } = await (supabase as any)
          .from('produto_tamanhos')
          .insert(
            formData.tamanhos.map(t => ({
              produto_id: produtoId,
              tamanho: t.tamanho,
              estoque: t.estoque,
            }))
          );
        if (sizesError) throw sizesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-products-with-sizes'] });
      toast.success(form.id ? 'Produto atualizado!' : 'Produto criado!');
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar produto');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      toast.error('O nome do produto é obrigatório');
      return;
    }
    if (form.valor <= 0) {
      toast.error('O valor deve ser maior que zero');
      return;
    }

    saveMutation.mutate(form);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getTotalEstoque = (tamanhos: any[]) => 
    tamanhos?.reduce((acc: number, t: any) => acc + (t.estoque || 0), 0) || 0;

  if (isLoading || !escolinhaId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loja</h1>
          <p className="text-muted-foreground">Gerencie produtos e pedidos da sua escola</p>
        </div>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Boxes className="w-4 h-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Foto do produto */}
              <div className="space-y-2">
                <Label>Foto do Produto</Label>
                <div className="flex items-center gap-4">
                  {form.foto_url ? (
                    <div className="relative">
                      <img
                        src={form.foto_url}
                        alt="Produto"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, foto_url: null }))}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Enviar</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Uniforme completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Detalhes do produto..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="ativo"
                      checked={form.ativo}
                      onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                    />
                    <Label htmlFor="ativo">Ativo</Label>
                  </div>
                </div>
              </div>
              
              {/* Tamanhos */}
              <div className="space-y-3">
                <Label>Tamanhos e Estoque</Label>
                <div className="flex flex-wrap gap-2">
                  {TAMANHOS_SUGERIDOS.map(tamanho => (
                    <Button
                      key={tamanho}
                      type="button"
                      variant={form.tamanhos.some(t => t.tamanho === tamanho) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => addTamanho(tamanho)}
                      disabled={form.tamanhos.some(t => t.tamanho === tamanho)}
                    >
                      {tamanho}
                    </Button>
                  ))}
                </div>
                
                {form.tamanhos.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {form.tamanhos.map((tamanho, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                        <Badge variant="secondary" className="min-w-[3rem] justify-center">
                          {tamanho.tamanho}
                        </Badge>
                        <Input
                          type="number"
                          min="0"
                          value={tamanho.estoque}
                          onChange={(e) => updateTamanhoEstoque(index, parseInt(e.target.value, 10) || 0)}
                          className="w-20 h-8"
                          placeholder="Qtd"
                        />
                        <span className="text-sm text-muted-foreground">un.</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeTamanho(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      Estoque total: {form.tamanhos.reduce((acc, t) => acc + t.estoque, 0)} unidades
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Nenhum produto cadastrado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Clique em "Novo Produto" para adicionar itens à loja.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((produto: any) => (
                <Card key={produto.id} className={!produto.ativo ? 'opacity-60' : ''}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex gap-3">
                      {produto.foto_url ? (
                        <img
                          src={produto.foto_url}
                          alt={produto.nome}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base font-semibold line-clamp-1">
                          {produto.nome}
                        </CardTitle>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(produto.valor)}
                        </span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(produto)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {produto.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{produto.descricao}</p>
                    )}
                    
                    {/* Mostrar tamanhos disponíveis */}
                    {produto.produto_tamanhos && produto.produto_tamanhos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {produto.produto_tamanhos.map((t: any) => (
                          <Badge
                            key={t.id}
                            variant={t.estoque > 0 ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {t.tamanho}: {t.estoque}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={getTotalEstoque(produto.produto_tamanhos) > 0 ? 'default' : 'destructive'}>
                        Estoque: {getTotalEstoque(produto.produto_tamanhos)}
                      </Badge>
                      {!produto.ativo && (
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6">
          <PedidosManagementSection escolinhaId={escolinhaId} />
        </TabsContent>

        <TabsContent value="estoque" className="mt-6">
          <LojaEstoqueSection escolinhaId={escolinhaId} />
        </TabsContent>

        <TabsContent value="relatorio" className="mt-6">
          <LojaRelatorioSection escolinhaId={escolinhaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
