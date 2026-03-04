import { Link } from 'react-router-dom';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';
import logoCarreira from '@/assets/logo-carreira-id.png';
import logoAtletaIdDark from '@/assets/logo-atleta-id-dark.png';
import heroLandingV2Bg from '@/assets/hero-landing-v2-bg.jpg';
import heroSolucaoBg from '@/assets/hero-solucao-bg.jpg';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertCircle,
  Frown,
  TrendingUp,
  Ban,
  Building2,
  CheckCircle2,
  Users,
  User,
  School,
  Briefcase,
  Link2,
  Image,
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  Lock,
  EyeOff,
  Settings,
  Star,
  Trophy,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';

/* ─── Section badge ─── */
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full border border-orange-500/40 text-orange-400 bg-orange-500/10">
      {children}
    </span>
  );
}

/* ─── Profile card mockup (hero) ─── */
function HeroProfileCard() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1a2332] border border-[#2a3a4e] shadow-2xl overflow-hidden">
      {/* Verified badge */}
      <div className="flex justify-end p-4 pb-0">
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Perfil Verificado
        </span>
      </div>
      {/* Profile info */}
      <div className="px-5 pt-2 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">
            JP
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">João Pedro Silva</h4>
            <p className="text-emerald-400 text-sm">Meio-campista • 15 anos</p>
            <div className="flex gap-2 mt-1.5">
              <span className="text-xs bg-[#2a3a4e] text-gray-300 px-2 py-0.5 rounded">Sub-15</span>
              <span className="text-xs bg-[#2a3a4e] text-gray-300 px-2 py-0.5 rounded">São Paulo, SP</span>
            </div>
          </div>
        </div>
      </div>
      {/* Experience rows */}
      <div className="px-5 space-y-2 pb-4">
        <div className="flex items-center gap-3 bg-[#1e2b3d] rounded-xl p-3 border border-[#2a3a4e]">
          <div className="w-10 h-10 rounded-lg bg-emerald-700/50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">EC Juventude Academy</p>
            <p className="text-gray-400 text-xs">2022 – Atual</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#1e2b3d] rounded-xl p-3 border border-[#2a3a4e]">
          <div className="w-10 h-10 rounded-lg bg-amber-700/50 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Artilheiro do Campeonato</p>
            <p className="text-gray-400 text-xs">Copa Regional Sub-15 • 2024</p>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a3a4e]">
        <p className="text-gray-400 text-sm">Trajetória documentada</p>
        <p className="text-orange-400 text-sm font-semibold">12 eventos</p>
      </div>
      <div className="px-5 pb-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-[#1e2b3d] border border-[#2a3a4e] rounded-full px-3 py-1.5">
          ☀️ Link Compartilhável
        </span>
      </div>
    </div>
  );
}

/* ─── Athlete card mockup (solution) ─── */
function SolutionProfileCard() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-[#1a2332] border border-emerald-500/30 shadow-2xl overflow-hidden">
      {/* Browser dots */}
      <div className="flex gap-1.5 p-4 pb-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
      </div>
      <div className="flex flex-col items-center px-6 pt-2 pb-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
          MS
        </div>
        <h4 className="text-white font-bold text-lg">Maria Santos</h4>
        <p className="text-emerald-400 text-sm">Atacante • 14 anos</p>
        {/* Skeleton bars */}
        <div className="w-full mt-4 space-y-2">
          <div className="h-2.5 bg-gray-600 rounded-full w-full" />
          <div className="h-2.5 bg-gray-600 rounded-full w-3/4" />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full mt-5">
          {[
            { n: '24', l: 'Jogos' },
            { n: '8', l: 'Gols' },
            { n: '3', l: 'Títulos' },
          ].map((s) => (
            <div key={s.l} className="bg-emerald-700/30 border border-emerald-500/30 rounded-xl py-3 text-center">
              <p className="text-white font-bold text-lg">{s.n}</p>
              <p className="text-emerald-300 text-xs">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CarreiraLandingV2() {
  const cadastroLink = carreiraPath('/cadastro');
  const loginLink = carreiraPath('/cadastro');

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "CARREIRA ID",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web",
    "description": "Identidade esportiva digital para atletas de base. Organize e valorize a trajetória do atleta desde a base.",
    "url": "https://carreiraid.com.br",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "BRL",
      "description": "Perfil gratuito com opção de assinatura premium"
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-50 bg-[#000000] border-b border-white/5">
        <div className="container flex items-center justify-between h-16 px-4 max-w-6xl mx-auto">
          <Link to={carreiraPath('/')} className="flex items-center">
            <img src={logoCarreira} alt="Carreira ID" className="h-9" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#problema" className="hover:text-white transition">O Problema</a>
            <a href="#solucao" className="hover:text-white transition">Solução</a>
            <a href="#planos" className="hover:text-white transition">Planos</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to={loginLink}
              className="text-gray-300 hover:text-white text-sm font-medium transition"
            >
              Entrar
            </Link>
            <Link
              to={cadastroLink}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Criar Perfil
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <img src={heroLandingV2Bg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f18]/95 via-[#0a0f18]/80 to-[#0a0f18]/60" />
        <div className="relative container max-w-6xl mx-auto px-4 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <SectionBadge>Plataforma Nacional</SectionBadge>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight">
              O futebol de base brasileiro precisa de{' '}
              <span className="text-orange-400">registro, organização e valorização</span>.
            </h1>
            <p className="mt-6 text-gray-400 text-lg leading-relaxed max-w-lg">
              O Carreira ID é a identidade esportiva digital que organiza e valoriza a trajetória do atleta desde a base.
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              Para atletas independentes ou integrados a escolas que utilizam o{' '}
              <span className="text-emerald-400 font-medium">Atleta ID</span>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to={cadastroLink}
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition"
              >
                Criar Perfil Gratuito <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#solucao"
                className="inline-flex items-center justify-center gap-2 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-medium px-7 py-3.5 rounded-xl text-base transition"
              >
                <PlayCircle className="w-5 h-5" /> Ver Como Funciona
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Leva menos de 2 minutos para começar.
            </p>
          </div>
          <div className="flex justify-center">
            <HeroProfileCard />
          </div>
        </div>
        </div>
      </section>

      {/* ═══ O Problema ═══ */}
      <section id="problema" className="bg-[#0d1420] py-20">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <SectionBadge>O Problema</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Talento sem registro é talento{' '}
            <span className="text-orange-400">invisível</span>.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
            {[
              { icon: AlertCircle, title: 'Campeonatos perdidos', desc: 'Participações em campeonatos não ficam organizadas ou registradas.' },
              { icon: Frown, title: 'Premiações esquecidas', desc: 'Conquistas e premiações se perdem com o tempo.' },
              { icon: TrendingUp, title: 'Evolução invisível', desc: 'Evoluções técnicas não são documentadas de forma profissional.' },
              { icon: Ban, title: 'Sem identidade', desc: 'Sem histórico estruturado, não há identidade esportiva nem valorização.' },
            ].map((item) => (
              <div key={item.title} className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-6 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-700/30 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ A Solução ═══ */}
      <section id="solucao" className="relative overflow-hidden py-20">
        <img src={heroSolucaoBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f18]/95 via-[#0a0f18]/85 to-[#0a0f18]/70" />
        <div className="relative container max-w-6xl mx-auto px-4">
          <SectionBadge>A Solução</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            O que é o <span className="text-orange-400">Carreira ID</span>?
          </h2>
          <div className="grid md:grid-cols-2 gap-12 mt-12 items-center">
            <div>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Carreira ID é a <strong className="text-white">identidade esportiva digital</strong> do atleta brasileiro.
                Um registro público, organizado e contínuo da trajetória no esporte.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Building2, label: 'Histórico de clubes e equipes' },
                  { icon: Trophy, label: 'Registro de campeonatos e participações' },
                  { icon: TrendingUp, label: 'Linha do tempo da evolução' },
                  { icon: Image, label: 'Fotos e vídeos organizados' },
                  { icon: Link2, label: 'Link profissional compartilhável' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3 bg-emerald-700/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/30 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-white text-sm font-medium">{f.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-emerald-700/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Não é uma rede social.</p>
                <p className="text-emerald-400 text-sm font-semibold">É um currículo esportivo vivo.</p>
              </div>
            </div>
            <div className="flex justify-center">
              <SolutionProfileCard />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Integração Atleta ID ═══ */}
      <section className="bg-gradient-to-br from-emerald-800 to-emerald-900 py-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-emerald-700/20 border border-emerald-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <img src={logoAtletaIdDark} alt="Atleta ID" className="h-14 rounded-lg" />
                <div>
                  <p className="text-emerald-200 text-sm">Integrado com</p>
                  <p className="text-white font-bold text-xl">Atleta ID</p>
                </div>
              </div>
              <ul className="space-y-3">
                {['Registro oficial de participações', 'Frequência documentada', 'Campeonatos organizados', 'Premiações registradas'].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-white text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionBadge>Integração</SectionBadge>
              <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold text-white">
                Integrado ao Atleta ID.
              </h2>
              <p className="mt-4 text-emerald-100/80 leading-relaxed">
                Se o atleta participa de uma escolinha que utiliza o Atleta ID, o histórico pode ser alimentado com dados técnicos registrados pela própria escola.
              </p>
              <div className="mt-6 bg-emerald-700/20 border border-emerald-500/20 rounded-xl p-5">
                <p className="text-white font-semibold">Mais precisão.</p>
                <p className="text-white font-semibold">Mais credibilidade.</p>
                <p className="text-emerald-300 font-semibold">Mais valorização do trabalho da base.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Para Quem ═══ */}
      <section className="bg-[#0a0f18] py-20">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <SectionBadge>Para Quem</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Para quem leva o futebol <span className="text-orange-400">a sério</span>.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
            {[
              { icon: User, title: 'Para Atletas', desc: 'Construa sua identidade esportiva desde cedo e destaque-se com um histórico organizado.', color: 'emerald' },
              { icon: Users, title: 'Para Pais', desc: 'Organize e acompanhe a evolução do seu filho com segurança e praticidade.', color: 'blue' },
              { icon: School, title: 'Para Escolinhas', desc: 'Profissionalize o registro dos atletas e valorize seu trabalho de formação.', color: 'purple' },
              { icon: Briefcase, title: 'Para Clubes', desc: 'Tenha acesso a trajetórias organizadas e estruturadas de potenciais talentos.', color: 'amber' },
            ].map((item) => {
              const colorMap: Record<string, string> = {
                emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
                blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
                purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
                amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
              };
              const iconColorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/20 text-emerald-400',
                blue: 'bg-blue-500/20 text-blue-400',
                purple: 'bg-purple-500/20 text-purple-400',
                amber: 'bg-amber-500/20 text-amber-400',
              };
              return (
                <div key={item.title} className={`bg-gradient-to-b ${colorMap[item.color]} border rounded-2xl p-6 text-left`}>
                  <div className={`w-12 h-12 rounded-xl ${iconColorMap[item.color]} flex items-center justify-center mb-4`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Como Funciona ═══ */}
      <section className="bg-[#0d1420] py-20">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <SectionBadge>Como Funciona</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Simples de começar.
          </h2>
          <p className="mt-2 text-gray-400">Estratégico no longo prazo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
            {[
              { step: '1', title: 'Crie o perfil', desc: 'Cadastre-se gratuitamente em menos de 2 minutos.' },
              { step: '2', title: 'Registre eventos', desc: 'Adicione clubes, campeonatos e conquistas.' },
              { step: '3', title: 'Organize a linha do tempo', desc: 'Construa a trajetória completa do atleta.' },
              { step: '4', title: 'Compartilhe', desc: 'Envie o link quando surgir oportunidade.' },
            ].map((item, i) => (
              <div key={item.step} className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-6 text-left relative">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 text-emerald-500/50">—</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Planos ═══ */}
      <section id="planos" className="bg-[#0a0f18] py-20">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <SectionBadge>Planos</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Comece gratuito. <span className="text-orange-400">Evolua quando quiser</span>.
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-14">
            {/* Gratuito */}
            <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-8 text-left flex flex-col">
              <h3 className="text-white font-bold text-xl">Gratuito</h3>
              <p className="text-gray-400 text-sm mt-1">Perfeito para começar</p>
              <p className="mt-4">
                <span className="text-4xl font-extrabold text-white">R$0</span>
                <span className="text-gray-400 text-sm ml-1">/mês</span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {['Perfil público básico', 'Publicações manuais', 'Link compartilhável'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={cadastroLink}
                className="mt-6 block text-center border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold py-3 rounded-xl transition"
              >
                Começar Grátis
              </Link>
            </div>
            {/* Carreira */}
            <div className="bg-emerald-700 rounded-2xl p-8 text-left flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-xs font-bold bg-[#0a0f18]/60 text-white px-3 py-1 rounded-full">Recomendado</span>
              </div>
              <h3 className="text-white font-bold text-xl">Carreira</h3>
              <p className="text-emerald-100/70 text-sm mt-1">Para quem quer se destacar</p>
              <p className="mt-4">
                <span className="text-4xl font-extrabold text-white">R$19</span>
                <span className="text-emerald-100/70 text-sm ml-1">/mês</span>
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {['Linha do tempo estruturada', 'Mini currículo esportivo', 'Registro avançado de eventos', 'Destaque no perfil', 'Controle ampliado de visibilidade'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={cadastroLink}
                className="mt-6 block text-center bg-white text-emerald-700 hover:bg-gray-100 font-semibold py-3 rounded-xl transition"
              >
                Assinar Agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Segurança ═══ */}
      <section className="bg-[#0d1420] py-20">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <SectionBadge>Segurança</SectionBadge>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold">
            Visibilidade com{' '}
            <span className="text-orange-400">responsabilidade</span>.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-14 max-w-4xl mx-auto">
            {[
              { icon: Lock, title: 'Controle Parental', desc: 'Perfis de menores são controlados pelos responsáveis.' },
              { icon: EyeOff, title: 'Dados Protegidos', desc: 'Informações sensíveis não são públicas automaticamente.' },
              { icon: Settings, title: 'Você Decide', desc: 'Você decide o que aparece e quem pode ver.' },
            ].map((item) => (
              <div key={item.title} className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-6 text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-700/30 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Final ═══ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1420] via-emerald-900/30 to-[#0d1420]" />
        <div className="container max-w-4xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            O talento brasileiro não pode depender apenas da{' '}
            <span className="text-emerald-400">sorte</span> para ser visto.
          </h2>
          <p className="mt-6 text-gray-300 text-xl font-semibold">
            Registre. Organize. <span className="text-emerald-400">Valorize.</span>
          </p>
          <Link
            to={cadastroLink}
            className="mt-8 inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition shadow-lg shadow-orange-500/20"
          >
            Criar Perfil Gratuito <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Gratuito para sempre. Sem cartão de crédito.
          </p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="bg-[#0a0f18] py-20">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <SectionBadge>Dúvidas Frequentes</SectionBadge>
            <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold">
              Perguntas <span className="text-orange-400">Frequentes</span>
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: 'O Carreira ID é gratuito?',
                a: 'Sim! Você pode criar seu perfil público, fazer publicações e compartilhar seu link gratuitamente. O plano Carreira (R$19/mês) oferece recursos avançados como linha do tempo estruturada e mini currículo esportivo.',
              },
              {
                q: 'Quem pode criar um perfil?',
                a: 'Qualquer pessoa ligada ao esporte: atletas, pais/responsáveis, profissionais de educação física e escolinhas esportivas. Perfis de menores de idade são controlados exclusivamente pelos responsáveis.',
              },
              {
                q: 'Como funciona para atletas menores de idade?',
                a: 'O responsável legal cria e gerencia o perfil do atleta menor de idade. Ele define o que pode ou não ser exibido publicamente, garantindo total controle parental sobre as informações.',
              },
              {
                q: 'O que é a integração com o Atleta ID?',
                a: 'O Atleta ID é a plataforma de gestão para escolinhas esportivas. Se o atleta está matriculado em uma escolinha que usa o Atleta ID, dados como frequência, participações em campeonatos e premiações podem ser importados automaticamente para o Carreira ID.',
              },
              {
                q: 'Meus dados ficam seguros?',
                a: 'Sim. Informações sensíveis nunca são exibidas publicamente. Você tem controle total sobre o que aparece no seu perfil. Utilizamos criptografia e práticas modernas de segurança para proteger seus dados.',
              },
              {
                q: 'Posso cancelar o plano a qualquer momento?',
                a: 'Sim, o plano Carreira pode ser cancelado a qualquer momento sem multa. Seu perfil continua ativo no plano gratuito, preservando todas as suas publicações.',
              },
              {
                q: 'Como compartilho meu perfil?',
                a: 'Cada perfil tem um link único (ex: carreiraid.com.br/seu-nome). Você pode copiar e enviar por WhatsApp, redes sociais, e-mail ou qualquer outro meio.',
              },
            ].map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl px-5 data-[state=open]:border-orange-500/40"
              >
                <AccordionTrigger className="text-white text-left font-medium hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-white/5 py-8 bg-[#0a0f18]">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoCarreira} alt="Carreira ID" className="h-8" />
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <a href={carreiraPath('/termos')} className="hover:text-white transition">Termos de Uso</a>
            <a href={carreiraPath('/privacidade')} className="hover:text-white transition">Privacidade</a>
            <a href={carreiraPath('/contato')} className="hover:text-white transition">Contato</a>
          </nav>
          <p className="text-xs text-gray-600">© 2024 Carreira ID. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ═══ WhatsApp Flutuante ═══ */}
      <a
        href="https://wa.me/5521969622045?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20Carreira%20ID!"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-transform hover:scale-110"
        aria-label="Fale conosco no WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}
