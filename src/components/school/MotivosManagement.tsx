import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  XCircle, 
  Star,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMotivosCancelamento,
  useMotivosAulaExtra,
  useCreateMotivoCancelamento,
  useUpdateMotivoCancelamento,
  useDeleteMotivoCancelamento,
  useCreateMotivoAulaExtra,
  useUpdateMotivoAulaExtra,
  useDeleteMotivoAulaExtra,
} from '@/hooks/useAulasData';

const MotivosManagement = () => {
  const [newMotivoCancelamento, setNewMotivoCancelamento] = useState('');
  const [newMotivoExtra, setNewMotivoExtra] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
  const { data: motivosCancelamento } = useMotivosCancelamento();
  const { data: motivosExtra } = useMotivosAulaExtra();
  
  const createMotivoCancelamento = useCreateMotivoCancelamento();
  const updateMotivoCancelamento = useUpdateMotivoCancelamento();
  const deleteMotivoCancelamento = useDeleteMotivoCancelamento();
  
  const createMotivoExtra = useCreateMotivoAulaExtra();
  const updateMotivoExtra = useUpdateMotivoAulaExtra();
  const deleteMotivoExtra = useDeleteMotivoAulaExtra();
  
  const handleAddMotivoCancelamento = async () => {
    if (!newMotivoCancelamento.trim()) return;
    
    try {
      await createMotivoCancelamento.mutateAsync(newMotivoCancelamento.trim());
      setNewMotivoCancelamento('');
      toast.success('Motivo adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar motivo');
    }
  };
  
  const handleAddMotivoExtra = async () => {
    if (!newMotivoExtra.trim()) return;
    
    try {
      await createMotivoExtra.mutateAsync(newMotivoExtra.trim());
      setNewMotivoExtra('');
      toast.success('Motivo adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar motivo');
    }
  };
  
  const handleEditStart = (id: string, nome: string) => {
    setEditingId(id);
    setEditingValue(nome);
  };
  
  const handleEditSave = async (type: 'cancelamento' | 'extra') => {
    if (!editingId || !editingValue.trim()) return;
    
    try {
      if (type === 'cancelamento') {
        await updateMotivoCancelamento.mutateAsync({ id: editingId, nome: editingValue.trim() });
      } else {
        await updateMotivoExtra.mutateAsync({ id: editingId, nome: editingValue.trim() });
      }
      setEditingId(null);
      toast.success('Motivo atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar motivo');
    }
  };
  
  const handleDelete = async (id: string, type: 'cancelamento' | 'extra') => {
    try {
      if (type === 'cancelamento') {
        await deleteMotivoCancelamento.mutateAsync(id);
      } else {
        await deleteMotivoExtra.mutateAsync(id);
      }
      toast.success('Motivo removido');
    } catch (error) {
      toast.error('Erro ao remover motivo');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Motivos</CardTitle>
        <CardDescription>
          Configure os motivos de cancelamento e aulas extras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cancelamento">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cancelamento" className="gap-2">
              <XCircle className="w-4 h-4" />
              Cancelamento
            </TabsTrigger>
            <TabsTrigger value="extra" className="gap-2">
              <Star className="w-4 h-4" />
              Aula Extra
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cancelamento" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Novo motivo de cancelamento"
                value={newMotivoCancelamento}
                onChange={(e) => setNewMotivoCancelamento(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMotivoCancelamento()}
              />
              <Button onClick={handleAddMotivoCancelamento} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {motivosCancelamento?.map((motivo) => (
                <div 
                  key={motivo.id} 
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30"
                >
                  {editingId === motivo.id ? (
                    <>
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEditSave('cancelamento')}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{motivo.nome}</span>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEditStart(motivo.id, motivo.nome)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleDelete(motivo.id, 'cancelamento')}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              
              {(!motivosCancelamento || motivosCancelamento.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum motivo de cancelamento cadastrado
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="extra" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Novo motivo de aula extra"
                value={newMotivoExtra}
                onChange={(e) => setNewMotivoExtra(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMotivoExtra()}
              />
              <Button onClick={handleAddMotivoExtra} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {motivosExtra?.map((motivo) => (
                <div 
                  key={motivo.id} 
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30"
                >
                  {editingId === motivo.id ? (
                    <>
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEditSave('extra')}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{motivo.nome}</span>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEditStart(motivo.id, motivo.nome)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleDelete(motivo.id, 'extra')}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              
              {(!motivosExtra || motivosExtra.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum motivo de aula extra cadastrado
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MotivosManagement;
