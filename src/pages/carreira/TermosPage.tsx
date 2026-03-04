import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';
import logoCarreiraId from '@/assets/logo-carreira-id-dark.png';
import logoAtletaId from '@/assets/logo-atleta-id.png';

export default function TermosPage() {
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
        <h1 className="text-2xl font-bold text-[hsl(25_95%_55%)] mb-1">Termos de Uso — {brand}</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 25 de fevereiro de 2026</p>

        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">1. Aceitação dos Termos</h2>
            <p>Ao acessar ou usar a plataforma {brand}, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">2. Descrição do Serviço</h2>
            <p>O {brand} é uma plataforma digital voltada à gestão de carreiras esportivas, criação de perfis profissionais e conexão entre profissionais do esporte. O serviço permite o cadastro de atletas, responsáveis, treinadores e demais profissionais do universo esportivo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">3. Cadastro e Conta</h2>
            <p>Para utilizar o serviço, é necessário criar uma conta com informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas em sua conta.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">4. Perfis de Menores de Idade</h2>
            <p>Perfis de atletas menores de 14 anos devem ser criados e gerenciados exclusivamente por seus responsáveis legais. A plataforma não coleta dados diretamente de crianças sem o consentimento do responsável.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">5. Uso Aceitável</h2>
            <p className="mb-2">Você concorda em não utilizar a plataforma para:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground/80">
              <li>Publicar conteúdo ofensivo, difamatório ou ilegal;</li>
              <li>Criar perfis falsos ou com informações fraudulentas;</li>
              <li>Violar a privacidade de terceiros;</li>
              <li>Utilizar o serviço para fins comerciais não autorizados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">6. Propriedade Intelectual</h2>
            <p>Todo o conteúdo e materiais da plataforma são de propriedade do {brand}. Conteúdos publicados pelos usuários permanecem de sua autoria, mas concedem ao {brand} licença de uso para exibição na plataforma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">7. Exclusão de Conta</h2>
            <p>Você pode solicitar a exclusão da sua conta a qualquer momento através das configurações do perfil. A exclusão é irreversível e todos os dados serão removidos permanentemente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">8. Limitação de Responsabilidade</h2>
            <p>O {brand} não se responsabiliza por perdas ou danos decorrentes do uso da plataforma, incluindo perda de dados ou interrupções no serviço.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[hsl(25_95%_55%)] mb-2">9. Contato</h2>
            <p className="mb-2">Para dúvidas ou suporte, entre em contato:</p>
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
