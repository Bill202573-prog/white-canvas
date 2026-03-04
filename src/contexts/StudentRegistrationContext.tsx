import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CriancaWithRelations } from '@/hooks/useSchoolData';
import { DraftData, getDraftsIndex } from '@/components/school/DraftManagerDialog';

interface StudentRegistrationContextType {
  // Dialog state
  isOpen: boolean;
  studentToEdit: CriancaWithRelations | null;
  isCreating: boolean;
  escolinhaId: string | null;
  initialDraft: DraftData | null;
  initialTab: string | null;
  
  // Draft manager state
  showDraftManager: boolean;
  
  // Actions
  openCreateDialog: (escolinhaId?: string) => void;
  openEditDialog: (student: CriancaWithRelations, escolinhaId?: string, initialTab?: string) => void;
  closeDialog: () => void;
  closeDraftManager: () => void;
  openStudentDialogWithDraft: (draft: DraftData) => void;
  openStudentDialogNew: () => void;
}

const StudentRegistrationContext = createContext<StudentRegistrationContextType | null>(null);

export function StudentRegistrationProvider({ children, defaultEscolinhaId }: { children: ReactNode; defaultEscolinhaId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<CriancaWithRelations | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [escolinhaId, setEscolinhaId] = useState<string | null>(defaultEscolinhaId || null);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [initialDraft, setInitialDraft] = useState<DraftData | null>(null);
  const [initialTab, setInitialTab] = useState<string | null>(null);

  const openCreateDialog = useCallback((escId?: string) => {
    const effectiveEscolinhaId = escId || defaultEscolinhaId || '';
    setEscolinhaId(effectiveEscolinhaId);
    
    // Check if there are any existing drafts
    const drafts = getDraftsIndex(effectiveEscolinhaId);
    
    if (drafts.length > 0) {
      // Show draft manager to let user choose
      setShowDraftManager(true);
    } else {
      // No drafts, open dialog directly for new student
      setStudentToEdit(null);
      setIsCreating(true);
      setInitialDraft(null);
      setIsOpen(true);
    }
  }, [defaultEscolinhaId]);

  const openEditDialog = useCallback((student: CriancaWithRelations, escId?: string, tab?: string) => {
    setStudentToEdit(student);
    setIsCreating(false);
    setEscolinhaId(escId || defaultEscolinhaId || null);
    setInitialDraft(null);
    setInitialTab(tab || null);
    setIsOpen(true);
  }, [defaultEscolinhaId]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // Don't clear student immediately to allow exit animations
    setTimeout(() => {
      setStudentToEdit(null);
      setIsCreating(false);
      setInitialDraft(null);
      setInitialTab(null);
    }, 300);
  }, []);

  const closeDraftManager = useCallback(() => {
    setShowDraftManager(false);
  }, []);

  const openStudentDialogWithDraft = useCallback((draft: DraftData) => {
    setShowDraftManager(false);
    setStudentToEdit(null);
    setIsCreating(true);
    setInitialDraft(draft);
    setIsOpen(true);
  }, []);

  const openStudentDialogNew = useCallback(() => {
    setShowDraftManager(false);
    setStudentToEdit(null);
    setIsCreating(true);
    setInitialDraft(null);
    setIsOpen(true);
  }, []);

  return (
    <StudentRegistrationContext.Provider
      value={{
        isOpen,
        studentToEdit,
        isCreating,
        escolinhaId,
        initialDraft,
        initialTab,
        showDraftManager,
        openCreateDialog,
        openEditDialog,
        closeDialog,
        closeDraftManager,
        openStudentDialogWithDraft,
        openStudentDialogNew,
      }}
    >
      {children}
    </StudentRegistrationContext.Provider>
  );
}

export function useStudentRegistration() {
  const context = useContext(StudentRegistrationContext);
  if (!context) {
    throw new Error('useStudentRegistration must be used within StudentRegistrationProvider');
  }
  return context;
}
