import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Trophy,
  FileCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useAtividadesExternas,
  useDeleteAtividadeExterna,
  AtividadeExterna,
  TIPO_ATIVIDADE_LABELS,
  ABRANGENCIA_LABELS,
} from '@/hooks/useAtividadesExternasData';
import AtividadeExternaFormDialog from './AtividadeExternaFormDialog';
import AtividadeImageGallery from './AtividadeImageGallery';
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

interface AtividadesExternasTabProps {
  criancaId: string;
  childName: string;
}

const AtividadesExternasTab = ({ criancaId, childName }: AtividadesExternasTabProps) => {
  const { data: atividades = [], isLoading } = useAtividadesExternas(criancaId);
  const deleteAtividade = useDeleteAtividadeExterna();
  
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<AtividadeExterna | null>(null);

  const handleEdit = (atividade: AtividadeExterna) => {
    setEditingActivity(atividade);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingActivity(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteAtividade.mutateAsync({ id: deleteConfirmId, crianca_id: criancaId });
      toast.success('Atividade removida com sucesso');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Erro ao remover atividade');
    }
  };

  const getCredibilidadeBadge = (status: AtividadeExterna['credibilidade_status']) => {
    switch (status) {
      case 'com_evidencia':
        return (
          <Badge variant="default" className="bg-emerald-500 text-white text-xs">
            <FileCheck className="w-3 h-3 mr-1" />
            Com evidência
          </Badge>
        );
      case 'validado':
        return (
          <Badge variant="default" className="bg-blue-500 text-white text-xs">
            <Trophy className="w-3 h-3 mr-1" />
            Validado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Registrado
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Atividades Externas</h3>
          <p className="text-sm text-muted-foreground">
            Registre treinos, avaliações e competições fora da escolinha
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Beta Badge */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
          BETA
        </Badge>
        <span className="text-sm text-amber-700 dark:text-amber-400">
          Você tem acesso antecipado a esta funcionalidade
        </span>
      </div>

      {/* Lista de Atividades */}
      {atividades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">Nenhuma atividade registrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Comece a documentar a jornada esportiva de {childName.split(' ')[0]}
            </p>
            <Button onClick={() => setFormOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Registrar primeira atividade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {atividades.map((atividade) => {
            const isExpanded = expandedId === atividade.id;
            const hasPhotos = atividade.fotos_urls && atividade.fotos_urls.length > 0;
            
            return (
              <Card key={atividade.id} className="overflow-hidden">
                {/* Mini Publication Header */}
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {TIPO_ATIVIDADE_LABELS[atividade.tipo]}
                        </CardTitle>
                        {getCredibilidadeBadge(atividade.credibilidade_status)}
                      </div>
                      
                      {atividade.tipo === 'outro' && atividade.tipo_outro_descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {atividade.tipo_outro_descricao}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(atividade.data), "dd 'de' MMMM", { locale: ptBR })}
                          {atividade.data_fim && atividade.data_fim !== atividade.data && (
                            <> - {format(parseISO(atividade.data_fim), "dd 'de' MMMM", { locale: ptBR })}</>
                          )}
                        </span>
                        {atividade.carga_horaria_horas ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {atividade.carga_horaria_horas}h
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {atividade.duracao_minutos} min
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="shrink-0"
                      onClick={() => setExpandedId(isExpanded ? null : atividade.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {/* Image Gallery - Always visible if has photos (mini publication style) */}
                {hasPhotos && (
                  <div className="px-4 pb-2">
                    <AtividadeImageGallery images={atividade.fotos_urls} />
                  </div>
                )}

                {/* Expandable Details */}
                {isExpanded && (
                  <CardContent className="pt-2 pb-4 px-4 border-t">
                    <div className="space-y-3 mt-3">
                      {/* Local */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Local</span>
                          <p className="text-sm text-muted-foreground">{atividade.local_atividade}</p>
                        </div>
                      </div>

                      {/* Profissional */}
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Profissional / Instituição</span>
                          <p className="text-sm text-muted-foreground">{atividade.profissional_instituicao}</p>
                        </div>
                      </div>

                      {/* Torneio (se aplicável) */}
                      {atividade.tipo === 'competicao_torneio' && atividade.torneio_nome && (
                        <div className="flex items-start gap-2">
                          <Trophy className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-sm font-medium">Torneio</span>
                            <p className="text-sm text-muted-foreground">
                              {atividade.torneio_nome}
                              {atividade.torneio_abrangencia && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {ABRANGENCIA_LABELS[atividade.torneio_abrangencia]}
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Objetivos */}
                      {atividade.objetivos && atividade.objetivos.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Objetivos</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {atividade.objetivos.map((obj) => (
                              <Badge key={obj} variant="secondary" className="text-xs capitalize">
                                {obj.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metodologia */}
                      {atividade.metodologia && (
                        <div>
                          <span className="text-sm font-medium">Metodologia</span>
                          <p className="text-sm text-muted-foreground capitalize">
                            {atividade.metodologia.replace(/_/g, ' ')}
                          </p>
                        </div>
                      )}

                      {/* Observações */}
                      {atividade.observacoes && (
                        <div>
                          <span className="text-sm font-medium">Observações</span>
                          <p className="text-sm text-muted-foreground">{atividade.observacoes}</p>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(atividade);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(atividade.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <AtividadeExternaFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        criancaId={criancaId}
        childName={childName}
        editingActivity={editingActivity}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAtividade.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AtividadesExternasTab;
