import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface NextAula {
  id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  turma_id: string;
  status: string;
  turma: {
    id: string;
    nome: string;
    professor_id: string | null;
    professor?: {
      id: string;
      nome: string;
      foto_url: string | null;
    };
    escolinha?: {
      id: string;
      nome: string;
    };
  };
  crianca: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  presenca?: {
    id: string;
    confirmado_responsavel: boolean | null;
    responsavel_confirmou_em: string | null;
    presente: boolean | null;
  };
  isActiveDay?: boolean; // Flag to indicate if this class is on the active day (can confirm presence)
}

/**
 * Determines the "active day" for a child based on their classes
 * Active day = the earliest date with classes where:
 * - The date is today or in the future
 * - The last class of the day hasn't finished yet (if today)
 * - OR not all classes are confirmed/rejected yet
 */
const getActiveDayForChild = (
  aulas: Array<{ data: string; horario_fim: string | null; presenca?: { confirmado_responsavel: boolean | null } }>
): string | null => {
  if (aulas.length === 0) return null;
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Group aulas by date
  const aulasByDate: Record<string, typeof aulas> = {};
  for (const aula of aulas) {
    if (!aulasByDate[aula.data]) {
      aulasByDate[aula.data] = [];
    }
    aulasByDate[aula.data].push(aula);
  }
  
  // Get sorted dates
  const sortedDates = Object.keys(aulasByDate).sort();
  
  for (const date of sortedDates) {
    const dayAulas = aulasByDate[date];
    
    // If it's today, check if the last class has finished
    if (date === todayStr) {
      const lastClassTime = dayAulas.reduce((max, a) => {
        const time = a.horario_fim || '23:59';
        return time > max ? time : max;
      }, '00:00');
      
      // If all classes of today have finished, skip to next day
      if (currentTime > lastClassTime) {
        continue;
      }
    }
    
    // This date is the active day
    return date;
  }
  
  return null;
};

// Hook to get week aulas for guardian's children (showing week, with active day logic)
export const useGuardianNextAulas = () => {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['guardian-next-aulas', user?.id],
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

      if (!criancaLinks || criancaLinks.length === 0) return [];

      const criancaIds = criancaLinks.map(l => l.crianca_id);

      // Get escolinha links to filter out inactive schools
      const { data: escolinhaLinks } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id, escolinha_id, ativo')
        .in('crianca_id', criancaIds);

      // Build map of crianca -> active escolinha IDs
      const activeEscolinhasByChild: Record<string, string[]> = {};
      escolinhaLinks?.forEach(link => {
        if (link.ativo) {
          if (!activeEscolinhasByChild[link.crianca_id]) {
            activeEscolinhasByChild[link.crianca_id] = [];
          }
          activeEscolinhasByChild[link.crianca_id].push(link.escolinha_id);
        }
      });

      // Get children's turmas (only from active schools)
      const { data: criancaTurmas } = await supabase
        .from('crianca_turma')
        .select(`
          crianca_id,
          turma_id,
          criancas(id, nome, foto_url),
          turmas(id, nome, professor_id, horario_inicio, horario_fim, escolinha_id)
        `)
        .in('crianca_id', criancaIds)
        .eq('ativo', true);

      if (!criancaTurmas || criancaTurmas.length === 0) return [];

      // Filter turmas to only include those from active schools for each child
      const filteredCriancaTurmas = criancaTurmas.filter(ct => {
        const turma = ct.turmas as any;
        if (!turma?.escolinha_id) return false;
        const activeSchools = activeEscolinhasByChild[ct.crianca_id] || [];
        return activeSchools.includes(turma.escolinha_id);
      });

      if (filteredCriancaTurmas.length === 0) return [];

      const turmaIds = [...new Set(filteredCriancaTurmas.map(ct => ct.turma_id))];

      // Get today's date and end of week
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

      // Get week aulas (today or next 7 days) - include normal and extra classes
      const { data: aulas } = await supabase
        .from('aulas')
        .select('*')
        .in('turma_id', turmaIds)
        .gte('data', todayStr)
        .lte('data', endOfWeekStr)
        .in('status', ['normal', 'extra'])
        .order('data', { ascending: true })
        .order('horario_inicio', { ascending: true });

      if (!aulas || aulas.length === 0) return [];

      // Get escolinha IDs from filtered turmas (only active schools)
      const escolinhaIds = [...new Set(filteredCriancaTurmas.map(ct => (ct.turmas as any)?.escolinha_id).filter(Boolean))];
      
      // Get escolinhas
      const { data: escolinhas } = await supabase
        .from('escolinhas')
        .select('id, nome')
        .in('id', escolinhaIds);

      // Get professors
      const professorIds = [...new Set(filteredCriancaTurmas.map(ct => (ct.turmas as any)?.professor_id).filter(Boolean))];
      const { data: professors } = await supabase
        .from('professores')
        .select('id, nome, foto_url')
        .in('id', professorIds);

      // Build aulas list first without isActiveDay
      const weekAulas: NextAula[] = [];

      for (const ct of filteredCriancaTurmas) {
        const crianca = ct.criancas as any;
        const turma = ct.turmas as any;

        if (!crianca || !turma) continue;

        // Get all aulas for this turma this week
        const turmaAulas = aulas.filter(a => a.turma_id === ct.turma_id);
        
        for (const aula of turmaAulas) {
          // Check if already added (avoid duplicates)
          const alreadyAdded = weekAulas.some(
            wa => wa.id === aula.id && wa.crianca.id === crianca.id
          );
          if (alreadyAdded) continue;

          // Check for existing presenca
          const { data: presencaData } = await supabase
            .from('presencas')
            .select('id, confirmado_responsavel, responsavel_confirmou_em, presente')
            .eq('aula_id', aula.id)
            .eq('crianca_id', ct.crianca_id)
            .maybeSingle();

          const professor = professors?.find(p => p.id === turma.professor_id);
          const escolinha = escolinhas?.find(e => e.id === turma.escolinha_id);

          weekAulas.push({
            id: aula.id,
            data: aula.data,
            horario_inicio: aula.horario_inicio,
            horario_fim: aula.horario_fim,
            turma_id: aula.turma_id,
            status: aula.status,
            turma: {
              id: turma.id,
              nome: turma.nome,
              professor_id: turma.professor_id,
              professor: professor || undefined,
              escolinha: escolinha || undefined,
            },
            crianca: {
              id: crianca.id,
              nome: crianca.nome,
              foto_url: crianca.foto_url,
            },
            presenca: presencaData || undefined,
            isActiveDay: false, // Will be set later
          });
        }
      }

      // Calculate active day for each child and set isActiveDay flag
      const activeDayByChild: Record<string, string | null> = {};
      
      for (const criancaId of criancaIds) {
        const childAulas = weekAulas.filter(a => a.crianca.id === criancaId);
        activeDayByChild[criancaId] = getActiveDayForChild(childAulas);
      }

      // Set isActiveDay flag
      for (const aula of weekAulas) {
        const activeDay = activeDayByChild[aula.crianca.id];
        aula.isActiveDay = activeDay === aula.data;
      }

      // Sort by date then by time
      weekAulas.sort((a, b) => {
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
      });

      return weekAulas;
    },
    enabled: !!session?.user?.id,
    refetchInterval: 60000, // Refresh every minute
  });
};

// Mutation to confirm/cancel presence
export const useConfirmPresence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aulaId,
      criancaId,
      confirmar,
    }: {
      aulaId: string;
      criancaId: string;
      confirmar: boolean;
    }) => {
      // Check if presenca already exists
      const { data: existingPresenca } = await supabase
        .from('presencas')
        .select('id')
        .eq('aula_id', aulaId)
        .eq('crianca_id', criancaId)
        .maybeSingle();

      if (existingPresenca) {
        // Update existing
        const { error } = await supabase
          .from('presencas')
          .update({
            confirmado_responsavel: confirmar,
            responsavel_confirmou_em: new Date().toISOString(),
          })
          .eq('id', existingPresenca.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('presencas')
          .insert({
            aula_id: aulaId,
            crianca_id: criancaId,
            confirmado_responsavel: confirmar,
            responsavel_confirmou_em: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-next-aulas'] });
    },
  });
};
