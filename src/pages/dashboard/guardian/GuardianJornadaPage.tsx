import { useState } from 'react';
import { useGuardianChildren } from '@/hooks/useSchoolData';
import { useHasAtividadesExternasAccess } from '@/hooks/useAtividadesExternasData';
import { Loader2, BarChart3, History, Footprints } from 'lucide-react';
import DesempenhoTab from '@/components/guardian/DesempenhoTab';
import HistoricoTab from '@/components/guardian/HistoricoTab';
import AtividadesExternasTab from '@/components/guardian/AtividadesExternasTab';
import { MobileGuardianLayout } from '@/components/layout/MobileGuardianLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GuardianJornadaPage = () => {
  const { data: children = [], isLoading } = useGuardianChildren();
  const { data: hasExternalAccess, isLoading: accessLoading } = useHasAtividadesExternasAccess();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('desempenho');

  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);

  if (isLoading || accessLoading) {
    return (
      <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileGuardianLayout>
    );
  }

  // Define tabs baseado no acesso do usuário
  const showExternalTab = hasExternalAccess === true;

  return (
    <MobileGuardianLayout selectedChildId={currentChildId} onChildChange={setSelectedChild}>
      <div className="p-4 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Jornada</h1>
          <p className="text-muted-foreground">
            Desempenho e histórico
          </p>
        </div>

        {currentChild && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full h-12 mb-4 ${showExternalTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="desempenho" className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Desempenho</span>
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2 text-sm">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
              {showExternalTab && (
                <TabsTrigger value="externas" className="flex items-center gap-2 text-sm">
                  <Footprints className="w-4 h-4" />
                  <span className="hidden sm:inline">Externas</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="desempenho">
              <DesempenhoTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
              />
            </TabsContent>
            
            <TabsContent value="historico">
              <HistoricoTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
              />
            </TabsContent>

            {showExternalTab && (
              <TabsContent value="externas">
                <AtividadesExternasTab
                  criancaId={currentChild.id}
                  childName={currentChild.nome}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </MobileGuardianLayout>
  );
};

export default GuardianJornadaPage;
