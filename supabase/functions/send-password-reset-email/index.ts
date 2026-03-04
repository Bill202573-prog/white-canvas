import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  guardianName: string;
  guardianEmail: string;
  tempPassword: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);

    const {
      guardianName,
      guardianEmail,
      tempPassword,
      loginUrl = "https://atletaid.com.br/auth",
    }: PasswordResetEmailRequest = await req.json();

    console.log(`Enviando email de reset de senha para ${guardianEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Atleta ID <contato@atletaid.com.br>",
      to: [guardianEmail],
      subject: "Atleta ID - Nova Senha de Acesso",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nova Senha - Atleta ID</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">⚽ Atleta ID</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Redefinição de Senha</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Olá, ${guardianName}!</h2>
                      
                      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Sua senha do <strong>Atleta ID</strong> foi redefinida. Utilize as novas credenciais abaixo para acessar sua conta.
                      </p>
                      
                      <!-- Credentials Box -->
                      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 8px;">
                        <p style="margin: 0 0 15px 0; color: #92400e; font-weight: bold; font-size: 14px;">🔐 SUAS NOVAS CREDENCIAIS</p>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold;">${guardianEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nova senha:</td>
                            <td style="padding: 8px 0;">
                              <code style="background-color: #ffffff; padding: 6px 12px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #dc2626; font-weight: bold; border: 1px solid #e5e7eb;">${tempPassword}</code>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                          Acessar Atleta ID
                        </a>
                      </div>
                      
                      <!-- Security Notice -->
                      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                          <strong>🔒 Segurança:</strong> Ao acessar, você será solicitado a criar uma nova senha pessoal.
                        </p>
                      </div>
                      
                      <!-- Warning -->
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                          <strong>⚠️ Importante:</strong> Se você não solicitou a redefinição de senha, entre em contato imediatamente com a escolinha.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        Este é um email automático do Atleta ID. Por favor, não responda.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                        © ${new Date().getFullYear()} Atleta ID - Todos os direitos reservados
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Resposta do Resend:", emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Erro retornado pelo Resend:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email de reset de senha enviado com sucesso para:", guardianEmail);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar email de reset de senha:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
