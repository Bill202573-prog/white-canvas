import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  useGuardianChildren,
} from '@/hooks/useSchoolData';
import { useConsolidatedViewEnabled } from '@/hooks/useConsolidatedViewEnabled';
import { 
  Users, 
  Loader2,
} from 'lucide-react';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';
import MuralAvisosEscolaInicio from '@/components/guardian/MuralAvisosEscolaInicio';
import MuralConsolidado from '@/components/guardian/MuralConsolidado';
import EnrollmentPaymentPopup from '@/components/guardian/EnrollmentPaymentPopup';

import PwaInstallBanner from '@/components/shared/PwaInstallBanner';

const GuardianInicioPage = () => {
  const { data: children = [], isLoading: childrenLoading, refetch } = useGuardianChildren();
  const { isEnabled: isConsolidatedView } = useConsolidatedViewEnabled();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);

  if (childrenLoading) {
    return (
      <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileGuardianLayout>
    );
  }

  const hasChildren = children.length > 0;

  return (
    <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
      {/* Enrollment Payment Popup - shows when there's a pending enrollment */}
      <EnrollmentPaymentPopup onPaymentComplete={() => refetch()} />
      
      <div className="p-4 space-y-4 animate-fade-in">
        {/* PWA Install Banner */}
        <PwaInstallBanner />

        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá!</h1>
          <p className="text-muted-foreground">
            Acompanhe os avisos da escola
          </p>
        </div>

        {hasChildren ? (
          isConsolidatedView ? (
            <MuralConsolidado 
              children={children.map(c => ({
                id: c.id,
                nome: c.nome,
                foto_url: c.foto_url,
              }))}
            />
          ) : (
            <MuralAvisosEscolaInicio />
          )
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Nenhuma criança vinculada</h3>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a escolinha para vincular seus filhos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianInicioPage;
