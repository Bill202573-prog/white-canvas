import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar,
  User,
  Users,
  AlertTriangle,
  Star,
  RotateCcw,
  XCircle,
  Edit,
  Save,
  Trash2,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  type AulaWithStatus, 
  useMotivosCancelamento,
  useCancelAula,
  useRestoreAula,
  useUpdateAula,
  useDeleteAula,
} from '@/hooks/useAulasData';
import { type TurmaWithRelations } from '@/hooks/useSchoolData';

// Hook to fetch presencas for an aula (including who closed attendance)
const useAulaPresencas = (aulaId: string | undefined, turmaDetails?: TurmaWithRelations) => {
  return useQuery({
    queryKey: ['aula-presencas', aulaId, turmaDetails?.id],
    queryFn: async () => {
      if (!aulaId) return { presencas: [], chamadaInfo: null };
      const { data, error } = await supabase
        .from('presencas')
        .select('crianca_id, confirmado_responsavel, presente, chamada_fechada_por, chamada_fechada_por_id, professor_confirmou_em')
        .eq('aula_id', aulaId);
      if (error) throw error;

      const presencas = data || [];
      let chamadaInfo: { fechadaPor: string | null; fechadaPorNome: string | null; fechadaEm: string | null } | null = null;

      const chamadaSalva = presencas.length > 0 && presencas.every(p => p.presente !== null);
      if (chamadaSalva && presencas.length > 0) {
        const first = presencas[0];
        let nome: string | null = null;
        if (first.chamada_fechada_por_id) {
          const { data: prof } = await supabase
            .from('professores')
            .select('nome')
            .eq('id', first.chamada_fechada_por_id)
            .maybeSingle();
          nome = prof?.nome || null;
        }
        chamadaInfo = {
          fechadaPor: first.chamada_fechada_por,
          fechadaPorNome: nome,
          fechadaEm: first.professor_confirmou_em,
        };
      }

      return { presencas, chamadaInfo };
    },
    enabled: !!aulaId,
    refetchInterval: 30000,
  });
};

interface AulaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula: AulaWithStatus | null;
  turmaDetails?: TurmaWithRelations;
  escolinhaId?: string;
}

const AulaDetailDialog = ({ open, onOpenChange, aula, turmaDetails, escolinhaId }: AulaDetailDialogProps) => {
  const [mode, setMode] = useState<'view' | 'edit' | 'cancel'>('view');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motivoCancelamentoId, setMotivoCancelamentoId] = useState('');
  
  // Use turma's escolinha_id if available, otherwise fall back to user's escolinhaId
  const effectiveEscolinhaId = escolinhaId || turmaDetails?.escolinha_id;
  const { data: motivosCancelamento } = useMotivosCancelamento(effectiveEscolinhaId);
  const { data: presencaData, isLoading: presencasLoading } = useAulaPresencas(aula?.id, turmaDetails);
  const presencas = presencaData?.presencas || [];
  const chamadaInfo = presencaData?.chamadaInfo;
  const cancelAula = useCancelAula();
  const restoreAula = useRestoreAula();
  const updateAula = useUpdateAula();
  const deleteAula = useDeleteAula();
  
  // Calculate confirmation stats
  const totalAlunos = turmaDetails?.criancas.length || 0;
  const confirmados = presencas.filter(p => p.confirmado_responsavel === true).length;
  const recusados = presencas.filter(p => p.confirmado_responsavel === false).length;
  const semResposta = totalAlunos - confirmados - recusados;
  
  // Create a map of crianca_id -> presenca for quick lookup
  const presencaMap = new Map(presencas.map(p => [p.crianca_id, p]));
  
  const handleDelete = async () => {
    if (!aula) return;
    
    try {
      await deleteAula.mutateAsync(aula.id);
      toast.success('Aula excluída com sucesso');
      handleOpenChange(false);
    } catch (error) {
      toast.error('Erro ao excluir aula');
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMode('view');
      setMotivoCancelamentoId('');
    }
    onOpenChange(isOpen);
  };
  
  const handleEdit = () => {
    setHorarioInicio(aula?.horario_inicio?.slice(0, 5) || '');
    setHorarioFim(aula?.horario_fim?.slice(0, 5) || '');
    setObservacoes(aula?.observacoes || '');
    setMode('edit');
  };
  
  const handleSave = async () => {
    if (!aula) return;
    
    try {
      await updateAula.mutateAsync({
        aulaId: aula.id,
        horarioInicio,
        horarioFim,
        observacoes,
      });
      toast.success('Aula atualizada com sucesso');
      setMode('view');
    } catch (error) {
      toast.error('Erro ao atualizar aula');
    }
  };
  
  const handleCancel = async () => {
    if (!aula || !motivoCancelamentoId) {
      toast.error('Selecione um motivo de cancelamento');
      return;
    }
    
    try {
      await cancelAula.mutateAsync({ aulaId: aula.id, motivoId: motivoCancelamentoId });
      toast.success('Aula cancelada');
      handleOpenChange(false);
    } catch (error) {
      toast.error('Erro ao cancelar aula');
    }
  };
  
  const handleRestore = async () => {
    if (!aula) return;
    
    try {
      await restoreAula.mutateAsync(aula.id);
      toast.success('Aula restaurada');
    } catch (error) {
      toast.error('Erro ao restaurar aula');
    }
  };
  
  if (!aula) return null;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };
  
  const getStatusBadge = () => {
    switch (aula.status) {
      case 'cancelada':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Cancelada</Badge>;
      case 'extra':
        return <Badge className="gap-1 bg-amber-500 hover:bg-amber-600"><Star className="w-3 h-3" />Aula Extra</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">Normal</Badge>;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {aula.turma?.nome}
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>
        
        {mode === 'view' && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid gap-3 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="capitalize">{formatDate(aula.data)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{aula.horario_inicio?.slice(0, 5) || '—'} - {aula.horario_fim?.slice(0, 5) || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Prof. {turmaDetails?.professor?.nome || 'Não definido'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{turmaDetails?.criancas.length || 0} alunos</span>
              </div>
            </div>

            {/* Chamada info */}
            {chamadaInfo && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                <div className="flex items-center gap-2 text-success font-medium text-sm">
                  <Check className="w-4 h-4" />
                  Chamada realizada
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {chamadaInfo.fechadaPorNome 
                    ? `Por: ${chamadaInfo.fechadaPorNome}`
                    : chamadaInfo.fechadaPor === 'escola' 
                      ? 'Por: Administração da escola' 
                      : 'Por: Professor'}
                  {chamadaInfo.fechadaEm && (
                    <> — {new Date(chamadaInfo.fechadaEm).toLocaleString('pt-BR')}</>
                  )}
                </p>
              </div>
            )}

            {/* Cancellation info */}
            {aula.status === 'cancelada' && aula.motivo_cancelamento && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Aula Cancelada
                </div>
                <p className="text-sm text-muted-foreground">
                  Motivo: {aula.motivo_cancelamento.nome}
                </p>
                {aula.cancelado_em && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancelada em: {new Date(aula.cancelado_em).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}
            
            {/* Extra class info */}
            {aula.status === 'extra' && aula.motivo_aula_extra && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-600 font-medium mb-1">
                  <Star className="w-4 h-4" />
                  Aula Extra
                </div>
                <p className="text-sm text-muted-foreground">
                  Motivo: {aula.motivo_aula_extra.nome}
                </p>
              </div>
            )}
            
            {/* Notes */}
            {aula.observacoes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">{aula.observacoes}</p>
              </div>
            )}
            
            {/* Students list */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Alunos
              </h4>
              
              {/* Confirmation stats */}
              {totalAlunos > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" />
                    {totalAlunos} total
                  </Badge>
                  <Badge variant="secondary" className="gap-1 bg-success/20 text-success">
                    <Check className="w-3 h-3" />
                    {confirmados} confirmados
                  </Badge>
                  <Badge variant="secondary" className="gap-1 bg-destructive/20 text-destructive">
                    <X className="w-3 h-3" />
                    {recusados} ausentes
                  </Badge>
                  <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
                    <HelpCircle className="w-3 h-3" />
                    {semResposta} sem resposta
                  </Badge>
                </div>
              )}
              
              {turmaDetails?.criancas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma</p>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {turmaDetails?.criancas.map(({ crianca }) => {
                    if (!crianca) return null;
                    const presenca = presencaMap.get(crianca.id);
                    const isConfirmed = presenca?.confirmado_responsavel === true;
                    const isDeclined = presenca?.confirmado_responsavel === false;
                    
                    return (
                      <div 
                        key={crianca.id} 
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          isConfirmed ? 'bg-success/10 border border-success/30' :
                          isDeclined ? 'bg-destructive/10 border border-destructive/30' :
                          'bg-secondary/30'
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          {crianca.foto_url && <AvatarImage src={crianca.foto_url} />}
                          <AvatarFallback className="text-xs">{crianca.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{crianca.nome}</span>
                        {isConfirmed && <Check className="w-4 h-4 text-success" />}
                        {isDeclined && <X className="w-4 h-4 text-destructive" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        
        {mode === 'edit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário Início</Label>
                <Input 
                  type="time" 
                  value={horarioInicio} 
                  onChange={(e) => setHorarioInicio(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim</Label>
                <Input 
                  type="time" 
                  value={horarioFim} 
                  onChange={(e) => setHorarioFim(e.target.value)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={observacoes} 
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre a aula..."
              />
            </div>
          </div>
        )}
        
        {mode === 'cancel' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                Você está prestes a cancelar esta aula. Selecione o motivo do cancelamento:
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo do Cancelamento *</Label>
              <Select value={motivoCancelamentoId} onValueChange={setMotivoCancelamentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosCancelamento?.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      {motivo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === 'view' && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir aula permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A aula e todas as presenças registradas serão removidas permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <div className="flex-1" />
              
              {aula.status === 'cancelada' ? (
                <Button onClick={handleRestore} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Restaurar Aula
                </Button>
              ) : (
                <>
                  <Button onClick={() => setMode('cancel')} variant="destructive" className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Cancelar Aula
                  </Button>
                  <Button onClick={handleEdit} variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                </>
              )}
            </>
          )}
          
          {mode === 'edit' && (
            <>
              <Button onClick={() => setMode('view')} variant="outline">Cancelar</Button>
              <Button onClick={handleSave} disabled={updateAula.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            </>
          )}
          
          {mode === 'cancel' && (
            <>
              <Button onClick={() => setMode('view')} variant="outline">Voltar</Button>
              <Button 
                onClick={handleCancel} 
                variant="destructive" 
                disabled={!motivoCancelamentoId || cancelAula.isPending}
              >
                Confirmar Cancelamento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AulaDetailDialog;
