import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';
import { ConvocacoesAmistososTab } from '@/components/guardian/ConvocacoesAmistososTab';
import { useState } from 'react';
import { useGuardianChildren } from '@/hooks/useSchoolData';

const GuardianConvocacoesPage = () => {
  const { data: children = [] } = useGuardianChildren();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const currentChildId = selectedChild || children[0]?.id || null;

  return (
    <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
      <div className="p-4 space-y-4 animate-fade-in pb-20">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convocações</h1>
          <p className="text-muted-foreground">
            Amistosos e campeonatos com participação do seu filho
          </p>
        </div>

        <ConvocacoesAmistososTab />
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianConvocacoesPage;
