import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tipo } = await req.json();
    let result: any = {};

    switch (tipo) {
      case "seguranca": {
        // Check each known table by querying with service role and counting
        const knownTables = [
          'profiles', 'user_roles', 'escolinhas', 'criancas', 'turmas',
          'professores', 'responsaveis', 'crianca_escolinha', 'crianca_turma',
          'crianca_responsavel', 'aulas', 'presencas', 'mensalidades',
          'comunicados', 'comunicados_escola', 'eventos_esportivos',
          'posts_atleta', 'perfil_atleta', 'post_likes', 'post_comentarios',
          'atividades_externas', 'campeonatos', 'campeonato_convocacoes',
          'amistoso_convocacoes', 'pedidos', 'pedido_itens', 'produtos',
          'produto_tamanhos', 'cobrancas_entrada', 'escola_cadastro_bancario',
          'escolinha_financeiro', 'historico_cobrancas', 'acessos_log',
          'motivos_cancelamento', 'motivos_aula_extra', 'escola_documentos',
          'perfis_rede', 'rede_conexoes', 'posts_escola', 'conquistas_coletivas',
          'evento_gols', 'evento_times', 'evento_time_alunos', 'evento_premiacoes',
          'comunicado_leituras', 'comunicado_escola_leituras',
          'atleta_follows', 'saas_config', 'indicacoes',
          'atividades_externas_whitelist', 'escola_asaas_jobs',
          'escola_asaas_admin_notifications', 'turma_assistentes',
        ];

        // Also test with anon key (no auth) to check if tables leak data publicly
        const publicClient = createClient(supabaseUrl, anonKey);

        const secResults: any[] = [];
        for (const tabela of knownTables) {
          try {
            // Count with service role (total records)
            const { count: totalCount, error: svcErr } = await serviceClient
              .from(tabela as any)
              .select("*", { count: "exact", head: true });

            // Count with anon (no auth) - should be 0 for protected tables
            const { count: publicCount, error: pubErr } = await publicClient
              .from(tabela as any)
              .select("*", { count: "exact", head: true });

            const rlsProtegido = pubErr !== null || (publicCount ?? 0) === 0;

            secResults.push({
              tabela,
              registros: totalCount ?? 0,
              rls_protegido: rlsProtegido,
              registros_publicos: pubErr ? 0 : (publicCount ?? 0),
              erro: svcErr?.message || null,
            });
          } catch {
            secResults.push({ tabela, registros: 0, rls_protegido: true, registros_publicos: 0, erro: "Tabela não encontrada" });
          }
        }

        const protegidas = secResults.filter(t => t.rls_protegido && !t.erro);
        const expostas = secResults.filter(t => !t.rls_protegido && !t.erro);
        const naoEncontradas = secResults.filter(t => t.erro);

        result = {
          tabelas: secResults,
          resumo: {
            total: secResults.length,
            protegidas: protegidas.length,
            expostas: expostas.length,
            nao_encontradas: naoEncontradas.length,
          }
        };
        break;
      }

      case "erros": {
        const checks: any[] = [];

        // 1. Expired PIX still pending
        const { count: pixExpirados } = await serviceClient
          .from("mensalidades")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .lt("data_vencimento", new Date().toISOString().split("T")[0]);

        checks.push({
          nome: "PIX expirados ainda pendentes",
          tipo: "warning",
          count: pixExpirados ?? 0,
          descricao: "Mensalidades com vencimento passado ainda com status pendente",
        });

        // 2. Inactive children in active turmas
        const { data: allCriancaTurma } = await serviceClient
          .from("crianca_turma")
          .select("id, crianca_id")
          .eq("ativo", true);

        let inactiveInTurmaCount = 0;
        if (allCriancaTurma && allCriancaTurma.length > 0) {
          const criancaIds = [...new Set(allCriancaTurma.map((ct: any) => ct.crianca_id))];
          const { data: inactiveCriancas } = await serviceClient
            .from("criancas")
            .select("id")
            .in("id", criancaIds)
            .eq("ativo", false);
          inactiveInTurmaCount = inactiveCriancas?.length ?? 0;
        }

        checks.push({
          nome: "Crianças inativas em turmas ativas",
          tipo: "warning",
          count: inactiveInTurmaCount,
          descricao: "Alunos inativos que ainda estão vinculados a turmas ativas",
        });

        // 3. Escolinhas without admin
        const { count: escolinhasSemAdmin } = await serviceClient
          .from("escolinhas")
          .select("id", { count: "exact", head: true })
          .is("admin_user_id", null)
          .eq("ativo", true);

        checks.push({
          nome: "Escolinhas ativas sem administrador",
          tipo: "error",
          count: escolinhasSemAdmin ?? 0,
          descricao: "Escolas ativas que não possuem um usuário administrador vinculado",
        });

        // 4. Turmas without professor
        const { count: turmasSemProf } = await serviceClient
          .from("turmas")
          .select("id", { count: "exact", head: true })
          .is("professor_id", null)
          .eq("status", "ativa");

        checks.push({
          nome: "Turmas ativas sem professor",
          tipo: "warning",
          count: turmasSemProf ?? 0,
          descricao: "Turmas com status ativo mas sem professor vinculado",
        });

        // 5. Cobrancas de entrada pendentes há mais de 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: cobrancasAntigas } = await serviceClient
          .from("cobrancas_entrada")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .lt("created_at", thirtyDaysAgo.toISOString());

        checks.push({
          nome: "Cobranças de entrada pendentes há +30 dias",
          tipo: "info",
          count: cobrancasAntigas ?? 0,
          descricao: "Cobranças de matrícula/entrada que estão pendentes há mais de 30 dias",
        });

        result = { checks };
        break;
      }

      case "saude": {
        const mainTables = [
          'escolinhas', 'criancas', 'responsaveis', 'professores', 'turmas',
          'aulas', 'presencas', 'mensalidades', 'perfil_atleta', 'posts_atleta',
          'comunicados_escola', 'eventos_esportivos', 'pedidos', 'acessos_log',
          'perfis_rede', 'rede_conexoes', 'user_roles', 'profiles',
        ];

        const tableCounts: any[] = [];
        for (const t of mainTables) {
          try {
            const { count } = await serviceClient
              .from(t as any)
              .select("*", { count: "exact", head: true });
            tableCounts.push({ tabela: t, registros: count ?? 0 });
          } catch {
            tableCounts.push({ tabela: t, registros: -1 });
          }
        }

        // Children without guardian - get all active children and check
        const { data: allActiveCriancas } = await serviceClient
          .from("criancas")
          .select("id, nome")
          .eq("ativo", true);

        const { data: allCriancaResp } = await serviceClient
          .from("crianca_responsavel")
          .select("crianca_id");

        const criancaIdsComResp = new Set((allCriancaResp || []).map((cr: any) => cr.crianca_id));
        const semResponsavel = (allActiveCriancas || []).filter((c: any) => !criancaIdsComResp.has(c.id)).slice(0, 10);

        // Children without school
        const { data: allCriancaEsc } = await serviceClient
          .from("crianca_escolinha")
          .select("crianca_id")
          .eq("ativo", true);

        const criancaIdsComEsc = new Set((allCriancaEsc || []).map((ce: any) => ce.crianca_id));
        const semEscola = (allActiveCriancas || []).filter((c: any) => !criancaIdsComEsc.has(c.id)).slice(0, 10);

        // Storage bucket sizes
        const buckets = ['escolinha-logos', 'child-photos', 'atleta-posts', 'atleta-fotos', 'escola-posts', 'product-photos'];
        const storageSizes: any[] = [];
        for (const b of buckets) {
          try {
            const { data: files } = await serviceClient.storage.from(b).list("", { limit: 1000 });
            storageSizes.push({ bucket: b, arquivos: files?.length ?? 0 });
          } catch {
            storageSizes.push({ bucket: b, arquivos: 0 });
          }
        }

        result = {
          tableCounts,
          criancasSemResponsavel: semResponsavel,
          criancasSemEscola: semEscola,
          storageSizes,
        };
        break;
      }

      case "performance": {
        const perfChecks: any[] = [];
        const largeTables = [
          'presencas', 'aulas', 'mensalidades', 'acessos_log',
          'posts_atleta', 'post_likes', 'post_comentarios',
        ];

        for (const t of largeTables) {
          try {
            const { count } = await serviceClient
              .from(t as any)
              .select("*", { count: "exact", head: true });
            perfChecks.push({
              tabela: t,
              registros: count ?? 0,
              status: (count ?? 0) > 50000 ? "warning" : (count ?? 0) > 10000 ? "info" : "ok",
              sugestao: (count ?? 0) > 50000
                ? "Tabela com muitos registros. Considere criar índices adicionais."
                : null,
            });
          } catch {
            perfChecks.push({ tabela: t, registros: -1, status: "error" });
          }
        }

        const queryTests: any[] = [];
        const queries = [
          { label: "COUNT presencas", table: "presencas", filter: null },
          { label: "Mensalidades pendentes", table: "mensalidades", filter: { key: "status", val: "pendente" } },
          { label: "COUNT acessos_log", table: "acessos_log", filter: null },
          { label: "COUNT posts_atleta", table: "posts_atleta", filter: null },
        ];

        for (const q of queries) {
          const start = Date.now();
          let query = serviceClient.from(q.table as any).select("id", { count: "exact", head: true });
          if (q.filter) query = query.eq(q.filter.key, q.filter.val);
          await query;
          queryTests.push({ query: q.label, tempo_ms: Date.now() - start });
        }

        result = { tabelas: perfChecks, queryTests };
        break;
      }

      case "armazenamento": {
        // Storage usage per bucket - list all files recursively
        const storageBuckets = [
          'escolinha-logos', 'child-photos', 'atleta-posts', 'atleta-fotos',
          'escola-posts', 'product-photos', 'atividade-externa-fotos', 'escola-documentos',
        ];

        const bucketDetails: any[] = [];
        let totalSize = 0;
        let totalFiles = 0;

        for (const bucketName of storageBuckets) {
          try {
            // List files with metadata
            const { data: files, error: listErr } = await serviceClient.storage
              .from(bucketName)
              .list("", { limit: 10000 });

            let bucketSize = 0;
            let fileCount = 0;

            if (files && !listErr) {
              // For root-level items, check if they are folders
              for (const item of files) {
                if (item.metadata?.size) {
                  bucketSize += item.metadata.size;
                  fileCount++;
                } else {
                  // It's a folder, list contents
                  const { data: subFiles } = await serviceClient.storage
                    .from(bucketName)
                    .list(item.name, { limit: 10000 });
                  if (subFiles) {
                    for (const sf of subFiles) {
                      if (sf.metadata?.size) {
                        bucketSize += sf.metadata.size;
                        fileCount++;
                      }
                    }
                  }
                }
              }
            }

            totalSize += bucketSize;
            totalFiles += fileCount;

            bucketDetails.push({
              bucket: bucketName,
              arquivos: fileCount,
              tamanho_bytes: bucketSize,
              tamanho_mb: Number((bucketSize / (1024 * 1024)).toFixed(2)),
            });
          } catch {
            bucketDetails.push({ bucket: bucketName, arquivos: 0, tamanho_bytes: 0, tamanho_mb: 0 });
          }
        }

        // Database size estimate via pg_database_size
        let dbSizeBytes = 0;
        let dbSizeMb = 0;
        try {
          const { data: sizeData } = await serviceClient.rpc('pg_database_size_estimate' as any);
          if (sizeData) {
            dbSizeBytes = Number(sizeData);
            dbSizeMb = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));
          }
        } catch { /* function may not exist */ }

        // User counts
        let totalUsers = 0;
        let totalResponsaveis = 0;
        let totalProfessores = 0;
        let totalEscolinhas = 0;
        let totalPerfisAtleta = 0;
        let totalPerfisRede = 0;

        const { count: usersCount } = await serviceClient
          .from("profiles" as any)
          .select("*", { count: "exact", head: true });
        totalUsers = usersCount ?? 0;

        const { count: respCount } = await serviceClient
          .from("responsaveis")
          .select("*", { count: "exact", head: true });
        totalResponsaveis = respCount ?? 0;

        const { count: profCount } = await serviceClient
          .from("professores")
          .select("*", { count: "exact", head: true });
        totalProfessores = profCount ?? 0;

        const { count: escCount } = await serviceClient
          .from("escolinhas")
          .select("*", { count: "exact", head: true })
          .eq("ativo", true);
        totalEscolinhas = escCount ?? 0;

        const { count: atletaCount } = await serviceClient
          .from("perfil_atleta")
          .select("*", { count: "exact", head: true });
        totalPerfisAtleta = atletaCount ?? 0;

        const { count: redeCount } = await serviceClient
          .from("perfis_rede")
          .select("*", { count: "exact", head: true });
        totalPerfisRede = redeCount ?? 0;

        // Posts count
        const { count: postsCount } = await serviceClient
          .from("posts_atleta")
          .select("*", { count: "exact", head: true });

        result = {
          storage: {
            buckets: bucketDetails,
            total_arquivos: totalFiles,
            total_bytes: totalSize,
            total_mb: Number((totalSize / (1024 * 1024)).toFixed(2)),
            total_gb: Number((totalSize / (1024 * 1024 * 1024)).toFixed(3)),
            limite_free_gb: 1,
            percentual_uso: Number(((totalSize / (1024 * 1024 * 1024)) * 100).toFixed(1)),
          },
          database: {
            tamanho_bytes: dbSizeBytes,
            tamanho_mb: dbSizeMb,
            limite_free_mb: 500,
          },
          usuarios: {
            total_profiles: totalUsers,
            responsaveis: totalResponsaveis,
            professores: totalProfessores,
            escolinhas_ativas: totalEscolinhas,
            perfis_atleta: totalPerfisAtleta,
            perfis_rede: totalPerfisRede,
            posts_atleta: postsCount ?? 0,
          },
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Tipo de diagnóstico inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
