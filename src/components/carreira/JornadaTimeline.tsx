import {
  useCarreiraGols,
  useCarreiraAmistosos,
  useCarreiraCampeonatos,
  useCarreiraPremiacoes,
  useCarreiraConquistas,
  type GolPublico,
  type AmistosoConvocacaoPublica,
  type CampeonatoConvocacaoPublica,
  type PremiacaoPublica,
  type ConquistaPublica,
} from '@/hooks/useCarreiraJornadaData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Trophy, Swords, Medal, Goal, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JornadaTimelineProps {
  criancaId: string | null | undefined;
  accentColor?: string;
  dadosPublicos?: {
    gols?: boolean;
    campeonatos?: boolean;
    amistosos?: boolean;
    premiacoes?: boolean;
    conquistas?: boolean;
  };
}

const PREMIACAO_LABELS: Record<string, string> = {
  melhor_jogador: 'Melhor Jogador',
  melhor_goleiro: 'Melhor Goleiro',
  artilheiro: 'Artilheiro',
  melhor_defesa: 'Melhor Defesa',
  destaque: 'Destaque da Partida',
};

export function JornadaTimeline({ criancaId, dadosPublicos, accentColor = '#3b82f6' }: JornadaTimelineProps) {
  const flags = dadosPublicos || { gols: true, campeonatos: true, amistosos: true, premiacoes: true, conquistas: true };

  const { data: gols, isLoading: golsLoading } = useCarreiraGols(flags.gols ? criancaId : null);
  const { data: amistosos, isLoading: amistososLoading } = useCarreiraAmistosos(flags.amistosos ? criancaId : null);
  const { data: campeonatos, isLoading: campeonatosLoading } = useCarreiraCampeonatos(flags.campeonatos ? criancaId : null);
  const { data: premiacoes, isLoading: premiacoesLoading } = useCarreiraPremiacoes(flags.premiacoes ? criancaId : null);
  const { data: conquistas, isLoading: conquistasLoading } = useCarreiraConquistas(flags.conquistas ? criancaId : null);

  const isLoading = golsLoading || amistososLoading || campeonatosLoading || premiacoesLoading || conquistasLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build gols map by evento_id
  const golsByEvento = new Map<string, GolPublico[]>();
  (gols || []).forEach(g => {
    if (!g.evento_id) return;
    const existing = golsByEvento.get(g.evento_id) || [];
    existing.push(g);
    golsByEvento.set(g.evento_id, existing);
  });

  // Filter amistosos that are done (realizado or finalizado)
  const amistososDone = (amistosos || []).filter(a => 
    a.evento?.status === 'finalizado' || a.evento?.status === 'realizado'
  ).sort((a, b) => new Date(b.evento!.data).getTime() - new Date(a.evento!.data).getTime());

  // Find "orphan" gol events - events with gols but no amistoso convocação
  const amistososEventIds = new Set((amistosos || []).map(a => a.evento_id));
  const orphanGolEvents = (gols || []).filter(g => 
    !amistososEventIds.has(g.evento_id) && g.evento
  ).reduce((acc, g) => {
    if (!acc.find(e => e.evento_id === g.evento_id)) {
      acc.push(g);
    }
    return acc;
  }, [] as GolPublico[]).sort((a, b) => {
    const dateA = a.evento?.data ? new Date(a.evento.data).getTime() : 0;
    const dateB = b.evento?.data ? new Date(b.evento.data).getTime() : 0;
    return dateB - dateA;
  });

  const campeonatosSorted = [...(campeonatos || [])].sort((a, b) => 
    (b.campeonato?.ano || 0) - (a.campeonato?.ano || 0)
  );

  const premiacoesSorted = [...(premiacoes || [])].sort((a, b) => {
    const dateA = a.evento?.data ? new Date(a.evento.data).getTime() : 0;
    const dateB = b.evento?.data ? new Date(b.evento.data).getTime() : 0;
    return dateB - dateA;
  });

  const conquistasSorted = [...(conquistas || [])].sort((a, b) => b.ano - a.ano);

  const totalGolsOrphan = orphanGolEvents.reduce((s, g) => s + g.quantidade, 0);
  const hasAmistosos = amistososDone.length > 0 || orphanGolEvents.length > 0;
  const hasCampeonatos = campeonatosSorted.length > 0;
  const hasPremiacoes = premiacoesSorted.length > 0;
  const hasConquistas = conquistasSorted.length > 0;

  if (!hasAmistosos && !hasCampeonatos && !hasPremiacoes && !hasConquistas) return null;

  // Sections that have data, open by default
  const defaultOpen: string[] = [];
  if (hasAmistosos) defaultOpen.push('amistosos');
  if (hasCampeonatos) defaultOpen.push('campeonatos');
  if (hasPremiacoes) defaultOpen.push('premiacoes');
  if (hasConquistas) defaultOpen.push('conquistas');

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Swords className="w-5 h-5" style={{ color: accentColor }} />
        Jornada Esportiva
      </h3>

      <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-1">
        {/* Amistosos */}
        {hasAmistosos && (
          <AccordionItem value="amistosos" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Jogos</span>
                <Badge variant="secondary" className="text-xs">{amistososDone.length + orphanGolEvents.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {amistososDone.map(a => (
                  <AmistosoItem key={a.id} amistoso={a} gols={golsByEvento.get(a.evento_id)} />
                ))}
                {orphanGolEvents.map(g => (
                  <OrphanGolItem key={g.id} gol={g} allGols={golsByEvento.get(g.evento_id) || [g]} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Campeonatos */}
        {hasCampeonatos && (
          <AccordionItem value="campeonatos" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-sm">Campeonatos</span>
                <Badge variant="secondary" className="text-xs">{campeonatosSorted.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {campeonatosSorted.map(c => (
                  <CampeonatoItem key={c.id} campeonato={c} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Premiações */}
        {hasPremiacoes && (
          <AccordionItem value="premiacoes" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-sm">Premiações</span>
                <Badge variant="secondary" className="text-xs">{premiacoesSorted.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {premiacoesSorted.map(p => (
                  <PremiacaoItem key={p.id} premiacao={p} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Conquistas */}
        {hasConquistas && (
          <AccordionItem value="conquistas" className="border rounded-lg px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-sm">Conquistas</span>
                <Badge variant="secondary" className="text-xs">{conquistasSorted.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {conquistasSorted.map(c => (
                  <ConquistaItem key={c.id} conquista={c} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </Card>
  );
}

// ========== Sub-components ==========

function AmistosoItem({ amistoso, gols }: { amistoso: AmistosoConvocacaoPublica; gols?: GolPublico[] }) {
  const a = amistoso;
  const totalGols = (gols || []).reduce((s, g) => s + g.quantidade, 0);
  const formattedDate = a.evento?.data ? format(new Date(a.evento.data), "dd MMM yyyy", { locale: ptBR }) : '';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Swords className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{a.evento?.nome || 'Amistoso'}</span>
          {a.evento?.adversario && (
            <span className="text-xs text-muted-foreground">vs {a.evento.adversario}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {a.evento?.placar_time1 != null && a.evento?.placar_time2 != null && (
            <Badge variant="outline" className="text-xs">
              {a.evento.placar_time1} x {a.evento.placar_time2}
            </Badge>
          )}
          {totalGols > 0 && (
            <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Goal className="w-3 h-3 mr-1" />
              {totalGols} {totalGols === 1 ? 'gol' : 'gols'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function OrphanGolItem({ gol, allGols }: { gol: GolPublico; allGols: GolPublico[] }) {
  const totalGols = allGols.reduce((s, g) => s + g.quantidade, 0);
  const formattedDate = gol.evento?.data ? format(new Date(gol.evento.data), "dd MMM yyyy", { locale: ptBR }) : '';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Swords className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{gol.evento?.nome || 'Partida'}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {gol.evento?.placar_time1 != null && gol.evento?.placar_time2 != null && (
            <Badge variant="outline" className="text-xs">
              {gol.evento.placar_time1} x {gol.evento.placar_time2}
            </Badge>
          )}
          {totalGols > 0 && (
            <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Goal className="w-3 h-3 mr-1" />
              {totalGols} {totalGols === 1 ? 'gol' : 'gols'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function CampeonatoItem({ campeonato }: { campeonato: CampeonatoConvocacaoPublica }) {
  const c = campeonato;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Trophy className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{c.campeonato?.nome || 'Campeonato'}</span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{c.campeonato?.ano}</span>
          {c.campeonato?.categoria && (
            <Badge variant="outline" className="text-xs">{c.campeonato.categoria}</Badge>
          )}
          {c.campeonato?.escolinha?.nome && (
            <span className="text-xs text-muted-foreground">{c.campeonato.escolinha.nome}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PremiacaoItem({ premiacao }: { premiacao: PremiacaoPublica }) {
  const p = premiacao;
  const formattedDate = p.evento?.data ? format(new Date(p.evento.data), "dd MMM yyyy", { locale: ptBR }) : '';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Medal className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">
          {PREMIACAO_LABELS[p.tipo_premiacao] || p.tipo_premiacao}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {p.evento?.nome && (
            <span className="text-xs text-muted-foreground">— {p.evento.nome}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ConquistaItem({ conquista }: { conquista: ConquistaPublica }) {
  const c = conquista;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Trophy className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{c.nome_campeonato}</span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">{c.colocacao}</Badge>
          <span className="text-xs text-muted-foreground">{c.ano}</span>
          {c.categoria && (
            <span className="text-xs text-muted-foreground">• {c.categoria}</span>
          )}
        </div>
      </div>
    </div>
  );
}
