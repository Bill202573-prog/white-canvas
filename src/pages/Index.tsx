import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronRight, Users, GraduationCap, CalendarCheck, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoAtletaId from '@/assets/logo-atleta-id.png';

const Index = () => {
  const { user, isLoading } = useAuth();

  // If already logged in, redirect to dashboard
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoAtletaId} alt="ATLETA ID" className="h-10 w-auto" />
          </div>
          <Link to="/login">
            <Button>
              Entrar
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <section className="container py-20 text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <img src={logoAtletaId} alt="" className="h-4 w-auto" />
              Sistema de Gestão para Escolinhas
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Gestão de Presença
              <span className="block text-accent">Simples e Eficiente</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Controle de alunos, turmas, professores e presença em um só lugar. 
              Alertas de aniversário, visualização por foto e muito mais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="xl" className="w-full sm:w-auto">
                  Acessar Sistema
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Saiba Mais
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                title: 'Gestão de Alunos',
                description: 'Cadastro completo com foto e vínculo com responsáveis',
              },
              {
                icon: GraduationCap,
                title: 'Professores',
                description: 'Controle de turmas e marcação de presença',
              },
              {
                icon: CalendarCheck,
                title: 'Controle de Presença',
                description: 'Confirmação pelo responsável e registro pelo professor',
              },
              {
                icon: Shield,
                title: 'Multi-Escolinhas',
                description: 'Administração global com múltiplas unidades',
              },
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* User Types */}
        <section className="container py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Para Cada Tipo de Usuário
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Interfaces personalizadas para cada perfil de acesso
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { role: 'Administrador', desc: 'Controle global do sistema', color: 'bg-primary' },
              { role: 'Escolinha', desc: 'Gestão completa da unidade', color: 'bg-accent' },
              { role: 'Professor', desc: 'Turmas e chamada', color: 'bg-success' },
              { role: 'Responsável', desc: 'Acompanhamento dos filhos', color: 'bg-warning' },
            ].map((item, index) => (
              <div 
                key={item.role}
                className="text-center p-6 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl ${item.color} mx-auto mb-4 flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-primary-foreground">{item.role.charAt(0)}</span>
                </div>
                <h3 className="font-semibold text-foreground">{item.role}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="container text-center text-sm text-muted-foreground">
            <p>© 2024 ATLETA ID. Sistema de Gestão de Escolinhas de Futebol.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
