import { useState } from 'react';
import { useGuardianChildren } from '@/hooks/useSchoolData';
import { Loader2 } from 'lucide-react';
import ChildProfileTab from '@/components/guardian/ChildProfileTab';
import IndicarAmigoCard from '@/components/guardian/IndicarAmigoCard';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';

const GuardianPerfilPage = () => {
  const { data: children = [], isLoading } = useGuardianChildren();
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
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <p className="text-muted-foreground">
            Informações do atleta
          </p>
        </div>

        {/* Indicar amigos - deve aparecer logo no início (sem precisar rolar) */}
        <div className="mb-4">
          <IndicarAmigoCard />
        </div>

        {currentChild && <ChildProfileTab child={currentChild} />}
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianPerfilPage;
