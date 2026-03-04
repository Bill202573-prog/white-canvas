import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

// Token secreto para autenticar chamadas do n8n
const N8N_SECRET_TOKEN = Deno.env.get("N8N_SECRET_TOKEN") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar token
    const token = req.headers.get("x-n8n-token") || "";
    if (!N8N_SECRET_TOKEN || token !== N8N_SECRET_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, params } = await req.json();

    let data: unknown = null;

    switch (action) {
      // ==================== RESUMO GERAL ====================
      case "resumo": {
        const { count: totalEscolas } = await supabase
          .from("escolinhas").select("*", { count: "exact", head: true }).eq("ativo", true);
        const { count: totalAlunos } = await supabase
          .from("criancas").select("*", { count: "exact", head: true }).eq("ativo", true);

        const mesAtual = new Date().toISOString().substring(0, 7) + "-01";
        const { data: cobrancas } = await supabase
          .from("historico_cobrancas").select("valor, status").gte("mes_referencia", mesAtual);
        const arr = (cobrancas || []) as Array<{ valor: number; status: string }>;
        const recebido = arr.reduce((s, c) => s + (c.status === "pago" ? Number(c.valor) : 0), 0);
        const pendente = arr.reduce((s, c) => s + (c.status === "pendente" ? Number(c.valor) : 0), 0);

        data = { totalEscolas, totalAlunos, faturamentoMes: { recebido, pendente } };
        break;
      }

      // ==================== ESCOLAS ====================
      case "escolas": {
        const { data: escolas } = await supabase
          .from("escolinhas").select("id, nome, status, ativo, nome_responsavel, telefone, email").eq("ativo", true).order("nome");
        data = escolas;
        break;
      }

      // ==================== ESCOLA DETALHE ====================
      case "escola_detalhe": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const { data: escola } = await supabase
          .from("escolinhas").select("*").eq("id", escolinhaId).maybeSingle();
        const { count: totalAlunos } = await supabase
          .from("crianca_escolinha").select("*", { count: "exact", head: true }).eq("escolinha_id", escolinhaId).eq("ativo", true);
        const { count: totalTurmas } = await supabase
          .from("turmas").select("*", { count: "exact", head: true }).eq("escolinha_id", escolinhaId).eq("ativo", true);
        const { count: totalProfessores } = await supabase
          .from("professores").select("*", { count: "exact", head: true }).eq("escolinha_id", escolinhaId).eq("ativo", true);
        const { data: financeiro } = await supabase
          .from("escolinha_financeiro").select("status, valor_mensal").eq("escolinha_id", escolinhaId).maybeSingle();

        data = { escola, totalAlunos, totalTurmas, totalProfessores, financeiro };
        break;
      }

      // ==================== ALUNOS POR ESCOLA ====================
      case "alunos": {
        const escolinhaId = params?.escolinha_id;
        let query = supabase
          .from("crianca_escolinha")
          .select("crianca_id, ativo, criancas!inner(id, nome, data_nascimento, ativo, foto_url)")
          .eq("ativo", true);
        if (escolinhaId) query = query.eq("escolinha_id", escolinhaId);
        const { data: alunos } = await query;
        data = alunos;
        break;
      }

      // ==================== FATURAMENTO SAAS ====================
      case "faturamento": {
        const { data: cobrancas } = await supabase
          .from("historico_cobrancas")
          .select("valor, status, mes_referencia, escolinhas!inner(nome)")
          .order("mes_referencia", { ascending: false })
          .limit(200);
        data = cobrancas;
        break;
      }

      // ==================== INADIMPLENTES ====================
      case "inadimplentes": {
        const { data: financeiro } = await supabase
          .from("escolinha_financeiro")
          .select("status, escolinhas!inner(nome)")
          .neq("status", "em_dia");
        data = financeiro;
        break;
      }

      // ==================== MENSALIDADES (ESCOLA) ====================
      case "mensalidades": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        let query = supabase
          .from("mensalidades")
          .select("id, crianca_id, valor, status, mes_referencia, data_vencimento, data_pagamento, criancas!inner(nome)")
          .eq("escolinha_id", escolinhaId)
          .order("mes_referencia", { ascending: false });

        if (params?.mes_referencia) {
          query = query.eq("mes_referencia", params.mes_referencia);
        }
        if (params?.status) {
          query = query.eq("status", params.status);
        }

        const { data: mensalidades } = await query.limit(params?.limit || 100);
        data = mensalidades;
        break;
      }

      // ==================== PRESENÇA / FALTAS ====================
      case "presencas": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        let query = supabase
          .from("presencas")
          .select("id, crianca_id, aula_id, presente, justificativa, criancas!inner(nome), aulas!inner(data, turma_id, turmas!inner(nome, escolinha_id))")
          .eq("aulas.turmas.escolinha_id", escolinhaId);

        if (params?.data) {
          query = query.eq("aulas.data", params.data);
        }

        const { data: presencas } = await query.limit(params?.limit || 200);
        data = presencas;
        break;
      }

      // ==================== FALTAS HOJE ====================
      case "faltas_hoje": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const hoje = new Date().toISOString().substring(0, 10);
        const { data: faltas } = await supabase
          .from("presencas")
          .select("crianca_id, justificativa, criancas!inner(nome), aulas!inner(data, turmas!inner(nome, escolinha_id))")
          .eq("presente", false)
          .eq("aulas.data", hoje)
          .eq("aulas.turmas.escolinha_id", escolinhaId);

        data = faltas;
        break;
      }

      // ==================== TURMAS ====================
      case "turmas": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const { data: turmas } = await supabase
          .from("turmas")
          .select("id, nome, dia_semana, horario, ativo, professor_id, professores!inner(nome)")
          .eq("escolinha_id", escolinhaId)
          .eq("ativo", true)
          .order("nome");
        data = turmas;
        break;
      }

      // ==================== COMUNICADOS ====================
      case "comunicados": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const { data: comunicados } = await supabase
          .from("comunicados_escola")
          .select("id, titulo, mensagem, tipo, categoria, destinatario_tipo, created_at")
          .eq("escolinha_id", escolinhaId)
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(params?.limit || 20);
        data = comunicados;
        break;
      }

      // ==================== FALTAS MÊS (alunos com >2 faltas no mês atual) ====================
      case "faltas_mes": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const now = new Date();
        const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const nextMonth = now.getMonth() + 2 > 12
          ? `${now.getFullYear() + 1}-01-01`
          : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

        const { data: presencas } = await supabase
          .from("presencas")
          .select("crianca_id, criancas!inner(nome), aulas!inner(data, turmas!inner(escolinha_id))")
          .eq("presente", false)
          .eq("aulas.turmas.escolinha_id", escolinhaId)
          .gte("aulas.data", mesInicio)
          .lt("aulas.data", nextMonth);

        // Agrupar por criança e contar faltas
        const faltasPorCrianca: Record<string, { nome: string; faltas: number }> = {};
        for (const p of (presencas || []) as Array<{ crianca_id: string; criancas: { nome: string } }>) {
          if (!faltasPorCrianca[p.crianca_id]) {
            faltasPorCrianca[p.crianca_id] = { nome: p.criancas?.nome || "", faltas: 0 };
          }
          faltasPorCrianca[p.crianca_id].faltas++;
        }

        data = Object.entries(faltasPorCrianca)
          .filter(([, v]) => v.faltas > 2)
          .map(([crianca_id, v]) => ({ crianca_id, nome: v.nome, faltas: v.faltas }))
          .sort((a, b) => b.faltas - a.faltas);
        break;
      }

      // ==================== INADIMPLENTES MÊS (mensalidades não pagas do mês atual) ====================
      case "inadimplentes_mes": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const mesRef = new Date().toISOString().substring(0, 7) + "-01";

        const { data: inadimplentes } = await supabase
          .from("mensalidades")
          .select("id, crianca_id, valor, status, data_vencimento, criancas!inner(nome)")
          .eq("escolinha_id", escolinhaId)
          .eq("mes_referencia", mesRef)
          .in("status", ["pendente", "atrasado"])
          .order("data_vencimento");

        data = (inadimplentes || []).map((m: { crianca_id: string; valor: number; status: string; data_vencimento: string; criancas: { nome: string } }) => ({
          crianca_id: m.crianca_id,
          nome: m.criancas?.nome,
          valor: m.valor,
          status: m.status,
          data_vencimento: m.data_vencimento,
        }));
        break;
      }

      // ==================== FATURAMENTO MÊS (total pago no mês atual) ====================
      case "faturamento_mes": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const mesRef = new Date().toISOString().substring(0, 7) + "-01";

        const { data: mensalidades } = await supabase
          .from("mensalidades")
          .select("valor, status, valor_pago")
          .eq("escolinha_id", escolinhaId)
          .eq("mes_referencia", mesRef);

        const arr = (mensalidades || []) as Array<{ valor: number; status: string; valor_pago: number | null }>;
        const totalPago = arr.reduce((s, m) => s + (m.status === "pago" ? Number(m.valor_pago ?? m.valor) : 0), 0);
        const totalPendente = arr.reduce((s, m) => s + (["pendente", "atrasado"].includes(m.status) ? Number(m.valor) : 0), 0);
        const totalMensalidades = arr.length;

        data = { mes_referencia: mesRef, totalPago, totalPendente, totalMensalidades };
        break;
      }

      // ==================== PRÓXIMOS EVENTOS (30 dias) ====================
      case "proximos_eventos": {
        const escolinhaId = params?.escolinha_id;
        if (!escolinhaId) { data = { error: "escolinha_id obrigatório" }; break; }

        const hoje = new Date().toISOString().substring(0, 10);
        const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);

        const { data: eventos } = await supabase
          .from("eventos_esportivos")
          .select("id, tipo, adversario, local, data_evento, horario, status")
          .eq("escolinha_id", escolinhaId)
          .gte("data_evento", hoje)
          .lte("data_evento", em30dias)
          .order("data_evento");

        data = eventos;
        break;
      }

      // ==================== QUERY LIVRE (tabela + filtros) ====================
      case "query": {
        const tabela = params?.tabela;
        const select = params?.select || "*";
        const filtros = params?.filtros || {};
        const limite = params?.limit || 100;

        if (!tabela) { data = { error: "tabela obrigatório" }; break; }

        // Whitelist de tabelas permitidas
        const tabelasPermitidas = [
          "escolinhas", "criancas", "crianca_escolinha", "crianca_responsavel",
          "responsaveis", "turmas", "crianca_turma", "aulas", "presencas",
          "mensalidades", "professores", "eventos_esportivos", "comunicados_escola",
          "historico_cobrancas", "escolinha_financeiro", "campeonatos",
          "amistoso_convocacoes", "campeonato_convocacoes", "produtos", "pedidos",
          "conquistas_coletivas", "indicacoes"
        ];

        if (!tabelasPermitidas.includes(tabela)) {
          data = { error: `Tabela '${tabela}' não permitida. Permitidas: ${tabelasPermitidas.join(", ")}` };
          break;
        }

        let query = supabase.from(tabela).select(select);
        for (const [key, value] of Object.entries(filtros)) {
          query = query.eq(key, value);
        }
        const { data: resultado, error } = await query.limit(limite);
        if (error) {
          data = { error: error.message };
        } else {
          data = resultado;
        }
        break;
      }

      default:
        data = {
          error: "Ação não reconhecida",
          acoes_disponiveis: [
            "resumo", "escolas", "escola_detalhe", "alunos", "faturamento",
            "inadimplentes", "mensalidades", "presencas", "faltas_hoje",
            "turmas", "comunicados", "faltas_mes", "inadimplentes_mes",
            "faturamento_mes", "proximos_eventos", "query"
          ],
        };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
