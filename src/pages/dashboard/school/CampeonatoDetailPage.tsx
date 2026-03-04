import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampeonatoDetail, useDeleteCampeonato } from '@/hooks/useCampeonatosData';
import { useCampeonatoConvocacoes } from '@/hooks/useCampeonatoConvocacoesData';
import { CampeonatoFormDialog } from '@/components/school/CampeonatoFormDialog';
import { CampeonatoConvocacoesSection } from '@/components/school/CampeonatoConvocacoesSection';
import { CampeonatoJogosSection } from '@/components/school/CampeonatoJogosSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  ArrowLeft,
  Trophy,
  Pencil,
  Trash2,
  Loader2,
  Target,
  CheckCircle2,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em Andamento',
  finalizado: 'Finalizado',
};

const STATUS_COLORS: Record<string, string> = {
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  finalizado: 'bg-muted text-muted-foreground border-border',
};

type CampeonatoDetailPageProps = {
  campeonatoId?: string;
};

export default function CampeonatoDetailPage({ campeonatoId }: CampeonatoDetailPageProps) {
  const id = campeonatoId ?? null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: campeonato, isLoading } = useCampeonatoDetail(id);
  const { data: convocacoes } = useCampeonatoConvocacoes(id);
  const deleteCampeonato = useDeleteCampeonato();

  const [campeonatoFormOpen, setCampeonatoFormOpen] = useState(false);
  const [deleteCampeonatoDialogOpen, setDeleteCampeonatoDialogOpen] = useState(false);

  const eventos = campeonato?.eventos || [];

  // Stats
  const stats = useMemo(() => {
    return {
      total: eventos.length,
      agendados: eventos.filter((e) => e.status === 'agendado').length,
      realizados: eventos.filter((e) => e.status === 'realizado' || e.status === 'finalizado').length,
      convocados: convocacoes?.length || 0,
    };
  }, [eventos, convocacoes]);

  // Get list of confirmed athlete IDs (pagos, confirmados or isentos confirmados)
  const atletasConfirmadosIds = useMemo(() => {
    if (!convocacoes) return [];
    return convocacoes
      .filter(c => c.status === 'pago' || c.status === 'confirmado')
      .map(c => c.crianca_id);
  }, [convocacoes]);

  const handleDeleteCampeonato = () => {
    if (eventos.length > 0) {
      toast.error('Não é possível excluir um campeonato com jogos vinculados');
      return;
    }
    setDeleteCampeonatoDialogOpen(true);
  };

  const confirmDeleteCampeonato = async () => {
    if (!campeonato) return;

    try {
      await deleteCampeonato.mutateAsync(campeonato.id);
      toast.success('Campeonato excluído com sucesso!');
      navigate('/dashboard/campeonatos');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir campeonato');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campeonato) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/campeonatos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campeonato não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/campeonatos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{campeonato.nome}</h1>
              <Badge variant="outline" className={STATUS_COLORS[campeonato.status]}>
                {STATUS_LABELS[campeonato.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{campeonato.ano}</Badge>
              {campeonato.categoria && (
                <Badge variant="outline">{campeonato.categoria}</Badge>
              )}
              {campeonato.nome_time && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Time: {campeonato.nome_time}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setCampeonatoFormOpen(true)}>
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Campeonato Info */}
      {campeonato.observacoes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{campeonato.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Jogos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agendados</p>
                <p className="text-2xl font-bold">{stats.agendados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realizados</p>
                <p className="text-2xl font-bold">{stats.realizados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Convocados</p>
                <p className="text-2xl font-bold">{stats.convocados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Convocados Section */}
      {id && campeonato.escolinha_id && (
        <CampeonatoConvocacoesSection
          campeonatoId={id}
          escolinhaId={campeonato.escolinha_id}
          categoria={campeonato.categoria}
          valorCampeonato={(campeonato as any).valor}
        />
      )}

      {/* Jogos Section */}
      {id && campeonato.escolinha_id && (
        <CampeonatoJogosSection
          campeonatoId={id}
          campeonatoNome={campeonato.nome}
          escolinhaId={campeonato.escolinha_id}
          escolaNome={user?.escolinhaNome}
          eventos={eventos}
          atletasConfirmadosIds={atletasConfirmadosIds}
        />
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Excluir Campeonato</p>
              <p className="text-sm text-muted-foreground">
                {eventos.length > 0
                  ? `Este campeonato tem ${eventos.length} jogo(s) vinculado(s). Remova todos os jogos antes de excluir.`
                  : 'Esta ação não pode ser desfeita.'}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteCampeonato}
              disabled={eventos.length > 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campeonato Form Dialog */}
      <CampeonatoFormDialog
        open={campeonatoFormOpen}
        onOpenChange={setCampeonatoFormOpen}
        campeonato={campeonato ? {
          ...campeonato,
          status: campeonato.status as 'em_andamento' | 'finalizado',
        } : undefined}
      />

      {/* Delete Campeonato Confirmation Dialog */}
      <AlertDialog open={deleteCampeonatoDialogOpen} onOpenChange={setDeleteCampeonatoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campeonato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o campeonato "{campeonato.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCampeonato}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampeonato.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
