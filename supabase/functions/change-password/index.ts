import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { new_password } = await req.json()

    if (!new_password || new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Clear password_needs_change flag
    await supabaseAdmin
      .from('profiles')
      .update({ password_needs_change: false })
      .eq('user_id', user.id)

    // Clear temporary passwords from ALL tables to minimize exposure
    // 1. Responsaveis
    await supabaseAdmin
      .from('responsaveis')
      .update({ senha_temporaria: null, senha_temporaria_ativa: false })
      .eq('user_id', user.id)

    // 2. Professores
    await supabaseAdmin
      .from('professores')
      .update({ senha_temporaria: null, senha_temporaria_ativa: false })
      .eq('user_id', user.id)

    // 3. Escolinhas (admin principal)
    await supabaseAdmin
      .from('escolinhas')
      .update({ senha_temporaria: null, senha_temporaria_ativa: false })
      .eq('admin_user_id', user.id)

    // 4. Escolinhas (sócio)
    await supabaseAdmin
      .from('escolinhas')
      .update({ senha_temporaria_socio: null, senha_temporaria_socio_ativa: false })
      .eq('socio_user_id', user.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})