import { ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { SchoolSidebar } from './SchoolSidebar';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import { FinancialStatusBanner } from '@/components/school/FinancialStatusBanner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudentRegistrationProvider, useStudentRegistration } from '@/contexts/StudentRegistrationContext';
import AlunoFichaDialog from '@/components/school/AlunoFichaDialog';
import DraftManagerDialog from '@/components/school/DraftManagerDialog';

interface SchoolDashboardLayoutProps {
  children: ReactNode;
}

// Inner component that uses the context
function SchoolDashboardLayoutInner({ children }: SchoolDashboardLayoutProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    isOpen, 
    studentToEdit, 
    isCreating, 
    escolinhaId, 
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

  // Fetch school's financial status with reasonable stale time
  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-financial-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('status_financeiro_escola')
        .eq('admin_user_id', user?.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - status doesn't change frequently
  });

  const effectiveEscolinhaId = escolinhaId || user?.escolinhaId || '';

  return (
    <>
      <div className="min-h-screen flex w-full bg-background">
        <SchoolSidebar />
        
        <SidebarInset className="flex flex-col">
          {/* Financial status banner - fixed at top */}
          {escolinha?.status_financeiro_escola && (
            <FinancialStatusBanner statusFinanceiroEscola={escolinha.status_financeiro_escola} />
          )}

          {/* Top bar with sidebar trigger */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Force Password Change Dialog */}
      <ForcePasswordChangeDialog open={user?.passwordNeedsChange || false} />

      {/* Draft Manager Dialog - for selecting existing drafts */}
      <DraftManagerDialog
        open={showDraftManager}
        onOpenChange={(open) => !open && closeDraftManager()}
        escolinhaId={effectiveEscolinhaId}
        onSelectDraft={openStudentDialogWithDraft}
        onNewStudent={openStudentDialogNew}
      />

      {/* Global Student Registration Dialog - persists across navigation */}
      <AlunoFichaDialog
        open={isOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
        student={studentToEdit}
        escolinhaId={effectiveEscolinhaId}
        isCreating={isCreating}
        initialDraft={initialDraft}
        initialTab={initialTab}
      />
    </>
  );
}

export function SchoolDashboardLayout({ children }: SchoolDashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider defaultOpen={true}>
        <StudentRegistrationProvider defaultEscolinhaId={user?.escolinhaId}>
          <SchoolDashboardLayoutInner>{children}</SchoolDashboardLayoutInner>
        </StudentRegistrationProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
