import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  useAdminComunicados,
  useDeleteComunicado,
  Comunicado,
} from '@/hooks/useComunicadosData';
import ComunicadoFormDialog from '@/components/admin/ComunicadoFormDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Globe,
  School,
  AlertTriangle,
  Info,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const tipoConfig = {
  informativo: {
    icon: Info,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    label: 'Informativo',
  },
  importante: {
    icon: Megaphone,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Importante',
  },
  urgente: {
    icon: AlertTriangle,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Urgente',
  },
};

const ComunicadosManagement = () => {
  const { data: comunicados = [], isLoading } = useAdminComunicados();
  const deleteComunicado = useDeleteComunicado();

  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<Comunicado | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comunicadoToDelete, setComunicadoToDelete] = useState<Comunicado | null>(null);

  const filteredComunicados = comunicados.filter(
    (c) =>
      c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mensagem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNew = () => {
    setSelectedComunicado(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (comunicado: Comunicado) => {
    setSelectedComunicado(comunicado);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (comunicado: Comunicado) => {
    setComunicadoToDelete(comunicado);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!comunicadoToDelete) return;

    try {
      await deleteComunicado.mutateAsync(comunicadoToDelete.id);
      toast.success('Comunicado excluído');
      setDeleteDialogOpen(false);
      setComunicadoToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir comunicado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comunicados</h1>
        <p className="text-muted-foreground">
          Envie avisos e mensagens para as escolinhas e responsáveis
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Gerenciar Comunicados
              </CardTitle>
              <CardDescription>
                {comunicados.length} comunicado(s) enviado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar comunicados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleNew}>
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredComunicados.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                {searchTerm ? 'Nenhum comunicado encontrado' : 'Nenhum comunicado enviado'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? 'Tente ajustar sua busca'
                  : 'Comece enviando seu primeiro comunicado'}
              </p>
              {!searchTerm && (
                <Button onClick={handleNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Comunicado
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComunicados.map((comunicado, index) => {
                const config = tipoConfig[comunicado.tipo];
                const Icon = config.icon;

                return (
                  <div
                    key={comunicado.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">
                              {comunicado.titulo}
                            </h3>
                            <Badge variant="outline" className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                            {!comunicado.ativo && (
                              <Badge variant="secondary" className="text-xs">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {comunicado.mensagem}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {comunicado.escolinha ? (
                                <>
                                  <School className="w-3 h-3" />
                                  {comunicado.escolinha.nome}
                                </>
                              ) : (
                                <>
                                  <Globe className="w-3 h-3" />
                                  Todas as escolinhas
                                </>
                              )}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(comunicado.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                            {comunicado.data_expiracao && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600">
                                  Expira em{' '}
                                  {format(new Date(comunicado.data_expiracao), 'dd/MM/yyyy')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(comunicado)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(comunicado)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ComunicadoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        comunicado={selectedComunicado}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comunicado será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteComunicado.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComunicadosManagement;
