import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can reset escolinha socio passwords' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { escolinha_id } = await req.json()

    if (!escolinha_id) {
      return new Response(JSON.stringify({ error: 'Missing escolinha_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the escolinha to find the socio_user_id
    const { data: escolinha, error: escolinhaError } = await supabaseAdmin
      .from('escolinhas')
      .select('socio_user_id')
      .eq('id', escolinha_id)
      .single()

    if (escolinhaError || !escolinha?.socio_user_id) {
      return new Response(JSON.stringify({ error: 'Escolinha socio user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate new temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let senhaTemporaria = ''
    for (let i = 0; i < 10; i++) {
      senhaTemporaria += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Update user password
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      escolinha.socio_user_id,
      { password: senhaTemporaria }
    )

    if (updateUserError) {
      console.error('Error updating user password:', updateUserError)
      return new Response(JSON.stringify({ error: updateUserError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update profile to require password change
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ password_needs_change: true })
      .eq('user_id', escolinha.socio_user_id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // Update escolinha with new temporary password
    const { error: updateError } = await supabaseAdmin
      .from('escolinhas')
      .update({
        senha_temporaria_socio: senhaTemporaria,
        senha_temporaria_socio_ativa: true
      })
      .eq('id', escolinha_id)

    if (updateError) {
      console.error('Error updating escolinha:', updateError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      senha_temporaria: senhaTemporaria 
    }), {
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
