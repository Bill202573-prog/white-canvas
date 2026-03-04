import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTeacherRequest {
  nome: string;
  email: string;
  telefone?: string;
  fotoUrl?: string;
  tipoProfissional?: string;
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  horaAula?: number;
  tipoContratacao?: string;
  escolinhaId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { 
      nome, 
      email, 
      telefone, 
      fotoUrl,
      tipoProfissional,
      cpf,
      endereco,
      cidade,
      estado,
      cep,
      horaAula,
      tipoContratacao,
      escolinhaId
    }: CreateTeacherRequest = await req.json();

    if (!nome || !email || !escolinhaId) {
      throw new Error("Nome, email e escolinhaId são obrigatórios");
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    // Create the user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (authError) {
      // If user already exists, just get their ID
      if (authError.message.includes("already been registered")) {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users?.find(u => u.email === email);
        if (user) {
          // Create professor without new auth user
          const { data: professor, error: profError } = await supabaseAdmin
            .from('professores')
            .insert({
              nome,
              email,
              telefone,
              foto_url: fotoUrl,
              tipo_profissional: tipoProfissional || 'professor',
              cpf,
              endereco,
              cidade,
              estado,
              cep,
              hora_aula: horaAula,
              tipo_contratacao: tipoContratacao,
              escolinha_id: escolinhaId,
              user_id: user.id,
              senha_temporaria: null,
              senha_temporaria_ativa: false
            })
            .select()
            .single();

          if (profError) throw profError;

          return new Response(
            JSON.stringify({ 
              success: true, 
              professor, 
              tempPassword: null,
              message: "Professor cadastrado (usuário já existia)" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw authError;
      }
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error("Erro ao criar usuário");

    // Create user role as teacher
    await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role: 'teacher'
    });

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      user_id: userId,
      nome,
      email,
      telefone,
      password_needs_change: true
    });

    // Create professor
    const { data: professor, error: profError } = await supabaseAdmin
      .from('professores')
      .insert({
        nome,
        email,
        telefone,
        foto_url: fotoUrl,
        tipo_profissional: tipoProfissional || 'professor',
        cpf,
        endereco,
        cidade,
        estado,
        cep,
        hora_aula: horaAula,
        tipo_contratacao: tipoContratacao,
        escolinha_id: escolinhaId,
        user_id: userId,
        senha_temporaria: tempPassword,
        senha_temporaria_ativa: true
      })
      .select()
      .single();

    if (profError) {
      // Rollback: delete auth user if professor creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        professor, 
        tempPassword,
        message: "Professor cadastrado com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error creating teacher:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});