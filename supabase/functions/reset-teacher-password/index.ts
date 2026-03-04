import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { professorId } = await req.json();

    if (!professorId) {
      throw new Error("professorId é obrigatório");
    }

    // Get the professor
    const { data: professor, error: fetchError } = await supabaseAdmin
      .from('professores')
      .select('user_id, email')
      .eq('id', professorId)
      .single();

    if (fetchError || !professor) {
      throw new Error("Professor não encontrado");
    }

    if (!professor.user_id) {
      throw new Error("Professor não possui usuário vinculado");
    }

    // Generate a new temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    // Update the user's password
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      professor.user_id,
      { password: tempPassword }
    );

    if (authError) throw authError;

    // Update professor with new temp password
    await supabaseAdmin
      .from('professores')
      .update({
        senha_temporaria: tempPassword,
        senha_temporaria_ativa: true
      })
      .eq('id', professorId);

    // Mark profile as needing password change
    await supabaseAdmin
      .from('profiles')
      .update({ password_needs_change: true })
      .eq('user_id', professor.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        message: "Senha resetada com sucesso" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});