import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface AmistosoConvocacao {
  id: string;
  evento_id: string;
  crianca_id: string;
  valor: number | null;
  isento: boolean;
  status: string;
  data_pagamento: string | null;
  notificado_em: string | null;
  presente: boolean | null;
  motivo_ausencia: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConvocacaoWithCrianca extends AmistosoConvocacao {
  crianca: {
    id: string;
    nome: string;
    data_nascimento: string;
    foto_url: string | null;
  };
}

export interface CreateAmistosoConvocacaoInput {
  evento_id: string;
  crianca_id: string;
  valor?: number | null;
  isento?: boolean;
}

// Fetch convocacoes for an amistoso
export function useAmistosoConvocacoes(eventoId: string | null) {
  return useQuery({
    queryKey: ['amistoso-convocacoes', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      const { data: convocacoes, error } = await supabase
        .from('amistoso_convocacoes')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const criancaIds = convocacoes.map(c => c.crianca_id);
      if (criancaIds.length === 0) return [];

      const { data: criancas, error: criancasError } = await supabase
        .from('criancas')
        .select('id, nome, data_nascimento, foto_url')
        .in('id', criancaIds);

      if (criancasError) throw criancasError;

      const criancaMap = new Map(criancas.map(c => [c.id, c]));

      return convocacoes.map(conv => ({
        ...conv,
        crianca: criancaMap.get(conv.crianca_id),
      })) as ConvocacaoWithCrianca[];
    },
    enabled: !!eventoId,
  });
}

// Count convocacoes for an amistoso
export function useAmistosoConvocacoesCount(eventoId: string | null) {
  return useQuery({
    queryKey: ['amistoso-convocacoes-count', eventoId],
    queryFn: async () => {
      if (!eventoId) return 0;

      const { count, error } = await supabase
        .from('amistoso_convocacoes')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', eventoId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventoId,
  });
}

// Upsert convocacoes (create or update multiple)
export function useUpsertAmistosoConvocacoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventoId, 
      convocacoes,
      enviarNotificacoes = false,
      valorPadrao = null,
    }: { 
      eventoId: string; 
      convocacoes: CreateAmistosoConvocacaoInput[];
      enviarNotificacoes?: boolean;
      valorPadrao?: number | null;
    }) => {
      // First, get existing convocacoes
      const { data: existing, error: fetchError } = await supabase
        .from('amistoso_convocacoes')
        .select('id, crianca_id, notificado_em, status')
        .eq('evento_id', eventoId);

      if (fetchError) throw fetchError;

      const existingMap = new Map(existing.map(e => [e.crianca_id, e]));
      const newCriancaIds = new Set(convocacoes.map(c => c.crianca_id));

      // Delete removed convocacoes (only if not already notified and not paid)
      const toDelete = existing.filter(e => 
        !newCriancaIds.has(e.crianca_id) && 
        !e.notificado_em && 
        e.status !== 'pago'
      );
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('amistoso_convocacoes')
          .delete()
          .in('id', toDelete.map(d => d.id));

        if (deleteError) throw deleteError;
      }

      // Insert new convocacoes
      const toInsert = convocacoes.filter(c => !existingMap.has(c.crianca_id));
      const newInsertedIds: string[] = [];
      
      if (toInsert.length > 0) {
        const insertData = toInsert.map(c => ({
          evento_id: eventoId,
          crianca_id: c.crianca_id,
          valor: c.valor ?? valorPadrao ?? null,
          isento: c.isento ?? false,
          notificado_em: enviarNotificacoes ? new Date().toISOString() : null,
        }));
        
        const { data: insertedRecords, error: insertError } = await supabase
          .from('amistoso_convocacoes')
          .insert(insertData)
          .select('id, crianca_id, valor, isento');

        if (insertError) throw insertError;
        
        // Track newly inserted IDs that need billing generation
        if (insertedRecords && enviarNotificacoes) {
          insertedRecords
            .filter(r => !r.isento && r.valor && r.valor > 0)
            .forEach(r => newInsertedIds.push(r.id));
        }
      }

      // Update existing convocacoes
      const toUpdate = convocacoes.filter(c => existingMap.has(c.crianca_id));
      const newlyNotifiedIds: string[] = [];
      
      for (const conv of toUpdate) {
        const existingItem = existingMap.get(conv.crianca_id);
        if (existingItem && existingItem.status !== 'pago') {
          const updateData: any = {
            valor: conv.valor ?? valorPadrao ?? null,
            isento: conv.isento ?? false,
          };
          
          // Only set notificado_em if sending notifications and not already sent
          if (enviarNotificacoes && !existingItem.notificado_em) {
            updateData.notificado_em = new Date().toISOString();
          }
          
          const { error: updateError } = await supabase
            .from('amistoso_convocacoes')
            .update(updateData)
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
          
          // Track newly notified IDs that need billing generation
          if (enviarNotificacoes && !existingItem.notificado_em && !conv.isento && (conv.valor || valorPadrao) && (conv.valor || valorPadrao)! > 0) {
            newlyNotifiedIds.push(existingItem.id);
          }
        }
      }

      // Count new notifications sent
      const newNotifications = enviarNotificacoes 
        ? toInsert.length + toUpdate.filter(c => !existingMap.get(c.crianca_id)?.notificado_em).length
        : 0;

      // Generate PIX for new convocations that need payment (in background, don't wait)
      const idsNeedingBilling = [...newInsertedIds, ...newlyNotifiedIds];
      if (idsNeedingBilling.length > 0) {
        // Fire and forget - generate PIX for each convocation
        // We don't await this because we don't want to slow down the UI
        idsNeedingBilling.forEach(id => {
          supabase.functions.invoke('generate-amistoso-pix', {
            body: { convocacao_id: id },
          }).catch(err => {
            console.error('Error generating PIX for convocacao:', id, err);
          });
        });
      }

      return { success: true, newNotifications };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes', variables.eventoId] });
      queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes-count', variables.eventoId] });
      queryClient.invalidateQueries({ queryKey: ['guardian-amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['eventos-convocacoes-counts'] });
    },
  });
}

// Hook to fetch convocacao counts for multiple events
export function useEventosConvocacoesCounts(eventoIds: string[]) {
  return useQuery({
    queryKey: ['eventos-convocacoes-counts', eventoIds],
    queryFn: async () => {
      if (eventoIds.length === 0) return {};

      const { data, error } = await supabase
        .from('amistoso_convocacoes')
        .select('evento_id')
        .in('evento_id', eventoIds);

      if (error) throw error;

      // Count convocacoes per evento
      const counts: Record<string, number> = {};
      data.forEach(conv => {
        counts[conv.evento_id] = (counts[conv.evento_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: eventoIds.length > 0,
  });
}
