import { useCarreiraStats } from '@/hooks/useCarreiraJornadaData';
import { Card } from '@/components/ui/card';
import { Goal, Trophy, Medal, Swords } from 'lucide-react';

interface CarreiraStatsCardsProps {
  criancaId: string | null | undefined;
  accentColor?: string;
}

const statConfig = [
  { key: 'totalGols', label: 'Gols', icon: Goal },
  { key: 'totalJogos', label: 'Jogos', icon: Swords },
  { key: 'totalCampeonatos', label: 'Campeonatos', icon: Trophy },
  { key: 'totalPremiacoes', label: 'Premiações', icon: Medal },
] as const;

export function CarreiraStatsCards({ criancaId, accentColor = '#3b82f6' }: CarreiraStatsCardsProps) {
  const stats = useCarreiraStats(criancaId);

  const hasAnyStats = stats.totalGols > 0 || stats.totalJogos > 0 || stats.totalCampeonatos > 0 || stats.totalPremiacoes > 0;

  if (!hasAnyStats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statConfig.map(({ key, label, icon: Icon }) => {
        const value = stats[key];
        if (value === 0) return null;
        return (
          <Card 
            key={key} 
            className="p-4 flex flex-col items-center justify-center text-center gap-1 border"
            style={{ borderColor: `${accentColor}25` }}
          >
            <Icon className="w-6 h-6" style={{ color: accentColor }} />
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </Card>
        );
      })}
    </div>
  );
}
