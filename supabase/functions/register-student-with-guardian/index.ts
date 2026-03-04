import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterStudentRequest {
  // Student data
  nome: string;
  dataNascimento: string;
  fotoUrl?: string;
  cpf?: string;
  
  // Financial data
  valorMensalidade?: number;
  diaVencimento?: number;
  formaCobranca?: 'mensal' | 'isento';
  dataInicioCobranca?: string;
  statusFinanceiro?: 'ativo' | 'suspenso' | 'isento';
  
  // Guardian data
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone?: string;
  responsavelCpf?: string;
  parentesco?: string;
  
  // Turma (optional)
  turmaId?: string;
  
  // Sport category
  categoria?: string;
  
  // School ID
  escolinhaId: string;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Normalize name for comparison (lowercase, trim, collapse spaces)
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Generate mensalidades for a student based on their financial settings
async function generateMensalidades(
  supabaseAdmin: any,
  criancaId: string,
  escolinhaId: string,
  valorMensalidade: number,
  diaVencimento: number,
  formaCobranca: string,
  dataInicioCobranca: string,
  statusFinanceiro: string
) {
  // Only generate for active students with mensal billing
  if (formaCobranca === 'isento' || statusFinanceiro !== 'ativo') {
    return;
  }

  const today = new Date();
  const startDate = new Date(dataInicioCobranca);
  
  // Generate for current month if start date is in the past or current month
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  
  // Only generate current month mensalidade if start date is in the past or this month
  if (startYear > currentYear || (startYear === currentYear && startMonth > currentMonth)) {
    return; // Start date is in the future, don't generate yet
  }
  
  const mesReferencia = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  
  // Check if mensalidade already exists for this month
  const { data: existing } = await supabaseAdmin
    .from('mensalidades')
    .select('id')
    .eq('crianca_id', criancaId)
    .eq('mes_referencia', mesReferencia)
    .maybeSingle();
  
  if (existing) {
    return; // Already exists
  }
  
  // Calculate vencimento date
  const vencimentoDate = new Date(currentYear, currentMonth - 1, diaVencimento);
  
  // Determine status (if past due date, mark as atrasado)
  let status = 'pendente';
  if (today > vencimentoDate) {
    status = 'atrasado';
  }
  
  // Create mensalidade
  await supabaseAdmin
    .from('mensalidades')
    .insert({
      crianca_id: criancaId,
      escolinha_id: escolinhaId,
      mes_referencia: mesReferencia,
      valor: valorMensalidade,
      data_vencimento: vencimentoDate.toISOString().split('T')[0],
      status,
      forma_pagamento: 'manual',
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is a school admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RegisterStudentRequest = await req.json();
    const { 
      nome, dataNascimento, fotoUrl, cpf, 
      responsavelNome, responsavelEmail, responsavelTelefone, responsavelCpf, parentesco, 
      escolinhaId,
      turmaId,
      categoria = 'Futebol de Campo',
      valorMensalidade = 180,
      diaVencimento = 10,
      formaCobranca = 'mensal',
      dataInicioCobranca = new Date().toISOString().split('T')[0],
      statusFinanceiro = 'ativo'
    } = body;

    // Check if caller is a system admin (role='admin') or school admin (role='school')
    const { data: callerRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const callerRole = callerRoleData?.role;
    const isSystemAdmin = callerRole === 'admin';
    const isSchoolRole = callerRole === 'school';

    // System admins can register students to any school
    if (isSystemAdmin) {
      // For system admin, just verify the escolinha exists
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
      // For school role, verify the caller is admin of THIS school
      const { data: escolinha, error: escolinhaError } = await supabaseAdmin
        .from("escolinhas")
        .select("id, admin_user_id")
        .eq("id", escolinhaId)
        .single();

      const isSchoolAdmin = escolinha?.admin_user_id === caller.id;

      if (escolinhaError || !escolinha || !isSchoolAdmin) {
        console.log("Authorization failed:", { isSchoolAdmin, callerRole, callerId: caller.id, schoolAdminId: escolinha?.admin_user_id });
        return new Response(
          JSON.stringify({ error: "Você não é admin desta escolinha" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Neither admin nor school role
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para cadastrar alunos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if guardian email already exists as an auth user
    // First, try to find by email using listUsers with filter
    const { data: existingUsersList } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = existingUsersList?.users?.find(u => u.email?.toLowerCase() === responsavelEmail.toLowerCase());
    
    let guardianUserId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

    // If not found via listUsers, also check responsaveis table (might be linked already)
    if (!existingUser) {
      const { data: existingResponsavelByEmail } = await supabaseAdmin
        .from("responsaveis")
        .select("user_id")
        .eq("email", responsavelEmail.toLowerCase())
        .maybeSingle();
      
      if (existingResponsavelByEmail?.user_id) {
        // User exists in responsaveis, get their auth user
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(existingResponsavelByEmail.user_id);
        if (userData?.user) {
          existingUser = userData.user;
        }
      }
    }

    if (existingUser) {
      // User already exists, use their ID
      // DO NOT generate a new password - the guardian keeps their existing credentials
      guardianUserId = existingUser.id;
      isNewUser = false;
      
      console.log("Guardian already exists, reusing credentials. No new password generated.");
      
      // Check if they already have a responsavel record
      const { data: existingResponsavel } = await supabaseAdmin
        .from("responsaveis")
        .select("id")
        .eq("user_id", guardianUserId)
        .maybeSingle();
      
      if (!existingResponsavel) {
        // Create responsavel record for existing user
        const { error: responsavelError } = await supabaseAdmin
          .from("responsaveis")
          .insert({
            user_id: guardianUserId,
            nome: responsavelNome,
            email: responsavelEmail.toLowerCase(),
            telefone: responsavelTelefone || null,
            cpf: responsavelCpf || null,
            ativo: true,
          });
        
        if (responsavelError) {
          console.error("Error creating responsavel:", responsavelError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar responsável: " + responsavelError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      // Try to create new auth user for guardian
      tempPassword = generateTempPassword();
      
      console.log("Attempting to create new guardian with temporary password");
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: responsavelEmail.toLowerCase(),
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          nome: responsavelNome,
        },
      });

      // Handle case where user already exists (email_exists error)
      if (createUserError) {
        if (createUserError.code === 'email_exists') {
          console.log("User already exists (detected via createUser error), fetching existing user");
          
          // Fetch the existing user by listing and filtering
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          existingUser = allUsers?.users?.find(u => u.email?.toLowerCase() === responsavelEmail.toLowerCase());
          
          if (existingUser) {
            guardianUserId = existingUser.id;
            isNewUser = false;
            tempPassword = null;
            
            // Check if they already have a responsavel record
            const { data: existingResponsavel } = await supabaseAdmin
              .from("responsaveis")
              .select("id")
              .eq("user_id", guardianUserId)
              .maybeSingle();
            
            if (!existingResponsavel) {
              // Create responsavel record for existing user
              const { error: responsavelError } = await supabaseAdmin
                .from("responsaveis")
                .insert({
                  user_id: guardianUserId,
                  nome: responsavelNome,
                  email: responsavelEmail.toLowerCase(),
                  telefone: responsavelTelefone || null,
                  cpf: responsavelCpf || null,
                  ativo: true,
                });
              
              if (responsavelError) {
                console.error("Error creating responsavel:", responsavelError);
                return new Response(
                  JSON.stringify({ error: "Erro ao criar responsável: " + responsavelError.message }),
                  { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          } else {
            // Couldn't find the user even after error, something is wrong
            console.error("Could not find existing user after email_exists error");
            return new Response(
              JSON.stringify({ error: "Erro ao verificar conta existente. Tente novamente." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error("Error creating user:", createUserError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar conta do responsável: " + createUserError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Successfully created new user
        guardianUserId = newUser.user.id;
        isNewUser = true;

        // Assign guardian role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: guardianUserId,
            role: "guardian",
          });

        if (roleError) {
          console.error("Error assigning role:", roleError);
        }

        // Create responsavel record with temporary password
        const { error: responsavelError } = await supabaseAdmin
          .from("responsaveis")
          .insert({
            user_id: guardianUserId,
            nome: responsavelNome,
            email: responsavelEmail.toLowerCase(),
            telefone: responsavelTelefone || null,
            cpf: responsavelCpf || null,
            ativo: true,
            senha_temporaria: tempPassword,
            senha_temporaria_ativa: true,
          });

        if (responsavelError) {
          console.error("Error creating responsavel:", responsavelError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar responsável: " + responsavelError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get the responsavel ID
    const { data: responsavel, error: getResponsavelError } = await supabaseAdmin
      .from("responsaveis")
      .select("id")
      .eq("user_id", guardianUserId)
      .single();

    if (getResponsavelError || !responsavel) {
      console.error("Error getting responsavel:", getResponsavelError);
      return new Response(
        JSON.stringify({ error: "Erro ao obter responsável" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // SMART CHILD MATCHING LOGIC
    // Check if the responsavel already has a child with the same name AND birth date
    // =====================================================
    
    let crianca: any = null;
    let isExistingChild = false;

    // Get all children linked to this responsavel
    const { data: existingChildLinks } = await supabaseAdmin
      .from("crianca_responsavel")
      .select("crianca_id")
      .eq("responsavel_id", responsavel.id);

    if (existingChildLinks && existingChildLinks.length > 0) {
      const childIds = existingChildLinks.map(link => link.crianca_id);
      
      // Get children data
      const { data: existingChildren } = await supabaseAdmin
        .from("criancas")
        .select("*")
        .in("id", childIds);

      if (existingChildren) {
        // Look for a match by normalized name AND birth date
        const normalizedInputName = normalizeName(nome);
        const matchingChild = existingChildren.find(child => {
          const normalizedChildName = normalizeName(child.nome);
          return normalizedChildName === normalizedInputName && 
                 child.data_nascimento === dataNascimento;
        });

        if (matchingChild) {
          crianca = matchingChild;
          isExistingChild = true;
          console.log("Found existing child:", crianca.id, crianca.nome);
        }
      }
    }

    // If no existing child found, create a new one
    if (!crianca) {
      const { data: newCrianca, error: criancaError } = await supabaseAdmin
        .from("criancas")
        .insert({
          nome,
          data_nascimento: dataNascimento,
          foto_url: fotoUrl || null,
          cpf_hash: cpf || null,
          ativo: true,
          valor_mensalidade: valorMensalidade,
          dia_vencimento: diaVencimento,
          forma_cobranca: formaCobranca,
          data_inicio_cobranca: dataInicioCobranca,
          status_financeiro: statusFinanceiro,
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

      // Link new child to guardian
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
      // Child already linked to this school
      return new Response(
        JSON.stringify({
          success: true,
          crianca,
          isNewUser,
          isExistingChild: true,
          alreadyLinkedToSchool: true,
          tempPassword: isNewUser ? tempPassword : null,
          message: "Este aluno já está vinculado a esta escolinha",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link child to school
    const { error: linkSchoolError } = await supabaseAdmin
      .from("crianca_escolinha")
      .insert({
        crianca_id: crianca.id,
        escolinha_id: escolinhaId,
        ativo: true,
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
      // Check if already linked to this turma
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
          // Non-fatal error, continue
        }
      }
    }

    // Generate mensalidades for the student (only for this school)
    await generateMensalidades(
      supabaseAdmin,
      crianca.id,
      escolinhaId,
      valorMensalidade,
      diaVencimento,
      formaCobranca,
      dataInicioCobranca,
      statusFinanceiro
    );

    // Send welcome email if this is a new user
    let emailSent = false;
    if (isNewUser && tempPassword) {
      try {
        // Get school name for the email
        const { data: escolinhaData } = await supabaseAdmin
          .from("escolinhas")
          .select("nome")
          .eq("id", escolinhaId)
          .single();

        const schoolName = escolinhaData?.nome || "Escolinha";

        // Call the send-welcome-email function
        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              guardianName: responsavelNome,
              guardianEmail: responsavelEmail.toLowerCase(),
              studentName: nome,
              schoolName: schoolName,
              tempPassword: tempPassword,
              loginUrl: "https://atletaid.com.br/auth",
            }),
          }
        );

        const emailResult = await emailResponse.json();
        emailSent = emailResult.success === true;
        
        if (emailSent) {
          console.log("Welcome email sent successfully to", responsavelEmail);
        } else {
          console.error("Failed to send welcome email:", emailResult.error);
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Non-fatal error, continue
      }
    }

    // Build response message
    let message: string;
    if (isExistingChild) {
      message = "Aluno existente vinculado a esta escolinha com sucesso";
    } else if (isNewUser) {
      if (emailSent) {
        message = `Aluno cadastrado! Credenciais enviadas por email para ${responsavelEmail}`;
      } else {
        message = `Aluno cadastrado! Senha temporária do responsável: ${tempPassword}`;
      }
    } else {
      message = "Aluno cadastrado e vinculado ao responsável existente";
    }

    return new Response(
      JSON.stringify({
        success: true,
        crianca,
        isNewUser,
        isExistingChild,
        tempPassword: isNewUser ? tempPassword : null,
        emailSent,
        message,
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