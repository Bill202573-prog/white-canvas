import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoTamanho {
  tamanho: string;
  estoque: number;
}

export interface Produto {
  id: string;
  escolinha_id: string;
  escolinha_nome?: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  valor: number;
  estoque: number | null;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  tamanhos?: ProdutoTamanho[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tamanho?: string | null;
  produto?: { nome: string; foto_url: string | null };
}

export interface Pedido {
  id: string;
  escolinha_id: string;
  responsavel_id: string;
  crianca_id: string | null;
  numero_pedido: number | null;
  valor_total: number;
  status: string;
  asaas_payment_id: string | null;
  pix_payload: string | null;
  pix_qrcode_url: string | null;
  pix_expires_at: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  itens?: PedidoItem[];
  crianca?: { nome: string } | null;
  responsavel?: { nome: string } | null;
}

// Hook para buscar produtos disponíveis para o responsável
export function useGuardianProducts() {
  return useQuery({
    queryKey: ['guardian-products'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Usar RPC com cast para evitar erro de tipagem
      const { data, error } = await (supabase.rpc as any)('get_guardian_products', { 
        p_user_id: userData.user.id 
      });

      if (error) {
        console.log('RPC não disponível, retornando vazio:', error);
        return [];
      }
      
      return (data || []) as Produto[];
    },
  });
}

// Hook para buscar pedidos do responsável
export function useGuardianPedidos() {
  return useQuery({
    queryKey: ['guardian-pedidos'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await (supabase.rpc as any)('get_guardian_pedidos', { 
        p_user_id: userData.user.id 
      });

      if (error) {
        console.log('RPC não disponível:', error);
        return [];
      }
      
      // O RPC retorna um array jsonb
      return (Array.isArray(data) ? data : []) as Pedido[];
    },
  });
}

// Hook para criar pedido
export function useCreatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      escolinha_id: string;
      crianca_id: string;
      itens: Array<{ produto_id: string; quantidade: number; valor_unitario: number; tamanho?: string }>;
      observacoes?: string;
    }) => {
      if (!data.crianca_id) {
        throw new Error('crianca_id é obrigatório');
      }

      const { data: result, error } = await (supabase.rpc as any)('create_pedido', {
        p_escolinha_id: data.escolinha_id,
        p_crianca_id: data.crianca_id,
        p_itens: data.itens,
        p_observacoes: data.observacoes || null,
      });

      if (error) throw error;
      return result as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-products'] });
    },
  });
}

// Hook para gerar PIX do pedido
export function useGeneratePedidoPix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-pedido-pix', {
        body: { pedido_id: pedidoId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-pedidos'] });
    },
  });
}

// Hook para verificar pagamento do pedido
export function useCheckPedidoPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data, error } = await supabase.functions.invoke('check-pedido-payment', {
        body: { pedido_id: pedidoId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
    },
  });
}

// Hook para cancelar pedido
export function useCancelPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pedidoId: string) => {
      const { error } = await (supabase.rpc as any)('cancel_pedido', { p_pedido_id: pedidoId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-pedidos'] });
    },
  });
}

// ============ HOOKS PARA ESCOLA ============

// Hook para buscar produtos da escola
export function useSchoolProducts(escolinhaId?: string) {
  return useQuery({
    queryKey: ['school-products', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await (supabase.rpc as any)('get_school_products', { 
        p_escolinha_id: escolinhaId 
      });

      if (error) {
        console.log('RPC não disponível:', error);
        return [];
      }
      
      return (data || []) as Produto[];
    },
    enabled: !!escolinhaId,
  });
}

// Hook para criar/atualizar produto
export function useManageProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id?: string;
      escolinha_id: string;
      nome: string;
      descricao?: string;
      tipo: string;
      valor: number;
      estoque?: number;
      foto_url?: string;
      ativo?: boolean;
    }) => {
      const { error } = await (supabase.rpc as any)('upsert_produto', {
        p_id: data.id || null,
        p_escolinha_id: data.escolinha_id,
        p_nome: data.nome,
        p_descricao: data.descricao || null,
        p_tipo: data.tipo,
        p_valor: data.valor,
        p_estoque: data.estoque ?? null,
        p_foto_url: data.foto_url || null,
        p_ativo: data.ativo ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-products'] });
    },
  });
}

// Hook para buscar pedidos da escola
export function useSchoolPedidos(escolinhaId?: string) {
  return useQuery({
    queryKey: ['school-pedidos', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await (supabase.rpc as any)('get_school_pedidos', { 
        p_escolinha_id: escolinhaId 
      });

      if (error) {
        console.log('RPC não disponível:', error);
        return [];
      }
      
      return (Array.isArray(data) ? data : []) as Pedido[];
    },
    enabled: !!escolinhaId,
  });
}

// Hook para atualizar status do pedido
export function useUpdatePedidoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pedidoId, status }: { pedidoId: string; status: string }) => {
      const { error } = await (supabase.rpc as any)('update_pedido_status', {
        p_pedido_id: pedidoId,
        p_status: status,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-pedidos'] });
    },
  });
}
