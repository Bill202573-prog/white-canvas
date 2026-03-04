import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateComunicado, useUpdateComunicado, Comunicado } from '@/hooks/useComunicadosData';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';
import { Loader2, Send, Globe, School } from 'lucide-react';

interface ComunicadoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comunicado?: Comunicado | null;
}

const ComunicadoFormDialog = ({ open, onOpenChange, comunicado }: ComunicadoFormDialogProps) => {
  const { escolinhas } = useAdminData();
  const createComunicado = useCreateComunicado();
  const updateComunicado = useUpdateComunicado();

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<'informativo' | 'urgente' | 'importante'>('informativo');
  const [destinatario, setDestinatario] = useState<'todas' | 'especifica'>('todas');
  const [escolinhaId, setEscolinhaId] = useState<string>('');
  const [dataExpiracao, setDataExpiracao] = useState('');

  useEffect(() => {
    if (comunicado) {
      setTitulo(comunicado.titulo);
      setMensagem(comunicado.mensagem);
      setTipo(comunicado.tipo);
      setDestinatario(comunicado.escolinha_id ? 'especifica' : 'todas');
      setEscolinhaId(comunicado.escolinha_id || '');
      setDataExpiracao(comunicado.data_expiracao?.split('T')[0] || '');
    } else {
      resetForm();
    }
  }, [comunicado, open]);

  const resetForm = () => {
    setTitulo('');
    setMensagem('');
    setTipo('informativo');
    setDestinatario('todas');
    setEscolinhaId('');
    setDataExpiracao('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }

    if (destinatario === 'especifica' && !escolinhaId) {
      toast.error('Selecione uma escolinha');
      return;
    }

    try {
      const data = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        tipo,
        escolinha_id: destinatario === 'todas' ? null : escolinhaId,
        data_expiracao: dataExpiracao || null,
      };

      if (comunicado) {
        await updateComunicado.mutateAsync({ id: comunicado.id, ...data });
        toast.success('Comunicado atualizado!');
      } else {
        await createComunicado.mutateAsync(data);
        toast.success('Comunicado enviado!');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar comunicado');
    }
  };

  const isLoading = createComunicado.isPending || updateComunicado.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {comunicado ? 'Editar Comunicado' : 'Novo Comunicado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do comunicado"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={5}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="importante">Importante</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiração (opcional)</Label>
              <Input
                type="date"
                value={dataExpiracao}
                onChange={(e) => setDataExpiracao(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Select value={destinatario} onValueChange={(v: any) => setDestinatario(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Todas as Escolinhas
                  </div>
                </SelectItem>
                <SelectItem value="especifica">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Escolinha Específica
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {destinatario === 'especifica' && (
            <div className="space-y-2">
              <Label>Escolinha</Label>
              <Select value={escolinhaId} onValueChange={setEscolinhaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escolinha" />
                </SelectTrigger>
                <SelectContent>
                  {escolinhas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {comunicado ? 'Atualizar' : 'Enviar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ComunicadoFormDialog;
