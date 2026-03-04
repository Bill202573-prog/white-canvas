import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Check,
  Clock,
  School,
  X,
  Trophy,
  MapPin,
  Swords,
  Dumbbell,
  Star,
} from 'lucide-react';
import { type NextAula } from '@/hooks/useGuardianData';
import { type NextEvento } from '@/hooks/useGuardianEventosData';

interface AgendaTabProps {
  criancaId: string;
  childName: string;
  childNextAulas: NextAula[];
  childNextEventos: NextEvento[];
  onConfirmPresence: (aulaId: string, criancaId: string, confirmar: boolean) => void;
  onConfirmEventoPresence: (eventoId: string, criancaId: string, timeId: string, confirmar: boolean) => void;
  isConfirming: boolean;
}

// Unified agenda item type
interface AgendaItem {
  type: 'aula' | 'amistoso' | 'campeonato';
  id: string;
  data: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  aula?: NextAula;
  evento?: NextEvento;
}

const AgendaTab = ({ 
  criancaId, 
  childName, 
  childNextAulas, 
  childNextEventos,
  onConfirmPresence, 
  onConfirmEventoPresence,
  isConfirming 
}: AgendaTabProps) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentTime = today.toTimeString().slice(0, 5);

  // Get end of week (Saturday)
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = 6 - dayOfWeek;
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysUntilSaturday);
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  // Filter aulas to current week only
  const currentWeekAulas = childNextAulas.filter(aula => 
    aula.data >= todayStr && aula.data <= endOfWeekStr && aula.status !== 'cancelada'
  );
  
  // Check if confirmation is still allowed (15 min before class start)
  const canConfirm = (data: string, horarioInicio: string | null): boolean => {
    if (data > todayStr) return true; // Future days always allowed
    if (data < todayStr) return false; // Past days not allowed
    
    // Same day - check if 15 min before
    if (!horarioInicio) return true;
    const classTime = horarioInicio.slice(0, 5);
    const classDate = new Date(`${data}T${classTime}:00`);
    const deadlineTime = new Date(classDate.getTime() - 15 * 60 * 1000); // 15 min before
    return new Date() < deadlineTime;
  };

  // Combine aulas and eventos in chronological order
  const allItems: AgendaItem[] = [
    ...currentWeekAulas.map(aula => ({
      type: 'aula' as const,
      id: aula.id,
      data: aula.data,
      horario_inicio: aula.horario_inicio,
      horario_fim: aula.horario_fim,
      aula,
    })),
    ...childNextEventos.map(evento => ({
      type: evento.tipo === 'campeonato' ? 'campeonato' as const : 'amistoso' as const,
      id: evento.id,
      data: evento.data,
      horario_inicio: evento.horario_inicio,
      horario_fim: evento.horario_fim,
      evento,
    })),
  ].sort((a, b) => {
    const dateCompare = a.data.localeCompare(b.data);
    if (dateCompare !== 0) return dateCompare;
    return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
  });

  // Group items by date for organized display
  const itemsByDate: Record<string, AgendaItem[]> = {};
  allItems.forEach(item => {
    if (!itemsByDate[item.data]) {
      itemsByDate[item.data] = [];
    }
    itemsByDate[item.data].push(item);
  });

  const sortedDates = Object.keys(itemsByDate).sort();

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const isToday = dateStr === todayStr;
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { weekday, formatted, isToday };
  };

  const getTypeStyles = (type: 'aula' | 'amistoso' | 'campeonato') => {
    switch (type) {
      case 'campeonato':
        return {
          border: 'border-l-4 border-l-amber-500',
          icon: <Trophy className="w-4 h-4 text-amber-500" />,
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
          label: '🏆 Campeonato',
        };
      case 'amistoso':
        return {
          border: 'border-l-4 border-l-sky-500',
          icon: <Swords className="w-4 h-4 text-sky-500" />,
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
          label: '⚔️ Amistoso',
        };
      default:
        return {
          border: 'border-l-4 border-l-primary',
          icon: <Dumbbell className="w-4 h-4 text-primary" />,
          badge: 'bg-primary/10 text-primary',
          label: 'Aula',
        };
    }
  };

  const renderCompactAulaItem = (aula: NextAula) => {
    const isConfirmed = aula.presenca?.confirmado_responsavel === true;
    const isCanceled = aula.presenca?.confirmado_responsavel === false;
    const isPending = aula.presenca?.confirmado_responsavel === null || aula.presenca?.confirmado_responsavel === undefined;
    const isExtra = aula.status === 'extra';
    const styles = getTypeStyles('aula');
    const allowConfirm = canConfirm(aula.data, aula.horario_inicio);

    return (
      <div 
        key={`aula-${aula.id}`}
        className={`p-3 rounded-lg bg-card border ${styles.border} ${
          isConfirmed ? 'bg-success/5' : isCanceled ? 'bg-destructive/5' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{styles.icon}</div>
          
          <div className="flex-1 min-w-0 space-y-1">
            {/* Top row: school + type badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {aula.turma.escolinha?.nome || 'Escolinha'}
              </span>
              {isExtra && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                  <Star className="w-2.5 h-2.5 mr-0.5" />Extra
                </Badge>
              )}
            </div>

            {/* Turma name */}
            <p className="font-semibold text-sm text-foreground truncate">{aula.turma.nome}</p>
            
            {/* Time + Professor */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {aula.horario_inicio?.slice(0, 5)} - {aula.horario_fim?.slice(0, 5)}
              </span>
              {aula.turma.professor && (
                <span className="flex items-center gap-1 truncate">
                  <Avatar className="w-4 h-4">
                    {aula.turma.professor.foto_url && <AvatarImage src={aula.turma.professor.foto_url} />}
                    <AvatarFallback className="text-[8px]">{aula.turma.professor.nome.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Prof. {aula.turma.professor.nome.split(' ')[0]}
                </span>
              )}
            </div>

            {/* Status or Actions */}
            <div className="flex items-center gap-2 pt-1">
              {isConfirmed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-success/50 text-success gap-1">
                  <Check className="w-3 h-3" /> Confirmado
                </Badge>
              )}
              {isCanceled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-destructive/50 text-destructive gap-1">
                  <X className="w-3 h-3" /> Não irei
                </Badge>
              )}
              {isPending && allowConfirm && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => onConfirmPresence(aula.id, aula.crianca.id, true)}
                    disabled={isConfirming}
                  >
                    <Check className="w-3 h-3 mr-1" />Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => onConfirmPresence(aula.id, aula.crianca.id, false)}
                    disabled={isConfirming}
                  >
                    <X className="w-3 h-3 mr-1" />Não irei
                  </Button>
                </div>
              )}
              {isPending && !allowConfirm && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground gap-1">
                  <Clock className="w-3 h-3" /> Prazo encerrado
                </Badge>
              )}
              {!isPending && allowConfirm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] px-1.5 text-muted-foreground"
                  onClick={() => onConfirmPresence(aula.id, aula.crianca.id, !isConfirmed)}
                  disabled={isConfirming}
                >
                  Alterar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompactEventoItem = (evento: NextEvento) => {
    const isConfirmed = evento.presenca?.confirmado_responsavel === true;
    const isCanceled = evento.presenca?.confirmado_responsavel === false;
    const isPending = evento.presenca?.confirmado_responsavel === null || evento.presenca?.confirmado_responsavel === undefined;
    const isCampeonato = evento.tipo === 'campeonato';
    const styles = getTypeStyles(isCampeonato ? 'campeonato' : 'amistoso');
    const allowConfirm = canConfirm(evento.data, evento.horario_inicio);

    return (
      <div 
        key={`evento-${evento.id}`}
        className={`p-3 rounded-lg bg-card border ${styles.border} ${
          isConfirmed ? 'bg-success/5' : isCanceled ? 'bg-destructive/5' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{styles.icon}</div>
          
          <div className="flex-1 min-w-0 space-y-1">
            {/* Top row: school + type badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {evento.escolinha.nome}
              </span>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${styles.badge}`}>
                {styles.label}
              </Badge>
            </div>

            {/* Event name */}
            <p className="font-semibold text-sm text-foreground">{evento.nome}</p>
            
            {/* Time + Location + Adversario */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {evento.horario_inicio && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {evento.horario_inicio?.slice(0, 5)}
                  {evento.horario_fim && ` - ${evento.horario_fim?.slice(0, 5)}`}
                </span>
              )}
              {evento.local && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  {evento.local}
                </span>
              )}
            </div>
            
            {evento.adversario && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Swords className="w-3 h-3" />
                <span>vs {evento.adversario}</span>
              </div>
            )}

            {/* Team */}
            <div className="flex items-center gap-1 text-xs">
              <Trophy className={`w-3 h-3 ${isCampeonato ? 'text-amber-500' : 'text-sky-500'}`} />
              <span className="font-medium">{evento.time.nome}</span>
            </div>

            {/* Status or Actions */}
            <div className="flex items-center gap-2 pt-1">
              {isConfirmed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-success/50 text-success gap-1">
                  <Check className="w-3 h-3" /> Confirmado
                </Badge>
              )}
              {isCanceled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-destructive/50 text-destructive gap-1">
                  <X className="w-3 h-3" /> Não irei
                </Badge>
              )}
              {isPending && allowConfirm && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className={`h-6 text-xs px-2 ${isCampeonato ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-500 hover:bg-sky-600'}`}
                    onClick={() => onConfirmEventoPresence(evento.id, evento.crianca.id, evento.time.id, true)}
                    disabled={isConfirming}
                  >
                    <Check className="w-3 h-3 mr-1" />Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => onConfirmEventoPresence(evento.id, evento.crianca.id, evento.time.id, false)}
                    disabled={isConfirming}
                  >
                    <X className="w-3 h-3 mr-1" />Não irei
                  </Button>
                </div>
              )}
              {isPending && !allowConfirm && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground gap-1">
                  <Clock className="w-3 h-3" /> Prazo encerrado
                </Badge>
              )}
              {!isPending && allowConfirm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] px-1.5 text-muted-foreground"
                  onClick={() => onConfirmEventoPresence(evento.id, evento.crianca.id, evento.time.id, !isConfirmed)}
                  disabled={isConfirming}
                >
                  Alterar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaItem = (item: AgendaItem) => {
    if (item.type === 'aula' && item.aula) {
      return renderCompactAulaItem(item.aula);
    }
    if ((item.type === 'amistoso' || item.type === 'campeonato') && item.evento) {
      return renderCompactEventoItem(item.evento);
    }
    return null;
  };

  if (allItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Nenhum compromisso</h3>
          <p className="text-sm text-muted-foreground">
            Não há aulas ou eventos agendados para esta semana.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-primary" />
            Agenda de {childName.split(' ')[0]}
          </CardTitle>
          <CardDescription className="text-xs">
            Confirme a presença até 15 min antes do horário
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Chronological list by date */}
      {sortedDates.map(dateStr => {
        const { weekday, formatted, isToday } = formatDateHeader(dateStr);
        const dayItems = itemsByDate[dateStr];

        return (
          <div key={dateStr} className="space-y-2">
            {/* Date header */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize text-foreground">
                  {weekday}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatted}
                </span>
              </div>
              {isToday && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                  Hoje
                </Badge>
              )}
            </div>

            {/* Day items */}
            <div className="space-y-2">
              {dayItems.map(item => renderAgendaItem(item))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-l-2 border-l-primary bg-primary/10" />
          <span>Aula</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-l-2 border-l-sky-500 bg-sky-100 dark:bg-sky-900/40" />
          <span>Amistoso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-l-2 border-l-amber-500 bg-amber-100 dark:bg-amber-900/40" />
          <span>Campeonato</span>
        </div>
      </div>
    </div>
  );
};

export default AgendaTab;