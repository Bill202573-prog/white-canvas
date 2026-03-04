import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterStudentInitialRequest {
  // Student data
  nome: string;
  dataNascimento: string;
  fotoUrl?: string;
  cpf?: string;
  
  // Guardian data (without creating auth user)
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone?: string;
  responsavelCpf?: string;
  parentesco?: string;
  
  // Address data (optional)
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  
  // Financial data for enrollment
  valorMensalidade?: number;
  diaVencimento?: number;
  valorMatricula?: number;
  valorUniforme?: number;
  
  // Sport category
  categoria?: string;
  
  // Turma (optional)
  turmaId?: string;
  
  // School ID
  escolinhaId: string;
}

// Normalize name for comparison (lowercase, trim, collapse spaces)
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RegisterStudentInitialRequest = await req.json();
    const { 
      nome, dataNascimento, fotoUrl, cpf, 
      responsavelNome, responsavelEmail, responsavelTelefone, responsavelCpf, parentesco, 
      escolinhaId,
      turmaId,
      valorMensalidade = 180,
      diaVencimento = 10,
      valorMatricula = 0,
      valorUniforme = 0,
      categoria = 'Futebol de Campo',
      cep, rua, numero, complemento, bairro, cidade, estado
    } = body;

    // Check if caller is a system admin or school admin
    const { data: callerRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const callerRole = callerRoleData?.role;
    const isSystemAdmin = callerRole === 'admin';
    const isSchoolRole = callerRole === 'school';

    if (isSystemAdmin) {
      const { data: escolinha, error: escolinhaError } = await supabaseAdmin
        .from("escolinhas")
        .select("id")
        .eq("id", escolinhaId)
        .single();
      
      if (escolinhaError || !escolinha) {
        return new Response(
          JSON.stringify({ error: "Escolinha não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (isSchoolRole) {
      const { data: escolinha, error: escolinhaError } = await supabaseAdmin
        .from("escolinhas")
        .select("id, admin_user_id")
        .eq("id", escolinhaId)
        .single();

      const isSchoolAdmin = escolinha?.admin_user_id === caller.id;

      if (escolinhaError || !escolinha || !isSchoolAdmin) {
        return new Response(
          JSON.stringify({ error: "Você não é admin desta escolinha" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para cadastrar alunos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if responsavel already exists by email first (most common case)
    let responsavel: any = null;
    let isExistingResponsavel = false;

    // First check responsaveis table by email (covers both with and without auth user)
    const { data: existingResponsavelByEmail } = await supabaseAdmin
      .from("responsaveis")
      .select("*")
      .eq("email", responsavelEmail.toLowerCase())
      .maybeSingle();

    if (existingResponsavelByEmail) {
      responsavel = existingResponsavelByEmail;
      isExistingResponsavel = true;
    }



    // Create responsavel record WITHOUT creating auth user (will be created when sending credentials)
    if (!responsavel) {
      const { data: newResponsavel, error: responsavelError } = await supabaseAdmin
        .from("responsaveis")
        .insert({
          user_id: null, // Will be updated when auth user is created via send-guardian-credentials
          nome: responsavelNome,
          email: responsavelEmail.toLowerCase(),
          telefone: responsavelTelefone || null,
          cpf: responsavelCpf || null,
          ativo: true,
          cep: cep || null,
          rua: rua || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
        })
        .select()
        .single();

      if (responsavelError) {
        console.error("Error creating responsavel:", responsavelError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar responsável: " + responsavelError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      responsavel = newResponsavel;
    }

    // Check if child already exists for this responsavel
    let crianca: any = null;
    let isExistingChild = false;

    const { data: existingChildLinks } = await supabaseAdmin
      .from("crianca_responsavel")
      .select("crianca_id")
      .eq("responsavel_id", responsavel.id);

    if (existingChildLinks && existingChildLinks.length > 0) {
      const childIds = existingChildLinks.map(link => link.crianca_id);
      
      const { data: existingChildren } = await supabaseAdmin
        .from("criancas")
        .select("*")
        .in("id", childIds);

      if (existingChildren) {
        const normalizedInputName = normalizeName(nome);
        const matchingChild = existingChildren.find(child => {
          const normalizedChildName = normalizeName(child.nome);
          return normalizedChildName === normalizedInputName && 
                 child.data_nascimento === dataNascimento;
        });

        if (matchingChild) {
          crianca = matchingChild;
          isExistingChild = true;
        }
      }
    }

    // Create new child if not exists
    if (!crianca) {
      const { data: newCrianca, error: criancaError } = await supabaseAdmin
        .from("criancas")
        .insert({
          nome,
          data_nascimento: dataNascimento,
          foto_url: fotoUrl || null,
          cpf_hash: cpf || null,
          ativo: true, // Aluno ativo por padrão, só inativa se a escola desativar manualmente
          valor_mensalidade: valorMensalidade,
          dia_vencimento: diaVencimento,
          forma_cobranca: 'mensal',
          data_inicio_cobranca: new Date().toISOString().split('T')[0],
          status_financeiro: 'ativo',
        })
        .select()
        .single();

      if (criancaError) {
        console.error("Error creating crianca:", criancaError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar aluno: " + criancaError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      crianca = newCrianca;

      // Link child to guardian
      const { error: linkGuardianError } = await supabaseAdmin
        .from("crianca_responsavel")
        .insert({
          crianca_id: crianca.id,
          responsavel_id: responsavel.id,
          parentesco: parentesco || null,
        });

      if (linkGuardianError) {
        console.error("Error linking to guardian:", linkGuardianError);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular aluno ao responsável: " + linkGuardianError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if child is already linked to this school
    const { data: existingSchoolLink } = await supabaseAdmin
      .from("crianca_escolinha")
      .select("id")
      .eq("crianca_id", crianca.id)
      .eq("escolinha_id", escolinhaId)
      .maybeSingle();

    if (existingSchoolLink) {
      return new Response(
        JSON.stringify({
          success: true,
          crianca,
          responsavel,
          alreadyLinkedToSchool: true,
          message: "Este aluno já está vinculado a esta escolinha",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link child to school with enrollment values
    const { error: linkSchoolError } = await supabaseAdmin
      .from("crianca_escolinha")
      .insert({
        crianca_id: crianca.id,
        escolinha_id: escolinhaId,
        ativo: true,
        status_matricula: 'pendente',
        valor_matricula: valorMatricula,
        valor_uniforme: valorUniforme,
        entrada_paga: false,
        categoria: categoria,
      });

    if (linkSchoolError) {
      console.error("Error linking to school:", linkSchoolError);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular aluno à escolinha: " + linkSchoolError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link child to turma if provided
    if (turmaId) {
      const { data: existingTurmaLink } = await supabaseAdmin
        .from("crianca_turma")
        .select("id")
        .eq("crianca_id", crianca.id)
        .eq("turma_id", turmaId)
        .maybeSingle();

      if (!existingTurmaLink) {
        const { error: linkTurmaError } = await supabaseAdmin
          .from("crianca_turma")
          .insert({
            crianca_id: crianca.id,
            turma_id: turmaId,
            ativo: true,
          });

        if (linkTurmaError) {
          console.error("Error linking to turma:", linkTurmaError);
        }
      }
    }

    console.log("Student registered successfully:", {
      criancaId: crianca.id,
      responsavelId: responsavel.id,
      escolinhaId,
      isExistingChild,
      isExistingResponsavel,
    });

    return new Response(
      JSON.stringify({
        success: true,
        crianca,
        responsavel,
        isExistingChild,
        isExistingResponsavel,
        message: "Aluno cadastrado com sucesso. Preencha os dados financeiros e gere a cobrança de entrada.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
