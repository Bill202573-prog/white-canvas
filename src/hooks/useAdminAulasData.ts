import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface AulaForAdmin {
  id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  status: string;
  turma_id: string;
  turma: {
    id: string;
    nome: string;
    campo: string | null;
    categoria_sub?: number | null;
    professor?: {
      id: string;
      nome: string;
    } | null;
  };
  alunos: AdminAlunoPresenca[];
  chamada_salva: boolean;
  chamada_fechada_por?: string | null;
  chamada_fechada_por_nome?: string | null;
  chamada_fechada_em?: string | null;
}

export interface AdminAlunoPresenca {
  id: string;
  crianca_id: string;
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
    data_nascimento: string;
  };
  confirmado_responsavel: boolean | null;
  responsavel_confirmou_em: string | null;
  presente: boolean | null;
  confirmado_professor: boolean | null;
  professor_confirmou_em: string | null;
  motivo_ausencia: string | null;
  observacoes: string | null;
}

// Hook to get all classes for a specific day for a given school (for admin use)
export const useAdminAulasForDay = (escolinhaId: string | undefined, date: string) => {
  return useQuery({
    queryKey: ['admin-aulas-day', escolinhaId, date],
    queryFn: async () => {
      if (!escolinhaId) return [];

      // Get all turmas for this school
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id, nome, campo, categoria_sub, professor_id, professores!turmas_professor_id_fkey(id, nome)')
        .eq('escolinha_id', escolinhaId)
        .eq('ativo', true);

      if (!turmas || turmas.length === 0) return [];

      const turmaIds = turmas.map(t => t.id);

      // Get all classes for this date
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select('id, data, horario_inicio, horario_fim, status, turma_id')
        .in('turma_id', turmaIds)
        .eq('data', date)
        .in('status', ['normal', 'extra'])
        .order('horario_inicio', { ascending: true });

      if (error) throw error;
      if (!aulas) return [];

      // Build result with turma info
      const result: AulaForAdmin[] = [];

      for (const aula of aulas) {
        const turma = turmas.find(t => t.id === aula.turma_id);
        if (!turma) continue;

        // Get students for this turma
        const { data: criancaTurmas } = await supabase
          .from('crianca_turma')
          .select(`
            crianca_id,
            criancas(id, nome, foto_url, data_nascimento)
          `)
          .eq('turma_id', aula.turma_id)
          .eq('ativo', true);

        if (!criancaTurmas) continue;

        const criancaIds = criancaTurmas.map(ct => ct.crianca_id);

        // Get presence records
        const { data: presencas } = await supabase
          .from('presencas')
          .select('*')
          .eq('aula_id', aula.id)
          .in('crianca_id', criancaIds.length > 0 ? criancaIds : ['00000000-0000-0000-0000-000000000000']);

        const alunos: AdminAlunoPresenca[] = criancaTurmas.map(ct => {
          const crianca = ct.criancas as any;
          const presenca = presencas?.find(p => p.crianca_id === ct.crianca_id);

          return {
            id: presenca?.id || `temp-${ct.crianca_id}`,
            crianca_id: ct.crianca_id,
            crianca: {
              id: crianca.id,
              nome: crianca.nome,
              foto_url: crianca.foto_url,
              data_nascimento: crianca.data_nascimento,
            },
            confirmado_responsavel: presenca?.confirmado_responsavel ?? null,
            responsavel_confirmou_em: presenca?.responsavel_confirmou_em ?? null,
            presente: presenca?.presente ?? null,
            confirmado_professor: presenca?.confirmado_professor ?? null,
            professor_confirmou_em: presenca?.professor_confirmou_em ?? null,
            motivo_ausencia: presenca?.motivo_ausencia ?? null,
            observacoes: presenca?.observacoes ?? null,
          };
        });

        alunos.sort((a, b) => a.crianca.nome.localeCompare(b.crianca.nome));

        const chamadaSalva = alunos.length > 0 && alunos.every(a => a.presente !== null);

        // Get who closed the attendance
        let chamadaFechadaPor: string | null = null;
        let chamadaFechadaPorNome: string | null = null;
        let chamadaFechadaEm: string | null = null;

        if (chamadaSalva && presencas && presencas.length > 0) {
          const firstPresenca = presencas[0];
          chamadaFechadaPor = firstPresenca.chamada_fechada_por;
          chamadaFechadaEm = firstPresenca.professor_confirmou_em;

          if (firstPresenca.chamada_fechada_por_id) {
            const { data: prof } = await supabase
              .from('professores')
              .select('nome')
              .eq('id', firstPresenca.chamada_fechada_por_id)
              .maybeSingle();
            chamadaFechadaPorNome = prof?.nome || null;
          }
        }

        result.push({
          id: aula.id,
          data: aula.data,
          horario_inicio: aula.horario_inicio,
          horario_fim: aula.horario_fim,
          status: aula.status,
          turma_id: aula.turma_id,
          turma: {
            id: turma.id,
            nome: turma.nome,
            campo: turma.campo,
            categoria_sub: turma.categoria_sub,
            professor: turma.professores as any,
          },
          alunos,
          chamada_salva: chamadaSalva,
          chamada_fechada_por: chamadaFechadaPor,
          chamada_fechada_por_nome: chamadaFechadaPorNome,
          chamada_fechada_em: chamadaFechadaEm,
        });
      }

      return result;
    },
    enabled: !!escolinhaId,
    refetchInterval: 30000,
  });
};

// Hook to get a single class with all student data
export const useAdminAulaDetail = (aulaId: string | undefined) => {
  return useQuery({
    queryKey: ['admin-aula-detail', aulaId],
    queryFn: async () => {
      if (!aulaId) return null;

      const { data: aula, error } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id,
          turmas(id, nome, campo, categoria_sub, professores!turmas_professor_id_fkey(id, nome))
        `)
        .eq('id', aulaId)
        .single();

      if (error) throw error;
      if (!aula) return null;

      // Get students for this turma
      const { data: criancaTurmas } = await supabase
        .from('crianca_turma')
        .select(`
          crianca_id,
          criancas(id, nome, foto_url, data_nascimento)
        `)
        .eq('turma_id', aula.turma_id)
        .eq('ativo', true);

      if (!criancaTurmas) return null;

      const criancaIds = criancaTurmas.map(ct => ct.crianca_id);

      // Get presence records
      const { data: presencas } = await supabase
        .from('presencas')
        .select('*')
        .eq('aula_id', aula.id)
        .in('crianca_id', criancaIds.length > 0 ? criancaIds : ['00000000-0000-0000-0000-000000000000']);

      const alunos: AdminAlunoPresenca[] = criancaTurmas.map(ct => {
        const crianca = ct.criancas as any;
        const presenca = presencas?.find(p => p.crianca_id === ct.crianca_id);

        return {
          id: presenca?.id || `temp-${ct.crianca_id}`,
          crianca_id: ct.crianca_id,
          crianca: {
            id: crianca.id,
            nome: crianca.nome,
            foto_url: crianca.foto_url,
            data_nascimento: crianca.data_nascimento,
          },
          confirmado_responsavel: presenca?.confirmado_responsavel ?? null,
          responsavel_confirmou_em: presenca?.responsavel_confirmou_em ?? null,
          presente: presenca?.presente ?? null,
          confirmado_professor: presenca?.confirmado_professor ?? null,
          professor_confirmou_em: presenca?.professor_confirmou_em ?? null,
          motivo_ausencia: presenca?.motivo_ausencia ?? null,
          observacoes: presenca?.observacoes ?? null,
        };
      });

      alunos.sort((a, b) => a.crianca.nome.localeCompare(b.crianca.nome));

      const chamadaSalva = alunos.length > 0 && alunos.every(a => a.presente !== null);

      const turmaData = aula.turmas as any;

      return {
        id: aula.id,
        data: aula.data,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim,
        status: aula.status,
        turma_id: aula.turma_id,
        turma: {
          id: turmaData.id,
          nome: turmaData.nome,
          campo: turmaData.campo,
          categoria_sub: turmaData.categoria_sub,
          professor: turmaData.professores,
        },
        alunos,
        chamada_salva: chamadaSalva,
      } as AulaForAdmin;
    },
    enabled: !!aulaId,
    refetchInterval: 30000,
  });
};

// Mutation to save attendance (for admin/school)
export const useAdminSaveAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aulaId,
      attendanceData,
      closedBy,
    }: {
      aulaId: string;
      attendanceData: Array<{
        crianca_id: string;
        presente: boolean;
        observacoes?: string;
      }>;
      closedBy: 'professor' | 'escola';
    }) => {
      const now = new Date().toISOString();

      for (const item of attendanceData) {
        // Check if presenca exists
        const { data: existingPresenca } = await supabase
          .from('presencas')
          .select('id')
          .eq('aula_id', aulaId)
          .eq('crianca_id', item.crianca_id)
          .maybeSingle();

        if (existingPresenca) {
          // Update
          const { error } = await supabase
            .from('presencas')
            .update({
              presente: item.presente,
              confirmado_professor: true,
              professor_confirmou_em: now,
              observacoes: item.observacoes || null,
              chamada_fechada_por: closedBy,
            })
            .eq('id', existingPresenca.id);

          if (error) throw error;
        } else {
          // Insert
          const { error } = await supabase
            .from('presencas')
            .insert({
              aula_id: aulaId,
              crianca_id: item.crianca_id,
              presente: item.presente,
              confirmado_professor: true,
              professor_confirmou_em: now,
              observacoes: item.observacoes || null,
              chamada_fechada_por: closedBy,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-aulas-day'] });
      queryClient.invalidateQueries({ queryKey: ['admin-aula-detail'] });
    },
  });
};
