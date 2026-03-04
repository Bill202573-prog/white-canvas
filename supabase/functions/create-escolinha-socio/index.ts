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
      return new Response(JSON.stringify({ error: 'Only admins can create escolinha partner users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { escolinha_id, email_socio, nome_socio } = await req.json()

    if (!escolinha_id || !email_socio || !nome_socio) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let senhaTemporaria = ''
    for (let i = 0; i < 10; i++) {
      senhaTemporaria += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Create the user with Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email_socio,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome: nome_socio
      }
    })

    if (createError) {
      console.error('Error creating socio user:', createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = newUser.user.id

    // Create profile with password_needs_change flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        nome: nome_socio,
        email: email_socio,
        password_needs_change: true
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }

    // Create user role as 'school' (same permissions as main admin)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'school'
      })

    if (roleError) {
      console.error('Error creating role:', roleError)
    }

    // Update escolinha with socio_user_id and senha_temporaria_socio
    const { error: updateError } = await supabaseAdmin
      .from('escolinhas')
      .update({
        socio_user_id: userId,
        senha_temporaria_socio: senhaTemporaria,
        senha_temporaria_socio_ativa: true
      })
      .eq('id', escolinha_id)

    if (updateError) {
      console.error('Error updating escolinha:', updateError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
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
