import { useState } from 'react';
import { 
  useGuardianChildren,
} from '@/hooks/useSchoolData';
import { useGuardianNextAulas, useConfirmPresence } from '@/hooks/useGuardianData';
import { useGuardianNextEventos, useConfirmEventoPresence } from '@/hooks/useGuardianEventosData';
import { useConsolidatedViewEnabled } from '@/hooks/useConsolidatedViewEnabled';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AgendaTab from '@/components/guardian/AgendaTab';
import AgendaConsolidada from '@/components/guardian/AgendaConsolidada';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';

const GuardianAgendaPage = () => {
  const { data: children = [], isLoading: childrenLoading } = useGuardianChildren();
  const { data: nextAulas = [], isLoading: aulasLoading } = useGuardianNextAulas();
  const { data: nextEventos = [], isLoading: eventosLoading } = useGuardianNextEventos();
  const confirmPresence = useConfirmPresence();
  const confirmEventoPresence = useConfirmEventoPresence();
  const { isEnabled: isConsolidatedView } = useConsolidatedViewEnabled();

  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const handleConfirmPresence = async (aulaId: string, criancaId: string, confirmar: boolean) => {
    try {
      await confirmPresence.mutateAsync({ aulaId, criancaId, confirmar });
      toast.success(confirmar ? 'Presença confirmada!' : 'Ausência registrada');
    } catch (error) {
      toast.error('Erro ao registrar presença');
    }
  };

  const handleConfirmEventoPresence = async (eventoId: string, criancaId: string, timeId: string, confirmar: boolean) => {
    try {
      await confirmEventoPresence.mutateAsync({ eventoId, criancaId, timeId, confirmar });
      toast.success(confirmar ? 'Presença no evento confirmada!' : 'Ausência no evento registrada');
    } catch (error) {
      toast.error('Erro ao registrar presença no evento');
    }
  };

  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);

  // For consolidated view, don't filter by child
  const childNextAulas = isConsolidatedView ? nextAulas : nextAulas.filter(a => a.crianca.id === currentChildId);
  const childNextEventos = isConsolidatedView ? nextEventos : nextEventos.filter(e => e.crianca.id === currentChildId);

  const isLoading = childrenLoading || aulasLoading || eventosLoading;

  if (isLoading) {
    return (
      <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileGuardianLayout>
    );
  }

  return (
    <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
      <div className="p-4 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">
            {isConsolidatedView ? 'Todos os compromissos' : 'Próximos compromissos'}
          </p>
        </div>

        {isConsolidatedView ? (
          <AgendaConsolidada
            allAulas={nextAulas}
            allEventos={nextEventos}
            onConfirmPresence={handleConfirmPresence}
            onConfirmEventoPresence={handleConfirmEventoPresence}
            isConfirming={confirmPresence.isPending || confirmEventoPresence.isPending}
          />
        ) : (
          currentChild && (
            <AgendaTab 
              criancaId={currentChild.id}
              childName={currentChild.nome}
              childNextAulas={childNextAulas}
              childNextEventos={childNextEventos}
              onConfirmPresence={handleConfirmPresence}
              onConfirmEventoPresence={handleConfirmEventoPresence}
              isConfirming={confirmPresence.isPending || confirmEventoPresence.isPending}
            />
          )
        )}
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianAgendaPage;
