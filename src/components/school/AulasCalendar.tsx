import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  Calendar as CalendarIcon,
  Plus,
  XCircle,
  Star,
  Clock,
  Settings,
  Trophy,
} from 'lucide-react';
import { useAulasForMonth, useAulasForWeek, type AulaWithStatus } from '@/hooks/useAulasData';
import { useSchoolTurmasWithRelations, getDayName, type TurmaWithRelations } from '@/hooks/useSchoolData';
import { useEventosForMonth, useEventosForWeek, type EventoEsportivo } from '@/hooks/useEventosData';
import AulaDetailDialog from './AulaDetailDialog';
import CreateExtraAulaDialog from './CreateExtraAulaDialog';
import MotivosManagement from './MotivosManagement';
import EventoDetailDialog from './EventoDetailDialog';

interface AulasCalendarProps {
  onOpenSettings?: () => void;
}

const AulasCalendar = ({ onOpenSettings }: AulasCalendarProps) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedAula, setSelectedAula] = useState<AulaWithStatus | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<EventoEsportivo | null>(null);
  const [showAulaDialog, setShowAulaDialog] = useState(false);
  const [showEventoDialog, setShowEventoDialog] = useState(false);
  const [showExtraDialog, setShowExtraDialog] = useState(false);
  const [showMotivos, setShowMotivos] = useState(false);
  const [extraDialogDate, setExtraDialogDate] = useState<string>('');
  
  const { data: turmas } = useSchoolTurmasWithRelations();
  const { data: monthAulas, isLoading: loadingMonth } = useAulasForMonth(
    viewDate.getFullYear(), 
    viewDate.getMonth()
  );
  const { data: monthEventos } = useEventosForMonth(
    viewDate.getFullYear(),
    viewDate.getMonth()
  );
  
  // Week view dates
  const weekStart = useMemo(() => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [viewDate]);
  
  const { data: weekAulas, isLoading: loadingWeek } = useAulasForWeek(weekStart);
  const { data: weekEventos } = useEventosForWeek(weekStart);
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const getTurmaDetails = (turmaId: string): TurmaWithRelations | undefined => {
    return turmas?.find(t => t.id === turmaId);
  };
  
  const handlePrev = () => {
    const d = new Date(viewDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setViewDate(d);
  };
  
  const handleNext = () => {
    const d = new Date(viewDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setViewDate(d);
  };
  
  const handleToday = () => {
    setViewDate(new Date());
  };
  
  const handleAulaClick = (aula: AulaWithStatus) => {
    setSelectedAula(aula);
    setShowAulaDialog(true);
  };
  
  const handleEventoClick = (evento: EventoEsportivo) => {
    setSelectedEvento(evento);
    setShowEventoDialog(true);
  };
  
  const handleAddExtra = (date?: string) => {
    setExtraDialogDate(date || '');
    setShowExtraDialog(true);
  };
  
  // Month calendar data
  const monthCalendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    
    const days: { date: Date | null; dateStr: string; aulas: AulaWithStatus[]; eventos: EventoEsportivo[] }[] = [];
    
    // Padding days from previous month
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], aulas: [], eventos: [] });
    }
    
    // Actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayAulas = monthAulas?.filter(a => a.data === dateStr) || [];
      const dayEventos = monthEventos?.filter(e => e.data === dateStr) || [];
      days.push({ date, dateStr, aulas: dayAulas, eventos: dayEventos });
    }
    
    // Padding days for next month to complete the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], aulas: [], eventos: [] });
    }
    
    return days;
  }, [monthAulas, monthEventos, viewDate]);
  
  // Week calendar data
  const weekCalendarData = useMemo(() => {
    const days: { date: Date; dateStr: string; aulas: AulaWithStatus[]; eventos: EventoEsportivo[] }[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayAulas = weekAulas?.filter(a => a.data === dateStr) || [];
      const dayEventos = weekEventos?.filter(e => e.data === dateStr) || [];
      days.push({ date, dateStr, aulas: dayAulas, eventos: dayEventos });
    }
    
    return days;
  }, [weekAulas, weekEventos, weekStart]);
  
  const getAulaStatusClasses = (status: AulaWithStatus['status']) => {
    switch (status) {
      case 'cancelada':
        return 'bg-destructive/20 text-destructive border-destructive/30 line-through opacity-70';
      case 'extra':
        return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };
  
  const getStatusIcon = (status: AulaWithStatus['status']) => {
    switch (status) {
      case 'cancelada':
        return <XCircle className="w-2.5 h-2.5" />;
      case 'extra':
        return <Star className="w-2.5 h-2.5" />;
      default:
        return null;
    }
  };
  
  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const startStr = weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${startStr} - ${endStr}`;
  };
  
  if (showMotivos) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowMotivos(false)} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Voltar ao Calendário
        </Button>
        <MotivosManagement />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Hoje
          </Button>
          <h2 className="text-lg font-semibold ml-2 capitalize">
            {view === 'month' 
              ? viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              : formatWeekRange()
            }
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
            <TabsList>
              <TabsTrigger value="month" className="gap-1.5">
                <CalendarDays className="w-4 h-4" />
                Mês
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                Semana
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={() => handleAddExtra()} className="gap-2">
            <Plus className="w-4 h-4" />
            Aula Extra
          </Button>
          
          <Button variant="outline" size="icon" onClick={() => setShowMotivos(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Month View */}
      {view === 'month' && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {/* Header */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              
              {/* Days */}
              {monthCalendarData.map((day, idx) => {
                const isToday = day.dateStr === todayStr;
                const isCurrentMonth = day.date?.getMonth() === viewDate.getMonth();
                
                return (
                  <div 
                    key={idx}
                    className={`min-h-[100px] p-1 border rounded-md transition-colors ${
                      isCurrentMonth ? 'bg-card' : 'bg-muted/30'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${
                        isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {day.date?.getDate()}
                      </span>
                      {isCurrentMonth && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 opacity-0 hover:opacity-100 group-hover:opacity-100"
                          onClick={() => handleAddExtra(day.dateStr)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {/* Eventos */}
                      {day.eventos.slice(0, 2).map(evento => (
                        <div 
                          key={`evento-${evento.id}`}
                          className="text-[10px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-1 bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30"
                          onClick={() => handleEventoClick(evento)}
                          title={`🏆 ${evento.nome}${evento.local ? ` – ${evento.local}` : ''}`}
                        >
                          <Trophy className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{evento.nome}</span>
                        </div>
                      ))}
                      {/* Aulas */}
                      {day.aulas.slice(0, Math.max(0, 3 - day.eventos.length)).map(aula => (
                        <div 
                          key={aula.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-1 ${getAulaStatusClasses(aula.status)}`}
                          onClick={() => handleAulaClick(aula)}
                          title={`${aula.turma?.nome} - ${aula.horario_inicio?.slice(0,5)} ${aula.status !== 'normal' ? `(${aula.status})` : ''}`}
                        >
                          {getStatusIcon(aula.status)}
                          <span className="truncate">{aula.turma?.nome}</span>
                        </div>
                      ))}
                      {(day.aulas.length + day.eventos.length) > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{(day.aulas.length + day.eventos.length) - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Week View */}
      {view === 'week' && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {weekCalendarData.map((day, idx) => {
                const isToday = day.dateStr === todayStr;
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className={`text-center p-2 rounded-lg ${isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary/50'}`}>
                      <div className="text-xs font-medium">{getDayName(day.date.getDay())}</div>
                      <div className="text-lg font-bold">{day.date.getDate()}</div>
                    </div>
                    
                    <div className="space-y-2 min-h-[300px]">
                      {/* Eventos */}
                      {day.eventos.map(evento => (
                        <div 
                          key={`evento-${evento.id}`}
                          className="p-2 rounded-lg border cursor-pointer hover:opacity-80 bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30"
                          onClick={() => handleEventoClick(evento)}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Trophy className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium text-xs truncate">{evento.nome}</span>
                          </div>
                          {evento.horario_inicio && (
                            <div className="flex items-center gap-1 text-[10px] opacity-80">
                              <Clock className="w-3 h-3" />
                              {evento.horario_inicio?.slice(0, 5)}
                              {evento.horario_fim && ` - ${evento.horario_fim?.slice(0, 5)}`}
                            </div>
                          )}
                          {evento.local && (
                            <div className="text-[10px] opacity-80 truncate mt-0.5">
                              📍 {evento.local}
                            </div>
                          )}
                          <Badge className="mt-1 text-[9px] px-1 py-0 bg-violet-600/20 text-violet-700 dark:text-violet-400 border-violet-500/30">
                            {evento.tipo === 'amistoso' ? 'Amistoso' : 'Campeonato'}
                          </Badge>
                        </div>
                      ))}
                      
                      {/* Aulas */}
                      {day.aulas.map(aula => (
                        <div 
                          key={aula.id}
                          className={`p-2 rounded-lg border cursor-pointer hover:opacity-80 ${getAulaStatusClasses(aula.status)}`}
                          onClick={() => handleAulaClick(aula)}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {getStatusIcon(aula.status)}
                            <span className="font-medium text-xs truncate">{aula.turma?.nome}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-80">
                            <Clock className="w-3 h-3" />
                            {aula.horario_inicio?.slice(0, 5)} - {aula.horario_fim?.slice(0, 5)}
                          </div>
                          {aula.status !== 'normal' && (
                            <Badge 
                              variant={aula.status === 'cancelada' ? 'destructive' : 'secondary'}
                              className="mt-1 text-[9px] px-1 py-0"
                            >
                              {aula.status === 'cancelada' ? 'Cancelada' : 'Extra'}
                            </Badge>
                          )}
                        </div>
                      ))}
                      
                      {day.aulas.length === 0 && day.eventos.length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          Sem aulas
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs gap-1"
                        onClick={() => handleAddExtra(day.dateStr)}
                      >
                        <Plus className="w-3 h-3" />
                        Aula Extra
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
          <span>Aula Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
          <span>Aula Extra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
          <span>Cancelada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-500/20 border border-violet-500/30" />
          <span>Evento Esportivo</span>
        </div>
      </div>
      
      {/* Dialogs */}
      <AulaDetailDialog
        open={showAulaDialog}
        onOpenChange={setShowAulaDialog}
        aula={selectedAula}
        turmaDetails={selectedAula ? getTurmaDetails(selectedAula.turma_id) : undefined}
        escolinhaId={selectedAula ? getTurmaDetails(selectedAula.turma_id)?.escolinha_id : undefined}
      />
      
      <CreateExtraAulaDialog
        open={showExtraDialog}
        onOpenChange={setShowExtraDialog}
        initialDate={extraDialogDate}
      />
      
      <EventoDetailDialog
        open={showEventoDialog}
        onOpenChange={setShowEventoDialog}
        evento={selectedEvento}
      />
    </div>
  );
};

export default AulasCalendar;
