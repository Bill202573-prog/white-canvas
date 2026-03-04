import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface NextEvento {
  id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  nome: string;
  tipo: 'amistoso' | 'campeonato';
  local: string | null;
  adversario: string | null;
  categoria: string | null;
  status: string;
  escolinha: {
    id: string;
    nome: string;
  };
  time: {
    id: string;
    nome: string;
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
  isActiveDay?: boolean;
  // Source of convocation (for proper confirmation handling)
  convocacaoTipo?: 'evento_time_alunos' | 'amistoso_convocacoes';
  convocacaoId?: string;
}

/**
 * Determines the "active day" for a child based on their events
 */
const getActiveDayForChildEvents = (
  eventos: Array<{ data: string; horario_fim: string | null; presenca?: { confirmado_responsavel: boolean | null } }>
): string | null => {
  if (eventos.length === 0) return null;
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Group eventos by date
  const eventosByDate: Record<string, typeof eventos> = {};
  for (const evento of eventos) {
    if (!eventosByDate[evento.data]) {
      eventosByDate[evento.data] = [];
    }
    eventosByDate[evento.data].push(evento);
  }
  
  // Get sorted dates
  const sortedDates = Object.keys(eventosByDate).sort();
  
  for (const date of sortedDates) {
    const dayEventos = eventosByDate[date];
    
    // If it's today, check if the last event has finished
    if (date === todayStr) {
      const lastEventTime = dayEventos.reduce((max, e) => {
        const time = e.horario_fim || '23:59';
        return time > max ? time : max;
      }, '00:00');
      
      if (currentTime > lastEventTime) {
        continue;
      }
    }
    
    return date;
  }
  
  return null;
};

// Hook to get upcoming events where child is called up (convocado)
export const useGuardianNextEventos = () => {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['guardian-next-eventos', user?.id],
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

      // Get date range: today + 20 days for events (allow early confirmation)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calculate end date (20 days from now)
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 20);
      const endDateStr = endDate.toISOString().split('T')[0];

      // Build eventos list
      const weekEventos: NextEvento[] = [];

      // === PART 1: Get convocations from evento_time_alunos (campeonatos and some amistosos) ===
      const { data: convocacoes } = await supabase
        .from('evento_time_alunos')
        .select('id, crianca_id, time_id')
        .in('crianca_id', criancaIds);

      if (convocacoes && convocacoes.length > 0) {
        const timeIds = [...new Set(convocacoes.map(c => c.time_id))];
        
        const { data: times } = await supabase
          .from('evento_times')
          .select('id, nome, evento_id')
          .in('id', timeIds);
        
        if (times && times.length > 0) {
          const eventoIds = [...new Set(times.map(t => t.evento_id))];
          
          const { data: eventos } = await supabase
            .from('eventos_esportivos')
            .select('id, nome, data, horario_inicio, horario_fim, tipo, local, adversario, categoria, status, escolinha_id')
            .in('id', eventoIds)
            .gte('data', todayStr)
            .lte('data', endDateStr)
            .eq('status', 'agendado');

          if (eventos && eventos.length > 0) {
            // Get escolinhas
            const escolinhaIds = [...new Set(eventos.map(e => e.escolinha_id).filter(Boolean))];
            const { data: escolinhas } = await supabase
              .from('escolinhas')
              .select('id, nome')
              .in('id', escolinhaIds);

            // Get criancas
            const { data: criancasData } = await supabase
              .from('criancas')
              .select('id, nome, foto_url')
              .in('id', criancaIds);

            const timesMap = new Map(times.map(t => [t.id, t]));
            const eventosMap = new Map(eventos.map(e => [e.id, e]));
            const criancasMap = new Map(criancasData?.map(c => [c.id, c]) || []);
            const escolinhasMap = new Map(escolinhas?.map(e => [e.id, e]) || []);

            for (const conv of convocacoes) {
              const time = timesMap.get(conv.time_id);
              if (!time) continue;
              
              const evento = eventosMap.get(time.evento_id);
              if (!evento) continue;
              
              const crianca = criancasMap.get(conv.crianca_id);
              if (!crianca) continue;

              // Check if already added
              const alreadyAdded = weekEventos.some(
                we => we.id === evento.id && we.crianca.id === crianca.id
              );
              if (alreadyAdded) continue;

              // Check for existing presença
              const { data: presencaData } = await supabase
                .from('evento_presencas')
                .select('id, confirmado_responsavel, responsavel_confirmou_em, presente')
                .eq('evento_id', evento.id)
                .eq('crianca_id', crianca.id)
                .maybeSingle();

              const escolinha = escolinhasMap.get(evento.escolinha_id);

              weekEventos.push({
                id: evento.id,
                data: evento.data,
                horario_inicio: evento.horario_inicio,
                horario_fim: evento.horario_fim,
                nome: evento.nome,
                tipo: evento.tipo as 'amistoso' | 'campeonato',
                local: evento.local,
                adversario: evento.adversario,
                categoria: evento.categoria,
                status: evento.status,
                escolinha: escolinha || { id: evento.escolinha_id || '', nome: 'Escolinha' },
                time: {
                  id: time.id,
                  nome: time.nome,
                },
                crianca: {
                  id: crianca.id,
                  nome: crianca.nome,
                  foto_url: crianca.foto_url,
                },
                presenca: presencaData || undefined,
                isActiveDay: false,
                convocacaoTipo: 'evento_time_alunos',
                convocacaoId: conv.id,
              });
            }
          }
        }
      }

      // === PART 2: Get convocations from amistoso_convocacoes ===
      const { data: amistosoConvocacoes } = await supabase
        .from('amistoso_convocacoes')
        .select(`
          id, 
          crianca_id, 
          evento_id, 
          status,
          presente
        `)
        .in('crianca_id', criancaIds)
        .in('status', ['pago', 'aguardando_pagamento', 'confirmado', 'pendente']);

      if (amistosoConvocacoes && amistosoConvocacoes.length > 0) {
        const amistosoEventoIds = [...new Set(amistosoConvocacoes.map(ac => ac.evento_id))];
        
        const { data: amistosoEventos } = await supabase
          .from('eventos_esportivos')
          .select('id, nome, data, horario_inicio, horario_fim, tipo, local, adversario, categoria, status, escolinha_id')
          .in('id', amistosoEventoIds)
          .gte('data', todayStr)
          .lte('data', endDateStr)
          .eq('status', 'agendado');

        if (amistosoEventos && amistosoEventos.length > 0) {
          // Get escolinhas for these eventos
          const escolinhaIdsAmistoso = [...new Set(amistosoEventos.map(e => e.escolinha_id).filter(Boolean))];
          const { data: escolinhasAmistoso } = await supabase
            .from('escolinhas')
            .select('id, nome')
            .in('id', escolinhaIdsAmistoso);

          // Get criancas if not already fetched
          const { data: criancasDataAmistoso } = await supabase
            .from('criancas')
            .select('id, nome, foto_url')
            .in('id', criancaIds);

          const eventosMapAmistoso = new Map(amistosoEventos.map(e => [e.id, e]));
          const criancasMapAmistoso = new Map(criancasDataAmistoso?.map(c => [c.id, c]) || []);
          const escolinhasMapAmistoso = new Map(escolinhasAmistoso?.map(e => [e.id, e]) || []);

          for (const conv of amistosoConvocacoes) {
            const evento = eventosMapAmistoso.get(conv.evento_id);
            if (!evento) continue;
            
            const crianca = criancasMapAmistoso.get(conv.crianca_id);
            if (!crianca) continue;

            // Check if already added from evento_time_alunos
            const alreadyAdded = weekEventos.some(
              we => we.id === evento.id && we.crianca.id === crianca.id
            );
            if (alreadyAdded) continue;

            const escolinha = escolinhasMapAmistoso.get(evento.escolinha_id);

            // For amistoso_convocacoes, presence is tracked differently
            // Map the convocation status to presence-like object
            const isConfirmed = conv.status === 'pago' || conv.status === 'confirmado';

            weekEventos.push({
              id: evento.id,
              data: evento.data,
              horario_inicio: evento.horario_inicio,
              horario_fim: evento.horario_fim,
              nome: evento.nome,
              tipo: evento.tipo as 'amistoso' | 'campeonato',
              local: evento.local,
              adversario: evento.adversario,
              categoria: evento.categoria,
              status: evento.status,
              escolinha: escolinha || { id: evento.escolinha_id || '', nome: 'Escolinha' },
              time: {
                id: conv.id, // Use convocacao ID as pseudo time ID
                nome: evento.nome.split(' x ')[0] || evento.nome, // Extract team name from event name
              },
              crianca: {
                id: crianca.id,
                nome: crianca.nome,
                foto_url: crianca.foto_url,
              },
              presenca: {
                id: conv.id,
                confirmado_responsavel: isConfirmed,
                responsavel_confirmou_em: null,
                presente: conv.presente,
              },
              isActiveDay: false,
              convocacaoTipo: 'amistoso_convocacoes',
              convocacaoId: conv.id,
            });
          }
        }
      }

      // Calculate active day for each child
      const activeDayByChild: Record<string, string | null> = {};
      
      for (const criancaId of criancaIds) {
        const childEventos = weekEventos.filter(e => e.crianca.id === criancaId);
        activeDayByChild[criancaId] = getActiveDayForChildEvents(childEventos);
      }

      // Set isActiveDay flag
      for (const evento of weekEventos) {
        const activeDay = activeDayByChild[evento.crianca.id];
        evento.isActiveDay = activeDay === evento.data;
      }

      // Sort by date then by time
      weekEventos.sort((a, b) => {
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
      });

      return weekEventos;
    },
    enabled: !!session?.user?.id,
    refetchInterval: 60000,
  });
};

// Mutation to confirm/cancel event presence
export const useConfirmEventoPresence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventoId,
      criancaId,
      timeId,
      confirmar,
    }: {
      eventoId: string;
      criancaId: string;
      timeId: string;
      confirmar: boolean;
    }) => {
      // Check if presença already exists
      const { data: existingPresenca } = await supabase
        .from('evento_presencas')
        .select('id')
        .eq('evento_id', eventoId)
        .eq('crianca_id', criancaId)
        .maybeSingle();

      if (existingPresenca) {
        // Update existing
        const { error } = await supabase
          .from('evento_presencas')
          .update({
            confirmado_responsavel: confirmar,
            responsavel_confirmou_em: new Date().toISOString(),
          })
          .eq('id', existingPresenca.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('evento_presencas')
          .insert({
            evento_id: eventoId,
            crianca_id: criancaId,
            time_id: timeId,
            confirmado_responsavel: confirmar,
            responsavel_confirmou_em: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-next-eventos'] });
    },
  });
};