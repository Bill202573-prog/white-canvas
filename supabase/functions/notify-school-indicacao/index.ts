import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  escolinha_id: string;
  nome_indicador: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  nome_crianca: string;
  idade_crianca: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyRequest = await req.json();
    const {
      escolinha_id,
      nome_indicador,
      nome_responsavel,
      telefone_responsavel,
      nome_crianca,
      idade_crianca,
    } = body;

    // Buscar dados da escola (email do admin)
    const { data: escola, error: escolaError } = await supabase
      .from("escolinhas")
      .select("nome, email")
      .eq("id", escolinha_id)
      .single();

    if (escolaError || !escola) {
      console.error("Escola não encontrada:", escolaError);
      return new Response(
        JSON.stringify({ error: "Escola não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!escola.email) {
      console.log("Escola sem email configurado, notificação não enviada");
      return new Response(
        JSON.stringify({ message: "Escola sem email configurado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar telefone para exibição
    const telefoneFormatado = telefone_responsavel.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );

    // Gerar link do WhatsApp para a escola entrar em contato
    const whatsappLink = `https://wa.me/55${telefone_responsavel}`;

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "Atleta ID <contato@atletaid.com.br>",
      to: [escola.email],
      subject: `🎉 Nova indicação recebida: ${nome_crianca}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nova Indicação!</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Olá, <strong>${escola.nome}</strong>!
              </p>
              
              <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
                ${nome_indicador !== 'Indicação direta' 
                  ? `<strong>${nome_indicador}</strong> indicou uma família para fazer uma aula experimental na sua escola.`
                  : 'Uma família demonstrou interesse em fazer uma aula experimental na sua escola.'
                }
              </p>
              
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 16px;">👤 Dados do Responsável</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Nome:</strong> ${nome_responsavel}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Telefone:</strong> ${telefoneFormatado}</p>
              </div>
              
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 16px;">⚽ Dados da Criança</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Nome:</strong> ${nome_crianca}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Idade:</strong> ${idade_crianca} anos</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${whatsappLink}" 
                   style="display: inline-block; background: #25D366; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  📱 Entrar em contato pelo WhatsApp
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                Você também pode gerenciar suas indicações no painel da escola.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Enviado pelo Atleta ID • Sistema de Gestão de Escolinhas
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email de notificação enviado:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: (emailResponse as any).id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao enviar notificação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
