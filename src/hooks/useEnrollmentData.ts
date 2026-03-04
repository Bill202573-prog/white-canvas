import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface ProdutoEscola {
  id: string;
  escolinha_id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  tipo: 'uniforme' | 'material' | 'taxa' | 'outro';
  ativo: boolean;
  created_at: string;
}

export interface CobrancaEntrada {
  id: string;
  crianca_id: string;
  escolinha_id: string;
  responsavel_id: string;
  valor_matricula: number;
  valor_mensalidade: number;
  valor_uniforme: number;
  valor_total: number;
  descricao_itens: unknown; // JSON type from database
  status: 'pendente' | 'pago' | 'cancelado';
  asaas_payment_id: string | null;
  pix_payload: string | null;
  pix_qrcode_url: string | null;
  pix_expires_at: string | null;
  data_pagamento: string | null;
  created_at: string;
  crianca?: {
    id: string;
    nome: string;
  };
  responsavel?: {
    id: string;
    nome: string;
    email: string;
  };
}

// Hook to get school products
export function useSchoolProducts(escolinhaId?: string) {
  const { user } = useAuth();
  const effectiveEscolinhaId = escolinhaId || user?.escolinhaId;

  return useQuery({
    queryKey: ['school-products', effectiveEscolinhaId],
    queryFn: async () => {
      if (!effectiveEscolinhaId) return [];

      const { data, error } = await supabase
        .from('produtos_escola')
        .select('*')
        .eq('escolinha_id', effectiveEscolinhaId)
        .eq('ativo', true)
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as ProdutoEscola[];
    },
    enabled: !!effectiveEscolinhaId,
  });
}

// Hook to manage products
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<ProdutoEscola, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('produtos_escola')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-products', variables.escolinha_id] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProdutoEscola> & { id: string }) => {
      const { data, error } = await supabase
        .from('produtos_escola')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-products'] });
    },
  });
}

// Hook to get enrollment charges for a school
export function useSchoolEnrollmentCharges(escolinhaId?: string) {
  const { user } = useAuth();
  const effectiveEscolinhaId = escolinhaId || user?.escolinhaId;

  return useQuery({
    queryKey: ['school-enrollment-charges', effectiveEscolinhaId],
    queryFn: async () => {
      if (!effectiveEscolinhaId) return [];

      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select(`
          *,
          crianca:criancas(id, nome),
          responsavel:responsaveis(id, nome, email)
        `)
        .eq('escolinha_id', effectiveEscolinhaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CobrancaEntrada[];
    },
    enabled: !!effectiveEscolinhaId,
  });
}

// Hook to get active (non-cancelled) enrollment charge for a specific child
export function useChildEnrollmentCharge(criancaId?: string, escolinhaId?: string) {
  return useQuery({
    queryKey: ['child-enrollment-charge', criancaId, escolinhaId],
    queryFn: async () => {
      if (!criancaId || !escolinhaId) return null;

      // Get the most recent active charge (pendente or pago) - ignore cancelled ones
      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select('*')
        .eq('crianca_id', criancaId)
        .eq('escolinha_id', escolinhaId)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CobrancaEntrada | null;
    },
    enabled: !!criancaId && !!escolinhaId,
  });
}

// Hook to get pending enrollment charges for guardian
export function useGuardianPendingEnrollment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['guardian-pending-enrollment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get responsavel id
      const { data: responsavel, error: respError } = await supabase
        .from('responsaveis')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (respError || !responsavel) return null;

      // Get pending enrollment charges
      const { data, error } = await supabase
        .from('cobrancas_entrada')
        .select(`
          *,
          crianca:criancas(id, nome),
          escolinha:escolinhas(id, nome)
        `)
        .eq('responsavel_id', responsavel.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (CobrancaEntrada & { 
        crianca?: { id: string; nome: string }; 
        escolinha?: { id: string; nome: string };
      })[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// Hook to generate enrollment PIX
export function useGenerateEnrollmentPix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      criancaId: string;
      escolinhaId: string;
      valorMatricula: number;
      valorMensalidade: number;
      valorUniforme: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-enrollment-pix', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['child-enrollment-charge', variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ['school-enrollment-charges'] });
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado', variables.criancaId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-pending-enrollment'] });
    },
  });
}

// Hook to check enrollment payment status
export function useCheckEnrollmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cobrancaId: string) => {
      const { data, error } = await supabase.functions.invoke('check-enrollment-payment', {
        body: { cobrancaId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-enrollment-charge'] });
      queryClient.invalidateQueries({ queryKey: ['school-enrollment-charges'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-pending-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
    },
  });
}

// Hook to register student initially (without creating auth user)
export function useRegisterStudentInitial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      nome: string;
      dataNascimento: string;
      fotoUrl?: string;
      cpf?: string;
      responsavelNome: string;
      responsavelEmail: string;
      responsavelTelefone?: string;
      responsavelCpf?: string;
      parentesco?: string;
      escolinhaId: string;
      turmaId?: string;
      valorMensalidade?: number;
      diaVencimento?: number;
      valorMatricula?: number;
      valorUniforme?: number;
      categoria?: string;
      cep?: string;
      rua?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('register-student-initial', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
    },
  });
}

// Hook to send guardian credentials
export function useSendGuardianCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      responsavelId: string;
      escolinhaId: string;
      criancaId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-guardian-credentials', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
    },
  });
}

// Hook to cancel enrollment charge
export function useCancelEnrollmentCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cobrancaId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-enrollment-payment', {
        body: { cobrancaId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, cobrancaId) => {
      queryClient.invalidateQueries({ queryKey: ['child-enrollment-charge'] });
      queryClient.invalidateQueries({ queryKey: ['school-enrollment-charges'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-pending-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
    },
  });
}
