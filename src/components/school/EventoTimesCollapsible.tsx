import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useEventoPresencas, type EventoPresencasByTime } from '@/hooks/useEventoPresencasData';
import { cn } from '@/lib/utils';

interface EventoTimesCollapsibleProps {
  eventoId: string;
  onEscalarClick: () => void;
}

export function EventoTimesCollapsible({ eventoId, onEscalarClick }: EventoTimesCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: timePresencas, isLoading } = useEventoPresencas(eventoId);

  const totalAlunos = timePresencas?.reduce((acc, t) => acc + t.presencas.length, 0) || 0;
  const confirmados = timePresencas?.reduce(
    (acc, t) => acc + t.presencas.filter(p => p.confirmado_responsavel).length,
    0
  ) || 0;

  return (
    <div className="mt-2 border-t pt-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onEscalarClick();
          }}
        >
          <Users className="w-4 h-4" />
          Escalar Times
        </Button>

        {totalAlunos > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>
                  {confirmados}/{totalAlunos} confirmados
                </span>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2" onClick={(e) => e.stopPropagation()}>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 bg-muted/30 rounded-lg p-3">
                  {timePresencas?.map((time) => (
                    <TimePresencasSection key={time.time_id} time={time} />
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function TimePresencasSection({ time }: { time: EventoPresencasByTime }) {
  if (time.presencas.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">{time.time_nome}</p>
      <div className="flex flex-wrap gap-2">
        {time.presencas.map((presenca) => (
          <div
            key={presenca.crianca_id}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-full text-sm',
              presenca.confirmado_responsavel
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-muted'
            )}
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={presenca.crianca.foto_url || undefined} />
              <AvatarFallback className="text-xs">
                {presenca.crianca.nome.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[120px]">{presenca.crianca.nome.split(' ')[0]}</span>
            {presenca.confirmado_responsavel && (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
