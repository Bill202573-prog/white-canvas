import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCampeonatoDetail } from '@/hooks/useCampeonatosData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Calendar,
  MapPin,
  Loader2,
} from 'lucide-react';

interface CampeonatoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campeonatoId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em Andamento',
  finalizado: 'Finalizado',
};

const STATUS_COLORS: Record<string, string> = {
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

const EVENTO_STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  finalizado: 'Finalizado',
};

const EVENTO_STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  realizado: 'bg-green-500/10 text-green-600 border-green-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

export function CampeonatoDetailDialog({ open, onOpenChange, campeonatoId }: CampeonatoDetailDialogProps) {
  const { data: campeonato, isLoading } = useCampeonatoDetail(campeonatoId);

  if (!campeonatoId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Detalhes do Campeonato
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : campeonato ? (
          <div className="space-y-6">
            {/* Campeonato Info */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{campeonato.nome}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={STATUS_COLORS[campeonato.status]}>
                  {STATUS_LABELS[campeonato.status]}
                </Badge>
                <Badge variant="secondary">{campeonato.ano}</Badge>
                {campeonato.categoria && (
                  <Badge variant="outline">{campeonato.categoria}</Badge>
                )}
              </div>
              {campeonato.observacoes && (
                <p className="text-sm text-muted-foreground mt-2">
                  {campeonato.observacoes}
                </p>
              )}
            </div>

            {/* Jogos do Campeonato */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Jogos ({campeonato.eventos?.length || 0})
              </h3>
              
              <ScrollArea className="h-[300px] pr-4">
                {campeonato.eventos && campeonato.eventos.length > 0 ? (
                  <div className="space-y-3">
                    {campeonato.eventos.map((evento: any) => (
                      <div
                        key={evento.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {evento.fase && (
                                <Badge variant="outline" className="text-xs">
                                  {evento.fase}
                                </Badge>
                              )}
                              <span className="font-medium truncate">{evento.nome}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(evento.data), "dd 'de' MMM", { locale: ptBR })}
                              </span>
                              {evento.local && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3" />
                                  {evento.local}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={EVENTO_STATUS_COLORS[evento.status]}>
                              {EVENTO_STATUS_LABELS[evento.status]}
                            </Badge>
                            {evento.placar_time1 !== null && evento.placar_time2 !== null && (
                              <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-semibold">
                                {evento.placar_time1} x {evento.placar_time2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum jogo vinculado a este campeonato</p>
                    <p className="text-sm">
                      Crie novos eventos e selecione este campeonato
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Campeonato não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
