import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Goal,
  Medal,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Swords,
} from 'lucide-react';
import { useAlunoHistorico } from '@/hooks/useAlunoHistoricoData';
import { TIPOS_PREMIACAO } from '@/hooks/useEventoPremiacoesData';

interface AlunoHistoricoSectionProps {
  criancaId: string;
}

const AlunoHistoricoSection = ({ criancaId }: AlunoHistoricoSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useAlunoHistorico(criancaId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Histórico Esportivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { eventos = [], stats } = data || { eventos: [], stats: null };

  if (!stats || eventos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Histórico Esportivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum evento esportivo registrado ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_PREMIACAO.find((t) => t.value === tipo)?.label || tipo;
  };

  const getTipoEmoji = (tipo: string) => {
    switch (tipo) {
      case 'melhor_jogador': return '🏆';
      case 'melhor_goleiro': return '🧤';
      case 'artilheiro': return '⚽';
      case 'melhor_defesa': return '🛡️';
      case 'destaque': return '⭐';
      default: return '🏅';
    }
  };

  const getResultadoBadge = (resultado: string | null) => {
    switch (resultado) {
      case 'vitoria':
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Vitória</Badge>;
      case 'derrota':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Derrota</Badge>;
      case 'empate':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Empate</Badge>;
      default:
        return null;
    }
  };

  const displayedEventos = expanded ? eventos : eventos.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Histórico Esportivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalEventos}</div>
            <div className="text-xs text-muted-foreground">Eventos</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {stats.totalAmistosos} amist. | {stats.totalCampeonatos} camp.
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.totalGols}</div>
            <div className="text-xs text-muted-foreground">Gols</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {stats.golsAmistosos} amist. | {stats.golsCampeonatos} camp.
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.totalPremiacoes}</div>
            <div className="text-xs text-muted-foreground">Premiações</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <div className="text-2xl font-bold text-violet-600">{stats.vitorias}</div>
            <div className="text-xs text-muted-foreground">Vitórias</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {stats.empates} emp. | {stats.derrotas} der.
            </div>
          </div>
        </div>

        <Separator />

        {/* Events list */}
        <div className="space-y-3">
          {displayedEventos.map((evento) => (
            <Collapsible key={evento.id}>
              <CollapsibleTrigger asChild>
                <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{evento.nome}</span>
                        {evento.tipo === 'campeonato' ? (
                          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                            <Trophy className="w-3 h-3 mr-1" />
                            Campeonato
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Amistoso</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(evento.data)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {evento.timeNome}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {evento.golsMarcados > 0 && (
                        <Badge variant="outline" className="shrink-0">
                          <Goal className="w-3 h-3 mr-1" />
                          {evento.golsMarcados}
                        </Badge>
                      )}
                      {evento.premiacoes.length > 0 && (
                        <Badge variant="outline" className="shrink-0 bg-amber-500/10">
                          <Medal className="w-3 h-3 mr-1" />
                          {evento.premiacoes.length}
                        </Badge>
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-2 space-y-3 border-x border-b rounded-b-lg -mt-1">
                  {/* Score and result */}
                  {evento.placarTime1 !== null && evento.placarTime2 !== null && (
                    <div className="flex items-center gap-3">
                      <Swords className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {evento.timeNome} {evento.placarTime1} x {evento.placarTime2} {evento.adversario}
                      </span>
                      {getResultadoBadge(evento.resultado)}
                    </div>
                  )}

                  {/* Category */}
                  {evento.categoria && (
                    <div className="text-sm text-muted-foreground">
                      Categoria: {evento.categoria}
                    </div>
                  )}

                  {/* Goals */}
                  {evento.golsMarcados > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>⚽</span>
                      <span>{evento.golsMarcados} gol(s) marcado(s)</span>
                    </div>
                  )}

                  {/* Awards */}
                  {evento.premiacoes.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Premiações:</div>
                      <div className="flex flex-wrap gap-2">
                        {evento.premiacoes.map((p) => (
                          <Badge key={p.id} variant="outline" className="bg-amber-500/10">
                            {getTipoEmoji(p.tipo)} {getTipoLabel(p.tipo)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Show more/less */}
        {eventos.length > 3 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Ver todos ({eventos.length} eventos)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AlunoHistoricoSection;
