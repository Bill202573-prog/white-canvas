import { useAuth } from '@/contexts/AuthContext';
import { useGuardianProfile } from '@/hooks/useSchoolData';
import { useGuardianChildren } from '@/hooks/useSchoolData';

/**
 * Feature flag hook for consolidated view
 * Currently enabled only for wnogueira@hotmail.com (for testing)
 * In the future, this can be expanded to all guardians with 2+ children
 */
export const useConsolidatedViewEnabled = () => {
  const { user } = useAuth();
  const { data: guardian } = useGuardianProfile();
  const { data: children = [] } = useGuardianChildren();

  // Feature flag emails - add emails here to enable consolidated view
  const enabledEmails = [
    'wnogueira@hotmail.com',
  ];

  const email = user?.email?.toLowerCase() || guardian?.email?.toLowerCase();
  const isEnabled = email ? enabledEmails.includes(email) : false;

  // Only enable if user has 2+ children (makes no sense for single child)
  const hasMultipleChildren = children.length >= 2;

  return {
    isEnabled: isEnabled && hasMultipleChildren,
    email,
    childCount: children.length,
  };
};
