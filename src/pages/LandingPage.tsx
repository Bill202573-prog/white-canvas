import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  ClipboardCheck,
  History,
  GraduationCap,
  Smartphone,
  CheckCircle2,
  Building2,
  Heart,
  Trophy,
  ArrowRight,
  Calendar,
  Medal,
  FileText,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  BarChart3,
  CalendarCheck,
  UserCheck,
  Bell,
} from "lucide-react";
import logoAtletaId from "@/assets/logo-atleta-id-vendas.png";
import heroPrimeiraDobra from "@/assets/hero-primeira-dobra.png";
import mockupPerfilPai from "@/assets/mockup-perfil-pai.png";
import mockupPerfilEscolinha from "@/assets/mockup-perfil-escolinha.png";
import mockupDashboardLaptop from "@/assets/mockup-dashboard-laptop.png";
import mockupGraficosEscolinha from "@/assets/mockup-graficos-escolinha.png";
import logoBandeirantes from "@/assets/parceiros/bandeirantes-futebol-recreio.jpg";

const LandingPage = () => {
const navigate = useNavigate();

  // OAuth cross-domain fallback:
  // When the Lovable-managed Google OAuth sends the user back to
  // bola-presente-kids.lovable.app after authentication, we detect any
  // active session and redirect to atletaid.com.br with the tokens,
  // so the Supabase client on that domain can restore the session.
  useEffect(() => {
    const CANONICAL_ORIGIN = 'https://atletaid.com.br';
    const isWrongDomain = window.location.origin !== CANONICAL_ORIGIN;

    // Helper to redirect authenticated user to canonical domain
    const redirectToCanonical = async (session: any) => {
      if (!session?.user || !isWrongDomain) return false;
      if (!session.access_token || !session.refresh_token) return false;

      const { data: existing } = await supabase
        .from('perfis_rede')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const targetPath = existing ? '/carreira' : '/carreira/cadastro';
      const tokenHash = `#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=recovery`;
      window.location.href = `${CANONICAL_ORIGIN}${targetPath}${tokenHash}`;
      return true;
    };

    // Listen for ALL auth events (SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          if (isWrongDomain) {
            await redirectToCanonical(session);
          } else if (event === 'SIGNED_IN') {
            const { data: existing } = await supabase
              .from('perfis_rede')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            navigate(existing ? '/carreira' : '/carreira/cadastro');
          }
        }
      }
    );

    // Immediate session check - catches cases where events fired before listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      redirectToCanonical(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleDemoRequest = () => {
    const message = encodeURIComponent("Vim pelo site e quero mais informações");
    window.open(`https://wa.me/5521969622045?text=${message}`, "_blank");
  };

  const impactBlocks = [
    {
      icon: TrendingUp,
      title: "Mais clareza",
      description: "Sobre a jornada de cada aluno",
    },
    {
      icon: Shield,
      title: "Mais confiança",
      description: "Percebida pelos pais",
    },
    {
      icon: Zap,
      title: "Mais profissionalismo",
      description: "No dia a dia da escolinha",
    },
    {
      icon: FileText,
      title: "Mais organização",
      description: "Para decisões de longo prazo",
    },
  ];

  const problemBlocks = [
    { icon: Calendar, text: "Aulas acontecem e se perdem no tempo" },
    { icon: Trophy, text: "Amistosos ficam apenas na memória" },
    { icon: Medal, text: "Campeonatos não deixam histórico" },
    { icon: FileText, text: "Conquistas não são documentadas" },
  ];

  const solutionCards = [
    {
      icon: ClipboardCheck,
      title: "Registro de presença",
      description: "Controle de frequência em todas as aulas",
    },
    {
      icon: Trophy,
      title: "Amistosos e campeonatos",
      description: "Participação registrada em cada evento",
    },
    {
      icon: Medal,
      title: "Conquistas documentadas",
      description: "Prêmios coletivos e individuais preservados",
    },
    {
      icon: History,
      title: "Histórico contínuo",
      description: "Jornada completa ao longo do tempo",
    },
  ];

  const stakeholders = [
    {
      icon: Building2,
      title: "Escolinha",
      description: "Organização, profissionalismo e clareza para decisões.",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Heart,
      title: "Pais",
      description: "Acompanhamento da jornada do filho, sem pressão, rankings ou comparações.",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: Users,
      title: "Alunos",
      description: "Registro da própria história esportiva, com valorização do processo.",
      color: "bg-success/10 text-success",
    },
    {
      icon: GraduationCap,
      title: "Professores",
      description: "Menos burocracia e mais foco no campo.",
      color: "bg-warning/10 text-warning-foreground",
    },
    {
      icon: Globe,
      title: "Esporte brasileiro",
      description: "Fortalecimento da base por meio da profissionalização das escolinhas.",
      color: "bg-primary/10 text-primary",
    },
  ];

  const parentFeatures = [
    { icon: CalendarCheck, text: "Agenda de aulas" },
    { icon: UserCheck, text: "Confirmação de presença" },
    { icon: History, text: "Jornada esportiva" },
    { icon: Bell, text: "Avisos da escola" },
  ];

  const schoolFeatures = [
    { icon: BarChart3, text: "Crescimento financeiro" },
    { icon: Users, text: "Número de alunos" },
    { icon: TrendingUp, text: "Indicadores de gestão" },
    { icon: FileText, text: "Relatórios e dados" },
  ];

  const plans = [
    { students: "Até 50 alunos", price: "170,00" },
    { students: "51 a 200 alunos", price: "210,00" },
    { students: "201 a 300 alunos", price: "250,00" },
  ];

  const faqs = [
    {
      question: "Preciso instalar algo?",
      answer:
        "Não! O ATLETA ID funciona 100% online, direto no navegador do celular ou computador. Basta acessar e usar.",
    },
    {
      question: "Funciona no celular?",
      answer:
        "Sim! O sistema foi pensado para funcionar perfeitamente no celular, tanto para gestores quanto para os pais dos alunos.",
    },
    {
      question: "Posso ter mais de uma unidade?",
      answer:
        "Sim! Você pode gerenciar múltiplas unidades em um único painel centralizado, cada uma com seu próprio enquadramento.",
    },
    {
      question: "O valor muda se minha escola crescer?",
      answer:
        "Sim, o plano se ajusta conforme a quantidade de alunos. Você sempre paga de acordo com o tamanho atual da sua escola.",
    },
    {
      question: "Posso cancelar quando quiser?",
      answer:
        "Sim! Não há fidelidade. Você pode cancelar a qualquer momento sem taxas adicionais.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ATLETA ID",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Sistema completo de gestão para escolinhas de futebol. Controle alunos, turmas, presença, mensalidades e campeonatos.",
    "url": "https://atletaid.com.br",
    "offers": {
      "@type": "Offer",
      "price": "170.00",
      "priceCurrency": "BRL",
      "description": "Plano a partir de R$170/mês para até 50 alunos"
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased overflow-x-hidden" style={{ contain: 'layout style' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ===================== HERO SECTION - IMPACTO COM IMAGEM DE FUNDO ===================== */}
      <section className="relative min-h-screen flex items-center">
        {/* Background image - using img for LCP optimization */}
        <img
          src={heroPrimeiraDobra}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Dark overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/60" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Header with login button */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="container mx-auto px-6 lg:px-12 py-4 flex justify-end">
            <Link to="/login">
              <Button
                variant="ghost"
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm font-medium"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>

        <div className="container relative mx-auto px-6 lg:px-12 py-20 lg:py-0">
          <div className="max-w-3xl">
            <img
              src={logoAtletaId}
              alt="ATLETA ID"
              width={192}
              height={192}
              fetchPriority="high"
              className="h-32 sm:h-40 lg:h-48 w-auto mb-8 lg:mb-10"
            />
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-primary-foreground leading-[1.15] tracking-tight mb-6">
              Gestão inteligente para impulsionar o crescimento da sua{" "}
              <span className="text-accent">escola esportiva</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/90 mb-4 max-w-xl font-medium">
              Organização, histórico e continuidade para escolinhas que levam a formação a sério.
            </p>
            
            <p className="text-sm sm:text-base lg:text-lg text-primary-foreground/70 mb-8 lg:mb-10 max-w-lg">
              Registre presença em aulas, participação em amistosos e campeonatos, conquistas coletivas e individuais, e construa um histórico esportivo real para cada aluno.
            </p>
            
            <Button
              onClick={handleDemoRequest}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base lg:text-lg px-8 lg:px-10 py-6 lg:py-7 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
            >
              Fale conosco
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-primary-foreground/50" />
          </div>
        </div>
      </section>

      {/* ===================== SECTION 2: GESTÃO INTELIGENTE - COM MOCKUP LAPTOP ===================== */}
      <section className="py-20 lg:py-28 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text content */}
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-6">
                Mais controle e clareza para a gestão da{" "}
                <span className="text-primary">sua escolinha</span>
              </h2>
              
              <p className="text-lg lg:text-xl text-muted-foreground mb-8">
                O ATLETA ID centraliza as informações mais importantes do dia a dia da sua escolinha em um único painel simples e fácil de usar. Você passa a enxergar a gestão com clareza, reduz o improviso e ganha segurança para tomar decisões.
              </p>

              {/* Vantagens em lista */}
              <div className="space-y-4 mb-8">
                {[
                  "Visão clara dos alunos ativos e responsáveis",
                  "Controle simples de mensalidades e pagamentos",
                  "Acompanhamento do financeiro mês a mês",
                  "Organização de turmas, professores e aulas",
                  "Menos dependência de planilhas e WhatsApp",
                  "Mais profissionalismo percebido pelos pais",
                  "Base estruturada para crescer com segurança"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground italic">
                Tudo pensado para facilitar a sua gestão no dia a dia.
              </p>
            </div>

            {/* Right: Mockup do laptop */}
            <div className="relative order-1 lg:order-2 flex justify-center">
              <div className="relative">
                {/* Decorative blur */}
                <div className="absolute -inset-8 bg-primary/15 rounded-[3rem] blur-3xl" />
                
                {/* Laptop mockup with real screenshot */}
                <div className="relative z-10 max-w-[500px] lg:max-w-[600px]">
                  <img
                    src={mockupDashboardLaptop}
                    alt="Dashboard administrativo - ATLETA ID"
                    width={600}
                    height={357}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 3: GESTÃO COM DADOS REAIS ===================== */}
      <section className="py-20 lg:py-28 bg-background overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-primary font-medium">Para a escolinha</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-6">
                Gestão com{" "}
                <span className="text-primary">dados reais.</span>
              </h2>
              
              <p className="text-lg lg:text-xl text-muted-foreground mb-8">
                A escolinha visualiza números importantes, acompanha crescimento e toma decisões com base em dados reais.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {schoolFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                <p className="text-foreground">
                  <strong className="text-accent">Ferramenta robusta de gestão</strong> — controle e decisão para quem administra.
                </p>
              </div>
            </div>

            {/* Right: Phone mockup */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Decorative blur */}
                <div className="absolute -inset-8 bg-primary/15 rounded-[3rem] blur-3xl" />
                
                {/* Phone mockup with charts */}
                <div className="relative z-10 max-w-[320px] lg:max-w-[380px]">
                  <img
                    src={mockupGraficosEscolinha}
                    alt="Gráficos de crescimento - ATLETA ID"
                    width={380}
                    height={676}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-[2rem] shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: PROVA DE IMPACTO ===================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight">
              Escolinhas organizadas constroem{" "}
              <span className="text-accent">projetos mais fortes.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {impactBlocks.map((block, index) => (
              <Card
                key={index}
                className="bg-card border-2 border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg group"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/20 transition-colors">
                    <block.icon className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
                    {block.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {block.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 5: TRANQUILIDADE PARA OS PAIS ===================== */}
      <section className="py-20 lg:py-28 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Phone mockup */}
            <div className="relative flex justify-center order-2 lg:order-1">
              <div className="relative">
                {/* Decorative blur */}
                <div className="absolute -inset-8 bg-accent/15 rounded-[3rem] blur-3xl" />
                
                {/* Phone mockup */}
                <div className="relative z-10 max-w-[320px] lg:max-w-[380px]">
                  <img
                    src={mockupPerfilPai}
                    alt="Agenda do responsável - ATLETA ID"
                    width={380}
                    height={676}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Right: Text content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full mb-6">
                <Heart className="h-5 w-5 text-accent" />
                <span className="text-accent font-medium">Para os pais</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-6">
                Tranquilidade para{" "}
                <span className="text-accent">acompanhar a jornada.</span>
              </h2>
              
              <p className="text-lg lg:text-xl text-muted-foreground mb-8">
                O pai acompanha a rotina esportiva do filho de forma simples, clara e sem pressão, diretamente pelo celular.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {parentFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-foreground">
                  <strong className="text-primary">Sistema real e funcional</strong> — pronto para uso pelos pais, sem complicação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 6: O PROBLEMA REAL ===================== */}
      <section className="py-20 lg:py-28 bg-muted/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-6">
                O que acontece quando a jornada{" "}
                <span className="text-destructive">não é registrada?</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-12">
              {problemBlocks.map((problem, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border/50 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <problem.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-lg text-foreground font-medium">{problem.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center p-8 lg:p-10 rounded-2xl bg-destructive/5 border-2 border-destructive/20">
              <p className="text-xl lg:text-2xl font-bold text-foreground">
                Sem registro, a história do atleta{" "}
                <span className="text-destructive">desaparece.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: A SOLUÇÃO ATLETA ID ===================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-4">
              O ATLETA ID resolve isso{" "}
              <span className="text-accent">de forma simples.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {solutionCards.map((solution, index) => (
              <Card
                key={index}
                className="bg-accent/5 border-2 border-accent/20 hover:border-accent/40 transition-all duration-300"
              >
                <CardContent className="p-6 lg:p-8">
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-5">
                    <solution.icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-foreground mb-2">
                    {solution.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {solution.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center p-8 lg:p-10 rounded-2xl bg-primary/5 border border-primary/20">
            <p className="text-lg lg:text-xl text-foreground">
              O aluno constrói um verdadeiro{" "}
              <strong className="text-primary font-bold">currículo esportivo</strong>,
              valorizando o processo e não apenas resultados imediatos.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 5: JORNADA NÃO FICA PRESA ===================== */}
      <section className="py-20 lg:py-28 bg-primary">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full mb-8">
              <History className="h-5 w-5 text-accent" />
              <span className="text-primary-foreground/80 font-medium">Diferencial exclusivo</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground tracking-tight mb-6">
              A história acompanha o atleta.
            </h2>
            
            <p className="text-lg lg:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
              Se o aluno passar por mais de uma escolinha, seu histórico esportivo continua.
            </p>
            
            <div className="inline-block p-6 lg:p-8 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20">
              <p className="text-xl lg:text-2xl font-bold text-primary-foreground">
                A jornada pertence ao <span className="text-accent">atleta</span>,
                não ao papel ou à memória.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================== SECTION 8: BENEFÍCIOS PARA TODOS ===================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight">
              Benefícios para{" "}
              <span className="text-accent">todos.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {stakeholders.map((stakeholder, index) => (
              <Card
                key={index}
                className="bg-card border-2 border-border hover:border-accent/30 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6 lg:p-8 text-center h-full flex flex-col">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${stakeholder.color}`}>
                    <stakeholder.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {stakeholder.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                    {stakeholder.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 9: PROPÓSITO ===================== */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="container relative mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full mb-8">
              <Heart className="h-5 w-5 text-accent" />
              <span className="text-primary-foreground/80 font-medium">Nosso propósito</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight tracking-tight">
              Mais do que um sistema,
              <br />
              <span className="text-accent">o ATLETA ID</span> é uma infraestrutura
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 mt-12 mb-8">
              <div className="p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <p className="text-primary-foreground font-semibold text-lg">Organizar a base</p>
              </div>
              <div className="p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <p className="text-primary-foreground font-semibold text-lg">Preservar histórias</p>
              </div>
              <div className="p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <p className="text-primary-foreground font-semibold text-lg">Fortalecer o esporte</p>
              </div>
            </div>

            <p className="text-xl text-primary-foreground/70">
              Contribuindo com o desenvolvimento do esporte brasileiro.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 10: OFERTA E PLANOS ===================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-full text-sm font-bold mb-6 shadow-lg">
              <Zap className="h-4 w-4" />
              Aproveite as condições de lançamento
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight mb-4">
              Exclusiva para as primeiras escolinhas
            </h2>
            
            {/* Taxa de implantação cortada */}
            <div className="mt-8 mb-6">
              <p className="text-lg lg:text-xl font-bold text-accent mb-2">
                SEM TAXA DE IMPLANTAÇÃO PARA AS PRIMEIRAS ESCOLINHAS
              </p>
              <p className="text-muted-foreground">
                <span className="line-through text-destructive/70">Taxa R$ 650,00</span>
                <span className="ml-3 text-accent font-bold">GRÁTIS!</span>
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 lg:gap-8">
              <div className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Sem fidelidade</span>
              </div>
              <div className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Gestão centralizada</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 lg:gap-6 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-primary text-primary-foreground border-0"
              >
                <CardContent className="p-6 lg:p-8 text-center">
                  <p className="text-sm mb-3 text-primary-foreground/70">
                    {plan.students}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl lg:text-5xl font-bold text-primary-foreground">
                      R$ {plan.price}
                    </span>
                    <span className="text-primary-foreground/70">
                      /mês
                    </span>
                  </div>
                  <Button
                    onClick={handleDemoRequest}
                    className="w-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Solicitar demonstração
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 11: FAQ + CTA FINAL ===================== */}
      <section className="py-20 lg:py-28 bg-muted/50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-center mb-12 tracking-tight">
              Perguntas frequentes
            </h2>

            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border-2 border-border rounded-xl px-6 data-[state=open]:border-accent/50"
                >
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-16 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-6">
                Pronto para transformar sua escolinha?
              </h3>
              <Button
                onClick={handleDemoRequest}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-10 py-7 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
              >
                Solicitar demonstração
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 12: ESCOLAS PARTICIPANTES ===================== */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
              Escolas que já fazem parte
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Conheça algumas das escolinhas que estão transformando sua gestão com o ATLETA ID
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
            {/* Escola 1 - Bandeirantes */}
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden bg-card border-2 border-border shadow-lg hover:border-accent/50 hover:shadow-xl transition-all duration-300">
              <img
                src={logoBandeirantes}
                alt="Bandeirantes Futebol Recreio"
                width={160}
                height={160}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Placeholder para futuras escolas */}
            {/* Adicione mais escolas aqui seguindo o mesmo padrão */}
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-12 bg-primary">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img
              src={logoAtletaId}
              alt="ATLETA ID"
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-8 w-auto brightness-0 invert"
            />
            <p className="text-primary-foreground/60 text-sm text-center md:text-right">
              © {new Date().getFullYear()} ATLETA ID. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
