import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Números autorizados (separados por vírgula)
const ADMIN_NUMBERS = (Deno.env.get("WHATSAPP_ADMIN_NUMBERS") || "").split(",").map(n => n.trim());
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "";

interface WhatsAppMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      remoteJidAlt?: string;
      fromMe: boolean;
      id: string;
      participant?: string;
      addressingMode?: string;
    };
    source?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName?: string;
  };
}

// Extrai o número do telefone do remoteJid
function extractPhoneNumber(remoteJid: string, remoteJidAlt?: string): string {
  // Preferir um JID com número (quando existir)
  const jid = remoteJidAlt && /@s\.whatsapp\.net$/.test(remoteJidAlt)
    ? remoteJidAlt
    : remoteJid;

  // Extrai apenas dígitos antes do @
  const beforeAt = jid.split("@")[0] || "";
  return beforeAt.replace(/\D/g, "");
}

// Verifica se o número está autorizado
function isAuthorized(phoneNumber: string): boolean {
  if (ADMIN_NUMBERS.length === 0 || (ADMIN_NUMBERS.length === 1 && ADMIN_NUMBERS[0] === "")) {
    return false;
  }
  return ADMIN_NUMBERS.some(admin => phoneNumber.includes(admin) || admin.includes(phoneNumber));
}

// Extrai o texto da mensagem
function extractMessageText(data: WhatsAppMessage["data"]): string {
  return (
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    ""
  ).toLowerCase().trim();
}

// Envio resiliente: quando a Evolution responder "Connection Closed", tenta reiniciar a instância e reenviar.
async function sendWhatsAppMessageResilient(to: string, message: string): Promise<void> {
  const baseUrl = (EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const sendUrl = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;

  const cleanNumber = to.replace("@s.whatsapp.net", "").replace("@g.us", "");
  const jidNumber = `${cleanNumber}@s.whatsapp.net`;

  const candidates = [
    { number: cleanNumber, text: message },
    { number: jidNumber, text: message },
    { number: cleanNumber, textMessage: { text: message } },
    { number: jidNumber, textMessage: { text: message } },
  ];

  const trySend = async (body: unknown) => {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    return { ok: res.ok, status: res.status, txt };
  };

  const tryRequest = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        apikey: EVOLUTION_API_KEY,
        ...(init?.method && init.method !== "GET" && init.method !== "HEAD"
          ? { "Content-Type": "application/json" }
          : {}),
      },
    });
    const txt = await res.text();
    return { ok: res.ok, status: res.status, txt };
  };

  const getConnectionState = async (): Promise<string | null> => {
    try {
      const url = `${baseUrl}/instance/connectionState/${EVOLUTION_INSTANCE}`;
      const res = await fetch(url, { headers: { apikey: EVOLUTION_API_KEY } });
      const txt = await res.text();
      if (!res.ok) {
        console.error(`connectionState failed (${res.status}):`, txt);
        return null;
      }
      const json = JSON.parse(txt) as { instance?: { state?: string } };
      return json?.instance?.state ?? null;
    } catch (e) {
      console.error("Failed to get connectionState:", e);
      return null;
    }
  };

  // Algumas instalações/v2 não expõem PUT /instance/restart/{instance} (404).
  // Então tentamos uma sequência de endpoints comuns para re-conectar a instância.
  const recoverInstanceConnection = async (): Promise<boolean> => {
    const before = await getConnectionState();
    console.error(`Instance state before recovery: ${before || "unknown"}`);
    if (before === "open") return true;

    const recoveryAttempts: Array<{
      name: string;
      url: string;
      init?: RequestInit;
    }> = [
      {
        name: "GET /instance/connect/{instance}",
        url: `${baseUrl}/instance/connect/${EVOLUTION_INSTANCE}`,
        init: { method: "GET" },
      },
      {
        name: "POST /instance/connect {instanceName}",
        url: `${baseUrl}/instance/connect`,
        init: { method: "POST", body: JSON.stringify({ instanceName: EVOLUTION_INSTANCE }) },
      },
      {
        name: "POST /instance/connect {instance}",
        url: `${baseUrl}/instance/connect`,
        init: { method: "POST", body: JSON.stringify({ instance: EVOLUTION_INSTANCE }) },
      },
      {
        name: "PUT /instance/restart/{instance}",
        url: `${baseUrl}/instance/restart/${EVOLUTION_INSTANCE}`,
        init: { method: "PUT" },
      },
      {
        name: "PUT /instance/restart {instanceName}",
        url: `${baseUrl}/instance/restart`,
        init: { method: "PUT", body: JSON.stringify({ instanceName: EVOLUTION_INSTANCE }) },
      },
    ];

    for (const attempt of recoveryAttempts) {
      try {
        const res = await tryRequest(attempt.url, attempt.init);
        if (res.ok) {
          console.log(`Recovery ok via ${attempt.name}:`, res.txt);
          await new Promise((r) => setTimeout(r, 1500));
          const after = await getConnectionState();
          console.error(`Instance state after recovery: ${after || "unknown"}`);
          return after === "open" || after === null;
        }
        console.error(`Recovery failed via ${attempt.name} (${res.status}):`, res.txt);
      } catch (e) {
        console.error(`Recovery error via ${attempt.name}:`, e);
      }
    }

    return false;
  };

  console.log(`Sending message to ${cleanNumber} via ${sendUrl}`);
  console.log(`Message preview: ${message.substring(0, 100)}...`);

  for (const body of candidates) {
    const first = await trySend(body);
    if (first.ok) {
      console.log("Message sent successfully:", first.txt);
      return;
    }

    console.error(`Error sending WhatsApp message (${first.status}):`, first.txt);
    console.error(`URL used: ${sendUrl}`);
    console.error(`Number used: ${cleanNumber}`);

    // Se for "Connection Closed", tenta recuperar a instância e reenviar apenas 1 vez.
    if (first.txt.includes("Connection Closed")) {
      const recovered = await recoverInstanceConnection();
      if (!recovered) return;

      const retry = await trySend(body);
      if (retry.ok) {
        console.log("Message sent successfully after recovery:", retry.txt);
      } else {
        console.error(`Retry after recovery failed (${retry.status}):`, retry.txt);
      }
      return;
    }
  }
}

// Envia mensagem de resposta via Evolution API
async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  // Evolution API v2 endpoint format - remove trailing slash from URL if present
  const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;
  
  // Format number - Evolution API expects just the number without @s.whatsapp.net
  const cleanNumber = to.replace("@s.whatsapp.net", "").replace("@g.us", "");
  
  console.log(`Sending message to ${cleanNumber} via ${url}`);
  console.log(`Message preview: ${message.substring(0, 100)}...`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Error sending WhatsApp message (${response.status}):`, responseText);
      console.error(`URL used: ${url}`);
      console.error(`Number used: ${cleanNumber}`);
      console.error(`API Key (first 10 chars): ${EVOLUTION_API_KEY.substring(0, 10)}...`);
    } else {
      console.log("Message sent successfully:", responseText);
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
  }
}

// Processa comandos e retorna resposta
async function processCommand(command: string, supabase: SupabaseClient): Promise<string> {
  const cmd = command.toLowerCase().trim();

  // Comando de ajuda
  if (cmd === "ajuda" || cmd === "help" || cmd === "?") {
    return `🤖 *AtletaID Bot - Comandos Disponíveis*

📊 *Resumo Geral:*
• \`resumo\` - Visão geral do sistema
• \`escolas\` - Total de escolas cadastradas
• \`alunos\` - Total de alunos ativos
• \`faturamento\` - Resumo financeiro

🏫 *Por Escola:*
• \`escola [nome]\` - Dados de uma escola específica
• \`listar escolas\` - Lista todas as escolas

💰 *Financeiro:*
• \`inadimplentes\` - Escolas com pagamento atrasado
• \`mes atual\` - Faturamento do mês

Digite qualquer comando para começar!`;
  }

  // Resumo geral
  if (cmd === "resumo" || cmd === "dashboard" || cmd === "status") {
    // Total de escolas
    const { count: totalEscolas } = await supabase
      .from("escolinhas")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true);

    // Total de alunos ativos
    const { count: totalAlunos } = await supabase
      .from("criancas")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true);

    // Faturamento do mês (SaaS)
    const mesAtual = new Date().toISOString().substring(0, 7) + "-01";
    const { data: cobrancasMes } = await supabase
      .from("historico_cobrancas")
      .select("valor, status")
      .gte("mes_referencia", mesAtual);

    const cobrancasArray = (cobrancasMes || []) as Array<{ valor: number; status: string }>;
    const faturamentoMes = cobrancasArray.reduce((acc, c) => acc + (c.status === "pago" ? Number(c.valor) : 0), 0);
    const pendenteMes = cobrancasArray.reduce((acc, c) => acc + (c.status === "pendente" ? Number(c.valor) : 0), 0);

    // Acessos últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const { count: acessos7dias } = await supabase
      .from("acessos_log")
      .select("*", { count: "exact", head: true })
      .gte("accessed_at", seteDiasAtras.toISOString());

    return `📊 *Resumo AtletaID*

🏫 *Escolas Ativas:* ${totalEscolas || 0}
👦 *Alunos Ativos:* ${totalAlunos || 0}

💰 *Faturamento do Mês:*
• Recebido: R$ ${faturamentoMes.toFixed(2)}
• Pendente: R$ ${pendenteMes.toFixed(2)}

📱 *Acessos (7 dias):* ${acessos7dias || 0}

_Atualizado em ${new Date().toLocaleString("pt-BR")}_`;
  }

  // Total de escolas
  if (cmd === "escolas" || cmd === "schools") {
    const { data: escolas, count } = await supabase
      .from("escolinhas")
      .select("nome, status, ativo", { count: "exact" })
      .eq("ativo", true);

    const escolasArray = (escolas || []) as Array<{ nome: string; status: string; ativo: boolean }>;
    const porStatus = escolasArray.reduce((acc: Record<string, number>, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    let statusText = "";
    for (const [status, qtd] of Object.entries(porStatus)) {
      statusText += `• ${status}: ${qtd}\n`;
    }

    return `🏫 *Escolas Cadastradas*

Total: *${count || 0}*

Por status:
${statusText || "• Nenhuma escola"}

Digite \`listar escolas\` para ver a lista completa.`;
  }

  // Listar escolas
  if (cmd === "listar escolas" || cmd === "list schools") {
    const { data: escolas } = await supabase
      .from("escolinhas")
      .select("nome, status")
      .eq("ativo", true)
      .order("nome");

    const escolasArray = (escolas || []) as Array<{ nome: string; status: string }>;
    if (escolasArray.length === 0) {
      return "Nenhuma escola cadastrada.";
    }

    let lista = "🏫 *Lista de Escolas*\n\n";
    escolasArray.forEach((e, i) => {
      const emoji = e.status === "ativa" ? "✅" : "⚠️";
      lista += `${i + 1}. ${emoji} ${e.nome}\n`;
    });

    lista += `\nDigite \`escola [nome]\` para detalhes.`;
    return lista;
  }

  // Total de alunos
  if (cmd === "alunos" || cmd === "students") {
    const { count: totalAtivos } = await supabase
      .from("criancas")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true);

    const { count: totalInativos } = await supabase
      .from("criancas")
      .select("*", { count: "exact", head: true })
      .eq("ativo", false);

    // Alunos por escola
    const { data: alunosPorEscola } = await supabase
      .from("crianca_escolinha")
      .select(`
        escolinha_id,
        escolinhas!inner(nome),
        ativo
      `)
      .eq("ativo", true);

    const alunosArray = (alunosPorEscola || []) as unknown as Array<{ escolinha_id: string; escolinhas: { nome: string }; ativo: boolean }>;
    const porEscola: Record<string, number> = {};
    alunosArray.forEach(a => {
      const nome = a.escolinhas?.nome || "Sem escola";
      porEscola[nome] = (porEscola[nome] || 0) + 1;
    });

    let escolasList = "";
    for (const [escola, qtd] of Object.entries(porEscola).sort((a, b) => b[1] - a[1])) {
      escolasList += `• ${escola}: ${qtd}\n`;
    }

    return `👦 *Alunos*

✅ Ativos: *${totalAtivos || 0}*
❌ Inativos: *${totalInativos || 0}*

📊 *Por Escola:*
${escolasList || "• Nenhum aluno matriculado"}`;
  }

  // Faturamento
  if (cmd === "faturamento" || cmd === "financeiro" || cmd === "revenue") {
    // Últimos 3 meses
    const { data: cobrancas } = await supabase
      .from("historico_cobrancas")
      .select("valor, status, mes_referencia")
      .order("mes_referencia", { ascending: false })
      .limit(100);

    const cobrancasArray = (cobrancas || []) as Array<{ valor: number; status: string; mes_referencia: string }>;
    const porMes: Record<string, { pago: number; pendente: number }> = {};
    cobrancasArray.forEach(c => {
      const mes = c.mes_referencia.substring(0, 7);
      if (!porMes[mes]) porMes[mes] = { pago: 0, pendente: 0 };
      if (c.status === "pago") {
        porMes[mes].pago += Number(c.valor);
      } else {
        porMes[mes].pendente += Number(c.valor);
      }
    });

    let faturamentoText = "";
    const meses = Object.keys(porMes).sort().reverse().slice(0, 3);
    meses.forEach(mes => {
      const { pago, pendente } = porMes[mes];
      const mesNome = new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      faturamentoText += `📅 *${mesNome}*\n`;
      faturamentoText += `   ✅ Recebido: R$ ${pago.toFixed(2)}\n`;
      faturamentoText += `   ⏳ Pendente: R$ ${pendente.toFixed(2)}\n\n`;
    });

    return `💰 *Faturamento SaaS*

${faturamentoText || "Nenhuma cobrança encontrada."}

Digite \`inadimplentes\` para ver escolas em atraso.`;
  }

  // Inadimplentes
  if (cmd === "inadimplentes" || cmd === "atrasados") {
    const { data: financeiro } = await supabase
      .from("escolinha_financeiro")
      .select(`
        status,
        escolinhas!inner(nome)
      `)
      .neq("status", "em_dia");

    const financeiroArray = (financeiro || []) as unknown as Array<{ status: string; escolinhas: { nome: string } }>;
    if (financeiroArray.length === 0) {
      return "✅ Nenhuma escola inadimplente! 🎉";
    }

    let lista = "⚠️ *Escolas Inadimplentes*\n\n";
    financeiroArray.forEach((f, i) => {
      const nome = f.escolinhas?.nome || "Desconhecida";
      const emoji = f.status === "suspenso" ? "🔴" : "🟡";
      lista += `${i + 1}. ${emoji} ${nome} (${f.status})\n`;
    });

    return lista;
  }

  // Mes atual
  if (cmd === "mes atual" || cmd === "mes" || cmd === "this month") {
    const mesAtual = new Date().toISOString().substring(0, 7) + "-01";
    
    const { data: cobrancas } = await supabase
      .from("historico_cobrancas")
      .select(`
        valor,
        status,
        escolinhas!inner(nome)
      `)
      .gte("mes_referencia", mesAtual);

    const cobrancasArray = (cobrancas || []) as unknown as Array<{ valor: number; status: string; escolinhas: { nome: string } }>;
    if (cobrancasArray.length === 0) {
      return "Nenhuma cobrança gerada para este mês.";
    }

    let totalPago = 0;
    let totalPendente = 0;
    let detalhes = "";

    cobrancasArray.forEach(c => {
      const nome = c.escolinhas?.nome || "Desconhecida";
      const valor = Number(c.valor);
      const emoji = c.status === "pago" ? "✅" : "⏳";
      
      if (c.status === "pago") totalPago += valor;
      else totalPendente += valor;
      
      detalhes += `${emoji} ${nome}: R$ ${valor.toFixed(2)}\n`;
    });

    const mesNome = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    return `📅 *Faturamento ${mesNome}*

💵 Total Recebido: *R$ ${totalPago.toFixed(2)}*
⏳ Total Pendente: *R$ ${totalPendente.toFixed(2)}*

*Detalhes:*
${detalhes}`;
  }

  // Buscar escola específica
  if (cmd.startsWith("escola ")) {
    const nomeBusca = cmd.replace("escola ", "").trim();
    
    const { data: escolas } = await supabase
      .from("escolinhas")
      .select("*")
      .ilike("nome", `%${nomeBusca}%`)
      .limit(1);

    const escolasArray = (escolas || []) as Array<{
      id: string;
      nome: string;
      status: string;
      nome_responsavel: string;
      telefone: string;
      email: string;
    }>;

    if (escolasArray.length === 0) {
      return `❌ Escola "${nomeBusca}" não encontrada.\n\nDigite \`listar escolas\` para ver todas.`;
    }

    const escola = escolasArray[0];

    // Buscar alunos ativos
    const { count: totalAlunos } = await supabase
      .from("crianca_escolinha")
      .select("*", { count: "exact", head: true })
      .eq("escolinha_id", escola.id)
      .eq("ativo", true);

    // Buscar turmas
    const { count: totalTurmas } = await supabase
      .from("turmas")
      .select("*", { count: "exact", head: true })
      .eq("escolinha_id", escola.id)
      .eq("ativo", true);

    // Buscar professores
    const { count: totalProfessores } = await supabase
      .from("professores")
      .select("*", { count: "exact", head: true })
      .eq("escolinha_id", escola.id)
      .eq("ativo", true);

    // Status financeiro
    const { data: financeiro } = await supabase
      .from("escolinha_financeiro")
      .select("status, valor_mensal")
      .eq("escolinha_id", escola.id)
      .maybeSingle();

    const financeiroData = financeiro as { status: string; valor_mensal: number } | null;
    const statusEmoji = escola.status === "ativa" ? "✅" : "⚠️";
    const financeiroEmoji = financeiroData?.status === "em_dia" ? "✅" : "🔴";

    return `🏫 *${escola.nome}*

📍 *Status:* ${statusEmoji} ${escola.status}
💰 *Financeiro:* ${financeiroEmoji} ${financeiroData?.status || "N/A"}
📋 *Plano:* R$ ${financeiroData?.valor_mensal?.toFixed(2) || "0.00"}/mês

📊 *Números:*
• 👦 Alunos: ${totalAlunos || 0}
• 📚 Turmas: ${totalTurmas || 0}
• 👨‍🏫 Professores: ${totalProfessores || 0}

👤 *Responsável:* ${escola.nome_responsavel || "N/A"}
📞 *Telefone:* ${escola.telefone || "N/A"}
📧 *Email:* ${escola.email || "N/A"}`;
  }

  // Comando não reconhecido
  return `❓ Comando não reconhecido: "${command}"

Digite *ajuda* para ver os comandos disponíveis.`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar configuração
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      console.error("Evolution API not configured");
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WhatsAppMessage = await req.json();

    const fromMe = Boolean(payload?.data?.key?.fromMe);
    const source = payload?.data?.source;
    const remoteJid = payload?.data?.key?.remoteJid;
    const remoteJidAlt = payload?.data?.key?.remoteJidAlt;
    const messagePreview = (() => {
      try {
        return extractMessageText(payload.data).slice(0, 80);
      } catch {
        return "";
      }
    })();

    // Log sanitizado (evita vazar apikey do webhook)
    console.log(
      "Received webhook:",
      JSON.stringify(
        {
          event: payload?.event,
          instance: payload?.instance,
          fromMe,
          source,
          remoteJid,
          remoteJidAlt,
          messagePreview,
        },
        null,
        2,
      ),
    );

    // Processa somente messages.upsert.
    // Por padrão ignoramos fromMe (para evitar loops), mas aceitamos comandos enviados via painel web (source=web).
    const allowFromMeWeb = fromMe && source === "web";
    if (payload.event !== "messages.upsert" || (fromMe && !allowFromMeWeb)) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNumber = extractPhoneNumber(payload.data.key.remoteJid, payload.data.key.remoteJidAlt);
    const messageText = extractMessageText(payload.data);

    console.log(`Message from ${phoneNumber}: ${messageText}`);

    // Verifica autorização
    if (!isAuthorized(phoneNumber)) {
      console.log(`Unauthorized number: ${phoneNumber}`);
      await sendWhatsAppMessageResilient(
        phoneNumber,
        "⛔ Acesso não autorizado. Este bot é restrito a administradores."
      );
      return new Response(JSON.stringify({ status: "unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Processa o comando
    const response = await processCommand(messageText, supabase);

    // Envia resposta
    await sendWhatsAppMessageResilient(phoneNumber, response);

    return new Response(
      JSON.stringify({ status: "processed", command: messageText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
