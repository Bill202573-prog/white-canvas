import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CampeonatoConvocacao {
  id: string;
  campeonato_id: string;
  crianca_id: string;
  valor: number | null;
  isento: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  asaas_payment_id?: string | null;
  pix_br_code?: string | null;
  pix_qr_code_url?: string | null;
  pix_expires_at?: string | null;
  data_pagamento?: string | null;
  notificado_em?: string | null;
}

export interface ConvocacaoWithCrianca extends CampeonatoConvocacao {
  crianca: {
    id: string;
    nome: string;
    data_nascimento: string;
    foto_url: string | null;
  };
  responsavel?: {
    nome: string;
    telefone: string | null;
  } | null;
}

export interface CreateConvocacaoInput {
  campeonato_id: string;
  crianca_id: string;
  valor?: number | null;
  isento?: boolean;
}

export interface UpdateConvocacaoInput {
  id: string;
  valor?: number | null;
  isento?: boolean;
  status?: string;
}

// Fetch eligible athletes by category
export function useEligibleAthletes(categoria: string | null, escolinhaId: string | null, turmaIds?: string[]) {
  const normalizedCategoria = categoria?.trim() || null;

  return useQuery({
    queryKey: ['eligible-athletes', normalizedCategoria, escolinhaId, turmaIds],
    queryFn: async () => {
      if (!escolinhaId) return [];

      // If turmaIds are provided, fetch athletes from those turmas
      if (turmaIds && turmaIds.length > 0) {
        const { data: criancaTurma, error: ctError } = await supabase
          .from('crianca_turma')
          .select('crianca_id')
          .in('turma_id', turmaIds)
          .eq('ativo', true);

        if (ctError) throw ctError;

        const criancaIds = [...new Set((criancaTurma || []).map((ct) => ct.crianca_id))];
        if (criancaIds.length === 0) return [];

        const { data: criancas, error: criancasError } = await supabase
          .from('criancas')
          .select('id, nome, data_nascimento, foto_url')
          .in('id', criancaIds)
          .eq('ativo', true)
          .order('nome');

        if (criancasError) throw criancasError;

        const now = new Date();
        return (criancas || []).map((crianca) => {
          const birthDate = new Date(crianca.data_nascimento);
          const age = differenceInYears(now, birthDate);
          return {
            ...crianca,
            idade: age,
            categoria: `Sub-${age}`,
          };
        });
      }

      // Get all active children in this school
      const { data: criancaEscolinha, error: ceError } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id')
        .eq('escolinha_id', escolinhaId)
        .eq('ativo', true);

      if (ceError) throw ceError;

      const criancaIds = (criancaEscolinha || []).map((ce) => ce.crianca_id);
      if (criancaIds.length === 0) return [];

      // Get children data
      const { data: criancas, error: criancasError } = await supabase
        .from('criancas')
        .select('id, nome, data_nascimento, foto_url')
        .in('id', criancaIds)
        .eq('ativo', true)
        .order('nome');

      if (criancasError) throw criancasError;

      // Calculate age category for each child
      const now = new Date();

      const atletasComCategoria = (criancas || []).map((crianca) => {
        const birthDate = new Date(crianca.data_nascimento);
        const age = differenceInYears(now, birthDate);
        let categoriaAtleta = '';

        if (age <= 5) categoriaAtleta = 'Sub-5';
        else if (age <= 6) categoriaAtleta = 'Sub-6';
        else if (age <= 7) categoriaAtleta = 'Sub-7';
        else if (age <= 8) categoriaAtleta = 'Sub-8';
        else if (age <= 9) categoriaAtleta = 'Sub-9';
        else if (age <= 10) categoriaAtleta = 'Sub-10';
        else if (age <= 11) categoriaAtleta = 'Sub-11';
        else if (age <= 12) categoriaAtleta = 'Sub-12';
        else if (age <= 13) categoriaAtleta = 'Sub-13';
        else if (age <= 14) categoriaAtleta = 'Sub-14';
        else if (age <= 15) categoriaAtleta = 'Sub-15';
        else if (age <= 17) categoriaAtleta = 'Sub-17';
        else categoriaAtleta = 'Livre';

        return {
          ...crianca,
          idade: age,
          categoria: categoriaAtleta,
        };
      });

      // Filter by category if provided
      if (normalizedCategoria && normalizedCategoria !== 'Livre') {
        return atletasComCategoria.filter((a) => a.categoria === normalizedCategoria);
      }

      return atletasComCategoria;
    },
    enabled: !!escolinhaId,
  });
}

// Fetch convocacoes for a campeonato
export function useCampeonatoConvocacoes(campeonatoId: string | null) {
  return useQuery({
    queryKey: ['campeonato-convocacoes', campeonatoId],
    queryFn: async () => {
      if (!campeonatoId) return [];

      // Get convocacoes with crianca data
      const { data: convocacoes, error } = await supabase
        .from('campeonato_convocacoes')
        .select('*')
        .eq('campeonato_id', campeonatoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get crianca data
      const criancaIds = convocacoes.map(c => c.crianca_id);
      if (criancaIds.length === 0) return [];

      const { data: criancas, error: criancasError } = await supabase
        .from('criancas')
        .select('id, nome, data_nascimento, foto_url')
        .in('id', criancaIds);

      if (criancasError) throw criancasError;

      // Get responsavel data
      const { data: criancaResponsaveis, error: crError } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id, responsavel_id')
        .in('crianca_id', criancaIds);

      if (crError) throw crError;

      const responsavelIds = criancaResponsaveis.map(cr => cr.responsavel_id);
      const { data: responsaveis, error: respError } = await supabase
        .from('responsaveis')
        .select('id, nome, telefone')
        .in('id', responsavelIds);

      if (respError) throw respError;

      // Create lookup maps
      const criancaMap = new Map(criancas.map(c => [c.id, c]));
      const respMap = new Map(responsaveis.map(r => [r.id, r]));
      const criancaRespMap = new Map(criancaResponsaveis.map(cr => [cr.crianca_id, cr.responsavel_id]));

      return convocacoes.map(conv => ({
        ...conv,
        crianca: criancaMap.get(conv.crianca_id),
        responsavel: respMap.get(criancaRespMap.get(conv.crianca_id) || ''),
      })) as ConvocacaoWithCrianca[];
    },
    enabled: !!campeonatoId,
  });
}

// Upsert convocacoes (create or update multiple) and generate PIX for new non-exempt
export function useUpsertConvocacoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campeonatoId, 
      convocacoes,
      sendNotifications = false,
    }: { 
      campeonatoId: string; 
      convocacoes: CreateConvocacaoInput[];
      sendNotifications?: boolean;
    }) => {
      // First, get existing convocacoes
      const { data: existing, error: fetchError } = await supabase
        .from('campeonato_convocacoes')
        .select('id, crianca_id, notificado_em, status')
        .eq('campeonato_id', campeonatoId);

      if (fetchError) throw fetchError;

      const existingMap = new Map(existing.map(e => [e.crianca_id, e]));
      const newCriancaIds = new Set(convocacoes.map(c => c.crianca_id));

      // Delete removed convocacoes (only if not yet notified/paid)
      const toDelete = existing.filter(e => 
        !newCriancaIds.has(e.crianca_id) && 
        !e.notificado_em && 
        e.status !== 'pago'
      );
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('campeonato_convocacoes')
          .delete()
          .in('id', toDelete.map(d => d.id));

        if (deleteError) throw deleteError;
      }

      // Insert new convocacoes
      const toInsert = convocacoes.filter(c => !existingMap.has(c.crianca_id));
      let insertedIds: string[] = [];
      
      if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('campeonato_convocacoes')
          .insert(toInsert.map(c => ({
            campeonato_id: campeonatoId,
            crianca_id: c.crianca_id,
            valor: c.valor ?? null,
            isento: c.isento ?? false,
            // Set notificado_em when sending notifications (same as amistoso flow)
            notificado_em: sendNotifications ? new Date().toISOString() : null,
          })))
          .select('id, crianca_id, isento, valor');

        if (insertError) throw insertError;
        // Only generate PIX for non-exempt with value > 0
        insertedIds = (inserted || []).filter(i => !i.isento && i.valor && i.valor > 0).map(i => i.id);
      }

      // Update existing convocacoes
      const toUpdate = convocacoes.filter(c => existingMap.has(c.crianca_id));
      const newlyNotifiedIds: string[] = [];
      
      for (const conv of toUpdate) {
        const existingItem = existingMap.get(conv.crianca_id);
        if (existingItem && existingItem.status !== 'pago') {
          const updateData: any = {
            valor: conv.valor ?? null,
            isento: conv.isento ?? false,
          };
          
          // Only set notificado_em if sending notifications and not already sent
          if (sendNotifications && !existingItem.notificado_em) {
            updateData.notificado_em = new Date().toISOString();
          }
          
          const { error: updateError } = await supabase
            .from('campeonato_convocacoes')
            .update(updateData)
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
          
          // Track newly notified IDs that need PIX generation
          if (sendNotifications && !existingItem.notificado_em && !conv.isento && conv.valor && conv.valor > 0) {
            newlyNotifiedIds.push(existingItem.id);
          }
        }
      }
      
      // Combine all IDs needing PIX generation
      const allIdsNeedingPix = [...insertedIds, ...newlyNotifiedIds];

      // If sendNotifications is true, generate PIX for all that need it (new + newly notified)
      if (sendNotifications && allIdsNeedingPix.length > 0) {
        console.log('Generating PIX for campeonato convocacoes:', allIdsNeedingPix);
        
        // Fire and forget - don't await, similar to amistoso pattern
        allIdsNeedingPix.forEach(convocacaoId => {
          supabase.functions.invoke('generate-campeonato-pix', {
            body: { convocacao_id: convocacaoId },
          }).catch(err => {
            console.error('Error generating PIX for convocacao:', convocacaoId, err);
          });
        });
      }

      return { inserted: insertedIds.length, updated: toUpdate.length, notified: allIdsNeedingPix.length };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes', variables.campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
    },
  });
}

// Update single convocacao
export function useUpdateConvocacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateConvocacaoInput) => {
      const { data, error } = await supabase
        .from('campeonato_convocacoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
    },
  });
}

// Delete convocacao
export function useDeleteConvocacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campeonato_convocacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
    },
  });
}

// ============ GUARDIAN HOOKS ============

export interface GuardianCampeonatoConvocacao {
  id: string;
  campeonato_id: string;
  crianca_id: string;
  valor: number | null;
  isento: boolean;
  status: string;
  asaas_payment_id: string | null;
  pix_br_code: string | null;
  pix_qr_code_url: string | null;
  pix_expires_at: string | null;
  data_pagamento: string | null;
  notificado_em: string | null;
  created_at: string;
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  campeonato: {
    id: string;
    nome: string;
    ano: number;
    categoria: string | null;
    valor: number | null;
    nome_time: string | null;
    escolinha: {
      id: string;
      nome: string;
      logo_url: string | null;
    };
  };
}

// Fetch campeonato convocations for the logged-in guardian
export function useGuardianCampeonatoConvocacoes() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['guardian-campeonato-convocacoes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      // Get responsavel_id
      const { data: responsavelId, error: respError } = await supabase.rpc('get_responsavel_id', {
        _user_id: session.user.id,
      });

      if (respError || !responsavelId) {
        console.log('No responsavel found for user');
        return [];
      }

      // Get children linked to this responsavel
      const { data: criancaResp, error: crError } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id')
        .eq('responsavel_id', responsavelId);

      if (crError) throw crError;

      const criancaIds = (criancaResp || []).map(cr => cr.crianca_id);
      if (criancaIds.length === 0) return [];

      // Get convocacoes for these children (only notified ones)
      const { data: convocacoes, error: convError } = await supabase
        .from('campeonato_convocacoes')
        .select('*')
        .in('crianca_id', criancaIds)
        .not('notificado_em', 'is', null)
        .order('created_at', { ascending: false });

      if (convError) throw convError;
      if (!convocacoes || convocacoes.length === 0) return [];

      // Get campeonato data
      const campeonatoIds = [...new Set(convocacoes.map(c => c.campeonato_id))];
      const { data: campeonatos, error: campError } = await supabase
        .from('campeonatos')
        .select(`
          id, nome, ano, categoria, valor, nome_time,
          escolinha:escolinhas!campeonatos_escolinha_id_fkey(id, nome, logo_url)
        `)
        .in('id', campeonatoIds);

      if (campError) throw campError;

      // Get criancas data
      const { data: criancas, error: criancasError } = await supabase
        .from('criancas')
        .select('id, nome, foto_url')
        .in('id', criancaIds);

      if (criancasError) throw criancasError;

      const criancaMap = new Map(criancas?.map(c => [c.id, c]) || []);
      // Normalize escolinha from array to object (Supabase join returns array)
      const campeonatoMap = new Map(campeonatos?.map(c => {
        const escolinha = Array.isArray(c.escolinha) ? c.escolinha[0] : c.escolinha;
        return [c.id, { ...c, escolinha }];
      }) || []);

      return convocacoes.map(conv => ({
        ...conv,
        crianca: criancaMap.get(conv.crianca_id),
        campeonato: campeonatoMap.get(conv.campeonato_id),
      })) as GuardianCampeonatoConvocacao[];
    },
    enabled: !!session?.user?.id,
  });
}

// Get pending campeonato convocations (not paid, not declined)
export function useGuardianPendingCampeonatoConvocacoes() {
  const { data, ...rest } = useGuardianCampeonatoConvocacoes();

  const pending = data?.filter(c => 
    c.status !== 'pago' && 
    c.status !== 'recusado' && 
    c.status !== 'confirmado'
  ) || [];

  return { data: pending, ...rest };
}

// Generate PIX for a campeonato convocation
export function useGenerateCampeonatoPix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-campeonato-pix', {
        body: { convocacao_id: convocacaoId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
    },
  });
}

// Check payment status for a campeonato convocation
export function useCheckCampeonatoPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      const { data, error } = await supabase.functions.invoke('check-campeonato-payment', {
        body: { convocacao_id: convocacaoId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-next-eventos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
    },
  });
}

// Confirm exempt participation in campeonato
export function useConfirmCampeonatoExemptParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convocacaoId: string) => {
      const { error } = await supabase
        .from('campeonato_convocacoes')
        .update({ status: 'confirmado' })
        .eq('id', convocacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['campeonato-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-next-eventos'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
    },
  });
}
