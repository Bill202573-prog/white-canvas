import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Plus, User } from 'lucide-react';
import { toast } from 'sonner';
import { useMotivosAulaExtra, useCreateExtraAula } from '@/hooks/useAulasData';
import { useSchoolTurmas, useSchoolTeachers } from '@/hooks/useSchoolData';
import { useAuth } from '@/contexts/AuthContext';

interface CreateExtraAulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  escolinhaId?: string;
}

const CreateExtraAulaDialog = ({ open, onOpenChange, initialDate, escolinhaId }: CreateExtraAulaDialogProps) => {
  const { user } = useAuth();
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [motivoId, setMotivoId] = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [professorId, setProfessorId] = useState('');
  
  const effectiveEscolinhaId = escolinhaId || user?.escolinhaId;
  const { data: turmas } = useSchoolTurmas();
  const { data: teachers } = useSchoolTeachers();
  const { data: motivos } = useMotivosAulaExtra(effectiveEscolinhaId);
  const createExtraAula = useCreateExtraAula();
  
  useEffect(() => {
    if (open) {
      setData(initialDate || new Date().toISOString().split('T')[0]);
      setTurmaId('');
      setHorarioInicio('');
      setHorarioFim('');
      setMotivoId('');
      setMotivoCustom('');
      setObservacoes('');
      setProfessorId('');
    }
  }, [open, initialDate]);
  
  // Auto-fill time and professor when turma is selected
  useEffect(() => {
    const selectedTurma = turmas?.find(t => t.id === turmaId);
    if (selectedTurma) {
      setHorarioInicio(selectedTurma.horario_inicio?.slice(0, 5) || '');
      setHorarioFim(selectedTurma.horario_fim?.slice(0, 5) || '');
      // Auto-select turma's professor
      if (selectedTurma.professor_id) {
        setProfessorId(selectedTurma.professor_id);
      }
    }
  }, [turmaId, turmas]);
  
  const handleSubmit = async () => {
    if (!turmaId || !data || !horarioInicio || !horarioFim || !motivoId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (motivoId === 'outros' && !motivoCustom.trim()) {
      toast.error('Informe o motivo da aula extra');
      return;
    }
    
    try {
      // For "outros" or predefined motivos without DB record, we use null motivoId
      const isPreDefinedMotivo = ['reposicao', 'extra', 'treino', 'outros'].includes(motivoId);
      const finalMotivoId = isPreDefinedMotivo ? null : motivoId;
      
      // Build observacoes with motivo info if needed
      let finalObservacoes = observacoes || '';
      if (motivoId === 'outros') {
        finalObservacoes = `Motivo: ${motivoCustom}${observacoes ? `. ${observacoes}` : ''}`;
      } else if (isPreDefinedMotivo) {
        const motivoLabel = motivoId === 'reposicao' ? 'Reposição' : 
                           motivoId === 'extra' ? 'Aula Extra' : 'Treino';
        finalObservacoes = `Motivo: ${motivoLabel}${observacoes ? `. ${observacoes}` : ''}`;
      }
      
      await createExtraAula.mutateAsync({
        turmaId,
        data,
        horarioInicio,
        horarioFim,
        motivoId: finalMotivoId,
        observacoes: finalObservacoes || undefined,
        professorSubstitutoId: professorId || undefined,
      });
      toast.success('Aula extra criada com sucesso');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating extra aula:', error);
      toast.error('Erro ao criar aula extra');
    }
  };
  
  const activeTurmas = turmas?.filter(t => t.ativo) || [];
  const activeTeachers = teachers?.filter(t => t.ativo) || [];
  const selectedTurma = turmas?.find(t => t.id === turmaId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Nova Aula Extra
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {activeTurmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Professor Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Professor
            </Label>
            <Select value={professorId} onValueChange={setProfessorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o professor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {activeTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.nome}
                    {selectedTurma?.professor_id === teacher.id && ' (professor da turma)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTurma?.professor_id && professorId !== selectedTurma.professor_id && professorId && (
              <p className="text-xs text-muted-foreground">
                Professor diferente do titular da turma
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input 
              type="date" 
              value={data} 
              onChange={(e) => setData(e.target.value)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário Início *</Label>
              <Input 
                type="time" 
                value={horarioInicio} 
                onChange={(e) => setHorarioInicio(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Horário Fim *</Label>
              <Input 
                type="time" 
                value={horarioFim} 
                onChange={(e) => setHorarioFim(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Motivo da Aula Extra *</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reposicao">Reposição</SelectItem>
                <SelectItem value="extra">Aula Extra</SelectItem>
                <SelectItem value="treino">Treino</SelectItem>
                {motivos?.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.nome}
                  </SelectItem>
                ))}
                <SelectItem value="outros">Outros (especificar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {motivoId === 'outros' && (
            <div className="space-y-2">
              <Label>Especifique o motivo *</Label>
              <Input 
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                placeholder="Descreva o motivo da aula extra..."
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea 
              value={observacoes} 
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a aula extra..."
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createExtraAula.isPending}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Aula Extra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExtraAulaDialog;
