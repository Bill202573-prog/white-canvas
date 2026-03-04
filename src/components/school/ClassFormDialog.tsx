import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Plus } from 'lucide-react';
import { useCreateTurma, useUpdateTurma, useSchoolTeachers, type TurmaWithRelations } from '@/hooks/useSchoolData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma?: TurmaWithRelations | null;
}

const DAYS_OF_WEEK = [
  { value: 'segunda', label: 'Segunda' },
  { value: 'terca', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const ClassFormDialog = ({ open, onOpenChange, turma }: ClassFormDialogProps) => {
  const isEditing = !!turma;
  const createTurma = useCreateTurma();
  const updateTurma = useUpdateTurma();
  const { data: teachers } = useSchoolTeachers();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [nome, setNome] = useState('');
  const [categoriaSub, setCategoriaSub] = useState<string>('');
  const [professorId, setProfessorId] = useState('');
  const [assistenteIds, setAssistenteIds] = useState<string[]>([]);
  const [selectedAssistenteId, setSelectedAssistenteId] = useState('');
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [campo, setCampo] = useState('');
  const [isSavingAssistentes, setIsSavingAssistentes] = useState(false);

  const SUB_CATEGORIES = Array.from({ length: 10 }, (_, i) => i + 7); // 7 to 16

  // Reset form when dialog opens/closes or turma changes
  useEffect(() => {
    if (open) {
      setNome(turma?.nome || '');
      setCategoriaSub(turma?.categoria_sub ? String(turma.categoria_sub) : '');
      setProfessorId(turma?.professor_id || '');
      // Load existing assistants from turma
      const existingAssistenteIds = turma?.assistentes?.map(a => a.id) || [];
      setAssistenteIds(existingAssistenteIds);
      setSelectedAssistenteId('');
      setDiasSemana(turma?.dias_semana || []);
      setHorarioInicio(turma?.horario_inicio || '');
      setHorarioFim(turma?.horario_fim || '');
      setCampo((turma as any)?.campo || '');
    }
  }, [open, turma]);

  const handleDayToggle = (day: string) => {
    setDiasSemana(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAddAssistente = () => {
    if (selectedAssistenteId && !assistenteIds.includes(selectedAssistenteId)) {
      setAssistenteIds(prev => [...prev, selectedAssistenteId]);
      setSelectedAssistenteId('');
    }
  };

  const handleRemoveAssistente = (id: string) => {
    setAssistenteIds(prev => prev.filter(a => a !== id));
  };

  const getAssistenteNome = (id: string) => {
    return teachers?.find(t => t.id === id)?.nome || 'Assistente';
  };

  const availableAssistentes = teachers?.filter(
    t => t.ativo && t.id !== professorId && !assistenteIds.includes(t.id)
  ) || [];

  const saveAssistentes = async (turmaId: string) => {
    // Delete existing assistants for this turma
    await supabase
      .from('turma_assistentes')
      .delete()
      .eq('turma_id', turmaId);
    
    // Insert new assistants
    if (assistenteIds.length > 0) {
      const inserts = assistenteIds.map(professorId => ({
        turma_id: turmaId,
        professor_id: professorId,
      }));
      
      const { error } = await supabase
        .from('turma_assistentes')
        .insert(inserts);
      
      if (error) throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('Informe o nome da turma');
      return;
    }

    setIsSavingAssistentes(true);
    try {
      if (isEditing && turma) {
        await updateTurma.mutateAsync({
          id: turma.id,
          nome: nome.trim(),
          categoria_sub: categoriaSub ? Number(categoriaSub) : null,
          professor_id: professorId || null,
          dias_semana: diasSemana,
          horario_inicio: horarioInicio || null,
          horario_fim: horarioFim || null,
          campo: campo.trim() || null,
        });
        
        // Save assistants
        await saveAssistentes(turma.id);
        
        toast.success('Turma atualizada');
      } else {
        const result = await createTurma.mutateAsync({
          nome: nome.trim(),
          categoriaSub: categoriaSub ? Number(categoriaSub) : undefined,
          professorId: professorId || undefined,
          diasSemana,
          horarioInicio: horarioInicio || undefined,
          horarioFim: horarioFim || undefined,
          campo: campo.trim() || undefined,
        });
        
        // Save assistants for new turma
        if (result?.id) {
          await saveAssistentes(result.id);
        }
        
        toast.success('Turma cadastrada');
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['school-turmas-relations', user?.escolinhaId] });
      
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error('Erro ao salvar turma');
    } finally {
      setIsSavingAssistentes(false);
    }
  };

  const resetForm = () => {
    setNome('');
    setCategoriaSub('');
    setProfessorId('');
    setAssistenteIds([]);
    setSelectedAssistenteId('');
    setDiasSemana([]);
    setHorarioInicio('');
    setHorarioFim('');
    setCampo('');
  };

  const isPending = createTurma.isPending || updateTurma.isPending || isSavingAssistentes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Turma' : 'Cadastrar Nova Turma'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Turma *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Turma 1, Turma Manhã..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria (Sub)</Label>
            <Select value={categoriaSub || "none"} onValueChange={(val) => setCategoriaSub(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {SUB_CATEGORIES.map(sub => (
                  <SelectItem key={sub} value={String(sub)}>
                    Sub {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Professor Responsável</Label>
            <Select value={professorId || "none"} onValueChange={(val) => setProfessorId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem professor</SelectItem>
                {teachers?.filter(t => t.ativo && t.tipo_profissional !== 'assistente').map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assistentes Técnicos</Label>
            
            {/* Current assistants */}
            {assistenteIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {assistenteIds.map(id => (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1">
                    {getAssistenteNome(id)}
                    <button
                      type="button"
                      onClick={() => handleRemoveAssistente(id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Add new assistant */}
            <div className="flex gap-2">
              <Select value={selectedAssistenteId || "none"} onValueChange={(val) => setSelectedAssistenteId(val === "none" ? "" : val)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar assistente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um assistente</SelectItem>
                  {availableAssistentes.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleAddAssistente}
                disabled={!selectedAssistenteId}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {availableAssistentes.length === 0 && assistenteIds.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum outro professor disponível para adicionar como assistente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <div className="flex flex-wrap gap-3">
              {DAYS_OF_WEEK.map(day => (
                <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={diasSemana.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horarioInicio">Horário Início</Label>
              <Input
                id="horarioInicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horarioFim">Horário Fim</Label>
              <Input
                id="horarioFim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campo">Campo / Local</Label>
            <Input
              id="campo"
              value={campo}
              onChange={(e) => setCampo(e.target.value)}
              placeholder="Ex: Campo 1, Campo Society, Salão..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClassFormDialog;