import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import { PushAutoSubscribe } from '@/components/guardian/PushAutoSubscribe';
import EnrollmentPaymentBlocker from '@/components/guardian/EnrollmentPaymentBlocker';
import { useAuth } from '@/contexts/AuthContext';
import { useGuardianChildren, useGuardianProfile } from '@/hooks/useSchoolData';
import { useGuardianPendingEnrollment } from '@/hooks/useEnrollmentData';

interface MobileGuardianLayoutProps {
  children: ReactNode;
  selectedChildId?: string | null;
  onChildChange?: (childId: string) => void;
}

export function MobileGuardianLayout({ 
  children, 
  selectedChildId,
  onChildChange 
}: MobileGuardianLayoutProps) {
  const { user } = useAuth();
  const { data: childrenData = [] } = useGuardianChildren();
  const { data: guardian } = useGuardianProfile();
  const { data: pendingEnrollments, isLoading: loadingEnrollments } = useGuardianPendingEnrollment();

  const currentChild = selectedChildId 
    ? childrenData.find(c => c.id === selectedChildId) 
    : childrenData[0];

  const handleChildChange = (childId: string) => {
    if (onChildChange) {
      onChildChange(childId);
    }
  };

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
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader 
          children={childrenData}
          currentChild={currentChild || null}
          guardianName={guardian?.nome}
          onChildChange={handleChildChange}
        />
        
        {/* Main content with bottom padding for nav */}
        <main className="flex-1 pb-20 overflow-auto">
          {children}
        </main>

        <MobileBottomNav />

        {/* Auto-subscribe guardian to push notifications */}
        <PushAutoSubscribe />

        {/* Force Password Change Dialog - only shows when NO pending payment */}
        <ForcePasswordChangeDialog open={user?.passwordNeedsChange || false} />
      </div>
    </ThemeProvider>
  );
}
