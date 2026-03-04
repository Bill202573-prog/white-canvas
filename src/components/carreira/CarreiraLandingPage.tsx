import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logoAtletaId from '@/assets/logo-atleta-id.png';
import heroCarreira from '@/assets/hero-carreira-landing.jpg';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';
import {
  UserPlus,
  Camera,
  Award,
  Share2,
  Shield,
  Eye,
  Star,
  Clock,
  CheckCircle2,
  Lock,
  LogIn,
} from 'lucide-react';

export function CarreiraLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to={carreiraPath('/')} className="flex items-center gap-2">
            <img src={logoAtletaId} alt="Atleta ID" className="h-8" />
            <span className="text-xs text-muted-foreground border-l border-border pl-3 hidden sm:inline">
              Carreira Esportiva
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={carreiraPath('/cadastro')}>
                <LogIn className="w-4 h-4 mr-1" />
                Entrar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={carreiraPath('/cadastro')}>Criar Perfil</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroCarreira}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/90" />
        <div className="container max-w-4xl px-4 py-20 md:py-32 text-center relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight tracking-tight">
            Construa sua{' '}
            <span className="text-accent">Carreira Esportiva</span>{' '}
            Pública
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Crie seu perfil gratuito, publique seus momentos no esporte e organize
            toda a sua trajetória esportiva em um só lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link to={carreiraPath('/cadastro')}>
                <UserPlus className="w-5 h-5 mr-2" />
                Criar Perfil Gratuito
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to={carreiraPath('/joao-guilherme-ribeiro-nogueira-cqauhf')}>
                <Eye className="w-5 h-5 mr-2" />
                Ver Exemplo de Carreira
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* O que é */}
      <section className="bg-card border-y border-border">
        <div className="container max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            O que é a Carreira Atleta ID?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            É o seu perfil público esportivo. Um espaço onde você registra suas
            conquistas, publica fotos e vídeos dos seus melhores momentos, e
            organiza todo o seu histórico esportivo — tudo acessível por um link
            que você compartilha com quem quiser.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            {[
              { icon: Star, title: 'Perfil Público', desc: 'Sua vitrine esportiva acessível para qualquer pessoa.' },
              { icon: Camera, title: 'Publicações', desc: 'Compartilhe fotos, textos e momentos marcantes.' },
              { icon: Clock, title: 'Histórico Organizado', desc: 'Linha do tempo com toda a sua trajetória no esporte.' },
            ].map((item) => (
              <Card key={item.title} variant="outlined" className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="container max-w-4xl px-4 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center">Como Funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {[
            { step: '1', icon: UserPlus, title: 'Crie seu perfil gratuito', desc: 'Preencha seus dados básicos e já tenha sua página pública.' },
            { step: '2', icon: Camera, title: 'Publique momentos', desc: 'Fotos, textos e registros dos seus treinos e jogos.' },
            { step: '3', icon: Award, title: 'Ative o Plano Carreira', desc: 'Opcional. Organize sua trajetória em formato de currículo.' },
            { step: '4', icon: Share2, title: 'Compartilhe seu link', desc: 'Envie para clubes, olheiros, amigos e familiares.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 rounded-full gradient-field flex items-center justify-center mx-auto mb-3 text-primary-foreground font-bold text-lg">
                {item.step}
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section className="bg-card border-y border-border">
        <div className="container max-w-4xl px-4 py-16">
          <h2 className="text-2xl font-bold text-foreground text-center">Planos</h2>
          <p className="text-muted-foreground text-center mt-2">Comece grátis. Evolua quando quiser.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <Card variant="outlined" className="flex flex-col">
              <CardContent className="pt-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-foreground">Gratuito</h3>
                <p className="text-3xl font-extrabold text-foreground mt-2">R$ 0</p>
                <p className="text-sm text-muted-foreground">para sempre</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {['Perfil público básico', 'Publicações com fotos e textos', 'Link compartilhável'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link to={carreiraPath('/cadastro')}>Criar Perfil Gratuito</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="flex flex-col border-2 border-accent relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">Em breve</div>
              <CardContent className="pt-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-foreground">Plano Carreira</h3>
                <p className="text-3xl font-extrabold text-foreground mt-2">R$ —<span className="text-base font-medium text-muted-foreground">/mês</span></p>
                <p className="text-sm text-muted-foreground">valor a definir</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {['Tudo do plano gratuito', 'Mini currículo estruturado', 'Linha do tempo organizada', 'Registro detalhado de eventos', 'Destaque visual no perfil', 'Controle de visibilidade'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant="outline" disabled>Em breve</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Segurança e Privacidade */}
      <section className="container max-w-4xl px-4 py-16">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Segurança e Privacidade</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Seus dados sensíveis nunca são exibidos publicamente. Informações de
            atletas menores de idade são controladas exclusivamente pelo
            responsável, que define o que pode ou não aparecer no perfil público.
          </p>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> Dados protegidos</span>
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Controle parental</span>
            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> Visibilidade configurável</span>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="gradient-field py-16">
        <div className="container max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-foreground">Pronto para começar?</h2>
          <p className="mt-2 text-primary-foreground/80">Crie seu perfil esportivo público em menos de 2 minutos.</p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link to={carreiraPath('/cadastro')}>
              <UserPlus className="w-5 h-5 mr-2" />
              Criar Perfil Gratuito
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-background">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Carreira Atleta ID — Sua trajetória no esporte</p>
        </div>
      </footer>
    </div>
  );
}