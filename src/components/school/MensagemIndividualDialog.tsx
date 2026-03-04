import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useCreateComunicadoEscola } from '@/hooks/useComunicadosEscolaData';

interface MensagemIndividualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolinhaId: string;
  crianca: {
    id: string;
    nome: string;
    foto_url?: string | null;
  };
}

export default function MensagemIndividualDialog({
  open,
  onOpenChange,
  escolinhaId,
  crianca,
}: MensagemIndividualDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<'informativo' | 'importante' | 'urgente'>('informativo');

  const createMutation = useCreateComunicadoEscola();
  const isLoading = createMutation.isPending;

  const resetForm = () => {
    setTitulo('');
    setMensagem('');
    setTipo('informativo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const formData = {
      titulo,
      mensagem,
      tipo,
      destinatario_tipo: 'responsaveis' as const,
      professor_id: null,
      turma_id: null,
      categoria: null,
      horario: null,
      data_expiracao: null,
      crianca_ids: [crianca.id],
    };

    try {
      await createMutation.mutateAsync({ escolinhaId, data: formData });
      toast.success(`Mensagem enviada para o responsável de ${crianca.nome.split(' ')[0]}!`);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Mensagem Individual
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem diretamente para o responsável deste aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar>
            {crianca.foto_url && <AvatarImage src={crianca.foto_url} alt={crianca.nome} />}
            <AvatarFallback>{crianca.nome.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{crianca.nome}</p>
            <p className="text-xs text-muted-foreground">Destinatário</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Lembrete importante"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem *</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Mensagem
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
