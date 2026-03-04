import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ComunicadoEscola {
  id: string;
  escolinha_id: string;
  titulo: string;
  mensagem: string;
  tipo: 'informativo' | 'importante' | 'urgente';
  destinatario_tipo: 'professores' | 'responsaveis';
  professor_id: string | null;
  turma_id: string | null;
  categoria: string | null;
  horario: string | null;
  criado_por: string;
  ativo: boolean;
  data_expiracao: string | null;
  crianca_ids: string[] | null;
  created_at: string;
  updated_at: string;
  professor?: { id: string; nome: string } | null;
  turma?: { id: string; nome: string } | null;
  escolinha?: { id: string; nome: string } | null;
}

export interface ComunicadoEscolaLeitura {
  id: string;
  comunicado_id: string;
  user_id: string;
  lido_em: string;
}

export interface ComunicadoEscolaComLeitura extends ComunicadoEscola {
  lido: boolean;
  leitura?: ComunicadoEscolaLeitura | null;
  leituras?: ComunicadoEscolaLeitura[];
  total_destinatarios?: number;
  criancas_nomes?: string[];
}

export interface CreateComunicadoEscolaData {
  titulo: string;
  mensagem: string;
  tipo: 'informativo' | 'importante' | 'urgente';
  destinatario_tipo: 'professores' | 'responsaveis';
  professor_id?: string | null;
  turma_id?: string | null;
  categoria?: string | null;
  horario?: string | null;
  data_expiracao?: string | null;
  crianca_ids?: string[] | null;
}

// Hook for school to manage their comunicados
export const useSchoolComunicadosEscola = (escolinhaId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['school-comunicados-escola', escolinhaId],
    queryFn: async () => {
      if (!escolinhaId) return [];

      const { data, error } = await supabase
        .from('comunicados_escola')
        .select(`
          *,
          professor:professores(id, nome),
          turma:turmas(id, nome)
        `)
        .eq('escolinha_id', escolinhaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch leituras for each comunicado
      const comunicadoIds = data.map(c => c.id);
      const { data: leituras } = await supabase
        .from('comunicado_escola_leituras')
        .select('*')
        .in('comunicado_id', comunicadoIds);

      // Get all crianca_ids from comunicados that have individual recipients
      const allCriancaIds = data
        .filter(c => c.crianca_ids && c.crianca_ids.length > 0)
        .flatMap(c => c.crianca_ids || []);
      
      // Fetch crianca names if there are individual recipients
      let criancasMap: Record<string, string> = {};
      if (allCriancaIds.length > 0) {
        const { data: criancas } = await supabase
          .from('criancas')
          .select('id, nome')
          .in('id', allCriancaIds);
        
        if (criancas) {
          criancasMap = criancas.reduce((acc, c) => {
            acc[c.id] = c.nome;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Get all active children for this school
      const { data: activeCriancaEscolinhas } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id')
        .eq('escolinha_id', escolinhaId)
        .eq('ativo', true);
      
      const activeCriancaIds = activeCriancaEscolinhas?.map(c => c.crianca_id) || [];

      // Get turma membership for calculating recipients
      const { data: criancaTurmas } = await supabase
        .from('crianca_turma')
        .select('crianca_id, turma_id')
        .in('crianca_id', activeCriancaIds)
        .eq('ativo', true);

      // Get unique responsaveis for all active children
      const { data: uniqueResponsaveis } = await supabase
        .from('crianca_responsavel')
        .select('responsavel_id, crianca_id')
        .in('crianca_id', activeCriancaIds);

      const totalResponsaveis = new Set(uniqueResponsaveis?.map(r => r.responsavel_id) || []).size;

      return data.map(c => {
        let totalDestinatarios = 0;
        
        // If crianca_ids exists, count those specific children
        if (c.crianca_ids && c.crianca_ids.length > 0) {
          totalDestinatarios = c.crianca_ids.length;
        }
        // If turma_id is set, count children in that turma
        else if (c.turma_id) {
          const childrenInTurma = criancaTurmas?.filter(ct => ct.turma_id === c.turma_id) || [];
          totalDestinatarios = childrenInTurma.length;
        }
        // Otherwise use total responsaveis
        else {
          totalDestinatarios = totalResponsaveis;
        }
        
        // Get names of individual recipients
        const isIndividual = c.crianca_ids && c.crianca_ids.length > 0;
        const criancasNomes = isIndividual
          ? c.crianca_ids.map((id: string) => criancasMap[id] || 'Aluno')
          : [];

        return {
          ...c,
          lido: false,
          leituras: leituras?.filter(l => l.comunicado_id === c.id) || [],
          total_destinatarios: totalDestinatarios,
          criancas_nomes: criancasNomes,
        };
      }) as ComunicadoEscolaComLeitura[];
    },
    enabled: !!user && user.role === 'school' && !!escolinhaId,
  });
};

// Hook for teachers to see comunicados for them
export const useTeacherComunicadosEscola = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-comunicados-escola'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunicados_escola')
        .select('*')
        .eq('destinatario_tipo', 'professores')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch leituras for this user
      const { data: leituras } = await supabase
        .from('comunicado_escola_leituras')
        .select('*');

      return (data || []).map(c => {
        const leitura = leituras?.find(l => l.comunicado_id === c.id);
        return {
          ...c,
          lido: !!leitura,
          leitura: leitura || null,
        } as ComunicadoEscolaComLeitura;
      });
    },
    enabled: !!user && user.role === 'teacher',
    refetchInterval: 5 * 60 * 1000,
  });
};

// Hook for guardians to see comunicados for them
export const useGuardianComunicadosEscola = () => {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['guardian-comunicados-escola', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      // Get responsavel ID
      const { data: responsavelData } = await supabase
        .rpc('get_responsavel_id', { _user_id: session.user.id });

      if (!responsavelData) return [];

      // Get children linked to this guardian
      const { data: criancaLinks } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id')
        .eq('responsavel_id', responsavelData);

      const myCriancaIds = criancaLinks?.map(l => l.crianca_id) || [];

      // Get turmas for my children
      const { data: myTurmas } = await supabase
        .from('crianca_turma')
        .select('crianca_id, turma_id')
        .in('crianca_id', myCriancaIds)
        .eq('ativo', true);

      const myTurmaIds = [...new Set(myTurmas?.map(t => t.turma_id) || [])];

      // Get enrollment dates for my children to filter old messages
      const { data: criancaEscolinhas } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id, escolinha_id, data_inicio')
        .in('crianca_id', myCriancaIds)
        .eq('ativo', true);

      // Build a map of escolinha -> earliest enrollment date
      const escolinhaEnrollmentDates: Record<string, Date> = {};
      criancaEscolinhas?.forEach(ce => {
        const enrollDate = new Date(ce.data_inicio);
        if (!escolinhaEnrollmentDates[ce.escolinha_id] || enrollDate < escolinhaEnrollmentDates[ce.escolinha_id]) {
          escolinhaEnrollmentDates[ce.escolinha_id] = enrollDate;
        }
      });

      // Fetch all active comunicados for responsaveis
      const { data, error } = await supabase
        .from('comunicados_escola')
        .select(`
          *,
          escolinha:escolinhas(id, nome)
        `)
        .eq('destinatario_tipo', 'responsaveis')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter comunicados that apply to this guardian
      const filteredData = (data || []).filter(comunicado => {
        // IMPORTANT: Filter out messages sent BEFORE the child enrolled at that school
        // This prevents new students from seeing old announcements
        const enrollDate = escolinhaEnrollmentDates[comunicado.escolinha_id];
        if (enrollDate) {
          const comunicadoDate = new Date(comunicado.created_at);
          if (comunicadoDate < enrollDate) {
            return false; // Skip messages created before enrollment
          }
        }

        // If crianca_ids is set, this is a snapshot of recipients at send time
        // Only show to guardians whose children are in that snapshot
        if (comunicado.crianca_ids && comunicado.crianca_ids.length > 0) {
          return comunicado.crianca_ids.some((id: string) => myCriancaIds.includes(id));
        }
        
        // If turma_id is set but no crianca_ids, this is a legacy comunicado
        // (before snapshot feature) - check current turma membership
        if (comunicado.turma_id) {
          return myTurmaIds.includes(comunicado.turma_id);
        }
        
        // If no specific filter, it's for all - check if we're in that school
        // Get escolinhas for my children
        return true; // General comunicados are shown (RLS already filters by school access)
      });

      // Fetch leituras for this user
      const { data: leituras } = await supabase
        .from('comunicado_escola_leituras')
        .select('*');

      return filteredData.map(c => {
        const leitura = leituras?.find(l => l.comunicado_id === c.id);
        return {
          ...c,
          lido: !!leitura,
          leitura: leitura || null,
        } as ComunicadoEscolaComLeitura;
      });
    },
    enabled: !!user && user.role === 'guardian' && !!session?.user?.id,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Hook to confirm reading (teachers and guardians)
export const useConfirmLeituraEscola = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (comunicadoId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comunicado_escola_leituras')
        .insert({
          comunicado_id: comunicadoId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-comunicados-escola'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-comunicados-escola'] });
    },
  });
};

// Hook to create comunicado (school only)
export const useCreateComunicadoEscola = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ escolinhaId, data }: { escolinhaId: string; data: CreateComunicadoEscolaData }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('comunicados_escola')
        .insert({
          escolinha_id: escolinhaId,
          titulo: data.titulo,
          mensagem: data.mensagem,
          tipo: data.tipo,
          destinatario_tipo: data.destinatario_tipo,
          professor_id: data.professor_id || null,
          turma_id: data.turma_id || null,
          categoria: data.categoria || null,
          horario: data.horario || null,
          data_expiracao: data.data_expiracao || null,
          criado_por: user.id,
          ativo: true,
          crianca_ids: data.crianca_ids || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      // Trigger push notification for the comunicado
      if (result && result.destinatario_tipo === 'responsaveis') {
        try {
          // Check if push is enabled for this school
          const { data: pushConfig } = await supabase
            .from('escola_push_config')
            .select('push_ativo, comunicado_push')
            .eq('escolinha_id', escolinhaId)
            .maybeSingle();

          if (pushConfig?.push_ativo && pushConfig?.comunicado_push) {
            // Get all guardians of this school
            const { data: guardians } = await supabase
              .from('crianca_escolinha')
              .select('crianca_id')
              .eq('escolinha_id', escolinhaId)
              .eq('ativo', true);

            if (guardians && guardians.length > 0) {
              const criancaIds = guardians.map(g => g.crianca_id);
              const { data: responsaveis } = await supabase
                .from('crianca_responsavel')
                .select('responsaveis!inner(user_id)')
                .in('crianca_id', criancaIds);

              if (responsaveis) {
                const userIds = [...new Set(responsaveis.map((r: any) => r.responsaveis.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                  await supabase.functions.invoke('send-push-notification', {
                    body: {
                      user_ids: userIds,
                      title: '📋 Novo Comunicado',
                      body: result.titulo,
                      url: '/dashboard/inicio',
                      tag: `comunicado-${result.id}`,
                      tipo: 'comunicado',
                      referencia_id: result.id,
                      escolinha_id: escolinhaId,
                    },
                  });
                }
              }
            }
          }
        } catch (pushError) {
          console.error('Error sending push for comunicado:', pushError);
        }
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-comunicados-escola', variables.escolinhaId] });
    },
  });
};

// Hook to update comunicado (school only)
export const useUpdateComunicadoEscola = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, escolinhaId, ...data }: Partial<ComunicadoEscola> & { id: string; escolinhaId: string }) => {
      const { data: result, error } = await supabase
        .from('comunicados_escola')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-comunicados-escola', variables.escolinhaId] });
    },
  });
};

// Hook to delete comunicado (school only)
export const useDeleteComunicadoEscola = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, escolinhaId }: { id: string; escolinhaId: string }) => {
      const { error } = await supabase
        .from('comunicados_escola')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-comunicados-escola', variables.escolinhaId] });
    },
  });
};
