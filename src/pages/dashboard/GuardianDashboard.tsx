import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useGuardianChildren,
  useGuardianProfile,
  calculateAge,
  isBirthdayToday,
  isBirthdayThisMonth,
} from '@/hooks/useSchoolData';
import { useGuardianNextAulas, useConfirmPresence } from '@/hooks/useGuardianData';
import { useGuardianNextEventos, useConfirmEventoPresence } from '@/hooks/useGuardianEventosData';
import { 
  Users, 
  Calendar,
  Cake,
  Loader2,
  User,
  Trophy,
  History,
  CreditCard,
} from 'lucide-react';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import { toast } from 'sonner';
import AgendaTab from '@/components/guardian/AgendaTab';
import ChildProfileTab from '@/components/guardian/ChildProfileTab';
import IndicarAmigoCard from '@/components/guardian/IndicarAmigoCard';
import DesempenhoTab from '@/components/guardian/DesempenhoTab';
import HistoricoTab from '@/components/guardian/HistoricoTab';
import FinanceiroTab from '@/components/guardian/FinanceiroTab';
import MuralAvisos from '@/components/guardian/MuralAvisos';
import MuralAvisosEscola from '@/components/guardian/MuralAvisosEscola';
import ChildPhotoUpload from '@/components/guardian/ChildPhotoUpload';

const GuardianDashboard = () => {
  const { user } = useAuth();
  const { data: children = [], isLoading: childrenLoading } = useGuardianChildren();
  const { data: guardian, isLoading: guardianLoading } = useGuardianProfile();
  const { data: nextAulas = [], isLoading: aulasLoading } = useGuardianNextAulas();
  const { data: nextEventos = [], isLoading: eventosLoading } = useGuardianNextEventos();
  const confirmPresence = useConfirmPresence();
  const confirmEventoPresence = useConfirmEventoPresence();

  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('agenda');

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
  
  // Set first child as selected when data loads
  const currentChildId = selectedChild || children[0]?.id || null;
  const currentChild = children.find(c => c.id === currentChildId);
  
  // Filter next aulas and eventos for current child
  const childNextAulas = nextAulas.filter(a => a.crianca.id === currentChildId);
  const childNextEventos = nextEventos.filter(e => e.crianca.id === currentChildId);

  const isLoading = childrenLoading || guardianLoading || aulasLoading || eventosLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {guardian?.nome?.split(' ')[0] || user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe seus filhos na escolinha
        </p>
      </div>

      {/* Mural de Avisos do Sistema */}
      <MuralAvisos />

      {/* Mural de Avisos da Escola */}
      <MuralAvisosEscola />

      {/* Children Selection */}
      {children.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {children.map(child => (
            <Button
              key={child.id}
              variant={currentChildId === child.id ? 'default' : 'outline'}
              className="flex items-center gap-2 shrink-0"
              onClick={() => setSelectedChild(child.id)}
            >
              <Avatar className="w-6 h-6">
                {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                <AvatarFallback className="text-xs">{child.nome.charAt(0)}</AvatarFallback>
              </Avatar>
              {child.nome.split(' ')[0]}
            </Button>
          ))}
        </div>
      )}

      {currentChild ? (
        <>
          {/* Child Profile Card - Compact */}
          <Card className={isBirthdayToday(currentChild.data_nascimento) ? 'border-warning/50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ChildPhotoUpload
                    childId={currentChild.id}
                    childName={currentChild.nome}
                    currentPhotoUrl={currentChild.foto_url}
                    size="md"
                  />
                  {isBirthdayToday(currentChild.data_nascimento) && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center animate-bounce-subtle">
                      <Cake className="w-3 h-3 text-warning-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-foreground truncate">{currentChild.nome}</h2>
                  <p className="text-sm text-muted-foreground">{calculateAge(currentChild.data_nascimento)} anos</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {currentChild.turmas.length} turma(s)
                    </Badge>
                    {(isBirthdayToday(currentChild.data_nascimento) || isBirthdayThisMonth(currentChild.data_nascimento)) && (
                      <BirthdayBadge 
                        isToday={isBirthdayToday(currentChild.data_nascimento)} 
                        isThisMonth={isBirthdayThisMonth(currentChild.data_nascimento) && !isBirthdayToday(currentChild.data_nascimento)} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Navigation - Mobile First */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-auto p-1">
              <TabsTrigger 
                value="agenda" 
                className="flex flex-col gap-1 py-2 px-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
              <TabsTrigger 
                value="perfil" 
                className="flex flex-col gap-1 py-2 px-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financeiro" 
                className="flex flex-col gap-1 py-2 px-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Financeiro</span>
              </TabsTrigger>
              <TabsTrigger 
                value="desempenho" 
                className="flex flex-col gap-1 py-2 px-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Desempenho</span>
              </TabsTrigger>
              <TabsTrigger 
                value="historico" 
                className="flex flex-col gap-1 py-2 px-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agenda" className="mt-4">
              <AgendaTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
                childNextAulas={childNextAulas}
                childNextEventos={childNextEventos}
                onConfirmPresence={handleConfirmPresence}
                onConfirmEventoPresence={handleConfirmEventoPresence}
                isConfirming={confirmPresence.isPending || confirmEventoPresence.isPending}
              />
            </TabsContent>

            <TabsContent value="perfil" className="mt-4 space-y-4">
              <ChildProfileTab child={currentChild} />
              <IndicarAmigoCard />
            </TabsContent>

            <TabsContent value="financeiro" className="mt-4">
              <FinanceiroTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
              />
            </TabsContent>

            <TabsContent value="desempenho" className="mt-4">
              <DesempenhoTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
              />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <HistoricoTab 
                criancaId={currentChild.id}
                childName={currentChild.nome}
              />
            </TabsContent>
          </Tabs>
        </>
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
  );
};

export default GuardianDashboard;
