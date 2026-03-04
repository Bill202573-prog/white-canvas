import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Brazilian first names for children
const childFirstNames = [
  'Lucas', 'Gabriel', 'Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Davi', 'Theo', 'Pedro', 'Samuel',
  'Enzo', 'Rafael', 'João', 'Gustavo', 'Nicolas', 'Felipe', 'Matheus', 'Lorenzo', 'Isaac', 'Cauã',
  'Henrique', 'Leonardo', 'Vinicius', 'Daniel', 'Bruno', 'Eduardo', 'Caio', 'André', 'Tales', 'Rodrigo'
]

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
  'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Monteiro', 'Mendes', 'Freitas'
]

const guardianFirstNames = [
  'Carlos', 'José', 'Paulo', 'Marcos', 'Fernando', 'Ricardo', 'Antonio', 'Luiz', 'Roberto', 'Sergio',
  'Maria', 'Ana', 'Claudia', 'Patricia', 'Fernanda', 'Juliana', 'Adriana', 'Luciana', 'Renata', 'Cristina',
  'Marcia', 'Sandra', 'Monica', 'Carla', 'Simone', 'Alessandra', 'Tatiana', 'Priscila', 'Vanessa', 'Debora'
]

// Categories and birth years
const categories = [
  { name: 'Sub-7', birthYear: 2018 },
  { name: 'Sub-8', birthYear: 2017 },
  { name: 'Sub-9', birthYear: 2016 },
  { name: 'Sub-10', birthYear: 2015 },
  { name: 'Sub-11', birthYear: 2014 }
]

// Distribution of enrollments per month (July to November 2025)
const enrollmentDistribution = [
  { month: 7, year: 2025, count: 5 },   // 5 students in July
  { month: 8, year: 2025, count: 5 },   // 5 students in August
  { month: 9, year: 2025, count: 5 },   // 5 students in September
  { month: 10, year: 2025, count: 5 },  // 5 students in October
  { month: 11, year: 2025, count: 10 }  // 10 students in November
]

function generateRandomBirthDate(year: number): string {
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function generateEnrollmentDate(month: number, year: number): string {
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function generatePassword(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generatePhone(index: number): string {
  const areaCode = 21
  const prefix = 98000 + index
  const suffix = 1000 + Math.floor(Math.random() * 9000)
  return `(${areaCode}) ${prefix}-${suffix}`
}

// Get all months from enrollment month to current month (December 2025)
function getMonthsFromEnrollment(enrollMonth: number, enrollYear: number): { month: number; year: number }[] {
  const months: { month: number; year: number }[] = []
  const currentMonth = 12
  const currentYear = 2025
  
  let m = enrollMonth
  let y = enrollYear
  
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    months.push({ month: m, year: y })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  
  return months
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting seed process: 30 students for Escolinha do Flamengo...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Look for "Escolinha do Flamengo"
    console.log('Looking for Escolinha do Flamengo...')
    const { data: escolinha } = await supabase
      .from('escolinhas')
      .select('id')
      .ilike('nome', '%flamengo%')
      .maybeSingle()

    if (!escolinha) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Escolinha do Flamengo não encontrada. Crie a escolinha primeiro.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const escolinhaId = escolinha.id
    console.log(`Using escolinha ID: ${escolinhaId}`)

    // Get existing turmas for this escolinha
    const { data: turmas } = await supabase
      .from('turmas')
      .select('id, nome')
      .eq('escolinha_id', escolinhaId)
      .eq('ativo', true)

    const createdStudents: any[] = []
    let studentIndex = 0
    const usedEmails = new Set<string>()

    // Process each enrollment period
    for (const period of enrollmentDistribution) {
      console.log(`\nCreating ${period.count} students for ${period.month}/${period.year}...`)
      
      for (let i = 0; i < period.count; i++) {
        // Generate unique names
        const firstName = childFirstNames[studentIndex % childFirstNames.length]
        const middleName = lastNames[(studentIndex + 10) % lastNames.length]
        const lastName = lastNames[(studentIndex + 5) % lastNames.length]
        const studentName = `${firstName} ${middleName} ${lastName}`
        
        // Select category and birth year
        const category = categories[studentIndex % categories.length]
        const birthDate = generateRandomBirthDate(category.birthYear)
        
        // Generate enrollment date
        const enrollmentDate = generateEnrollmentDate(period.month, period.year)
        
        console.log(`[${studentIndex + 1}/30] Creating: ${studentName} (${category.name}, enrolled ${enrollmentDate})`)

        // Create the child
        const { data: child, error: childError } = await supabase
          .from('criancas')
          .insert({
            nome: studentName,
            data_nascimento: birthDate,
            ativo: true,
            valor_mensalidade: 180.00,
            dia_vencimento: 10,
            forma_cobranca: 'mensal',
            status_financeiro: 'ativo',
            data_inicio_cobranca: enrollmentDate,
            foto_url: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(studentName)}`
          })
          .select()
          .single()

        if (childError) {
          console.error(`Error creating child:`, childError)
          studentIndex++
          continue
        }

        // Link child to escolinha
        await supabase.from('crianca_escolinha').insert({
          crianca_id: child.id,
          escolinha_id: escolinhaId,
          ativo: true,
          data_inicio: enrollmentDate
        })

        // Link to a turma if available
        if (turmas && turmas.length > 0) {
          const turma = turmas[studentIndex % turmas.length]
          await supabase.from('crianca_turma').insert({
            crianca_id: child.id,
            turma_id: turma.id,
            ativo: true
          })
        }

        // Create guardian
        const guardianFirstName = guardianFirstNames[studentIndex % guardianFirstNames.length]
        const guardianName = `${guardianFirstName} ${middleName} ${lastName}`
        
        // Generate unique email
        let guardianEmail = `${guardianFirstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
        let emailCounter = 1
        while (usedEmails.has(guardianEmail)) {
          guardianEmail = `${guardianFirstName.toLowerCase()}.${lastName.toLowerCase()}${emailCounter}@email.com`
          emailCounter++
        }
        usedEmails.add(guardianEmail)
        
        const guardianPassword = generatePassword()
        const guardianPhone = generatePhone(studentIndex)

        console.log(`Creating guardian: ${guardianName} (${guardianEmail})`)

        // Create auth user for guardian
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: guardianEmail,
          password: guardianPassword,
          email_confirm: true,
          user_metadata: { nome: guardianName }
        })

        if (authError) {
          console.error(`Error creating auth user:`, authError)
          studentIndex++
          continue
        }

        // Create user role
        await supabase.from('user_roles').insert({
          user_id: authUser.user.id,
          role: 'guardian'
        })

        // Create responsavel record
        const { data: responsavel, error: respError } = await supabase
          .from('responsaveis')
          .insert({
            user_id: authUser.user.id,
            nome: guardianName,
            email: guardianEmail,
            telefone: guardianPhone,
            ativo: true
          })
          .select()
          .single()

        if (respError) {
          console.error(`Error creating responsavel:`, respError)
          studentIndex++
          continue
        }

        // Link child to responsavel
        await supabase.from('crianca_responsavel').insert({
          crianca_id: child.id,
          responsavel_id: responsavel.id,
          parentesco: Math.random() > 0.5 ? 'Pai' : 'Mãe'
        })

        // Create mensalidades from enrollment month to current month (December 2025)
        const monthsToCreate = getMonthsFromEnrollment(period.month, period.year)
        
        for (const { month, year } of monthsToCreate) {
          const mesReferencia = `${year}-${String(month).padStart(2, '0')}-01`
          const dataVencimento = `${year}-${String(month).padStart(2, '0')}-10`
          
          // Payment logic:
          // - July to October: 90% paid, 10% pending
          // - November: 75% paid, 25% pending  
          // - December: 40% paid, 60% pending (current month)
          let paidChance = 0.9
          if (month === 11 && year === 2025) paidChance = 0.75
          if (month === 12 && year === 2025) paidChance = 0.4
          
          const isPaid = Math.random() < paidChance
          const payDay = Math.floor(Math.random() * 15) + 1
          
          // Determine status
          let status = 'pendente'
          if (isPaid) {
            status = 'pago'
          } else if (month < 12 || year < 2025) {
            // Past months that aren't paid are overdue
            status = 'atrasado'
          }
          
          await supabase.from('mensalidades').insert({
            crianca_id: child.id,
            escolinha_id: escolinhaId,
            mes_referencia: mesReferencia,
            valor: 180.00,
            valor_pago: isPaid ? 180.00 : null,
            data_vencimento: dataVencimento,
            data_pagamento: isPaid ? `${year}-${String(month).padStart(2, '0')}-${String(payDay).padStart(2, '0')}T10:00:00.000Z` : null,
            status: status,
            forma_pagamento: isPaid ? 'manual' : null
          })
        }

        createdStudents.push({
          student: studentName,
          category: category.name,
          birthDate,
          enrollmentDate,
          enrollmentMonth: `${period.month}/${period.year}`,
          guardian: guardianName,
          email: guardianEmail,
          password: guardianPassword,
          phone: guardianPhone,
          mensalidadesCreated: monthsToCreate.length
        })

        studentIndex++
      }
    }

    console.log(`\nSuccessfully created ${createdStudents.length} students with guardians and mensalidades`)

    // Count by enrollment period
    const distribution = enrollmentDistribution.map(p => ({
      period: `${p.month}/${p.year}`,
      expected: p.count,
      created: createdStudents.filter(s => s.enrollmentMonth === `${p.month}/${p.year}`).length
    }))

    return new Response(JSON.stringify({
      success: true,
      message: `Created ${createdStudents.length} students with guardians and financial history`,
      escolinhaId,
      distribution,
      students: createdStudents,
      totalCreated: createdStudents.length
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Seed error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
