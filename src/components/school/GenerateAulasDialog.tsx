import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, AlertCircle, X, CalendarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { TurmaWithRelations } from '@/hooks/useSchoolData';

interface GenerateAulasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: TurmaWithRelations;
}

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Mês atual', months: 1 },
  { value: 'quarter', label: 'Trimestre (3 meses)', months: 3 },
  { value: 'semester', label: 'Semestre (6 meses)', months: 6 },
  { value: 'year', label: 'Ano (12 meses)', months: 12 },
  { value: 'custom', label: 'Período personalizado', months: 0 },
];

const DAY_MAP: Record<string, number> = {
  'domingo': 0,
  'segunda': 1,
  'terca': 2,
  'quarta': 3,
  'quinta': 4,
  'sexta': 5,
  'sabado': 6,
};

const GenerateAulasDialog = ({ open, onOpenChange, turma }: GenerateAulasDialogProps) => {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const calculateEndDate = (start: Date, periodValue: string): Date => {
    const end = new Date(start);
    const option = PERIOD_OPTIONS.find(o => o.value === periodValue);
    if (option && option.months > 0) {
      end.setMonth(end.getMonth() + option.months);
    }
    return end;
  };

  const addExcludedDate = () => {
    if (excludeInput && !excludedDates.includes(excludeInput)) {
      setExcludedDates(prev => [...prev, excludeInput].sort());
      setExcludeInput('');
      setPreview([]);
    }
  };

  const removeExcludedDate = (date: string) => {
    setExcludedDates(prev => prev.filter(d => d !== date));
    setPreview([]);
  };

  const generateDates = (): string[] => {
    if (!turma.dias_semana || turma.dias_semana.length === 0) return [];
    
    // Normalize turma's dias_semana to lowercase for comparison
    const turmaDays = turma.dias_semana.map(d => d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    
    const start = new Date(startDate + 'T12:00:00'); // Avoid timezone issues
    const end = period === 'custom' && endDate 
      ? new Date(endDate + 'T12:00:00') 
      : calculateEndDate(start, period);
    
    const dates: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Get the day name for current date and normalize it
      const dayName = Object.entries(DAY_MAP).find(([_, num]) => num === dayOfWeek)?.[0];
      
      if (dayName && turmaDays.includes(dayName)) {
        // Format date as YYYY-MM-DD
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Only add if not in excluded dates
        if (!excludedDates.includes(dateStr)) {
          dates.push(dateStr);
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const handlePreview = () => {
    const dates = generateDates();
    setPreview(dates);
  };

  const handleGenerate = async () => {
    const dates = generateDates();
    
    if (dates.length === 0) {
      toast.error('Nenhuma aula a ser gerada. Verifique os dias da semana da turma.');
      return;
    }

    setIsGenerating(true);
    try {
      // Get existing aulas for this turma to avoid duplicates
      const { data: existingAulas } = await supabase
        .from('aulas')
        .select('data')
        .eq('turma_id', turma.id)
        .in('data', dates);
      
      const existingDates = new Set(existingAulas?.map(a => a.data) || []);
      const newDates = dates.filter(d => !existingDates.has(d));
      
      if (newDates.length === 0) {
        toast.info('Todas as aulas já existem para o período selecionado.');
        return;
      }

      const aulasToInsert = newDates.map(data => ({
        turma_id: turma.id,
        data,
        horario_inicio: turma.horario_inicio,
        horario_fim: turma.horario_fim,
        status: 'normal' as const,
      }));

      const { error } = await supabase
        .from('aulas')
        .insert(aulasToInsert);

      if (error) throw error;

      toast.success(`${newDates.length} aulas geradas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['aulas'] });
      queryClient.invalidateQueries({ queryKey: ['month-aulas'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating aulas:', error);
      toast.error('Erro ao gerar aulas');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateBR = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  const hasSchedule = turma.dias_semana && turma.dias_semana.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Gerar Aulas - {turma.categoria_sub ? `Sub ${turma.categoria_sub} — ` : ''}{turma.nome}
          </DialogTitle>
          <DialogDescription>
            Gere aulas automaticamente com base na recorrência configurada da turma.
          </DialogDescription>
        </DialogHeader>

        {!hasSchedule ? (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Esta turma não possui dias da semana configurados. Configure a recorrência antes de gerar aulas.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>Dias:</strong> {turma.dias_semana.join(', ')}</p>
              <p><strong>Horário:</strong> {turma.horario_inicio?.slice(0, 5)} - {turma.horario_fim?.slice(0, 5)}</p>
            </div>

            <div className="space-y-2">
              <Label>Período de geração</Label>
              <Select value={period} onValueChange={(val) => { setPeriod(val); setPreview([]); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPreview([]); }}
                />
              </div>
              {period === 'custom' && (
                <div className="space-y-2">
                  <Label>Data final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPreview([]); }}
                  />
                </div>
              )}
            </div>

            {/* Excluded dates section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarOff className="w-4 h-4" />
                Excluir Datas (Feriados, etc.)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  min={startDate}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addExcludedDate}
                  disabled={!excludeInput}
                >
                  Adicionar
                </Button>
              </div>
              {excludedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {excludedDates.map(date => (
                    <Badge 
                      key={date} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeExcludedDate(date)}
                    >
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} className="flex-1">
                Pré-visualizar
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !hasSchedule}
                className="flex-1"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Aulas'}
              </Button>
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <Label>Pré-visualização ({preview.length} aulas)</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {preview.slice(0, 50).map(date => (
                    <div key={date} className="text-sm px-2 py-1 bg-muted/50 rounded">
                      {formatDateBR(date)}
                    </div>
                  ))}
                  {preview.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {preview.length - 50} aulas
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GenerateAulasDialog;
