import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle2, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useSchoolComunicadosEscola, useDeleteComunicadoEscola, ComunicadoEscolaComLeitura } from '@/hooks/useComunicadosEscolaData';
import ComunicadoEscolaFormDialog from '@/components/school/ComunicadoEscolaFormDialog';
import ComunicadoLeiturasDialog from '@/components/school/ComunicadoLeiturasDialog';
import { PushConfigSection } from '@/components/school/PushConfigSection';

const tipoConfig = {
  informativo: { icon: Info, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Informativo' },
  importante: { icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Importante' },
  urgente: { icon: AlertCircle, color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Urgente' },
};

const filtroConfig = {
  turma: { label: 'Por Turma' },
  horario: { label: 'Por Horário' },
  categoria: { label: 'Por Categoria' },
  todos: { label: 'Todos' },
};

export default function ComunicadosEscolaManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<ComunicadoEscolaComLeitura | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comunicadoToDelete, setComunicadoToDelete] = useState<ComunicadoEscolaComLeitura | null>(null);
  const [leiturasDialogOpen, setLeiturasDialogOpen] = useState(false);
  const [comunicadoForLeituras, setComunicadoForLeituras] = useState<ComunicadoEscolaComLeitura | null>(null);

  // Get escolinha ID
  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: comunicados = [], isLoading } = useSchoolComunicadosEscola(escolinha?.id);
  const deleteMutation = useDeleteComunicadoEscola();

  const filteredComunicados = comunicados.filter((c) =>
    c.titulo.toLowerCase().includes(search.toLowerCase()) ||
    c.mensagem.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (comunicado: ComunicadoEscolaComLeitura) => {
    setSelectedComunicado(comunicado);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!comunicadoToDelete || !escolinha?.id) return;

    try {
      await deleteMutation.mutateAsync({ id: comunicadoToDelete.id, escolinhaId: escolinha.id });
      toast.success('Comunicado excluído!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    } finally {
      setDeleteDialogOpen(false);
      setComunicadoToDelete(null);
    }
  };

  const openDeleteDialog = (comunicado: ComunicadoEscolaComLeitura) => {
    setComunicadoToDelete(comunicado);
    setDeleteDialogOpen(true);
  };

  const openLeiturasDialog = (comunicado: ComunicadoEscolaComLeitura) => {
    setComunicadoForLeituras(comunicado);
    setLeiturasDialogOpen(true);
  };

  const getFilterDescription = (c: ComunicadoEscolaComLeitura) => {
    // If individual recipients, show their names
    if (c.criancas_nomes && c.criancas_nomes.length > 0) {
      if (c.criancas_nomes.length === 1) {
        return c.criancas_nomes[0];
      }
      return `${c.criancas_nomes.length} alunos selecionados`;
    }
    
    const parts = [];
    if (c.turma?.nome) parts.push(`Turma: ${c.turma.nome}`);
    if (c.horario) parts.push(`Horário: ${c.horario}`);
    if (c.categoria) parts.push(`Categoria: ${c.categoria}`);
    return parts.length > 0 ? parts.join(' | ') : 'Todos os responsáveis';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Comunicados para Responsáveis</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens para os responsáveis dos alunos</p>
        </div>
        <Button onClick={() => { setSelectedComunicado(null); setFormOpen(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Comunicado
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Comunicados Enviados</CardTitle>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar comunicados..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {filteredComunicados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 px-4">
              {search ? 'Nenhum comunicado encontrado' : 'Nenhum comunicado enviado ainda'}
            </p>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="block lg:hidden space-y-3 px-4">
                {filteredComunicados.map((c) => {
                  const TipoIcon = tipoConfig[c.tipo]?.icon || Info;
                  const total = c.total_destinatarios || 0;
                  const lidos = c.leituras?.length || 0;
                  const percentual = total > 0 ? Math.round((lidos / total) * 100) : 0;
                  
                  return (
                    <div key={c.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {c.mensagem}
                          </p>
                        </div>
                        <Badge variant="outline" className={`${tipoConfig[c.tipo]?.color} shrink-0 text-xs`}>
                          <TipoIcon className="w-3 h-3 mr-1" />
                          {tipoConfig[c.tipo]?.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                        {c.criancas_nomes && c.criancas_nomes.length > 0 && (
                          <User className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="truncate">{getFilterDescription(c)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openLeiturasDialog(c)}
                          >
                            <Eye className="w-3 h-3" />
                            {lidos}/{total}
                          </Button>
                          <span className={`text-xs font-medium ${
                            percentual >= 80 ? 'text-emerald-600' : 
                            percentual >= 50 ? 'text-amber-600' : 
                            'text-muted-foreground'
                          }`}>
                            {percentual}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(c)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(c)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {/* Desktop View - Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Filtro</TableHead>
                      <TableHead>Leituras</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {filteredComunicados.map((c) => {
                    const TipoIcon = tipoConfig[c.tipo]?.icon || Info;
                    const leiturasCount = c.leituras?.length || 0;

                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.titulo}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {c.mensagem}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tipoConfig[c.tipo]?.color}>
                            <TipoIcon className="w-3 h-3 mr-1" />
                            {tipoConfig[c.tipo]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.criancas_nomes && c.criancas_nomes.length > 0 && (
                              <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {getFilterDescription(c)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const total = c.total_destinatarios || 0;
                            const lidos = c.leituras?.length || 0;
                            const percentual = total > 0 ? Math.round((lidos / total) * 100) : 0;
                            
                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs gap-1"
                                    onClick={() => openLeiturasDialog(c)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {lidos}/{total}
                                  </Button>
                                  <span className={`text-xs font-medium ${
                                    percentual >= 80 ? 'text-emerald-600' : 
                                    percentual >= 50 ? 'text-amber-600' : 
                                    'text-muted-foreground'
                                  }`}>
                                    {percentual}%
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(c)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDeleteDialog(c)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {escolinha?.id && (
        <ComunicadoEscolaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          escolinhaId={escolinha.id}
          comunicado={selectedComunicado}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comunicado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o comunicado "{comunicadoToDelete?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {escolinha?.id && (
        <ComunicadoLeiturasDialog
          open={leiturasDialogOpen}
          onOpenChange={setLeiturasDialogOpen}
          comunicado={comunicadoForLeituras}
          escolinhaId={escolinha.id}
        />
      )}

      {/* Push Notifications Config */}
      {escolinha?.id && (
        <PushConfigSection escolinhaId={escolinha.id} />
      )}
    </div>
  );
}
