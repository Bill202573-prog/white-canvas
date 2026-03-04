import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConectarButton } from '../ConectarButton';
import { ConexoesCount } from '../ConexoesCount';
import type { ProfileType } from '../ProfileTypeSelector';

const TYPE_CONFIG: Record<ProfileType, { label: string; icon: string; color: string }> = {
  professor: { label: 'Professor / Treinador', icon: '👨‍🏫', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  tecnico: { label: 'Técnico de Futebol', icon: '⚽', color: 'bg-green-500/10 text-green-700 border-green-200' },
  dono_escola: { label: 'Dono de Escola', icon: '🏫', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  preparador_fisico: { label: 'Preparador Físico', icon: '💪', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
  empresario: { label: 'Empresário', icon: '💼', color: 'bg-slate-500/10 text-slate-700 border-slate-200' },
  influenciador: { label: 'Influenciador', icon: '⭐', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  atleta_filho: { label: 'Atleta', icon: '⚽', color: 'bg-green-500/10 text-green-700 border-green-200' },
  scout: { label: 'Scout', icon: '🎯', color: 'bg-red-500/10 text-red-700 border-red-200' },
  agente_clube: { label: 'Agente de Clube', icon: '🏢', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-200' },
  fotografo: { label: 'Fotógrafo', icon: '📸', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
};

interface PerfilData {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  foto_url: string | null;
  bio: string | null;
  instagram: string | null;
  dados_perfil: Record<string, any> | null;
}

interface Props {
  perfil: PerfilData;
  isOwnProfile: boolean;
  currentUserId?: string | null;
  children?: ReactNode;
}

export function PerfilLayout({ perfil, isOwnProfile, currentUserId, children }: Props) {
  const config = TYPE_CONFIG[perfil.tipo as ProfileType] || { label: perfil.tipo, icon: '👤', color: 'bg-muted text-muted-foreground' };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Card */}
      <Card className="p-5 border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            {perfil.foto_url ? (
              <img src={perfil.foto_url} alt={perfil.nome} className="w-24 h-24 rounded-full object-cover ring-2 ring-[hsl(25_95%_55%)] ring-offset-2 ring-offset-background shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground ring-2 ring-[hsl(25_95%_55%)] ring-offset-2 ring-offset-background">
                {perfil.nome?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-xl font-bold text-foreground">{perfil.nome}</h1>
            <Badge variant="outline" className={`mt-1 ${config.color}`}>
              {config.icon} {config.label}
            </Badge>

            {perfil.instagram && (
              <div className="mt-2">
                <a
                  href={`https://instagram.com/${perfil.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  @{perfil.instagram.replace('@', '')}
                </a>
              </div>
            )}

            {perfil.bio && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{perfil.bio}</p>
            )}

            <div className="mt-3 flex items-center gap-3 justify-center sm:justify-start">
              <ConexoesCount userId={perfil.user_id} />
              {!isOwnProfile && currentUserId && (
                <ConectarButton targetUserId={perfil.user_id} currentUserId={currentUserId} />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Specific Data */}
      {children}
    </div>
  );
}
