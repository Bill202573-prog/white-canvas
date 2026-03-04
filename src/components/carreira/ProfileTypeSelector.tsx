import { Card } from '@/components/ui/card';

export type ProfileType =
  | 'atleta_filho'
  | 'professor'
  | 'tecnico'
  | 'dono_escola'
  | 'preparador_fisico'
  | 'empresario'
  | 'influenciador'
  | 'scout'
  | 'agente_clube'
  | 'fotografo';

interface ProfileOption {
  type: ProfileType;
  icon: string;
  label: string;
  description: string;
}

const PROFILE_OPTIONS: ProfileOption[] = [
  { type: 'atleta_filho', icon: '⚽', label: 'Cadastrar meu Atleta', description: 'Crie o perfil esportivo do seu filho (você administra)' },
  { type: 'professor', icon: '👨‍🏫', label: 'Professor / Treinador', description: 'Ensina e treina atletas em formação' },
  { type: 'tecnico', icon: '📋', label: 'Técnico de Futebol', description: 'Dirige equipes em competições e jogos' },
  { type: 'dono_escola', icon: '🏫', label: 'Dono de Escola', description: 'Administra escolinha ou clube de base' },
  { type: 'preparador_fisico', icon: '💪', label: 'Preparador Físico', description: 'Cuida da performance física dos atletas' },
  { type: 'empresario', icon: '💼', label: 'Empresário', description: 'Representa e gerencia carreiras de atletas' },
  { type: 'influenciador', icon: '⭐', label: 'Influenciador', description: 'Cria conteúdo sobre esporte' },
  { type: 'scout', icon: '🎯', label: 'Scout', description: 'Observa e identifica talentos esportivos' },
  { type: 'agente_clube', icon: '🏢', label: 'Agente de Clube', description: 'Representa um clube na captação de talentos' },
  { type: 'fotografo', icon: '📸', label: 'Fotógrafo', description: 'Registra momentos esportivos' },
];

interface Props {
  onSelect: (type: ProfileType) => void;
}

export function ProfileTypeSelector({ onSelect }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Como você quer participar?</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha o perfil que melhor representa você na rede</p>
      </div>

      <div className="grid gap-2">
        {PROFILE_OPTIONS.map((opt) => (
          <Card
            key={opt.type}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => onSelect(opt.type)}
          >
            <div className="flex items-center gap-3 p-3">
              <span className="text-2xl flex-shrink-0">{opt.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
