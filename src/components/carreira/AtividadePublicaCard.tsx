import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, Trophy, Dumbbell, GraduationCap, ClipboardCheck, Zap, Pencil, Trash2, Loader2 } from 'lucide-react';
import { AtividadeExternaPublica } from '@/hooks/useCarreiraData';
import { useDeleteAtividadeExterna } from '@/hooks/useAtividadesExternasData';
import { cn } from '@/lib/utils';
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

const TIPO_ICONS: Record<string, React.ReactNode> = {
  'clinica_camp': <GraduationCap className="w-4 h-4" />,
  'treino_tecnico': <Dumbbell className="w-4 h-4" />,
  'treino_fisico': <Zap className="w-4 h-4" />,
  'avaliacao': <ClipboardCheck className="w-4 h-4" />,
  'competicao_torneio': <Trophy className="w-4 h-4" />,
};

const TIPO_LABELS: Record<string, string> = {
  'clinica_camp': 'Clínica / Camp',
  'treino_tecnico': 'Treino Técnico',
  'treino_fisico': 'Treino Físico',
  'avaliacao': 'Avaliação',
  'competicao_torneio': 'Competição / Torneio',
  'outro': 'Atividade',
};

const ABRANGENCIA_LABELS: Record<string, string> = {
  'local': 'Local',
  'regional': 'Regional',
  'estadual': 'Estadual',
  'nacional': 'Nacional',
  'internacional': 'Internacional',
};

interface AtividadePublicaCardProps {
  atividade: AtividadeExternaPublica;
  isOwner?: boolean;
  onEdit?: (atividade: AtividadeExternaPublica) => void;
  accentColor?: string;
}

export function AtividadePublicaCard({ atividade, isOwner = false, onEdit, accentColor = '#3b82f6' }: AtividadePublicaCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteAtividade = useDeleteAtividadeExterna();
  const tipoLabel = atividade.tipo === 'outro' 
    ? atividade.tipo_outro_descricao || 'Atividade' 
    : TIPO_LABELS[atividade.tipo] || atividade.tipo;

  const tipoIcon = TIPO_ICONS[atividade.tipo] || <Trophy className="w-4 h-4" />;

  const formattedDate = format(new Date(atividade.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
  const formattedDateEnd = atividade.data_fim 
    ? format(new Date(atividade.data_fim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
    : null;

  const photos = atividade.fotos_urls || [];

  const handleDelete = async () => {
    try {
      await deleteAtividade.mutateAsync({ id: atividade.id, crianca_id: atividade.crianca_id });
      toast.success('Atividade removida com sucesso');
      setDeleteConfirmOpen(false);
    } catch {
      toast.error('Erro ao remover atividade');
    }
  };

  return (
    <>
      <Card className="overflow-hidden border" style={{ borderColor: `${accentColor}25` }}>
        <CardContent className="pt-4 space-y-3">
          {/* Header with type badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1.5">
              {tipoIcon}
              {tipoLabel}
            </Badge>
            <div className="flex items-center gap-1">
              {atividade.torneio_abrangencia && (
                <Badge variant="outline" className="text-xs">
                  {ABRANGENCIA_LABELS[atividade.torneio_abrangencia] || atividade.torneio_abrangencia}
                </Badge>
              )}
              {isOwner && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(atividade)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Title (for tournaments) */}
          {atividade.torneio_nome && (
            <h3 className="font-semibold text-lg">{atividade.torneio_nome}</h3>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {formattedDate}
                {formattedDateEnd && ` - ${formattedDateEnd}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{atividade.local_atividade}</span>
            </div>
          </div>

          {/* Institution */}
          {atividade.profissional_instituicao && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Realizado por:</span> {atividade.profissional_instituicao}
            </p>
          )}

          {/* Observations */}
          {atividade.observacoes && (
            <p className="text-sm">{atividade.observacoes}</p>
          )}

          {/* Photos Gallery */}
          {photos.length > 0 && (
            <div className={cn(
              'grid gap-2 mt-3',
              photos.length === 1 && 'grid-cols-1',
              photos.length === 2 && 'grid-cols-2',
              photos.length >= 3 && 'grid-cols-3'
            )}>
              {photos.slice(0, 3).map((url, index) => (
                <div 
                  key={index} 
                  className={cn(
                    'relative rounded-lg overflow-hidden bg-muted',
                    photos.length === 1 ? 'aspect-video' : 'aspect-square'
                  )}
                >
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
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
    </>
  );
}
