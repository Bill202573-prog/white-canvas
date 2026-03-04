import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SchoolDashboardLayout } from '@/components/layout/SchoolDashboardLayout';
import AdminDashboard from './dashboard/AdminDashboard';
import SchoolDashboard from './dashboard/SchoolDashboard';
import TeacherDashboard from './dashboard/TeacherDashboard';
import ChildrenManagement from './dashboard/school/ChildrenManagement';
import TeachersManagement from './dashboard/school/TeachersManagement';
import ClassesManagement from './dashboard/school/ClassesManagement';
import AulasManagement from './dashboard/school/AulasManagement';
import AmistososManagement from './dashboard/school/AmistososManagement';
import CampeonatosManagement from './dashboard/school/CampeonatosManagement';
import CampeonatoDetailPage from './dashboard/school/CampeonatoDetailPage';
import SalaTrofeusPage from './dashboard/school/SalaTrofeusPage';
import AdminSchoolsPage from './dashboard/admin/AdminSchoolsPage';
import AdminFinanceiroPage from './dashboard/admin/AdminFinanceiroPage';
import SchoolAdminPage from './dashboard/admin/SchoolAdminPage';
import SchoolFinanceiroPage from './dashboard/school/SchoolFinanceiroPage';
import SchoolChamadaPage from './dashboard/school/SchoolChamadaPage';
import DiagnosticoAcessoPage from './dashboard/admin/DiagnosticoAcessoPage';
import ComunicadosManagement from './dashboard/admin/ComunicadosManagement';
import AtividadesExternasAdminPage from './dashboard/admin/AtividadesExternasAdminPage';
import AdminRedeSocialPage from './dashboard/admin/AdminRedeSocialPage';
import ComunicadosEscolaManagement from './dashboard/school/ComunicadosEscolaManagement';
import IndicacoesManagement from './dashboard/school/IndicacoesManagement';
import SchoolLojaPage from './dashboard/school/SchoolLojaPage';
import SchoolPublicProfilePage from './dashboard/school/SchoolPublicProfilePage';
import GuardianInicioPage from './dashboard/guardian/GuardianInicioPage';
import GuardianAgendaPage from './dashboard/guardian/GuardianAgendaPage';
import GuardianPerfilPage from './dashboard/guardian/GuardianPerfilPage';
import GuardianFrequenciaPage from './dashboard/guardian/GuardianFrequenciaPage';
import GuardianFinanceiroPage from './dashboard/guardian/GuardianFinanceiroPage';
import GuardianJornadaPage from './dashboard/guardian/GuardianJornadaPage';
import GuardianConvocacoesPage from './dashboard/guardian/GuardianConvocacoesPage';
import GuardianLojaPage from './dashboard/guardian/GuardianLojaPage';

import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground">
            Sua conta foi criada mas ainda nao foi configurada com um perfil. 
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  // Guardian uses its own layout with sidebar
  if (user.role === 'guardian') {
    const path = location.pathname;
    if (path === '/dashboard/agenda') return <GuardianAgendaPage />;
    if (path === '/dashboard/perfil') return <GuardianPerfilPage />;
    if (path === '/dashboard/frequencia') return <GuardianFrequenciaPage />;
    if (path === '/dashboard/financeiro') return <GuardianFinanceiroPage />;
    if (path === '/dashboard/jornada') return <GuardianJornadaPage />;
    if (path === '/dashboard/convocacoes') return <GuardianConvocacoesPage />;
    if (path === '/dashboard/loja') return <GuardianLojaPage />;
    // Atleta ID agora vive em /atletaid/linkedin (produto separado)
    return <GuardianInicioPage />;
  }

  const renderContent = () => {
    const path = location.pathname;
    
    // Admin-specific routes
    if (user.role === 'admin') {
      if (path === '/dashboard/schools') return <AdminSchoolsPage />;
      if (path === '/dashboard/financeiro') return <AdminFinanceiroPage />;
      if (path === '/dashboard/school-admin') return <SchoolAdminPage />;
      if (path === '/dashboard/diagnostico') return <DiagnosticoAcessoPage />;
      if (path === '/dashboard/comunicados') return <ComunicadosManagement />;
      if (path === '/dashboard/atividades-externas') return <AtividadesExternasAdminPage />;
      if (path === '/dashboard/rede-social') return <AdminRedeSocialPage />;
    }
    
    // School-specific routes
    if (user.role === 'school') {
      if (path === '/dashboard/children') return <ChildrenManagement />;
      if (path === '/dashboard/teachers') return <TeachersManagement />;
      if (path === '/dashboard/classes') return <ClassesManagement />;
      if (path === '/dashboard/aulas') return <AulasManagement />;
      if (path === '/dashboard/chamada') return <SchoolChamadaPage />;
      if (path === '/dashboard/amistosos') return <AmistososManagement />;
      if (path === '/dashboard/campeonatos') return <CampeonatosManagement />;
      if (path.startsWith('/dashboard/campeonatos/')) {
        const campeonatoId = path.split('/dashboard/campeonatos/')[1]?.split('/')[0];
        return <CampeonatoDetailPage campeonatoId={campeonatoId} />;
      }
      if (path === '/dashboard/trofeus') return <SalaTrofeusPage />;
      if (path === '/dashboard/comunicados') return <ComunicadosEscolaManagement />;
      if (path === '/dashboard/indicacoes') return <IndicacoesManagement />;
      if (path === '/dashboard/loja') return <SchoolLojaPage />;
      if (path === '/dashboard/perfil-publico') return <SchoolPublicProfilePage />;
      if (path === '/dashboard/financeiro') return <SchoolFinanceiroPage />;
    }
    
    // Default dashboard by role
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'school':
        return <SchoolDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      default:
        return <Navigate to="/auth" replace />;
    }
  };

  // Use different layouts based on role
  if (user.role === 'school') {
    return (
      <SchoolDashboardLayout>
        {renderContent()}
      </SchoolDashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Dashboard;
