import { useState } from 'react';
import { useGuardianChildren } from '@/hooks/useSchoolData';
import { useConsolidatedViewEnabled } from '@/hooks/useConsolidatedViewEnabled';
import { Loader2 } from 'lucide-react';
import FinanceiroTab from '@/components/guardian/FinanceiroTab';
import FinanceiroConsolidado from '@/components/guardian/FinanceiroConsolidado';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';

const GuardianFinanceiroPage = () => {
  const { data: children = [], isLoading } = useGuardianChildren();
  const { isEnabled: isConsolidatedView } = useConsolidatedViewEnabled();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);

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
          <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground">
            {isConsolidatedView ? 'Todas as cobranças' : 'Mensalidades e histórico'}
          </p>
        </div>

        {isConsolidatedView ? (
          <FinanceiroConsolidado 
            children={children.map(c => ({
              id: c.id,
              nome: c.nome,
              foto_url: c.foto_url,
            }))}
          />
        ) : (
          currentChild && (
            <FinanceiroTab 
              criancaId={currentChild.id}
              childName={currentChild.nome}
            />
          )
        )}
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianFinanceiroPage;
