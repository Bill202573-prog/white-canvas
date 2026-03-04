import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCredentialsRequest {
  responsavelId: string;
  escolinhaId: string;
  criancaId: string;
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

    const body: SendCredentialsRequest = await req.json();
    const { responsavelId, escolinhaId, criancaId } = body;

    // Verify caller is admin of this school
    const { data: callerRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const callerRole = callerRoleData?.role;
    const isSystemAdmin = callerRole === 'admin';

    if (!isSystemAdmin) {
      const { data: escolinha } = await supabaseAdmin
        .from("escolinhas")
        .select("id, admin_user_id")
        .eq("id", escolinhaId)
        .single();

      if (!escolinha || escolinha.admin_user_id !== caller.id) {
        return new Response(
          JSON.stringify({ error: "Você não é admin desta escolinha" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get responsavel data
    const { data: responsavel, error: respError } = await supabaseAdmin
      .from("responsaveis")
      .select("*")
      .eq("id", responsavelId)
      .single();

    if (respError || !responsavel) {
      return new Response(
        JSON.stringify({ error: "Responsável não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if auth user already exists
    // User needs creation if user_id is null, empty, or the placeholder UUID
    const needsUserCreation = !responsavel.user_id || 
      responsavel.user_id === '00000000-0000-0000-0000-000000000000';
    let guardianUserId = responsavel.user_id;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (needsUserCreation) {
      // Need to create auth user
      const { data: existingUsersList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsersList?.users?.find(u => u.email?.toLowerCase() === responsavel.email.toLowerCase());

      if (existingUser) {
        // User exists, link to existing
        guardianUserId = existingUser.id;
        
        // Update responsavel with real user_id
        await supabaseAdmin
          .from("responsaveis")
          .update({ user_id: guardianUserId })
          .eq("id", responsavelId);

      } else {
        // Create new auth user
        tempPassword = generateTempPassword();
        
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: responsavel.email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            nome: responsavel.nome,
          },
        });

        if (createUserError) {
          console.error("Error creating user:", createUserError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar conta do responsável: " + createUserError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        guardianUserId = newUser.user.id;
        isNewUser = true;

        // Assign guardian role
        await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: guardianUserId,
            role: "guardian",
          });

        // Update responsavel with real user_id and temp password
        await supabaseAdmin
          .from("responsaveis")
          .update({ 
            user_id: guardianUserId,
            senha_temporaria: tempPassword,
            senha_temporaria_ativa: true,
          })
          .eq("id", responsavelId);

        // Mark profile as needing password change
        await supabaseAdmin
          .from("profiles")
          .update({ password_needs_change: true })
          .eq("user_id", guardianUserId);
      }
    } else {
      // Auth user already exists - generate a new temp password for resend
      tempPassword = generateTempPassword();
      
      // Update the password in auth
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        guardianUserId,
        { password: tempPassword }
      );
      
      if (updateError) {
        console.error("Error updating password:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar senha: " + updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update responsavel with new temp password
      await supabaseAdmin
        .from("responsaveis")
        .update({ 
          senha_temporaria: tempPassword,
          senha_temporaria_ativa: true,
        })
        .eq("id", responsavelId);
      
      // Mark profile as needing password change
      await supabaseAdmin
        .from("profiles")
        .update({ password_needs_change: true })
        .eq("user_id", guardianUserId);
    }

    // Get student and school data for email
    const { data: crianca } = await supabaseAdmin
      .from("criancas")
      .select("nome")
      .eq("id", criancaId)
      .single();

    const { data: escolinha } = await supabaseAdmin
      .from("escolinhas")
      .select("nome")
      .eq("id", escolinhaId)
      .single();

    // Send email if we have a temp password
    let emailSent = false;
    if (tempPassword) {
      try {
         // ALWAYS use production URL for email links - guardians should access the real app
         const loginUrl = "https://atletaid.com.br/auth";
         console.log("Using loginUrl for welcome email:", loginUrl);

         const emailResponse = await fetch(
           `${supabaseUrl}/functions/v1/send-welcome-email`,
           {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${supabaseServiceKey}`,
             },
             body: JSON.stringify({
               guardianName: responsavel.nome,
               guardianEmail: responsavel.email.toLowerCase(),
               studentName: crianca?.nome || "Seu filho(a)",
               schoolName: escolinha?.nome || "Escolinha",
               tempPassword: tempPassword,
               loginUrl,
             }),
           }
         );

        const emailResult = await emailResponse.json();
        emailSent = emailResult.success === true;
        
        if (emailSent) {
          console.log("Welcome email sent successfully to", responsavel.email);
        } else {
          console.error("Failed to send welcome email:", emailResult.error);
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
      }
    }

    const message = isNewUser 
      ? (emailSent 
          ? `Credenciais enviadas para ${responsavel.email}` 
          : `Credenciais criadas. Senha temporária: ${tempPassword}`)
      : (tempPassword 
          ? (emailSent 
              ? `Credenciais reenviadas para ${responsavel.email}` 
              : `Credenciais já existentes. Senha temporária: ${tempPassword}`)
          : "Responsável já possui acesso ao sistema");

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        emailSent,
        tempPassword,
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
