import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasPaymentResponse {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  description: string;
  externalReference: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  nossoNumero?: string;
}

interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

// Helper function to generate a valid test CPF for Asaas sandbox
function generateTestCpf(): string {
  // Generate random 9 digits
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Calculate first verification digit
  let d1 = n.reduce((acc, val, idx) => acc + val * (10 - idx), 0);
  d1 = ((d1 * 10) % 11) % 10;
  
  // Calculate second verification digit
  let d2 = n.reduce((acc, val, idx) => acc + val * (11 - idx), 0) + d1 * 2;
  d2 = ((d2 * 10) % 11) % 10;
  
  return [...n, d1, d2].join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');

    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for parameters
    const body = await req.json().catch(() => ({}));
    const { escolinha_id, mes_referencia, crianca_id } = body;

    if (!escolinha_id) {
      throw new Error('escolinha_id é obrigatório');
    }

    if (!mes_referencia) {
      throw new Error('mes_referencia é obrigatório');
    }

    // Optional: crianca_id to generate for a single student
    const targetCriancaId = crianca_id || null;
    console.log('Iniciando geração de cobranças Asaas...', { escolinha_id, mes_referencia, crianca_id: targetCriancaId });

    // Get escola data
    const { data: escolinha, error: escolinhaError } = await supabase
      .from('escolinhas')
      .select('id, nome, status_financeiro_escola')
      .eq('id', escolinha_id)
      .single();

    if (escolinhaError) {
      throw new Error(`Erro ao buscar escola: ${escolinhaError.message}`);
    }

    // Get escola's Asaas account info
    const { data: cadastroBancario, error: cadastroError } = await supabase
      .from('escola_cadastro_bancario')
      .select('asaas_account_id, asaas_api_key, asaas_status')
      .eq('escolinha_id', escolinha_id)
      .maybeSingle();

    // Use school's subconta API key if available, otherwise use master key for testing
    let subaccountApiKey: string;
    let usingMasterKey = false;
    
    if (cadastroBancario?.asaas_api_key) {
      subaccountApiKey = cadastroBancario.asaas_api_key;
      console.log("Using school's Asaas subconta API key for escola:", escolinha_id, "Account ID:", cadastroBancario.asaas_account_id);
    } else {
      // Fallback to master API key for schools without subconta (testing purposes)
      subaccountApiKey = asaasApiKey;
      usingMasterKey = true;
      console.log("School does not have subconta, using master API key for escola:", escolinha_id);
    }

    // Build query for active children with billing setup
    let criancasQuery = supabase
      .from('crianca_escolinha')
      .select(`
        crianca_id,
        escolinha_id,
        crianca:criancas(
          id,
          nome,
          valor_mensalidade,
          dia_vencimento,
          forma_cobranca,
          status_financeiro,
          data_inicio_cobranca,
          ativo
        )
      `)
      .eq('escolinha_id', escolinha_id)
      .eq('ativo', true);

    // If targeting a specific student, filter by crianca_id
    if (targetCriancaId) {
      criancasQuery = criancasQuery.eq('crianca_id', targetCriancaId);
    }

    const { data: criancasData, error: criancasError } = await criancasQuery;

    if (criancasError) {
      throw new Error(`Erro ao buscar crianças: ${criancasError.message}`);
    }

    console.log(`Encontradas ${criancasData?.length || 0} crianças ativas`);

    const results: Array<{
      crianca_id: string;
      crianca_nome: string;
      status: 'created' | 'already_exists' | 'skipped' | 'error';
      message: string;
      billing_id?: string;
    }> = [];

    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    for (const registro of criancasData || []) {
      const crianca = registro.crianca as any;

      // Skip invalid records
      if (!crianca) {
        continue;
      }

      // Skip inactive children
      if (!crianca.ativo) {
        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'skipped',
          message: 'Aluno inativo'
        });
        continue;
      }

      // Skip if financial status is not "ativo" (includes "isento" and "suspenso")
      // Note: forma_cobranca "isento" was deprecated - isenção is now controlled solely by status_financeiro
      if (crianca.status_financeiro !== 'ativo') {
        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'skipped',
          message: `Status financeiro: ${crianca.status_financeiro}`
        });
        continue;
      }

      // CRITICAL: Skip if data_inicio_cobranca is set and is after the mes_referencia
      // This prevents charging for months before the configured billing start date
      // The rule: if billing starts in February (any day), February should be charged
      if (crianca.data_inicio_cobranca) {
        const dataInicioCobranca = new Date(crianca.data_inicio_cobranca);
        const mesReferenciaDate = new Date(mes_referencia);
        
        // Compare year and month only - if data_inicio_cobranca month is AFTER mes_referencia month, skip
        const inicioYear = dataInicioCobranca.getFullYear();
        const inicioMonth = dataInicioCobranca.getMonth(); // 0-indexed
        const refYear = mesReferenciaDate.getFullYear();
        const refMonth = mesReferenciaDate.getMonth(); // 0-indexed
        
        // Skip if data_inicio_cobranca is in a month AFTER mes_referencia
        // Example: data_inicio = 2026-03-01, mes_ref = 2026-02-01 -> skip
        // Example: data_inicio = 2026-02-15, mes_ref = 2026-02-01 -> charge (same month)
        if (inicioYear > refYear || (inicioYear === refYear && inicioMonth > refMonth)) {
          results.push({
            crianca_id: crianca.id,
            crianca_nome: crianca.nome || 'N/A',
            status: 'skipped',
            message: `Cobrança começa em ${monthNames[inicioMonth + 1]}/${inicioYear} (após ${monthNames[refMonth + 1]}/${refYear})`
          });
          continue;
        }
      }

      // Check if month is already covered by a paid enrollment charge (1ª mensalidade)
      const { data: paidEntrada } = await supabase
        .from('cobrancas_entrada')
        .select('id, mes_referencia_primeira_mensalidade')
        .eq('crianca_id', crianca.id)
        .eq('escolinha_id', escolinha_id)
        .eq('status', 'pago')
        .gt('valor_mensalidade', 0)
        .eq('mes_referencia_primeira_mensalidade', mes_referencia)
        .maybeSingle();

      if (paidEntrada) {
        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'skipped',
          message: `Mês já coberto pela 1ª mensalidade paga na matrícula`
        });
        continue;
      }

      // Check if billing already exists for this month (prevent duplicates)
      // Ignore cancelled billings - they should allow regeneration
      const { data: existingBillings } = await supabase
        .from('mensalidades')
        .select('id, abacatepay_billing_id, status')
        .eq('crianca_id', crianca.id)
        .eq('escolinha_id', escolinha_id)
        .eq('mes_referencia', mes_referencia);

      const activeBilling = existingBillings?.find(b => b.status !== 'cancelado');
      if (activeBilling) {
        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'already_exists',
          message: `Mensalidade já existe para este mês (status: ${activeBilling.status})`,
          billing_id: activeBilling.id
        });
        continue;
      }

      // Delete any cancelled billings to allow regeneration
      const cancelledBillings = existingBillings?.filter(b => b.status === 'cancelado') || [];
      if (cancelledBillings.length > 0) {
        console.log(`Removendo ${cancelledBillings.length} mensalidades canceladas para ${crianca.nome}`);
        await supabase
          .from('mensalidades')
          .delete()
          .in('id', cancelledBillings.map(b => b.id));
      }

      // Calculate due date based on child's dia_vencimento
      const [year, month] = mes_referencia.split('-').map(Number);
      const diaVencimento = crianca.dia_vencimento || 10;
      let dataVencimento = new Date(year, month - 1, diaVencimento);
      
      // CRITICAL: Asaas does not accept due dates in the past
      // If the calculated due date is before today, use tomorrow instead
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dataVencimento < today) {
        console.log(`Data de vencimento ${dataVencimento.toISOString()} está no passado, usando ${tomorrow.toISOString()}`);
        dataVencimento = tomorrow;
      }
      
      const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];

      // Get valor mensalidade
      const valorMensalidade = crianca.valor_mensalidade || 180;

      try {
        // Get or create customer in Asaas for this child's responsavel
        const { data: responsavelData } = await supabase
          .from('crianca_responsavel')
          .select(`
            responsavel:responsaveis(
              id,
              nome,
              email,
              telefone,
              cpf
            )
          `)
          .eq('crianca_id', crianca.id)
          .limit(1)
          .single();

        const responsavel = (responsavelData?.responsavel as any) || null;

        if (!responsavel) {
          results.push({
            crianca_id: crianca.id,
            crianca_nome: crianca.nome || 'N/A',
            status: 'error',
            message: 'Responsável não encontrado'
          });
          continue;
        }

        // Search for existing customer by CPF or email
        let customerId: string | null = null;
        let customerNeedsCpfUpdate = false;
        const cleanCpf = responsavel.cpf?.replace(/\D/g, '') || null;

        if (cleanCpf) {
          const searchResponse = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${cleanCpf}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'access_token': subaccountApiKey,
            },
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.data && searchData.data.length > 0) {
              customerId = searchData.data[0].id;
            }
          }
        }

        if (!customerId && responsavel.email) {
          const searchResponse = await fetch(`https://api.asaas.com/v3/customers?email=${encodeURIComponent(responsavel.email)}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'access_token': subaccountApiKey,
            },
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.data && searchData.data.length > 0) {
              customerId = searchData.data[0].id;
              // Customer found by email but may not have CPF - check and flag for update
              const existingCustomer = searchData.data[0];
              if (!existingCustomer.cpfCnpj && cleanCpf) {
                customerNeedsCpfUpdate = true;
              }
            }
          }
        }

        // If customer found by email but has no CPF, we need to handle this
        // The Asaas API requires CPF for PIX payments
        // Strategy: Generate a test CPF and update the customer, or create a new one
        if (customerId && customerNeedsCpfUpdate) {
          // Generate a valid test CPF for sandbox
          const testCpf = generateTestCpf();
          console.log(`Cliente ${customerId} sem CPF - tentando atualizar com CPF de teste: ${testCpf}`);
          
          const updateResponse = await fetch(`https://api.asaas.com/v3/customers/${customerId}`, {
            method: 'PUT',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'access_token': subaccountApiKey,
            },
            body: JSON.stringify({ cpfCnpj: testCpf }),
          });
          
          if (!updateResponse.ok) {
            // If update fails, we need to create a new customer with CPF
            console.log(`Falha ao atualizar CPF - criando novo cliente com CPF`);
            customerId = null; // Force creation of new customer
          }
        }

        // Create customer if not found
        if (!customerId) {
          // For sandbox testing, if no CPF available, generate a valid test CPF
          let cpfToUse = cleanCpf;
          if (!cpfToUse) {
            // Generate a random valid CPF for testing (sandbox only)
            cpfToUse = generateTestCpf();
            console.log(`CPF não disponível para ${responsavel.nome}, usando CPF de teste: ${cpfToUse}`);
          }
          
          const customerPayload: Record<string, unknown> = {
            name: responsavel.nome,
            email: responsavel.email || undefined,
            phone: responsavel.telefone?.replace(/\D/g, '') || undefined,
            cpfCnpj: cpfToUse,
            notificationDisabled: true,
          };

          const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'access_token': subaccountApiKey,
            },
            body: JSON.stringify(customerPayload),
          });

          if (!customerResponse.ok) {
            const errorText = await customerResponse.text();
            throw new Error(`Erro ao criar cliente Asaas: ${errorText}`);
          }

          const customerData = await customerResponse.json();
          customerId = customerData.id;
        }

        // Create payment in Asaas
        const mesFormatado = `${monthNames[month]}/${year}`;
        const paymentPayload = {
          customer: customerId,
          billingType: 'PIX',
          value: valorMensalidade,
          dueDate: dataVencimentoStr,
          description: `Mensalidade ${mesFormatado} - Aluno ${crianca.nome}`,
          externalReference: `mensalidade-${crianca.id}-${mes_referencia}`,
        };

        console.log(`Criando cobrança Asaas para ${crianca.nome}:`, paymentPayload);

        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'access_token': subaccountApiKey,
          },
          body: JSON.stringify(paymentPayload),
        });

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text();
          throw new Error(`Asaas payment error: ${paymentResponse.status} - ${errorText}`);
        }

        const paymentData: AsaasPaymentResponse = await paymentResponse.json();
        console.log(`Cobrança criada com sucesso:`, paymentData);

        // Get PIX QR Code
        const qrCodeResponse = await fetch(`https://api.asaas.com/v3/payments/${paymentData.id}/pixQrCode`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'access_token': subaccountApiKey,
          },
        });

        let pixData: AsaasPixQrCodeResponse | null = null;
        if (qrCodeResponse.ok) {
          pixData = await qrCodeResponse.json();
        }

        // Initial status is always "a_vencer" since we adjusted the due date to be in the future
        const initialStatus = 'a_vencer';

        // Insert mensalidade
        const { error: insertError } = await supabase
          .from('mensalidades')
          .insert({
            crianca_id: crianca.id,
            escolinha_id: escolinha_id,
            mes_referencia: mes_referencia,
            valor: valorMensalidade,
            data_vencimento: dataVencimentoStr,
            status: initialStatus,
            forma_pagamento: 'pix',
            abacatepay_billing_id: paymentData.id, // Reusing field for Asaas payment ID
            abacatepay_url: paymentData.invoiceUrl || null, // Reusing field for invoice URL
            observacoes: `PIX gerado via Asaas em ${new Date().toISOString()}. ${pixData ? 'QR Code disponível.' : ''}`,
          });

        if (insertError) {
          throw new Error(`Erro ao inserir mensalidade: ${insertError.message}`);
        }

        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'created',
          message: 'Cobrança PIX criada com sucesso',
          billing_id: paymentData.id
        });

      } catch (billingError: any) {
        console.error(`Erro ao criar cobrança para ${crianca.nome}:`, billingError);
        results.push({
          crianca_id: crianca.id,
          crianca_nome: crianca.nome || 'N/A',
          status: 'error',
          message: billingError.message
        });
      }
    }

    // Summary
    const summary = {
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      already_exists: results.filter(r => r.status === 'already_exists').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      mes_referencia: mes_referencia
    };

    console.log('Geração de cobranças Asaas finalizada:', summary);

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na função generate-student-billing-asaas:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
