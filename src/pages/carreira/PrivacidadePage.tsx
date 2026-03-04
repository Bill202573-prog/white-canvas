import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';
import logoCarreiraId from '@/assets/logo-carreira-id-dark.png';
import logoAtletaId from '@/assets/logo-atleta-id.png';

export default function PrivacidadePage() {
  const navigate = useNavigate();
  const isCarreira = isCarreiraDomain();
  const logo = isCarreira ? logoCarreiraId : logoAtletaId;
  const brand = isCarreira ? 'Carreira ID' : 'Atleta ID';

  return (
    <div className="min-h-screen bg-background" data-theme="dark-orange">
      <div className="h-1 w-full bg-[hsl(25_95%_55%)]" />
      <header className="sticky top-0 z-50 bg-[hsl(0_0%_0%/0.97)] border-b border-[hsl(25_95%_55%/0.4)]">
        <div className="container flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <img src={logo} alt={brand} className="h-10" />
          </button>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[hsl(25_95%_55%)] mb-1">Política de Privacidade — {brand}</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 25 de fevereiro de 2026</p>

        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">1. Dados Coletados</h2>
            <p className="mb-2">Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li><strong className="text-foreground">Dados de conta:</strong> nome, email, senha (criptografada);</li>
              <li><strong className="text-foreground">Dados de identificação:</strong> CPF/CNPJ e telefone WhatsApp do responsável (dados privados, não exibidos publicamente);</li>
              <li><strong className="text-foreground">Dados do atleta:</strong> nome, data de nascimento, foto, modalidade esportiva, cidade/estado;</li>
              <li><strong className="text-foreground">Dados de uso:</strong> logs de acesso, interações na plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">2. Uso dos Dados</h2>
            <p className="mb-2">Utilizamos seus dados para:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Autenticação e segurança da conta;</li>
              <li>Personalização do perfil esportivo;</li>
              <li>Comunicação sobre o serviço;</li>
              <li>Garantir a integridade e segurança da plataforma;</li>
              <li>Prevenção contra perfis fraudulentos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">3. Dados Privados</h2>
            <p>CPF/CNPJ e número de WhatsApp são coletados exclusivamente para fins de segurança e identificação interna. Estes dados <strong className="text-foreground">nunca são exibidos publicamente</strong> nos perfis e não são compartilhados com terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">4. Proteção de Menores</h2>
            <p>Levamos a proteção de dados de menores muito a sério. Perfis de atletas menores de 14 anos são administrados exclusivamente pelos responsáveis legais. Informações sensíveis de menores possuem camadas adicionais de proteção e não são exibidas publicamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">5. Compartilhamento de Dados</h2>
            <p className="mb-2">Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, exceto quando necessário para:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Cumprimento de obrigação legal;</li>
              <li>Processamento de pagamentos (dados mínimos necessários);</li>
              <li>Proteção dos direitos da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">6. Segurança</h2>
            <p>Utilizamos medidas técnicas e organizacionais apropriadas para proteger seus dados, incluindo criptografia, controle de acesso e políticas de segurança de banco de dados.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">7. Seus Direitos</h2>
            <p className="mb-2">Conforme a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos ou desatualizados;</li>
              <li>Solicitar a exclusão dos seus dados;</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">8. Exclusão de Dados</h2>
            <p>Ao excluir sua conta, todos os seus dados serão removidos permanentemente da plataforma. Esta ação é irreversível.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">9. Contato</h2>
            <p className="mb-2">Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Email: <a href="mailto:contato@atletaid.com.br" className="text-[hsl(25_95%_55%)] hover:underline">contato@atletaid.com.br</a></li>
              <li>WhatsApp: <a href="https://wa.me/5521969622045" target="_blank" rel="noopener noreferrer" className="text-[hsl(25_95%_55%)] hover:underline">(21) 96962-2045</a></li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
