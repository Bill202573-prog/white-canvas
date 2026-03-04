import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: filter by escolinha_id for testing
    const url = new URL(req.url);
    const filterEscolinhaId = url.searchParams.get('escolinha_id');

    // Get schools with push enabled
    let configQuery = supabase
      .from('escola_push_config')
      .select('*')
      .eq('push_ativo', true);

    if (filterEscolinhaId) {
      configQuery = configQuery.eq('escolinha_id', filterEscolinhaId);
    }

    const { data: configs, error: configError } = await configQuery;
    if (configError) throw configError;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: 'No schools with push enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let totalSent = 0;

    // Helper to send push and log
    async function sendPush(userId: string, title: string, body: string, pushUrl: string, tag: string, tipo: string, referenciaId: string, diasAntes: number, escolinhaId: string) {
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_ids: [userId],
          title,
          body,
          url: pushUrl,
          tag,
          tipo,
          referencia_id: referenciaId,
          dias_antes: diasAntes,
          escolinha_id: escolinhaId,
        }),
      });
      const result = await pushResponse.json();
      return result.sent || 0;
    }

    // Helper to check if already sent
    async function alreadySent(userId: string, tipo: string, referenciaId: string, diasAntes: number): Promise<boolean> {
      const { data: existing } = await supabase
        .from('push_notifications_log')
        .select('id')
        .eq('user_id', userId)
        .eq('tipo', tipo)
        .eq('referencia_id', referenciaId)
        .eq('dias_antes', diasAntes)
        .limit(1);
      return !!(existing && existing.length > 0);
    }

    // Helper to get guardians for a child
    async function getGuardianUserIds(criancaId: string): Promise<string[]> {
      const { data: responsaveis } = await supabase
        .from('crianca_responsavel')
        .select('responsavel_id, responsaveis!inner(user_id)')
        .eq('crianca_id', criancaId);
      if (!responsaveis) return [];
      return responsaveis.map((r: any) => r.responsaveis?.user_id).filter(Boolean);
    }

    for (const config of configs) {
      // ========== COBRANÇA REMINDERS ==========
      const diasCobranca: number[] = [];
      if (config.cobranca_3_dias_antes) diasCobranca.push(3);
      if (config.cobranca_1_dia_antes) diasCobranca.push(1);
      if (config.cobranca_no_dia) diasCobranca.push(0);
      if (config.cobranca_1_dia_depois) diasCobranca.push(-1);

      for (const dias of diasCobranca) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + dias);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const { data: mensalidades } = await supabase
          .from('mensalidades')
          .select(`
            id, crianca_id, mes_referencia, valor, data_vencimento, status,
            criancas!inner(nome, id),
            escolinhas!inner(id, nome)
          `)
          .eq('escolinha_id', config.escolinha_id)
          .eq('data_vencimento', targetDateStr)
          .in('status', ['pendente', 'a_vencer', 'atrasado', 'vencido']);

        if (!mensalidades || mensalidades.length === 0) continue;

        for (const mens of mensalidades) {
          const userIds = await getGuardianUserIds(mens.crianca_id);
          for (const userId of userIds) {
            if (await alreadySent(userId, 'cobranca', mens.id, dias)) continue;

            const childName = (mens as any).criancas?.nome || 'seu filho(a)';
            const valor = `R$ ${Number(mens.valor).toFixed(2).replace('.', ',')}`;
            let title = '💰 Lembrete de Mensalidade';
            let body = '';

            if (dias > 0) {
              body = `A mensalidade de ${childName} (${valor}) vence em ${dias} dia${dias > 1 ? 's' : ''}!`;
            } else if (dias === 0) {
              body = `A mensalidade de ${childName} (${valor}) vence HOJE!`;
            } else {
              title = '⚠️ Mensalidade Atrasada';
              body = `A mensalidade de ${childName} (${valor}) está vencida!`;
            }

            totalSent += await sendPush(userId, title, body, '/dashboard/financeiro', `cobranca-${mens.id}`, 'cobranca', mens.id, dias, config.escolinha_id);
          }
        }
      }

      // ========== CONVOCAÇÃO REMINDERS (Amistosos) ==========
      const diasConvocacao: number[] = [];
      if (config.convocacao_2_dias_antes) diasConvocacao.push(2);
      if (config.convocacao_1_dia_antes) diasConvocacao.push(1);
      if (config.convocacao_no_dia) diasConvocacao.push(0);

      for (const dias of diasConvocacao) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + dias);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Amistoso convocations
        const { data: convocacoes } = await supabase
          .from('amistoso_convocacoes')
          .select(`
            id, crianca_id, status,
            eventos_esportivos!inner(id, nome, data, escolinha_id),
            criancas!inner(nome)
          `)
          .eq('eventos_esportivos.escolinha_id', config.escolinha_id)
          .eq('eventos_esportivos.data', targetDateStr)
          .in('status', ['confirmado', 'pago']);

        if (convocacoes && convocacoes.length > 0) {
          for (const conv of convocacoes) {
            const userIds = await getGuardianUserIds(conv.crianca_id);
            for (const userId of userIds) {
              if (await alreadySent(userId, 'convocacao', conv.id, dias)) continue;

              const childName = (conv as any).criancas?.nome || 'seu filho(a)';
              const eventoNome = (conv as any).eventos_esportivos?.nome || 'evento';
              let body = '';
              if (dias > 0) {
                body = `Lembrete: ${childName} tem "${eventoNome}" em ${dias} dia${dias > 1 ? 's' : ''}! Não esqueça 💪`;
              } else {
                body = `${childName} tem "${eventoNome}" HOJE! Boa sorte ⚽`;
              }

              totalSent += await sendPush(userId, '⚽ Lembrete de Jogo', body, '/dashboard/convocacoes', `convocacao-${conv.id}`, 'convocacao', conv.id, dias, config.escolinha_id);
            }
          }
        }

        // Campeonato convocations
        const { data: campConvocacoes } = await supabase
          .from('campeonato_convocacoes')
          .select(`
            id, crianca_id, status,
            campeonatos!inner(id, nome, escolinha_id),
            criancas!inner(nome)
          `)
          .eq('campeonatos.escolinha_id', config.escolinha_id)
          .in('status', ['confirmado', 'pago']);

        if (campConvocacoes && campConvocacoes.length > 0) {
          for (const conv of campConvocacoes) {
            // For campeonatos, check if there's an event on the target date
            const campId = (conv as any).campeonatos?.id;
            if (!campId) continue;

            const { data: eventos } = await supabase
              .from('eventos_esportivos')
              .select('id, nome, data')
              .eq('campeonato_id', campId)
              .eq('data', targetDateStr)
              .limit(1);

            if (!eventos || eventos.length === 0) continue;

            const userIds = await getGuardianUserIds(conv.crianca_id);
            for (const userId of userIds) {
              if (await alreadySent(userId, 'convocacao_campeonato', conv.id, dias)) continue;

              const childName = (conv as any).criancas?.nome || 'seu filho(a)';
              const campNome = (conv as any).campeonatos?.nome || 'campeonato';
              let body = '';
              if (dias > 0) {
                body = `${childName} tem jogo do "${campNome}" em ${dias} dia${dias > 1 ? 's' : ''}! Confirme a presença.`;
              } else {
                body = `${childName} tem jogo do "${campNome}" HOJE!`;
              }

              totalSent += await sendPush(userId, '🏆 Campeonato', body, '/dashboard/convocacoes', `campeonato-${conv.id}`, 'convocacao_campeonato', conv.id, dias, config.escolinha_id);
            }
          }
        }
      }

      // ========== AULA REMINDERS ==========
      const diasAula: number[] = [];
      if (config.aula_3_dias_antes) diasAula.push(3);
      if (config.aula_1_dia_antes) diasAula.push(1);
      if (config.aula_no_dia) diasAula.push(0);

      for (const dias of diasAula) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + dias);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Get aulas for this school on target date
        const { data: aulas } = await supabase
          .from('aulas')
          .select(`
            id, data, status,
            turmas!inner(id, nome, escolinha_id)
          `)
          .eq('turmas.escolinha_id', config.escolinha_id)
          .eq('data', targetDateStr)
          .eq('status', 'agendada');

        if (!aulas || aulas.length === 0) continue;

        for (const aula of aulas) {
          // Get children enrolled in this turma
          const { data: criancaTurmas } = await supabase
            .from('crianca_turma')
            .select('crianca_id')
            .eq('turma_id', (aula as any).turmas.id)
            .eq('ativo', true);

          if (!criancaTurmas || criancaTurmas.length === 0) continue;

          for (const ct of criancaTurmas) {
            // For day-of (dias === 0), send motivational message to everyone
            // For earlier reminders, skip if already confirmed
            if (dias > 0) {
              const { data: presenca } = await supabase
                .from('presencas')
                .select('id, confirmado_responsavel')
                .eq('aula_id', aula.id)
                .eq('crianca_id', ct.crianca_id)
                .limit(1);

              if (presenca && presenca.length > 0 && presenca[0].confirmado_responsavel) continue;
            }

            const userIds = await getGuardianUserIds(ct.crianca_id);
            for (const userId of userIds) {
              if (await alreadySent(userId, 'aula', aula.id + '-' + ct.crianca_id, dias)) continue;

            const turmaNome = (aula as any).turmas?.nome || 'turma';
              let title = '📚 Confirmação de Aula';
              let body = '';

              if (dias === 3) {
                body = `Aula de "${turmaNome}" em 3 dias. Você já pode confirmar a presença!`;
              } else if (dias === 1) {
                title = '📚 Lembrete de Aula';
                body = `Aula de "${turmaNome}" amanhã! Confirme a presença do seu filho(a).`;
              } else {
                // No dia da aula: mensagem motivacional (enviada mesmo se já confirmou)
                title = '📚 Aula Hoje!';
                body = `Aula de "${turmaNome}" é HOJE! Contamos com sua presença 💪⚽`;
              }

              totalSent += await sendPush(userId, title, body, '/dashboard/agenda', `aula-${aula.id}`, 'aula', aula.id + '-' + ct.crianca_id, dias, config.escolinha_id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Push reminders processed', 
      schools: configs.length,
      totalSent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Process push reminders error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
