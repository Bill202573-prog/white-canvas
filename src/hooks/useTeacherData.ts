import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface TeacherProfile {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  telefone: string | null;
  escolinha_id: string;
  escolinha?: {
    id: string;
    nome: string;
    logo_url: string | null;
  };
}

export interface TeacherTurma {
  id: string;
  nome: string;
  dias_semana: string[];
  horario_inicio: string | null;
  horario_fim: string | null;
  campo: string | null;
  status: string;
  alunos_count: number;
}

export interface AulaForTeacher {
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
  };
  alunos: AlunoPresenca[];
  chamada_salva: boolean; // Indicates if attendance has been finalized
}

export interface AlunoPresenca {
  id: string;
  crianca_id: string;
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
    data_nascimento: string;
  };
  // Guardian confirmation status
  confirmado_responsavel: boolean | null;
  responsavel_confirmou_em: string | null;
  // Teacher attendance status
  presente: boolean | null;
  confirmado_professor: boolean | null;
  professor_confirmou_em: string | null;
  motivo_ausencia: string | null;
  observacoes: string | null;
}

// Hook to get teacher profile
export const useTeacherProfile = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['teacher-profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('professores')
        .select(`
          id, nome, email, foto_url, telefone, escolinha_id,
          escolinhas(id, nome, logo_url)
        `)
        .eq('user_id', session.user.id)
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        escolinha: data.escolinhas as any,
      } as TeacherProfile;
    },
    enabled: !!session?.user?.id,
  });
};

// Hook to get teacher's turmas
export const useTeacherTurmas = (professorId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-turmas', professorId],
    queryFn: async () => {
      if (!professorId) return [];

      // Get turmas where teacher is the main professor
      const { data: mainTurmas, error } = await supabase
        .from('turmas')
        .select('*')
        .eq('professor_id', professorId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Get turmas where teacher is an assistant
      const { data: assistenteTurmaIds } = await supabase
        .from('turma_assistentes')
        .select('turma_id')
        .eq('professor_id', professorId);

      let assistantTurmas: any[] = [];
      if (assistenteTurmaIds && assistenteTurmaIds.length > 0) {
        const ids = assistenteTurmaIds.map(a => a.turma_id);
        const { data } = await supabase
          .from('turmas')
          .select('*')
          .in('id', ids)
          .eq('ativo', true)
          .order('nome');
        assistantTurmas = data || [];
      }

      // Merge and deduplicate
      const turmasMap = new Map();
      [...(mainTurmas || []), ...assistantTurmas].forEach(t => {
        if (!turmasMap.has(t.id)) turmasMap.set(t.id, t);
      });
      const turmas = Array.from(turmasMap.values());

      // Get student count for each turma
      const turmasWithCount: TeacherTurma[] = [];
      
      for (const turma of turmas) {
        const { count } = await supabase
          .from('crianca_turma')
          .select('*', { count: 'exact', head: true })
          .eq('turma_id', turma.id)
          .eq('ativo', true);

        turmasWithCount.push({
          id: turma.id,
          nome: turma.nome,
          dias_semana: turma.dias_semana,
          horario_inicio: turma.horario_inicio,
          horario_fim: turma.horario_fim,
          campo: turma.campo,
          status: turma.status,
          alunos_count: count || 0,
        });
      }

      return turmasWithCount;
    },
    enabled: !!professorId,
  });
};

// Hook to get ALL teacher's classes for TODAY (for selection)
export const useTeacherTodayAulas = (professorId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-today-aulas', professorId],
    queryFn: async () => {
      if (!professorId) return [];

      // Get teacher's turmas (where they are the main teacher)
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('professor_id', professorId)
        .eq('ativo', true);

      // Get turmas where teacher is an assistant
      const { data: assistenteTurmaIds } = await supabase
        .from('turma_assistentes')
        .select('turma_id')
        .eq('professor_id', professorId);

      const mainTurmaIds = turmas?.map(t => t.id) || [];
      const assistTurmaIds = assistenteTurmaIds?.map(a => a.turma_id) || [];
      const turmaIds = [...new Set([...mainTurmaIds, ...assistTurmaIds])];
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Get classes where teacher is main or assistant (normal or extra)
      const { data: mainAulas } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id, professor_substituto_id,
          turmas(id, nome, campo)
        `)
        .in('turma_id', turmaIds.length > 0 ? turmaIds : ['00000000-0000-0000-0000-000000000000'])
        .in('status', ['normal', 'extra'])
        .eq('data', todayStr)
        .order('horario_inicio', { ascending: true });

      // Get classes where teacher is a substitute
      const { data: substituteAulas } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id, professor_substituto_id,
          turmas(id, nome, campo)
        `)
        .eq('professor_substituto_id', professorId)
        .in('status', ['normal', 'extra'])
        .eq('data', todayStr)
        .order('horario_inicio', { ascending: true });

      // Combine and deduplicate
      const allAulasMap = new Map();
      [...(mainAulas || []), ...(substituteAulas || [])].forEach(aula => {
        if (!allAulasMap.has(aula.id)) {
          allAulasMap.set(aula.id, aula);
        }
      });

      const allAulas = Array.from(allAulasMap.values()).sort((a, b) => {
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
      });

      // Build list of aulas with basic info
      const result: Array<{
        id: string;
        data: string;
        horario_inicio: string | null;
        horario_fim: string | null;
        status: string;
        turma_id: string;
        turma: { id: string; nome: string; campo: string | null };
      }> = [];

      for (const aula of allAulas) {
        result.push({
          id: aula.id,
          data: aula.data,
          horario_inicio: aula.horario_inicio,
          horario_fim: aula.horario_fim,
          status: aula.status,
          turma_id: aula.turma_id,
          turma: aula.turmas as any,
        });
      }

      return result;
    },
    enabled: !!professorId,
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook to get details for a specific class (with students and attendance)
export const useTeacherAulaDetails = (aulaId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-aula-details', aulaId],
    queryFn: async () => {
      if (!aulaId) return null;

      // Get the aula
      const { data: aula } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id,
          turmas(id, nome, campo)
        `)
        .eq('id', aulaId)
        .single();

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

      // Get presence records for this class
      const criancaIds = criancaTurmas.map(ct => ct.crianca_id);
      const { data: presencas } = await supabase
        .from('presencas')
        .select('*')
        .eq('aula_id', aula.id)
        .in('crianca_id', criancaIds);

      // Build student list with presence status
      const alunos: AlunoPresenca[] = criancaTurmas.map(ct => {
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

      // Sort by name
      alunos.sort((a, b) => a.crianca.nome.localeCompare(b.crianca.nome));

      // Check if attendance has been saved (all students have presente !== null)
      const chamadaSalva = alunos.length > 0 && alunos.every(a => a.presente !== null);

      return {
        id: aula.id,
        data: aula.data,
        horario_inicio: aula.horario_inicio,
        horario_fim: aula.horario_fim,
        status: aula.status,
        turma_id: aula.turma_id,
        turma: aula.turmas as any,
        alunos,
        chamada_salva: chamadaSalva,
      } as AulaForTeacher;
    },
    enabled: !!aulaId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// LEGACY: Hook to get teacher's next class (the very next upcoming class) - kept for backwards compat
export const useTeacherNextAula = (professorId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-next-aula', professorId],
    queryFn: async () => {
      if (!professorId) return null;

      // Get teacher's turmas (where they are the main teacher)
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('professor_id', professorId)
        .eq('ativo', true);

      const turmaIds = turmas?.map(t => t.id) || [];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      // Get classes where teacher is the main teacher (normal or extra)
      const { data: mainAulas } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id, professor_substituto_id,
          turmas(id, nome, campo)
        `)
        .in('turma_id', turmaIds.length > 0 ? turmaIds : ['00000000-0000-0000-0000-000000000000'])
        .in('status', ['normal', 'extra'])
        .gte('data', todayStr)
        .order('data', { ascending: true })
        .order('horario_inicio', { ascending: true })
        .limit(20);

      // Get classes where teacher is a substitute
      const { data: substituteAulas } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id, professor_substituto_id,
          turmas(id, nome, campo)
        `)
        .eq('professor_substituto_id', professorId)
        .in('status', ['normal', 'extra'])
        .gte('data', todayStr)
        .order('data', { ascending: true })
        .order('horario_inicio', { ascending: true })
        .limit(20);

      // Combine and deduplicate
      const allAulasMap = new Map();
      [...(mainAulas || []), ...(substituteAulas || [])].forEach(aula => {
        if (!allAulasMap.has(aula.id)) {
          allAulasMap.set(aula.id, aula);
        }
      });

      const allAulas = Array.from(allAulasMap.values()).sort((a, b) => {
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
      });

      if (allAulas.length === 0) return null;

      // Find the next class (today that hasn't ended, or the first future class)
      let nextAula = null;
      for (const aula of allAulas) {
        if (aula.data === todayStr) {
          // If today, check if the class hasn't ended yet
          const endTime = aula.horario_fim || '23:59';
          if (currentTime <= endTime) {
            nextAula = aula;
            break;
          }
        } else {
          // Future date, this is the next class
          nextAula = aula;
          break;
        }
      }

      if (!nextAula) return null;

      // Get students for this turma
      const { data: criancaTurmas } = await supabase
        .from('crianca_turma')
        .select(`
          crianca_id,
          criancas(id, nome, foto_url, data_nascimento)
        `)
        .eq('turma_id', nextAula.turma_id)
        .eq('ativo', true);

      if (!criancaTurmas) return null;

      // Get presence records for this class
      const criancaIds = criancaTurmas.map(ct => ct.crianca_id);
      const { data: presencas } = await supabase
        .from('presencas')
        .select('*')
        .eq('aula_id', nextAula.id)
        .in('crianca_id', criancaIds);

      // Build student list with presence status
      const alunos: AlunoPresenca[] = criancaTurmas.map(ct => {
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

      // Sort by name
      alunos.sort((a, b) => a.crianca.nome.localeCompare(b.crianca.nome));

      // Check if attendance has been saved (all students have presente !== null)
      const chamadaSalva = alunos.length > 0 && alunos.every(a => a.presente !== null);

      return {
        id: nextAula.id,
        data: nextAula.data,
        horario_inicio: nextAula.horario_inicio,
        horario_fim: nextAula.horario_fim,
        status: nextAula.status,
        turma_id: nextAula.turma_id,
        turma: nextAula.turmas as any,
        alunos,
        chamada_salva: chamadaSalva,
      } as AulaForTeacher;
    },
    enabled: !!professorId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Hook to get teacher's past classes (for consultation only)
export const useTeacherPastAulas = (professorId: string | undefined, limit = 20) => {
  return useQuery({
    queryKey: ['teacher-past-aulas', professorId, limit],
    queryFn: async () => {
      if (!professorId) return [];

      // Get teacher's turmas (main + assistant)
      const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('professor_id', professorId);

      const { data: assistenteTurmaIds } = await supabase
        .from('turma_assistentes')
        .select('turma_id')
        .eq('professor_id', professorId);

      const mainIds = turmas?.map(t => t.id) || [];
      const assistIds = assistenteTurmaIds?.map(a => a.turma_id) || [];
      const turmaIds = [...new Set([...mainIds, ...assistIds])];

      if (turmaIds.length === 0) return [];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      // Get past classes (including today's classes that have ended)
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select(`
          id, data, horario_inicio, horario_fim, status, turma_id,
          turmas(id, nome, campo)
        `)
        .in('turma_id', turmaIds)
        .lte('data', todayStr)
        .order('data', { ascending: false })
        .order('horario_inicio', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!aulas) return [];

      // Filter to only include truly past classes
      const pastAulas = aulas.filter(aula => {
        if (aula.data < todayStr) return true;
        if (aula.data === todayStr) {
          const endTime = aula.horario_fim || '23:59';
          return currentTime > endTime;
        }
        return false;
      });

      // Get presence data for each class
      const result: AulaForTeacher[] = [];
      
      for (const aula of pastAulas) {
        // Get students for this turma
        const { data: criancaTurmas } = await supabase
          .from('crianca_turma')
          .select(`
            crianca_id,
            criancas(id, nome, foto_url, data_nascimento)
          `)
          .eq('turma_id', aula.turma_id);

        if (!criancaTurmas) continue;

        const criancaIds = criancaTurmas.map(ct => ct.crianca_id);
        
        // Get presence records
        const { data: presencas } = await supabase
          .from('presencas')
          .select('*')
          .eq('aula_id', aula.id)
          .in('crianca_id', criancaIds);

        const alunos: AlunoPresenca[] = criancaTurmas.map(ct => {
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

        result.push({
          id: aula.id,
          data: aula.data,
          horario_inicio: aula.horario_inicio,
          horario_fim: aula.horario_fim,
          status: aula.status,
          turma_id: aula.turma_id,
          turma: aula.turmas as any,
          alunos,
          chamada_salva: true, // Past classes are always "saved"
        });
      }

      return result;
    },
    enabled: !!professorId,
  });
};

// Mutation to save attendance (mark presence for all students) - for teachers
export const useSaveAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aulaId,
      attendanceData,
      professorId,
    }: {
      aulaId: string;
      attendanceData: Array<{
        crianca_id: string;
        presente: boolean;
        observacoes?: string;
      }>;
      professorId?: string;
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
              chamada_fechada_por: 'professor',
              chamada_fechada_por_id: professorId || null,
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
              chamada_fechada_por: 'professor',
              chamada_fechada_por_id: professorId || null,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-next-aula'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-today-aulas'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-aula-details'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-aulas'] });
    },
  });
};