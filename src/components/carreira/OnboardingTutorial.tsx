import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Shield, Camera, MapPin, Trophy, Share2, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  onStart: () => void;
  brandName: string;
}

const STEPS = [
  {
    icon: UserPlus,
    emoji: '👋',
    title: 'Crie sua conta',
    description: 'Use seu Google ou cadastre com email e senha. É rápido e gratuito!',
    details: [
      'Nome completo',
      'Email válido',
      'Senha (mínimo 6 caracteres)',
    ],
  },
  {
    icon: Trophy,
    emoji: '⚽',
    title: 'Escolha o tipo de perfil',
    description: 'Selecione como você participa do mundo esportivo.',
    details: [
      'Cadastrar meu Atleta (filho)',
      'Professor / Treinador',
      'Dono de Escola',
      'Empresário, Scout e mais...',
    ],
  },
  {
    icon: Shield,
    emoji: '📋',
    title: 'Preencha o perfil',
    description: 'Para o perfil de atleta, você precisará dos seguintes dados:',
    details: [
      'Nome do atleta e data de nascimento',
      'CPF e WhatsApp do responsável (privados)',
      'Modalidade e categoria esportiva',
      'Cidade e estado',
      'Foto do atleta (opcional)',
    ],
  },
  {
    icon: Share2,
    emoji: '🚀',
    title: 'Compartilhe e conecte!',
    description: 'Após criar, seu atleta terá uma vitrine profissional completa.',
    details: [
      'Link público para compartilhar',
      'Timeline de atividades e conquistas',
      'Conexão com escolas e profissionais',
      'Histórico de carreira esportiva',
    ],
  },
];

export function OnboardingTutorial({ onStart, brandName }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Como funciona o {brandName}?</h1>
        <p className="text-sm text-muted-foreground mt-1">Veja o passo a passo antes de começar</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentStep
                ? 'w-8 bg-primary'
                : i < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6 min-h-[280px] flex flex-col">
        <div className="text-center mb-4">
          <span className="text-4xl mb-2 block">{step.emoji}</span>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
            Passo {currentStep + 1} de {STEPS.length}
          </div>
          <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
        </div>

        <ul className="space-y-2.5 flex-1">
          {step.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-foreground">{detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="gap-1"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
        )}
        
        {isLast ? (
          <Button size="lg" className="flex-1 gap-2" onClick={onStart}>
            Começar Cadastro
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="lg" className="flex-1 gap-2" onClick={() => setCurrentStep(currentStep + 1)}>
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      <button
        onClick={onStart}
        className="w-full mt-3 text-center text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        Pular tutorial →
      </button>
    </div>
  );
}
