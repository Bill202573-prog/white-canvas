import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  GraduationCap, 
  Calendar,
  BookOpen,
  DollarSign,
  School,
  ClipboardCheck,
} from 'lucide-react';
import ChildrenManagement from '@/pages/dashboard/school/ChildrenManagement';
import TeachersManagement from '@/pages/dashboard/school/TeachersManagement';
import ClassesManagement from '@/pages/dashboard/school/ClassesManagement';
import AulasManagement from '@/pages/dashboard/school/AulasManagement';
import SchoolFinanceiroPage from '@/pages/dashboard/school/SchoolFinanceiroPage';
import AdminChamadaTab from '@/components/admin/AdminChamadaTab';
import { supabase } from '@/integrations/supabase/client';
import { StudentRegistrationProvider, useStudentRegistration } from '@/contexts/StudentRegistrationContext';
import AlunoFichaDialog from '@/components/school/AlunoFichaDialog';
import DraftManagerDialog from '@/components/school/DraftManagerDialog';

const SchoolAdminPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get escolinhaId from URL query param (persisted) or location state (navigation)
  const queryEscolinhaId = searchParams.get('escolinhaId');
  const stateData = location.state as { escolinhaId: string; escolinhaNome: string } | undefined;
  const escolinhaId = queryEscolinhaId || stateData?.escolinhaId;
  
  const [escolinhaNome, setEscolinhaNome] = useState(stateData?.escolinhaNome || '');
  const [activeTab, setActiveTab] = useState('children');

  // Fetch school name if not in state (e.g., page was refreshed)
  useEffect(() => {
    if (escolinhaId && !escolinhaNome) {
      supabase
        .from('escolinhas')
        .select('nome')
        .eq('id', escolinhaId)
        .single()
        .then(({ data }) => {
          if (data) setEscolinhaNome(data.nome);
        });
    }
  }, [escolinhaId, escolinhaNome]);

  if (!escolinhaId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">Nenhuma escolinha selecionada.</p>
        <Button onClick={() => navigate('/dashboard/schools')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Escolinhas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/schools')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <School className="w-6 h-6 text-primary" />
            {escolinhaNome || 'Escolinha'}
          </h1>
          <p className="text-muted-foreground">
            Gerenciando como administrador do sistema
          </p>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="children" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Alunos</span>
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Professores</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Turmas</span>
          </TabsTrigger>
          <TabsTrigger value="aulas" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Aulas</span>
          </TabsTrigger>
          <TabsTrigger value="chamada" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Chamada</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children">
          <AdminSchoolContextWrapper escolinhaId={escolinhaId}>
            <ChildrenManagement />
          </AdminSchoolContextWrapper>
        </TabsContent>
        
        <TabsContent value="teachers">
          <AdminSchoolContextWrapper escolinhaId={escolinhaId}>
            <TeachersManagement />
          </AdminSchoolContextWrapper>
        </TabsContent>
        
        <TabsContent value="classes">
          <AdminSchoolContextWrapper escolinhaId={escolinhaId}>
            <ClassesManagement />
          </AdminSchoolContextWrapper>
        </TabsContent>
        
        <TabsContent value="aulas">
          <AdminSchoolContextWrapper escolinhaId={escolinhaId}>
            <AulasManagement />
          </AdminSchoolContextWrapper>
        </TabsContent>
        
        <TabsContent value="chamada">
          <AdminChamadaTab />
        </TabsContent>
        
        <TabsContent value="financeiro">
          <AdminSchoolContextWrapper escolinhaId={escolinhaId}>
            <SchoolFinanceiroPage />
          </AdminSchoolContextWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Context wrapper to pass escolinhaId to child components
// Includes StudentRegistrationProvider for the global modal to work
const AdminSchoolContextWrapper = ({ 
  escolinhaId, 
  children 
}: { 
  escolinhaId: string; 
  children: React.ReactNode;
}) => {
  return (
    <StudentRegistrationProvider defaultEscolinhaId={escolinhaId}>
      <div className="space-y-4">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600">
              <strong>Modo Admin:</strong> Você está visualizando esta escolinha como administrador do sistema. 
              Escolinha ID: <code className="bg-amber-500/20 px-1 rounded">{escolinhaId}</code>
            </p>
          </CardContent>
        </Card>
        {children}
        {/* Global modal for admin context */}
        <AdminStudentDialog escolinhaId={escolinhaId} />
      </div>
    </StudentRegistrationProvider>
  );
};

// Render the dialogs using context
const AdminStudentDialog = ({ escolinhaId }: { escolinhaId: string }) => {
  const queryClient = useQueryClient();
  const { 
    isOpen, 
    studentToEdit, 
    isCreating, 
    initialDraft,
    initialTab,
    showDraftManager,
    closeDialog,
    closeDraftManager,
    openStudentDialogWithDraft,
    openStudentDialogNew
  } = useStudentRegistration();

  // Handle dialog close with data refresh
  const handleDialogClose = useCallback(() => {
    closeDialog();
    // Invalidate queries to refresh data after closing the dialog
    queryClient.invalidateQueries({ queryKey: ['school-children'] });
    queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
  }, [closeDialog, queryClient]);
  
  return (
    <>
      <DraftManagerDialog
        open={showDraftManager}
        onOpenChange={(open) => !open && closeDraftManager()}
        escolinhaId={escolinhaId}
        onSelectDraft={openStudentDialogWithDraft}
        onNewStudent={openStudentDialogNew}
      />
      <AlunoFichaDialog
        open={isOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
        student={studentToEdit}
        escolinhaId={escolinhaId}
        isCreating={isCreating}
        initialDraft={initialDraft}
        initialTab={initialTab}
      />
    </>
  );
};

export default SchoolAdminPage;
