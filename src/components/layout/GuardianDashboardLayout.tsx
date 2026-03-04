import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { GuardianSidebar } from './GuardianSidebar';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import EnrollmentPaymentBlocker from '@/components/guardian/EnrollmentPaymentBlocker';
import { useGuardianChildren, useGuardianProfile } from '@/hooks/useSchoolData';
import { useGuardianPendingEnrollment } from '@/hooks/useEnrollmentData';
import { useUnreadComunicados } from '@/hooks/useUnreadComunicados';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface GuardianDashboardLayoutProps {
  children: ReactNode;
  selectedChildId?: string | null;
}

export function GuardianDashboardLayout({ children, selectedChildId }: GuardianDashboardLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: childrenData = [] } = useGuardianChildren();
  const { data: guardian } = useGuardianProfile();
  const { data: pendingEnrollments, isLoading: loadingEnrollments } = useGuardianPendingEnrollment();
  const { hasUnread, unreadCount } = useUnreadComunicados();

  // Get the current selected child
  const currentChild = selectedChildId 
    ? childrenData.find(c => c.id === selectedChildId) 
    : childrenData[0];

  // SECURITY: Always check pending enrollments FIRST - block everything while loading or if pending
  // This prevents password change dialog from appearing before we know if there's a pending payment
  if (loadingEnrollments) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <EnrollmentPaymentBlocker>
          {children}
        </EnrollmentPaymentBlocker>
      </ThemeProvider>
    );
  }

  const hasPendingPayment = pendingEnrollments && pendingEnrollments.length > 0;

  // If there's a pending payment, show the blocker instead of the normal layout
  // This takes priority over everything, including password change
  if (hasPendingPayment) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <EnrollmentPaymentBlocker>
          {children}
        </EnrollmentPaymentBlocker>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <GuardianSidebar 
            child={currentChild || null}
            guardianName={guardian?.nome}
          />
          
          <SidebarInset className="flex flex-col flex-1">
            {/* Top bar with sidebar trigger */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-primary px-4">
              <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10" />
              <div className="flex-1" />
              
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                className="relative text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate('/dashboard/inicio')}
                title="Mensagens"
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </header>

            {/* Main content */}
            <main className="flex-1 p-4 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </div>

        {/* Force Password Change Dialog - only shows when NO pending payment */}
        <ForcePasswordChangeDialog open={user?.passwordNeedsChange || false} />
      </SidebarProvider>
    </ThemeProvider>
  );
}
