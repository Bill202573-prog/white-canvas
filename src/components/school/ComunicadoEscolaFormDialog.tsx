import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateComunicadoEscola, useUpdateComunicadoEscola, ComunicadoEscola } from '@/hooks/useComunicadosEscolaData';
import { useSchoolTurmas } from '@/hooks/useSchoolData';
import { supabase } from '@/integrations/supabase/client';

interface ComunicadoEscolaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolinhaId: string;
  comunicado?: ComunicadoEscola | null;
}

export default function ComunicadoEscolaFormDialog({
  open,
  onOpenChange,
  escolinhaId,
  comunicado,
}: ComunicadoEscolaFormDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<'informativo' | 'importante' | 'urgente'>('informativo');
  const [turmaId, setTurmaId] = useState<string>('all');
  const [categoria, setCategoria] = useState<string>('all');
  const [horario, setHorario] = useState<string>('all');
  const [dataExpiracao, setDataExpiracao] = useState('');

  const { data: turmas = [] } = useSchoolTurmas(escolinhaId);
  const createMutation = useCreateComunicadoEscola();
  const updateMutation = useUpdateComunicadoEscola();

  const isEditing = !!comunicado;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setTitulo('');
    setMensagem('');
    setTipo('informativo');
    setTurmaId('all');
    setCategoria('all');
    setHorario('all');
    setDataExpiracao('');
  };

  useEffect(() => {
    if (!open) return;

    if (comunicado) {
      setTitulo(comunicado.titulo);
      setMensagem(comunicado.mensagem);
      setTipo(comunicado.tipo);
      setTurmaId(comunicado.turma_id || 'all');
      setCategoria(comunicado.categoria || 'all');
      setHorario(comunicado.horario || 'all');
      setDataExpiracao(comunicado.data_expiracao ? comunicado.data_expiracao.split('T')[0] : '');
    } else {
      resetForm();
    }
  }, [open, comunicado?.id]);

  // Helper to get current children IDs for a turma (snapshot at send time)
  const getSnapshotCriancaIds = async (turmaId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('crianca_turma')
      .select('crianca_id')
      .eq('turma_id', turmaId)
      .eq('ativo', true);
    return data?.map(c => c.crianca_id) || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // For new comunicados with turma filter, snapshot the current children
    let criancaIdsSnapshot: string[] | null = null;
    if (!isEditing && turmaId !== 'all') {
      criancaIdsSnapshot = await getSnapshotCriancaIds(turmaId);
    }

    const formData = {
      titulo,
      mensagem,
      tipo,
      destinatario_tipo: 'responsaveis' as const,
      professor_id: null,
      turma_id: turmaId !== 'all' ? turmaId : null,
      categoria: categoria !== 'all' ? categoria : null,
      horario: horario !== 'all' ? horario : null,
      data_expiracao: dataExpiracao || null,
      // Save snapshot of children IDs when sending to turma
      crianca_ids: criancaIdsSnapshot,
    };

    try {
      if (isEditing && comunicado) {
        // When editing, don't change crianca_ids (keep original recipients)
        const { crianca_ids, ...updateData } = formData;
        await updateMutation.mutateAsync({ id: comunicado.id, escolinhaId, ...updateData });
        toast.success('Comunicado atualizado!');
      } else {
        await createMutation.mutateAsync({ escolinhaId, data: formData });
        toast.success('Comunicado enviado para os responsáveis!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar comunicado');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isEditing ? 'Editar Comunicado' : 'Novo Comunicado para Responsáveis'}
          </DialogTitle>
          <DialogDescription>
            Envie mensagens para os responsáveis dos alunos. Você pode filtrar por turma, horário ou categoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Aviso sobre treino especial"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem *</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem que será enviada aos responsáveis..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Comunicado</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informativo">📋 Informativo</SelectItem>
                <SelectItem value="importante">⚠️ Importante</SelectItem>
                <SelectItem value="urgente">🚨 Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <Label className="text-sm font-medium">Filtrar Destinatários (opcional)</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Por Turma</Label>
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Por Horário</Label>
                <Select value={horario} onValueChange={setHorario}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Por Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="sub-7">Sub-7</SelectItem>
                    <SelectItem value="sub-9">Sub-9</SelectItem>
                    <SelectItem value="sub-11">Sub-11</SelectItem>
                    <SelectItem value="sub-13">Sub-13</SelectItem>
                    <SelectItem value="sub-15">Sub-15</SelectItem>
                    <SelectItem value="sub-17">Sub-17</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiracao">Data de Expiração (opcional)</Label>
            <Input
              id="expiracao"
              type="date"
              value={dataExpiracao}
              onChange={(e) => setDataExpiracao(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Enviar Comunicado'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
