import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tipos para atividades externas
export type AtividadeExternaTipo = 
  | 'clinica_camp'
  | 'treino_preparador_fisico'
  | 'treino_tecnico'
  | 'avaliacao'
  | 'competicao_torneio'
  | 'jogo_amistoso_externo'
  | 'outro';

export type TorneioAbrangencia = 
  | 'municipal'
  | 'regional'
  | 'estadual'
  | 'nacional'
  | 'internacional';

export type CredibilidadeStatus = 'registrado' | 'com_evidencia' | 'validado';

export interface AtividadeExterna {
  id: string;
  crianca_id: string;
  criado_por: string;
  tipo: AtividadeExternaTipo;
  tipo_outro_descricao: string | null;
  data: string;
  data_fim: string | null;
  duracao_minutos: number;
  frequencia_semanal: number | null;
  carga_horaria_horas: number | null;
  local_atividade: string;
  profissional_instituicao: string;
  profissionais_envolvidos: string[] | null;
  organizador: string | null;
  torneio_abrangencia: TorneioAbrangencia | null;
  torneio_nome: string | null;
  objetivos: string[];
  metodologia: string | null;
  observacoes: string | null;
  evidencia_url: string | null;
  evidencia_tipo: string | null;
  credibilidade_status: CredibilidadeStatus;
  visibilidade: 'privado' | 'publico';
  fotos_urls: string[];
  tornar_publico: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAtividadeExternaInput {
  crianca_id: string;
  tipo: AtividadeExternaTipo;
  tipo_outro_descricao?: string;
  data: string;
  data_fim?: string;
  duracao_minutos?: number;
  frequencia_semanal?: number;
  carga_horaria_horas?: number;
  local_atividade: string;
  profissional_instituicao: string;
  profissionais_envolvidos?: string[];
  organizador?: string;
  torneio_abrangencia?: TorneioAbrangencia;
  torneio_nome?: string;
  objetivos?: string[];
  metodologia?: string;
  observacoes?: string;
  evidencia_url?: string;
  evidencia_tipo?: string;
  fotos_urls?: string[];
  tornar_publico?: boolean;
}

// Hook para verificar se usuário tem acesso à funcionalidade
// Utiliza a hierarquia: modo global → whitelist → escolinha liberada
export const useHasAtividadesExternasAccess = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['atividades-externas-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .rpc('has_atividades_externas_access', { check_user_id: user.id });

      if (error) {
        console.error('Erro ao verificar acesso a atividades externas:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - cache para evitar chamadas repetidas
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para verificar acesso para uma criança específica
// Usado quando precisa validar se pode criar/editar atividade para um filho específico
export const useHasAtividadesExternasAccessForChild = (criancaId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['atividades-externas-access-child', user?.id, criancaId],
    queryFn: async () => {
      if (!user?.id || !criancaId) return false;

      const { data, error } = await supabase
        .rpc('has_atividades_externas_access_for_child', { 
          check_user_id: user.id,
          check_crianca_id: criancaId
        });

      if (error) {
        console.error('Erro ao verificar acesso para criança:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id && !!criancaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para buscar atividades externas de uma criança
export const useAtividadesExternas = (criancaId: string | null) => {
  return useQuery({
    queryKey: ['atividades-externas', criancaId],
    queryFn: async () => {
      if (!criancaId) return [];

      const { data, error } = await supabase
        .from('atividades_externas')
        .select('*')
        .eq('crianca_id', criancaId)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar atividades:', error);
        throw error;
      }

      return data as AtividadeExterna[];
    },
    enabled: !!criancaId,
  });
};

// Hook para criar atividade externa
export const useCreateAtividadeExterna = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAtividadeExternaInput) => {
      // Fallback to session for social auth users
      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        currentUserId = sessionData.session?.user?.id;
      }
      if (!currentUserId) throw new Error('Usuário não autenticado');

      // Determinar status de credibilidade - fotos também contam como evidência
      const hasEvidence = input.evidencia_url || (input.fotos_urls && input.fotos_urls.length > 0);
      const credibilidade_status: CredibilidadeStatus = 
        hasEvidence ? 'com_evidencia' : 'registrado';

      // Calcular duracao_minutos a partir de carga_horaria_horas se necessário
      const duracao_minutos = input.duracao_minutos ?? 
        (input.carga_horaria_horas ? Math.round(input.carga_horaria_horas * 60) : 60);

      const { data, error } = await supabase
        .from('atividades_externas')
        .insert({
          crianca_id: input.crianca_id,
          criado_por: currentUserId,
          tipo: input.tipo,
          tipo_outro_descricao: input.tipo_outro_descricao || null,
          data: input.data,
          data_fim: input.data_fim || null,
          duracao_minutos,
          frequencia_semanal: input.frequencia_semanal || null,
          carga_horaria_horas: input.carga_horaria_horas || null,
          local_atividade: input.local_atividade,
          profissional_instituicao: input.profissional_instituicao,
          profissionais_envolvidos: input.profissionais_envolvidos || null,
          organizador: input.organizador || null,
          torneio_abrangencia: input.torneio_abrangencia || null,
          torneio_nome: input.torneio_nome || null,
          objetivos: input.objetivos || [],
          metodologia: input.metodologia || null,
          observacoes: input.observacoes || null,
          evidencia_url: input.evidencia_url || null,
          evidencia_tipo: input.evidencia_tipo || null,
          credibilidade_status,
          visibilidade: 'privado',
          origem: 'app_escolinha',
          fotos_urls: input.fotos_urls || [],
          tornar_publico: input.tornar_publico ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['atividades-externas', variables.crianca_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['atividades-publicas', variables.crianca_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['carreira-atividade-limit'] 
      });
    },
  });
};

// Hook para atualizar atividade externa
export const useUpdateAtividadeExterna = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      crianca_id,
      ...updates 
    }: Partial<AtividadeExterna> & { id: string; crianca_id: string }) => {
      const tornarPublicoChanged = typeof updates.tornar_publico === 'boolean';

      const sanitizedUpdates: Record<string, unknown> = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );

      const nullableTextFields = [
        'tipo_outro_descricao',
        'data_fim',
        'organizador',
        'torneio_nome',
        'metodologia',
        'observacoes',
        'evidencia_url',
        'evidencia_tipo',
      ];

      nullableTextFields.forEach((field) => {
        if (sanitizedUpdates[field] === '') {
          sanitizedUpdates[field] = null;
        }
      });

      if (sanitizedUpdates.torneio_abrangencia === '') {
        sanitizedUpdates.torneio_abrangencia = null;
      }

      if (
        Array.isArray(sanitizedUpdates.profissionais_envolvidos) &&
        sanitizedUpdates.profissionais_envolvidos.length === 0
      ) {
        sanitizedUpdates.profissionais_envolvidos = null;
      }

      // Atualizar credibilidade se evidência ou fotos foram adicionadas/removidas
      let credibilidade_status = sanitizedUpdates.credibilidade_status as CredibilidadeStatus | undefined;
      const fotos = sanitizedUpdates.fotos_urls;
      const hasEvidence = Boolean(sanitizedUpdates.evidencia_url) || (Array.isArray(fotos) && fotos.length > 0);

      if ('evidencia_url' in sanitizedUpdates || 'fotos_urls' in sanitizedUpdates) {
        credibilidade_status = hasEvidence ? 'com_evidencia' : 'registrado';
      }

      if (credibilidade_status) {
        sanitizedUpdates.credibilidade_status = credibilidade_status;
      }

      const { data, error } = await supabase
        .from('atividades_externas')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, crianca_id, tornarPublicoChanged };
    },
    onSuccess: (result) => {
      // Always invalidate the child's activities
      queryClient.invalidateQueries({ 
        queryKey: ['atividades-externas', result.crianca_id] 
      });
      
      // If tornar_publico was changed, invalidate public activities queries for Carreira
      if (result.tornarPublicoChanged) {
        queryClient.invalidateQueries({ 
          queryKey: ['atividades-publicas', result.crianca_id] 
        });
        // Also invalidate any posts-atleta queries that may show activities
        queryClient.invalidateQueries({ 
          queryKey: ['posts-atleta'] 
        });
      }
    },
  });
};

// Hook para deletar atividade externa
export const useDeleteAtividadeExterna = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, crianca_id }: { id: string; crianca_id: string }) => {
      const { error } = await supabase
        .from('atividades_externas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { crianca_id, id };
    },
    onMutate: async ({ id, crianca_id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['atividades-externas', crianca_id] });
      await queryClient.cancelQueries({ queryKey: ['atividades-publicas', crianca_id] });

      // Snapshot previous values
      const prevExternas = queryClient.getQueryData(['atividades-externas', crianca_id]);
      const prevPublicas = queryClient.getQueryData(['atividades-publicas', crianca_id]);

      // Optimistically remove from both caches
      queryClient.setQueryData(['atividades-externas', crianca_id], (old: any[]) =>
        old ? old.filter((a: any) => a.id !== id) : []
      );
      queryClient.setQueryData(['atividades-publicas', crianca_id], (old: any[]) =>
        old ? old.filter((a: any) => a.id !== id) : []
      );

      return { prevExternas, prevPublicas, crianca_id };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(['atividades-externas', context.crianca_id], context.prevExternas);
        queryClient.setQueryData(['atividades-publicas', context.crianca_id], context.prevPublicas);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ 
        queryKey: ['atividades-externas', vars.crianca_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['atividades-publicas', vars.crianca_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['carreira-atividade-limit'] 
      });
    },
  });
};

// Labels para exibição
export const TIPO_ATIVIDADE_LABELS: Record<AtividadeExternaTipo, string> = {
  clinica_camp: 'Clínica / Camp',
  treino_preparador_fisico: 'Treino com Preparador Físico',
  treino_tecnico: 'Treino Técnico (Treinador)',
  avaliacao: 'Avaliação',
  competicao_torneio: 'Competição / Torneio',
  jogo_amistoso_externo: 'Jogo Amistoso Externo',
  outro: 'Outro',
};

export const ABRANGENCIA_LABELS: Record<TorneioAbrangencia, string> = {
  municipal: 'Municipal',
  regional: 'Regional',
  estadual: 'Estadual',
  nacional: 'Nacional',
  internacional: 'Internacional',
};

export const OBJETIVOS_OPTIONS = [
  { value: 'forca', label: 'Força' },
  { value: 'velocidade', label: 'Velocidade' },
  { value: 'agilidade', label: 'Agilidade' },
  { value: 'resistencia', label: 'Resistência' },
  { value: 'coordenacao_motora', label: 'Coordenação Motora' },
  { value: 'mobilidade_flexibilidade', label: 'Mobilidade / Flexibilidade' },
  { value: 'prevencao_lesao', label: 'Prevenção de Lesão' },
  { value: 'fundamentos_tecnicos', label: 'Fundamentos Técnicos' },
];

export const METODOLOGIA_OPTIONS = [
  { value: 'funcional', label: 'Funcional' },
  { value: 'circuito', label: 'Circuito' },
  { value: 'tecnico_analitico', label: 'Técnico-Analítico' },
  { value: 'integrado', label: 'Integrado' },
  { value: 'ludico', label: 'Lúdico' },
];

export const FREQUENCIA_OPTIONS = [
  { value: 1, label: '1x por semana' },
  { value: 2, label: '2x por semana' },
  { value: 3, label: '3x por semana' },
  { value: 4, label: '4x por semana' },
  { value: 5, label: '5x por semana' },
  { value: 6, label: '6x por semana' },
  { value: 7, label: 'Diariamente' },
];

// Helper para determinar quais campos exibir por tipo
export const getFieldsForType = (tipo: AtividadeExternaTipo) => {
  const baseFields = ['tipo', 'data', 'local_atividade'];
  
  switch (tipo) {
    case 'treino_preparador_fisico':
    case 'treino_tecnico':
      return {
        required: ['data', 'local_atividade', 'profissional_instituicao'],
        optional: ['data_fim', 'frequencia_semanal', 'carga_horaria_horas', 'objetivos', 'metodologia', 'observacoes'],
        hidden: ['torneio_nome', 'organizador', 'torneio_abrangencia', 'profissionais_envolvidos'],
      };
    case 'clinica_camp':
      return {
        required: ['data', 'data_fim', 'carga_horaria_horas', 'local_atividade', 'profissional_instituicao'],
        optional: ['profissionais_envolvidos', 'observacoes'],
        hidden: ['objetivos', 'metodologia', 'frequencia_semanal', 'torneio_nome', 'organizador', 'torneio_abrangencia'],
      };
    case 'competicao_torneio':
      return {
        required: ['torneio_nome', 'data', 'data_fim', 'local_atividade', 'organizador', 'torneio_abrangencia'],
        optional: ['observacoes'],
        hidden: ['objetivos', 'metodologia', 'frequencia_semanal', 'carga_horaria_horas', 'profissionais_envolvidos'],
      };
    case 'avaliacao':
      return {
        required: ['data', 'local_atividade', 'profissional_instituicao'],
        optional: ['observacoes'],
        hidden: ['objetivos', 'metodologia', 'frequencia_semanal', 'carga_horaria_horas', 'torneio_nome', 'organizador', 'torneio_abrangencia', 'profissionais_envolvidos', 'data_fim'],
      };
    case 'jogo_amistoso_externo':
      return {
        required: ['data', 'local_atividade'],
        optional: ['organizador', 'observacoes'],
        hidden: ['objetivos', 'metodologia', 'frequencia_semanal', 'carga_horaria_horas', 'torneio_nome', 'torneio_abrangencia', 'profissionais_envolvidos', 'data_fim'],
      };
    case 'outro':
    default:
      return {
        required: ['data', 'local_atividade', 'profissional_instituicao', 'tipo_outro_descricao'],
        optional: ['observacoes'],
        hidden: ['objetivos', 'metodologia', 'frequencia_semanal', 'carga_horaria_horas', 'torneio_nome', 'organizador', 'torneio_abrangencia', 'profissionais_envolvidos', 'data_fim'],
      };
  }
};
