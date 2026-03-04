import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  MapPin,
  Users,
  Trophy,
  CreditCard,
  Clock,
  Check,
  AlertCircle,
  Copy,
  Edit2,
  Save,
  X,
  Loader2,
  Plus,
  School,
  QrCode,
  GraduationCap,
  Send
} from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import AlunoHistoricoSection from './AlunoHistoricoSection';
import AlunoAulasSection from './AlunoAulasSection';
import SchoolChildPhotoUpload from './SchoolChildPhotoUpload';
import NewStudentPhotoUpload from './NewStudentPhotoUpload';
import FinanceiroHistoricoUnificado from '@/components/shared/FinanceiroHistoricoUnificado';
import GuardianEditCard, { type GuardianData } from './GuardianEditCard';
import { validateCPF } from '@/lib/cpf-validator';
import EnrollmentPixCheckoutDialog from './EnrollmentPixCheckoutDialog';
import ExistingGuardianDetector from './ExistingGuardianDetector';
import { ExistingGuardian } from '@/hooks/useExistingGuardianLookup';
import GenerateIndividualBillingDialog from './GenerateIndividualBillingDialog';
import { useChildEnrollmentCharge, useRegisterStudentInitial, useSendGuardianCredentials, useGenerateEnrollmentPix, useCheckEnrollmentPayment, useCancelEnrollmentCharge } from '@/hooks/useEnrollmentData';
import {
  calculateAge,
  isBirthdayToday,
  isBirthdayThisMonth,
  useUpdateCrianca,
  useSchoolTurmas,
  useAddCriancaToTurma,
  type CriancaWithRelations,
  type Crianca
} from '@/hooks/useSchoolData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface AlunoFichaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: CriancaWithRelations | null;
  escolinhaId?: string;
  isCreating?: boolean;
  initialDraft?: DraftData | null;
  initialTab?: string | null;
}

// CPF formatting
const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Phone formatting
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// CEP formatting
const formatCep = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

import { 
  saveDraft as saveDraftToStorage, 
  loadDraft as loadDraftFromStorage, 
  deleteDraft, 
  generateDraftId,
  type DraftData 
} from './DraftManagerDialog';

const AlunoFichaDialog = ({ open, onOpenChange, student, escolinhaId: propEscolinhaId, isCreating = false, initialDraft, initialTab: propInitialTab }: AlunoFichaDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStudent = useUpdateCrianca();
  const { data: turmas } = useSchoolTurmas(propEscolinhaId);
  const addToTurma = useAddCriancaToTurma();
  
  // Get effective escolinha ID
  const effectiveEscolinhaId = propEscolinhaId || user?.escolinhaId;
  
  // Enrollment charge data - for saved students
  const [savedStudentId, setSavedStudentId] = useState<string | null>(null);
  const [savedResponsavelId, setSavedResponsavelId] = useState<string | null>(null);
  
  const { data: enrollmentCharge, refetch: refetchEnrollmentCharge } = useChildEnrollmentCharge(
    student?.id || savedStudentId || undefined, 
    effectiveEscolinhaId
  );
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('resumo');
  const [isEditing, setIsEditing] = useState(isCreating);
  
  // Student fields
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [cpf, setCpf] = useState('');
  
  // Financial fields
  const [valorMensalidade, setValorMensalidade] = useState('170');
  const [diaVencimento, setDiaVencimento] = useState('8');
  const [formaCobranca, setFormaCobranca] = useState<'mensal'>('mensal');
  const [dataInicioCobranca, setDataInicioCobranca] = useState('');
  const [statusFinanceiro, setStatusFinanceiro] = useState<'ativo' | 'suspenso' | 'isento'>('ativo');
  
  // Enrollment values (for new students)
  const [valorMatricula, setValorMatricula] = useState('100');
  const [valorUniforme, setValorUniforme] = useState('0');
  
  // Guardian fields (for new students)
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelEmail, setResponsavelEmail] = useState('');
  const [responsavelEmailConfirm, setResponsavelEmailConfirm] = useState('');
  const [responsavelTelefone, setResponsavelTelefone] = useState('');
  const [responsavelCpf, setResponsavelCpf] = useState('');
  const [parentesco, setParentesco] = useState('');
  
  // Address fields
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Guardian data for display
  const [guardianData, setGuardianData] = useState<GuardianData | null>(null);
  const [loadingGuardian, setLoadingGuardian] = useState(false);
  
  // Turma and categoria selection
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('Futebol de Campo');
  
  // Result state
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // New student registration state - flow tracking
  const [resumoSaved, setResumoSaved] = useState(false);
  const [enderecoSaved, setEnderecoSaved] = useState(false);
  const [financeiroSaved, setFinanceiroSaved] = useState(false);
  const [cobrancaGerada, setCobrancaGerada] = useState(false);
  const [credentiaisEnviadas, setCredenciaisEnviadas] = useState(false);
  const [isMigration, setIsMigration] = useState(false); // Migration mode - skip enrollment charge
  
  // Existing guardian detection state
  const [existingGuardian, setExistingGuardian] = useState<ExistingGuardian | null>(null);
  const [usingExistingGuardian, setUsingExistingGuardian] = useState(false);
  
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [generatingCharge, setGeneratingCharge] = useState(false);
  const [cancellingCharge, setCancellingCharge] = useState(false);
  
  // Individual billing dialog state
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [generatingBilling, setGeneratingBilling] = useState(false);
  
  // Close confirmation dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  
  // Draft management - unique ID for each new registration
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  // Check if form has unsaved data (for new students only)
  const hasUnsavedData = useCallback(() => {
    if (student) return false; // Don't persist for existing students
    return nome.trim() !== '' || responsavelNome.trim() !== '' || responsavelEmail.trim() !== '';
  }, [student, nome, responsavelNome, responsavelEmail]);
  
  // Save draft to localStorage with unique ID
  const saveDraft = useCallback(() => {
    if (student || !effectiveEscolinhaId) return; // Don't save draft for existing students
    
    const draftId = currentDraftId || generateDraftId();
    if (!currentDraftId) {
      setCurrentDraftId(draftId);
    }
    
    const draft: DraftData = {
      id: draftId,
      escolinhaId: effectiveEscolinhaId,
      nome,
      dataNascimento,
      cpf,
      valorMensalidade,
      diaVencimento,
      formaCobranca,
      dataInicioCobranca,
      statusFinanceiro,
      valorMatricula,
      valorUniforme,
      responsavelNome,
      responsavelEmail,
      responsavelEmailConfirm,
      responsavelTelefone,
      responsavelCpf,
      parentesco,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      selectedTurmaId,
      categoria,
      activeTab,
      savedStudentId,
      savedResponsavelId,
      resumoSaved,
      enderecoSaved,
      financeiroSaved,
      cobrancaGerada,
      credentiaisEnviadas,
      isMigration,
      timestamp: Date.now(),
    };
    
    saveDraftToStorage(draft);
  }, [
    student, effectiveEscolinhaId, currentDraftId, nome, dataNascimento, cpf, valorMensalidade, diaVencimento, formaCobranca,
    dataInicioCobranca, statusFinanceiro, valorMatricula, valorUniforme, responsavelNome,
    responsavelEmail, responsavelEmailConfirm, responsavelTelefone, responsavelCpf, parentesco,
    cep, rua, numero, complemento, bairro, cidade, estado, selectedTurmaId, activeTab,
    savedStudentId, savedResponsavelId, resumoSaved, enderecoSaved, financeiroSaved,
    cobrancaGerada, credentiaisEnviadas, isMigration
  ]);
  
  // Clear current draft from localStorage
  const clearDraft = useCallback(() => {
    if (currentDraftId) {
      deleteDraft(currentDraftId);
      setCurrentDraftId(null);
    }
  }, [currentDraftId]);
  
  // Auto-save draft when form changes (for new students)
  useEffect(() => {
    if (open && !student && hasUnsavedData()) {
      saveDraft();
    }
  }, [open, student, hasUnsavedData, saveDraft]);
  
  // Handle dialog close with confirmation
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && !student && hasUnsavedData() && !credentiaisEnviadas) {
      setShowCloseConfirm(true);
      setPendingClose(true);
    } else {
      if (!newOpen && credentiaisEnviadas) {
        clearDraft(); // Clear draft when enrollment is complete
      }
      onOpenChange(newOpen);
    }
  }, [student, hasUnsavedData, credentiaisEnviadas, onOpenChange, clearDraft]);
  
  // Confirm close without saving
  const confirmClose = useCallback(() => {
    clearDraft();
    setShowCloseConfirm(false);
    setPendingClose(false);
    onOpenChange(false);
  }, [clearDraft, onOpenChange]);
  
  // Cancel close
  const cancelClose = useCallback(() => {
    setShowCloseConfirm(false);
    setPendingClose(false);
  }, []);

  // Fetch guardian data when viewing/editing an existing student
  useEffect(() => {
    const fetchGuardianData = async () => {
      if (!open || !student) {
        setGuardianData(null);
        return;
      }
      
      setLoadingGuardian(true);
      try {
        const { data: links, error: linkError } = await supabase
          .from('crianca_responsavel')
          .select('responsavel_id, parentesco')
          .eq('crianca_id', student.id)
          .limit(1);
        
        if (linkError || !links || links.length === 0) {
          setGuardianData(null);
          setLoadingGuardian(false);
          return;
        }
        
        setParentesco(links[0].parentesco || '');
        setSavedResponsavelId(links[0].responsavel_id); // Set responsavel ID for credential sending
        
        const { data: responsavel, error: respError } = await supabase
          .from('responsaveis')
          .select('id, nome, email, telefone, cpf, user_id, senha_temporaria, senha_temporaria_ativa, cep, rua, numero, complemento, bairro, cidade, estado')
          .eq('id', links[0].responsavel_id)
          .single();
        
        if (respError || !responsavel) {
          setGuardianData(null);
        } else {
          setGuardianData({
            id: responsavel.id,
            nome: responsavel.nome,
            email: responsavel.email,
            telefone: responsavel.telefone,
            cpf: responsavel.cpf,
            senha_temporaria: responsavel.senha_temporaria,
            senha_temporaria_ativa: responsavel.senha_temporaria_ativa,
            cep: responsavel.cep,
            rua: responsavel.rua,
            numero: responsavel.numero,
            complemento: responsavel.complemento,
            bairro: responsavel.bairro,
            cidade: responsavel.cidade,
            estado: responsavel.estado,
          });
          // Pre-fill address fields for editing
          setCep(responsavel.cep || '');
          setRua(responsavel.rua || '');
          setNumero(responsavel.numero || '');
          setComplemento(responsavel.complemento || '');
          setBairro(responsavel.bairro || '');
          setCidade(responsavel.cidade || '');
          setEstado(responsavel.estado || '');
          
          // Check if guardian has credentials (user_id is set and not null)
          // If user_id is null, credentials were not sent yet
          const hasCredentials = !!responsavel.user_id;
          setCredenciaisEnviadas(hasCredentials);
          
          // Check if active enrollment charge exists (not cancelled)
          const { data: cobranca } = await supabase
            .from('cobrancas_entrada')
            .select('id, status')
            .eq('crianca_id', student.id)
            .eq('escolinha_id', effectiveEscolinhaId)
            .neq('status', 'cancelado')
            .maybeSingle();
          
          setCobrancaGerada(!!cobranca && (cobranca.status === 'pendente' || cobranca.status === 'pago'));
        }
      } catch {
        setGuardianData(null);
      } finally {
        setLoadingGuardian(false);
      }
    };
    
    fetchGuardianData();
  }, [open, student, effectiveEscolinhaId]);

  // Reset form when dialog opens/closes or student changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (open && student) {
      setNome(student.nome || '');
      setDataNascimento(student.data_nascimento || '');
      setFotoUrl(student.foto_url || '');
      setCpf('');
      setValorMensalidade(String(student.valor_mensalidade ?? 170));
      setDiaVencimento(String(student.dia_vencimento ?? 8));
      setFormaCobranca('mensal');
      setDataInicioCobranca(student.data_inicio_cobranca || today);
      setStatusFinanceiro((student.status_financeiro as 'ativo' | 'suspenso' | 'isento') || 'ativo');
      setResponsavelNome('');
      setResponsavelEmail('');
      setResponsavelEmailConfirm('');
      setResponsavelTelefone('');
      setResponsavelCpf('');
      setSelectedTurmaId('');
      setIsEditing(false);
      setActiveTab(propInitialTab || 'resumo');
      // Reset flow states for existing student - will be updated by guardian data check
      setResumoSaved(true);
      setEnderecoSaved(true);
      setFinanceiroSaved(true);
      setCobrancaGerada(true);
      setCredenciaisEnviadas(true); // Will be updated by guardian check below
      setSavedStudentId(student.id); // Keep student ID for potential credential sending
      setSavedResponsavelId(null); // Will be set by guardian fetch
    } else if (open && !student) {
      // Use initialDraft if provided
      if (initialDraft) {
        setCurrentDraftId(initialDraft.id);
        setNome(initialDraft.nome);
        setDataNascimento(initialDraft.dataNascimento);
        setCpf(initialDraft.cpf);
        setValorMensalidade(initialDraft.valorMensalidade);
        setDiaVencimento(initialDraft.diaVencimento);
        setFormaCobranca('mensal');
        setDataInicioCobranca(initialDraft.dataInicioCobranca || today);
        setStatusFinanceiro(initialDraft.statusFinanceiro);
        setValorMatricula(initialDraft.valorMatricula);
        setValorUniforme(initialDraft.valorUniforme);
        setResponsavelNome(initialDraft.responsavelNome);
        setResponsavelEmail(initialDraft.responsavelEmail);
        setResponsavelEmailConfirm(initialDraft.responsavelEmailConfirm);
        setResponsavelTelefone(initialDraft.responsavelTelefone);
        setResponsavelCpf(initialDraft.responsavelCpf);
        setParentesco(initialDraft.parentesco);
        setCep(initialDraft.cep);
        setRua(initialDraft.rua);
        setNumero(initialDraft.numero);
        setComplemento(initialDraft.complemento);
        setBairro(initialDraft.bairro);
        setCidade(initialDraft.cidade);
        setEstado(initialDraft.estado);
        setSelectedTurmaId(initialDraft.selectedTurmaId);
        setCategoria(initialDraft.categoria || 'Futebol de Campo');
        setSavedStudentId(initialDraft.savedStudentId);
        setSavedResponsavelId(initialDraft.savedResponsavelId);
        setResumoSaved(initialDraft.resumoSaved);
        setEnderecoSaved(initialDraft.enderecoSaved);
        setFinanceiroSaved(initialDraft.financeiroSaved);
        setCobrancaGerada(initialDraft.cobrancaGerada);
        setCredenciaisEnviadas(initialDraft.credentiaisEnviadas);
        setIsMigration(initialDraft.isMigration || false);
        setActiveTab(initialDraft.activeTab);
        setIsEditing(true);
        toast.info('Cadastro restaurado. Continue de onde parou.');
      } else {
        // Start fresh - generate new draft ID
        setCurrentDraftId(null);
        setNome('');
        setDataNascimento('');
        setFotoUrl('');
        setCpf('');
        setValorMensalidade('170');
        setDiaVencimento('8');
        setFormaCobranca('mensal');
        setDataInicioCobranca(today);
        setStatusFinanceiro('ativo');
        setResponsavelNome('');
        setResponsavelEmail('');
        setResponsavelEmailConfirm('');
        setResponsavelTelefone('');
        setResponsavelCpf('');
        setParentesco('');
        setSelectedTurmaId('');
        setCategoria('Futebol de Campo');
        setCep('');
        setRua('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setEstado('');
        setValorMatricula('100');
        setValorUniforme('0');
        setSavedStudentId(null);
        setSavedResponsavelId(null);
        setResumoSaved(false);
        setEnderecoSaved(false);
        setFinanceiroSaved(false);
        setCobrancaGerada(false);
        setCredenciaisEnviadas(false);
        setIsMigration(false);
        setExistingGuardian(null);
        setUsingExistingGuardian(false);
        setActiveTab('resumo');
      }
      setIsEditing(true);
    }
    setTempPassword(null);
    setCopied(false);
  }, [open, student, initialDraft, propInitialTab]);

  // Fetch address from CEP
  const fetchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setRua(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        toast.success('Endereço encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  // Save address mutation for new students (before creating)
  const saveNewStudentAddressMutation = useMutation({
    mutationFn: async () => {
      if (!savedResponsavelId) throw new Error('Responsável não encontrado');
      
      const { error } = await supabase
        .from('responsaveis')
        .update({
          cep: cep.replace(/\D/g, '') || null,
          rua: rua || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
        })
        .eq('id', savedResponsavelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setEnderecoSaved(true);
      toast.success('Endereço salvo! Continue com os dados financeiros.');
      // Stay on dialog, switch to financeiro tab
      setActiveTab('financeiro');
    },
    onError: () => {
      toast.error('Erro ao salvar endereço');
    },
  });

  // Save address mutation for existing students
  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      if (!guardianData?.id) throw new Error('Responsável não encontrado');
      
      const { error } = await supabase
        .from('responsaveis')
        .update({
          cep: cep.replace(/\D/g, '') || null,
          rua: rua || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
        })
        .eq('id', guardianData.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Endereço salvo com sucesso!');
      if (guardianData) {
        setGuardianData({
          ...guardianData,
          cep: cep.replace(/\D/g, '') || null,
          rua: rua || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
        });
      }
    },
    onError: () => {
      toast.error('Erro ao salvar endereço');
    },
  });

  const registerInitial = useRegisterStudentInitial();
  const sendCredentials = useSendGuardianCredentials();
  const generateEnrollmentPix = useGenerateEnrollmentPix();
  const checkEnrollmentPayment = useCheckEnrollmentPayment();
  const cancelEnrollmentCharge = useCancelEnrollmentCharge();

  // Step 1: Save basic data (Resumo)
  const saveResumoMutation = useMutation({
    mutationFn: async () => {
      const response = await registerInitial.mutateAsync({
        nome: nome.trim(),
        dataNascimento,
        fotoUrl: fotoUrl || undefined,
        cpf: cpf.replace(/\D/g, '') || undefined,
        responsavelNome: responsavelNome.trim(),
        responsavelEmail: responsavelEmail.trim().toLowerCase(),
        responsavelTelefone: responsavelTelefone.replace(/\D/g, '') || undefined,
        responsavelCpf: responsavelCpf.replace(/\D/g, '') || undefined,
        parentesco: parentesco || undefined,
        escolinhaId: propEscolinhaId || user?.escolinhaId || '',
        valorMensalidade: parseFloat(valorMensalidade) || 170,
        diaVencimento: parseInt(diaVencimento) || 8,
        valorMatricula: parseFloat(valorMatricula) || 0,
        valorUniforme: parseFloat(valorUniforme) || 0,
        turmaId: selectedTurmaId || undefined,
        categoria: categoria || 'Futebol de Campo',
        cep: cep.replace(/\D/g, '') || undefined,
        rua: rua || undefined,
        numero: numero || undefined,
        complemento: complemento || undefined,
        bairro: bairro || undefined,
        cidade: cidade || undefined,
        estado: estado || undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      
      setSavedStudentId(data.crianca?.id);
      setSavedResponsavelId(data.responsavel?.id);
      setResumoSaved(true);
      toast.success('Dados do aluno salvos! Continue com o endereço.');
      // Stay on dialog, switch to address tab
      setActiveTab('endereco');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar aluno');
    },
  });

  // Step 2: Save address (Endereço) - use the mutation above
  const handleSaveEndereco = () => {
    if (savedResponsavelId) {
      saveNewStudentAddressMutation.mutate();
    }
  };

  // Step 3: Save financial data (Financeiro)
  const saveFinanceiroMutation = useMutation({
    mutationFn: async () => {
      if (!savedStudentId) throw new Error('Aluno não encontrado');
      
      // For migration mode, set aluno as ativo and entrada_paga = true
      const criancaUpdate: Record<string, any> = {
        valor_mensalidade: parseFloat(valorMensalidade) || 170,
        dia_vencimento: parseInt(diaVencimento) || 8,
        forma_cobranca: formaCobranca,
        data_inicio_cobranca: dataInicioCobranca,
        status_financeiro: statusFinanceiro,
      };
      
      // In migration mode, also set ativo = true
      if (isMigration) {
        criancaUpdate.ativo = true;
      }
      
      const { error: criancaError } = await supabase
        .from('criancas')
        .update(criancaUpdate)
        .eq('id', savedStudentId);
      
      if (criancaError) throw criancaError;

      // Update crianca_escolinha with enrollment values (or mark as paid for migration)
      const ceUpdate: Record<string, any> = {
        valor_matricula: isMigration ? 0 : (parseFloat(valorMatricula) || 0),
        valor_uniforme: isMigration ? 0 : (parseFloat(valorUniforme) || 0),
      };
      
      // In migration mode, mark entrada as paid and aluno as ativo
      if (isMigration) {
        ceUpdate.entrada_paga = true;
        ceUpdate.ativo = true;
        ceUpdate.status_matricula = 'ativo';
      }
      
      const { error: ceError } = await supabase
        .from('crianca_escolinha')
        .update(ceUpdate)
        .eq('crianca_id', savedStudentId)
        .eq('escolinha_id', effectiveEscolinhaId);
      
      if (ceError) throw ceError;
    },
    onSuccess: () => {
      setFinanceiroSaved(true);
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
      
      if (isMigration) {
        toast.success('Aluno ativado! Agora envie os dados de acesso.');
      } else {
        toast.success('Dados financeiros salvos!');
      }
    },
    onError: () => {
      toast.error('Erro ao salvar dados financeiros');
    },
  });

  // Step 4: Generate enrollment charge
  const handleGenerateEnrollmentCharge = async () => {
    if (!savedStudentId || !effectiveEscolinhaId) {
      toast.error('Salve os dados primeiro');
      return;
    }
    
    setGeneratingCharge(true);
    try {
      await generateEnrollmentPix.mutateAsync({
        criancaId: savedStudentId,
        escolinhaId: effectiveEscolinhaId,
        valorMatricula: parseFloat(valorMatricula) || 0,
        valorUniforme: parseFloat(valorUniforme) || 0,
        valorMensalidade: parseFloat(valorMensalidade) || 170,
      });
      
      setCobrancaGerada(true);
      await refetchEnrollmentCharge();
      toast.success('Cobrança de matrícula gerada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar cobrança');
    } finally {
      setGeneratingCharge(false);
    }
  };

  // Generate enrollment charge for existing students
  const handleGenerateEnrollmentChargeExisting = async () => {
    const studentId = student?.id;
    
    toast.info('Gerando cobrança PIX...', { id: 'generating-charge' });
    console.log('[EnrollmentCharge] Button clicked - handleGenerateEnrollmentChargeExisting', { 
      studentId, 
      effectiveEscolinhaId,
      valorMatricula,
      valorUniforme,
      valorMensalidade 
    });
    
    if (!studentId || !effectiveEscolinhaId) {
      toast.error('Dados do aluno não encontrados', { id: 'generating-charge' });
      console.error('[EnrollmentCharge] Missing studentId or escolinhaId', { studentId, effectiveEscolinhaId });
      return;
    }
    
    setGeneratingCharge(true);
    try {
      console.log('[EnrollmentCharge] Calling edge function...');
      const result = await generateEnrollmentPix.mutateAsync({
        criancaId: studentId,
        escolinhaId: effectiveEscolinhaId,
        valorMatricula: parseFloat(valorMatricula) || 0,
        valorUniforme: parseFloat(valorUniforme) || 0,
        valorMensalidade: parseFloat(valorMensalidade) || 170,
      });
      
      console.log('[EnrollmentCharge] Edge function success:', result);
      setCobrancaGerada(true);
      
      // Force refetch and invalidate all related queries
      await refetchEnrollmentCharge();
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      queryClient.invalidateQueries({ queryKey: ['child-enrollment-charge'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado', studentId] });
      queryClient.invalidateQueries({ queryKey: ['school-enrollment-charges'] });
      
      toast.success(`Cobrança de R$ ${result.valorTotal.toFixed(2).replace('.', ',')} gerada! PIX disponível.`, { id: 'generating-charge' });
    } catch (error: any) {
      console.error('[EnrollmentCharge] Error:', error);
      toast.error(error.message || 'Erro ao gerar cobrança', { id: 'generating-charge' });
    } finally {
      setGeneratingCharge(false);
    }
  };

  // Cancel enrollment charge
  const handleCancelEnrollmentCharge = async () => {
    if (!enrollmentCharge?.id) {
      toast.error('Cobrança não encontrada');
      return;
    }
    
    if (enrollmentCharge.status === 'pago') {
      toast.error('Não é possível cancelar uma cobrança já paga');
      return;
    }
    
    setCancellingCharge(true);
    try {
      await cancelEnrollmentCharge.mutateAsync(enrollmentCharge.id);
      setCobrancaGerada(false);
      await refetchEnrollmentCharge();
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
      toast.success('Cobrança cancelada! Agora você pode gerar uma nova.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar cobrança');
    } finally {
      setCancellingCharge(false);
    }
  };

  // Step 5: Send credentials
  const handleSendCredentials = async () => {
    const responsavelId = savedResponsavelId || guardianData?.id;
    const studentId = savedStudentId || student?.id;
    
    if (!responsavelId || !studentId) {
      toast.error('Salve o aluno primeiro');
      return;
    }
    
    setSendingCredentials(true);
    try {
      const result = await sendCredentials.mutateAsync({
        responsavelId: responsavelId,
        escolinhaId: propEscolinhaId || user?.escolinhaId || '',
        criancaId: studentId,
      });
      
      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
      }
      setCredenciaisEnviadas(true);
      toast.success(result.message || 'Credenciais enviadas!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar credenciais');
    } finally {
      setSendingCredentials(false);
    }
  };

  // Generate individual monthly billing
  const handleGenerateBilling = async (mesReferencia: string) => {
    const studentId = savedStudentId || student?.id;
    const escolinhaId = propEscolinhaId || user?.escolinhaId;
    
    if (!studentId || !escolinhaId) {
      toast.error('Erro: aluno ou escolinha não encontrados');
      throw new Error('Aluno ou escolinha não encontrados');
    }

    setGeneratingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-student-billing-asaas', {
        body: { 
          escolinha_id: escolinhaId, 
          mes_referencia: mesReferencia,
          crianca_id: studentId
        }
      });

      if (error) throw error;

      if (data?.results?.length > 0) {
        const result = data.results.find((r: any) => r.crianca_id === studentId);
        if (result) {
          if (result.status === 'created') {
            queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });
            queryClient.invalidateQueries({ queryKey: ['school-children'] });
            // Success is shown by the dialog
          } else if (result.status === 'already_exists') {
            toast.info('Mensalidade já existe para este mês');
            throw new Error('Mensalidade já existe para este mês');
          } else if (result.status === 'skipped') {
            toast.info(result.message || 'Aluno não elegível para cobrança');
            throw new Error(result.message || 'Aluno não elegível para cobrança');
          } else {
            toast.error(result.message || 'Erro ao gerar cobrança');
            throw new Error(result.message || 'Erro ao gerar cobrança');
          }
        }
      } else if (data?.error) {
        toast.error(data.error);
        throw new Error(data.error);
      }
    } finally {
      setGeneratingBilling(false);
    }
  };
  const handleSaveResumo = () => {
    if (!nome.trim() || !dataNascimento) {
      toast.error('Preencha o nome e data de nascimento do aluno');
      return;
    }
    
    if (!responsavelNome.trim() || !responsavelEmail.trim() || !responsavelEmailConfirm.trim()) {
      toast.error('Preencha todos os dados do responsável');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsavelEmail)) {
      toast.error('Email do responsável inválido');
      return;
    }
    
    if (responsavelEmail.trim().toLowerCase() !== responsavelEmailConfirm.trim().toLowerCase()) {
      toast.error('Os e-mails informados não coincidem.');
      return;
    }
    
    saveResumoMutation.mutate();
  };

  // Handle save for existing student
  const handleSaveExistingStudent = async () => {
    if (!student) return;
    
    try {
      await updateStudent.mutateAsync({
        id: student.id,
        foto_url: fotoUrl || null,
        valor_mensalidade: parseFloat(valorMensalidade) || 170,
        dia_vencimento: parseInt(diaVencimento) || 8,
        forma_cobranca: formaCobranca,
        data_inicio_cobranca: dataInicioCobranca,
        status_financeiro: statusFinanceiro,
      });
      toast.success('Aluno atualizado');
      setIsEditing(false);
    } catch {
      toast.error('Erro ao atualizar aluno');
    }
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Senha copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    // If registration is complete (tempPassword set or credentials sent), clear draft
    if (tempPassword || credentiaisEnviadas) {
      clearDraft();
    }
    setTempPassword(null);
    setIsEditing(false);
    // Use handleOpenChange to trigger confirmation if needed
    handleOpenChange(false);
  };

  const isPending = saveResumoMutation.isPending || updateStudent.isPending;
  const activeTurmas = turmas?.filter(t => t.ativo) || [];
  
  const isNewStudent = !student;
  const age = student ? calculateAge(student.data_nascimento) : dataNascimento ? calculateAge(dataNascimento) : 0;
  const isBirthday = student ? isBirthdayToday(student.data_nascimento) : false;
  const isBirthdayMonth = student ? isBirthdayThisMonth(student.data_nascimento) : false;

  // Calculate time at school
  const getTempoEscola = () => {
    if (!student) return 'Novo aluno';
    const createdDate = new Date(student.created_at);
    const now = new Date();
    const totalMonths = differenceInMonths(now, createdDate);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'}${months > 0 ? ` e ${months} ${months === 1 ? 'mês' : 'meses'}` : ''}`;
    }
    if (months > 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    return 'Recém cadastrado';
  };

  // Financial status
  const getFinanceiroInfo = () => {
    const finStatus = student?.financeiroStatus;
    if (!finStatus || finStatus.status === 'em_dia') {
      return { color: 'bg-emerald-500', text: 'Em dia', icon: Check };
    }
    if (finStatus.status === 'isento') {
      return { color: 'bg-muted text-muted-foreground', text: 'Isento', icon: FileText };
    }
    if (finStatus.status === 'atrasado') {
      return { color: 'bg-red-500', text: `${finStatus.atrasadas} atrasada(s)`, icon: AlertCircle };
    }
    return { color: 'bg-amber-500', text: 'Pendente', icon: Clock };
  };
  const finInfo = getFinanceiroInfo();
  const FinIcon = finInfo.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Calculate total for enrollment charge
  const totalCobrancaEntrada = (parseFloat(valorMatricula) || 0) + (parseFloat(valorUniforme) || 0) + (parseFloat(valorMensalidade) || 0);

  // Success screen after sending credentials
  if (tempPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Cadastro Concluído!</h2>
            <p className="text-muted-foreground text-sm">
              O responsável recebeu as credenciais de acesso por e-mail:
            </p>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={responsavelEmail} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Senha Temporária</Label>
                <div className="flex gap-2">
                  <Input value={tempPassword} readOnly className="font-mono bg-muted" />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopyPassword(tempPassword)}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
              ⚠️ O responsável deverá trocar a senha no primeiro acesso.
            </div>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
          onPointerDownOutside={(e) => {
            // Prevent closing by clicking outside for new unsaved students
            if (!student && !resumoSaved && hasUnsavedData()) {
              e.preventDefault();
              setShowCloseConfirm(true);
              setPendingClose(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing by Escape for new unsaved students
            if (!student && !resumoSaved && hasUnsavedData()) {
              e.preventDefault();
              setShowCloseConfirm(true);
              setPendingClose(true);
            }
          }}
        >
        {/* Draft warning banner for new students */}
        {isNewStudent && !resumoSaved && (
          <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Rascunho — Os dados ainda <strong>não foram salvos</strong>. Preencha todos os campos e clique em "Salvar e Continuar" abaixo.</span>
          </div>
        )}
        {/* Header com foto e info principal */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Foto com upload - para escolas */}
            {student ? (
              <SchoolChildPhotoUpload
                childId={student.id}
                childName={student.nome}
                currentPhotoUrl={student.foto_url}
                size="lg"
                onPhotoUpdated={(url) => setFotoUrl(url)}
              />
            ) : (
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {(nome || 'N').charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isNewStudent ? (
                  <h2 className="text-2xl font-bold truncate text-muted-foreground">
                    {nome || 'Novo Aluno'}
                  </h2>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold truncate">{student?.nome}</h2>
                    <Badge variant={student?.ativo ? 'default' : 'secondary'} className="shrink-0">
                      {student?.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {isBirthday && <BirthdayBadge isToday showLabel />}
                    {isBirthdayMonth && !isBirthday && <BirthdayBadge isThisMonth showLabel />}
                  </>
                )}
              </div>
              
              {(student || dataNascimento) && (
                <p className="text-muted-foreground mt-1">
                  {age > 0 && `${age} anos • `}
                  {(student?.data_nascimento || dataNascimento) && 
                    `Nascimento: ${format(new Date((student?.data_nascimento || dataNascimento) + 'T12:00:00'), 'dd/MM/yyyy')}`
                  }
                </p>
              )}
              
              {/* Quick stats - only for existing students */}
              {student && (
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border shadow-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{getTempoEscola()}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-white ${finInfo.color}`}>
                    <FinIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{finInfo.text}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border shadow-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {student.turmas.length === 0 ? 'Sem turma' : `${student.turmas.length} turma(s)`}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress indicator for new students */}
              {isNewStudent && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant={resumoSaved ? 'default' : 'outline'} className="gap-1">
                    {resumoSaved ? <Check className="w-3 h-3" /> : '1'}
                    Resumo
                  </Badge>
                  <Badge variant={enderecoSaved ? 'default' : 'outline'} className="gap-1">
                    {enderecoSaved ? <Check className="w-3 h-3" /> : '2'}
                    Endereço
                  </Badge>
                  {!isMigration && (
                    <>
                      <Badge variant={financeiroSaved ? 'default' : 'outline'} className="gap-1">
                        {financeiroSaved ? <Check className="w-3 h-3" /> : '3'}
                        Financeiro
                      </Badge>
                      <Badge variant={cobrancaGerada ? 'default' : 'outline'} className="gap-1">
                        {cobrancaGerada ? <Check className="w-3 h-3" /> : '4'}
                        Cobrança
                      </Badge>
                      <Badge variant={credentiaisEnviadas ? 'default' : 'outline'} className="gap-1">
                        {credentiaisEnviadas ? <Check className="w-3 h-3" /> : '5'}
                        Acesso
                      </Badge>
                    </>
                  )}
                  {isMigration && (
                    <>
                      <Badge variant={financeiroSaved ? 'default' : 'outline'} className="gap-1">
                        {financeiroSaved ? <Check className="w-3 h-3" /> : '3'}
                        Financeiro
                      </Badge>
                      <Badge variant={credentiaisEnviadas ? 'default' : 'outline'} className="gap-1">
                        {credentiaisEnviadas ? <Check className="w-3 h-3" /> : '4'}
                        Acesso
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {!isNewStudent && isEditing && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                    disabled={isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveExistingStudent}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </>
              )}
              {!isNewStudent && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {isNewStudent && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClose}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6 pt-4">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="endereco" disabled={isNewStudent && !resumoSaved}>Endereço</TabsTrigger>
            <TabsTrigger value="financeiro" disabled={isNewStudent && !resumoSaved}>Financeiro</TabsTrigger>
            <TabsTrigger value="jornada" disabled={isNewStudent}>Jornada</TabsTrigger>
            <TabsTrigger value="aulas" disabled={isNewStudent}>Aulas</TabsTrigger>
          </TabsList>

          {/* Resumo */}
          <TabsContent value="resumo" className="space-y-6 mt-0">
            {/* Migration mode toggle - only for new students before saving */}
            {isNewStudent && !resumoSaved && (
              <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="migration-mode" className="text-base font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Aluno já matriculado
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ative para alunos que já fazem parte da escola e estão migrando para o sistema. 
                        Não será gerada cobrança de matrícula.
                      </p>
                    </div>
                    <Switch
                      id="migration-mode"
                      checked={isMigration}
                      onCheckedChange={setIsMigration}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dados do Aluno */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dados do Aluno
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && isNewStudent && !resumoSaved ? (
                    <>
                      {/* Photo upload for new student */}
                      <div className="flex justify-center mb-4">
                        <NewStudentPhotoUpload
                          studentName={nome}
                          currentPhotoUrl={fotoUrl || null}
                          onPhotoUploaded={(url) => setFotoUrl(url)}
                          onPhotoRemoved={() => setFotoUrl('')}
                          size="xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Nome completo do aluno"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Nascimento *</Label>
                        <Input
                          type="date"
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CPF do Aluno</Label>
                        <Input
                          value={cpf}
                          onChange={(e) => setCpf(formatCpf(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                        {cpf && cpf.replace(/\D/g, '').length === 11 && !validateCPF(cpf) && (
                          <p className="text-xs text-destructive">CPF inválido</p>
                        )}
                        {cpf && cpf.replace(/\D/g, '').length === 11 && validateCPF(cpf) && (
                          <p className="text-xs text-emerald-600">✓ CPF válido</p>
                        )}
                      </div>
                      {activeTurmas.length > 0 && (
                        <div className="space-y-2">
                          <Label>Vincular a uma turma</Label>
                          <Select value={selectedTurmaId || "none"} onValueChange={(v) => setSelectedTurmaId(v === "none" ? "" : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {activeTurmas.map(turma => (
                                <SelectItem key={turma.id} value={turma.id}>
                                  {turma.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Categoria / Modalidade</Label>
                        <Select value={categoria} onValueChange={setCategoria}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a modalidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Futebol de Campo">Futebol de Campo</SelectItem>
                            <SelectItem value="Futsal">Futsal</SelectItem>
                            <SelectItem value="Society">Society</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : isNewStudent && resumoSaved ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nome completo</span>
                        <span className="font-medium">{nome}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data de nascimento</span>
                        <span className="font-medium">
                          {dataNascimento && format(new Date(dataNascimento + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <Separator />
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
                        ✓ Dados salvos com sucesso
                      </div>
                    </>
                  ) : isEditing ? (
                    <>
                      <div className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Nome completo</span>
                        <p className="font-medium">{student?.nome}</p>
                      </div>
                      <Separator />
                      <div className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Data de nascimento</span>
                        <p className="font-medium">
                          {student?.data_nascimento && format(new Date(student.data_nascimento + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border">
                        O nome e a data de nascimento não podem ser editados pela escola.
                      </p>
                      <Separator />
                      <div className="space-y-2">
                        <Label>URL da Foto</Label>
                        <Input
                          value={fotoUrl}
                          onChange={(e) => setFotoUrl(e.target.value)}
                          placeholder="https://exemplo.com/foto.jpg"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nome completo</span>
                        <span className="font-medium">{student?.nome}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data de nascimento</span>
                        <span className="font-medium">
                          {student?.data_nascimento && format(new Date(student.data_nascimento + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Idade</span>
                        <span className="font-medium">{age} anos</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data de cadastro</span>
                        <span className="font-medium">
                          {student?.created_at && format(new Date(student.created_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tempo na escola</span>
                        <span className="font-medium">{getTempoEscola()}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Responsável */}
              {isNewStudent ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Responsável
                      {usingExistingGuardian && existingGuardian && (
                        <Badge className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <Check className="w-3 h-3 mr-1" />
                          Vinculado
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!resumoSaved ? (
                      <>
                        {/* Existing Guardian Detector - shows when guardian is found */}
                        {!usingExistingGuardian && (
                          <ExistingGuardianDetector
                            email={responsavelEmail}
                            cpf={responsavelCpf}
                            isSearchEnabled={!resumoSaved && !usingExistingGuardian}
                            onGuardianFound={(guardian) => {
                              setExistingGuardian(guardian);
                            }}
                            onUseExistingGuardian={(guardian) => {
                              setExistingGuardian(guardian);
                              setUsingExistingGuardian(true);
                              // Pre-fill all guardian data
                              setResponsavelNome(guardian.nome);
                              setResponsavelEmail(guardian.email);
                              setResponsavelEmailConfirm(guardian.email);
                              setResponsavelTelefone(guardian.telefone ? formatPhone(guardian.telefone) : '');
                              setResponsavelCpf(guardian.cpf ? formatCpf(guardian.cpf) : '');
                              // Pre-fill address
                              setCep(guardian.cep || '');
                              setRua(guardian.rua || '');
                              setNumero(guardian.numero || '');
                              setComplemento(guardian.complemento || '');
                              setBairro(guardian.bairro || '');
                              setCidade(guardian.cidade || '');
                              setEstado(guardian.estado || '');
                              // If guardian already has credentials, skip sending them later
                              if (guardian.hasCredentials) {
                                setCredenciaisEnviadas(true);
                              }
                              toast.success(`Responsável "${guardian.nome}" selecionado! Os dados foram preenchidos automaticamente.`);
                            }}
                            onCreateNewGuardian={() => {
                              setExistingGuardian(null);
                              setUsingExistingGuardian(false);
                            }}
                          />
                        )}

                        {/* Using existing guardian - show read-only summary */}
                        {usingExistingGuardian && existingGuardian && (
                          <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                  <Check className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">{existingGuardian.nome}</p>
                                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{existingGuardian.email}</p>
                                  {existingGuardian.telefone && (
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{formatPhone(existingGuardian.telefone)}</p>
                                  )}
                                  {existingGuardian.childrenCount > 0 && (
                                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                                      {existingGuardian.childrenCount} filho(s) já vinculado(s): {existingGuardian.childrenNames.join(', ')}
                                    </p>
                                  )}
                                  {existingGuardian.hasCredentials && (
                                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                                      ✓ Responsável já possui acesso ao sistema
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setUsingExistingGuardian(false);
                                setExistingGuardian(null);
                                // Clear pre-filled data
                                setResponsavelNome('');
                                setResponsavelEmail('');
                                setResponsavelEmailConfirm('');
                                setResponsavelTelefone('');
                                setResponsavelCpf('');
                                setCep('');
                                setRua('');
                                setNumero('');
                                setComplemento('');
                                setBairro('');
                                setCidade('');
                                setEstado('');
                                setCredenciaisEnviadas(false);
                              }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancelar e cadastrar novo responsável
                            </Button>
                            
                            {/* Parentesco for existing guardian */}
                            <div className="space-y-2">
                              <Label>Parentesco com este aluno</Label>
                              <Select value={parentesco || "none"} onValueChange={(v) => setParentesco(v === "none" ? "" : v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o parentesco" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Não informado</SelectItem>
                                  <SelectItem value="Pai">Pai</SelectItem>
                                  <SelectItem value="Mãe">Mãe</SelectItem>
                                  <SelectItem value="Avô">Avô</SelectItem>
                                  <SelectItem value="Avó">Avó</SelectItem>
                                  <SelectItem value="Tio">Tio</SelectItem>
                                  <SelectItem value="Tia">Tia</SelectItem>
                                  <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* New guardian form - show when not using existing */}
                        {!usingExistingGuardian && (
                          <>
                            <div className="space-y-2">
                              <Label>Nome Completo *</Label>
                              <Input
                                value={responsavelNome}
                                onChange={(e) => setResponsavelNome(e.target.value)}
                                placeholder="Nome completo do responsável"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>E-mail *</Label>
                              <Input
                                type="email"
                                value={responsavelEmail}
                                onChange={(e) => setResponsavelEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Confirmar E-mail *</Label>
                              <Input
                                type="email"
                                value={responsavelEmailConfirm}
                                onChange={(e) => setResponsavelEmailConfirm(e.target.value)}
                                placeholder="email@exemplo.com"
                              />
                              <p className="text-xs text-muted-foreground">
                                O responsável usará este email para acessar o sistema
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Telefone *</Label>
                              <Input
                                value={responsavelTelefone}
                                onChange={(e) => setResponsavelTelefone(formatPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                              />
                              {responsavelTelefone && responsavelTelefone.replace(/\D/g, '').length < 10 && (
                                <p className="text-xs text-destructive">Telefone incompleto</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>CPF</Label>
                              <Input
                                value={responsavelCpf}
                                onChange={(e) => setResponsavelCpf(formatCpf(e.target.value))}
                                placeholder="000.000.000-00"
                                maxLength={14}
                              />
                              {responsavelCpf && responsavelCpf.replace(/\D/g, '').length === 11 && !validateCPF(responsavelCpf) && (
                                <p className="text-xs text-destructive">CPF inválido</p>
                              )}
                              {responsavelCpf && responsavelCpf.replace(/\D/g, '').length === 11 && validateCPF(responsavelCpf) && (
                                <p className="text-xs text-emerald-600">✓ CPF válido</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Parentesco</Label>
                              <Select value={parentesco || "none"} onValueChange={(v) => setParentesco(v === "none" ? "" : v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o parentesco" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Não informado</SelectItem>
                                  <SelectItem value="Pai">Pai</SelectItem>
                                  <SelectItem value="Mãe">Mãe</SelectItem>
                                  <SelectItem value="Avô">Avô</SelectItem>
                                  <SelectItem value="Avó">Avó</SelectItem>
                                  <SelectItem value="Tio">Tio</SelectItem>
                                  <SelectItem value="Tia">Tia</SelectItem>
                                  <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Nome</span>
                          <span className="font-medium">{responsavelNome}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">E-mail</span>
                          <span className="font-medium">{responsavelEmail}</span>
                        </div>
                        {responsavelTelefone && (
                          <>
                            <Separator />
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Telefone</span>
                              <span className="font-medium">{responsavelTelefone}</span>
                            </div>
                          </>
                        )}
                        {usingExistingGuardian && existingGuardian && (
                          <>
                            <Separator />
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs text-emerald-700 dark:text-emerald-400">
                              ✓ Responsável existente vinculado
                              {existingGuardian.hasCredentials && ' (já possui acesso)'}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <GuardianEditCard
                  guardianData={guardianData}
                  parentesco={parentesco}
                  loading={loadingGuardian}
                  criancaId={student?.id}
                  onGuardianUpdated={(data) => setGuardianData(data)}
                  onParentescoChange={(value) => setParentesco(value)}
                />
              )}
            </div>

            {/* Save button for new students - sticky at bottom */}
            {isNewStudent && !resumoSaved && (
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-background/95 backdrop-blur-sm border-t shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Dados não salvos (apenas rascunho local)
                  </p>
                  <Button 
                    onClick={handleSaveResumo}
                    disabled={saveResumoMutation.isPending}
                    size="lg"
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  >
                    {saveResumoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar e Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Escolinhas - only for existing students */}
            {student && student.escolinhas.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Escolinhas Vinculadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {student.escolinhas.map((escola) => (
                      <div 
                        key={escola.id} 
                        className="p-3 border rounded-lg bg-primary/5 border-primary/20"
                      >
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-primary" />
                          <p className="font-medium">{escola.nome}</p>
                        </div>
                        {escola.data_inicio && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Matriculado desde {format(new Date(escola.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Turmas - only for existing students */}
            {student && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Turmas Vinculadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {student.turmas.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhuma turma vinculada
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {student.turmas.map((t, i) => (
                        <div 
                          key={i} 
                          className="p-3 border rounded-lg bg-muted/30"
                        >
                          <p className="font-medium">{t.turma?.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {t.turma?.dias_semana?.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                            {t.turma?.horario_inicio && ` • ${t.turma.horario_inicio.slice(0, 5)}`}
                            {t.turma?.horario_fim && ` - ${t.turma.horario_fim.slice(0, 5)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Endereço */}
          <TabsContent value="endereco" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço do Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isNewStudent && resumoSaved ? (
                  // New student - address form
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <div className="flex gap-2">
                          <Input
                            value={cep}
                            onChange={(e) => setCep(formatCep(e.target.value))}
                            placeholder="00000-000"
                            maxLength={9}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => fetchAddressByCep(cep)}
                            disabled={loadingCep || cep.replace(/\D/g, '').length !== 8}
                          >
                            {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Digite o CEP e clique para buscar</p>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Rua / Logradouro</Label>
                        <Input
                          value={rua}
                          onChange={(e) => setRua(e.target.value)}
                          placeholder="Nome da rua"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-2">
                        <Label>Complemento</Label>
                        <Input
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                          placeholder="Apto, bloco, etc."
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          placeholder="Nome do bairro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Nome da cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    
                    {enderecoSaved && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
                        ✓ Endereço salvo com sucesso
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      {!enderecoSaved && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEnderecoSaved(true); // Mark as skipped
                            setActiveTab('financeiro');
                          }}
                        >
                          Pular
                        </Button>
                      )}
                      {!enderecoSaved && (
                        <Button
                          onClick={handleSaveEndereco}
                          disabled={saveNewStudentAddressMutation.isPending}
                        >
                          {saveNewStudentAddressMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Salvar Endereço
                        </Button>
                      )}
                      {enderecoSaved && (
                        <Button onClick={() => setActiveTab('financeiro')}>
                          Continuar para Financeiro
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !guardianData ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center">
                      {isNewStudent ? 'Cadastre o aluno primeiro para adicionar o endereço' : 'Responsável não encontrado'}
                    </p>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <div className="flex gap-2">
                          <Input
                            value={cep}
                            onChange={(e) => setCep(formatCep(e.target.value))}
                            placeholder="00000-000"
                            maxLength={9}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => fetchAddressByCep(cep)}
                            disabled={loadingCep || cep.replace(/\D/g, '').length !== 8}
                          >
                            {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Digite o CEP e clique para buscar</p>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Rua / Logradouro</Label>
                        <Input
                          value={rua}
                          onChange={(e) => setRua(e.target.value)}
                          placeholder="Nome da rua"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-2">
                        <Label>Complemento</Label>
                        <Input
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                          placeholder="Apto, bloco, etc."
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          placeholder="Nome do bairro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Nome da cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => saveAddressMutation.mutate()}
                      disabled={saveAddressMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {saveAddressMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Endereço
                    </Button>
                  </div>
                ) : guardianData.rua || guardianData.cidade ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">CEP</span>
                        <p className="font-medium">{guardianData.cep ? formatCep(guardianData.cep) : '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Estado</span>
                        <p className="font-medium">{guardianData.estado || '-'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Endereço Completo</span>
                      <p className="font-medium">
                        {guardianData.rua}
                        {guardianData.numero && `, ${guardianData.numero}`}
                        {guardianData.complemento && ` - ${guardianData.complemento}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {guardianData.bairro}
                        {guardianData.cidade && ` - ${guardianData.cidade}`}
                        {guardianData.estado && `/${guardianData.estado}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-center">Endereço não cadastrado</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsEditing(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Endereço
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-0 space-y-4">
            {/* Migration mode - simplified flow without enrollment charge */}
            {isNewStudent && resumoSaved && isMigration && (
              <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    Cadastro de Aluno Existente (Migração)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O aluno será cadastrado como <strong>ativo</strong> sem gerar cobrança de matrícula. 
                    Configure o valor da mensalidade recorrente abaixo.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor da Mensalidade *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorMensalidade}
                        onChange={(e) => setValorMensalidade(e.target.value)}
                        placeholder="170.00"
                        disabled={financeiroSaved}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dia de Vencimento</Label>
                      <Select 
                        value={diaVencimento} 
                        onValueChange={setDiaVencimento}
                        disabled={financeiroSaved}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25].map(dia => (
                            <SelectItem key={dia} value={String(dia)}>Dia {dia}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {financeiroSaved && !credentiaisEnviadas && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Dados salvos! Aluno ativo.</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Agora envie os dados de acesso para o responsável poder acessar o sistema.
                      </p>
                      <Button
                        onClick={handleSendCredentials}
                        disabled={sendingCredentials}
                        className="w-full"
                      >
                        {sendingCredentials ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar Dados de Acesso
                      </Button>
                    </div>
                  )}

                  {!financeiroSaved && (
                    <Button
                      onClick={() => saveFinanceiroMutation.mutate()}
                      disabled={saveFinanceiroMutation.isPending}
                      className="w-full"
                    >
                      {saveFinanceiroMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar e Ativar Aluno
                    </Button>
                  )}

                  {credentiaisEnviadas && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Migração concluída!</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        O aluno foi cadastrado como ativo e o responsável recebeu os dados de acesso por e-mail.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Standard flow - Enrollment charge fields (only for non-migration new students) */}
            {isNewStudent && resumoSaved && !isMigration && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Valores de Entrada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Preencha os valores abaixo para gerar a cobrança de entrada do aluno.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Matrícula *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorMatricula}
                        onChange={(e) => setValorMatricula(e.target.value)}
                        placeholder="100.00"
                        disabled={cobrancaGerada}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Uniforme</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorUniforme}
                        onChange={(e) => setValorUniforme(e.target.value)}
                        placeholder="0.00"
                        disabled={cobrancaGerada}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primeira Mensalidade *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorMensalidade}
                        onChange={(e) => setValorMensalidade(e.target.value)}
                        placeholder="170.00"
                        disabled={cobrancaGerada}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Total da Cobrança de Entrada:</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {totalCobrancaEntrada.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {financeiroSaved && !cobrancaGerada && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
                      ✓ Dados financeiros salvos
                    </div>
                  )}

                  {!financeiroSaved && (
                    <Button
                      onClick={() => saveFinanceiroMutation.mutate()}
                      disabled={saveFinanceiroMutation.isPending}
                      className="w-full"
                    >
                      {saveFinanceiroMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Dados Financeiros
                    </Button>
                  )}

                  {financeiroSaved && !cobrancaGerada && (
                    <Button
                      onClick={handleGenerateEnrollmentCharge}
                      disabled={generatingCharge}
                      className="w-full"
                      variant="default"
                    >
                      {generatingCharge ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Gerar Cobrança de Matrícula
                    </Button>
                  )}

                  {/* Charge generated - need to send credentials (new guardian only) */}
                  {cobrancaGerada && !credentiaisEnviadas && !usingExistingGuardian && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Cobrança gerada com sucesso!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Agora envie os dados de acesso para o responsável. Ao fazer o primeiro login, 
                        a cobrança aparecerá automaticamente no aplicativo.
                      </p>
                      <Button
                        onClick={handleSendCredentials}
                        disabled={sendingCredentials}
                        className="w-full"
                      >
                        {sendingCredentials ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar Dados de Acesso
                      </Button>
                      <Button
                        onClick={handleCancelEnrollmentCharge}
                        disabled={cancellingCharge}
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                      >
                        {cancellingCharge ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        Cancelar Cobrança
                      </Button>
                    </div>
                  )}

                  {/* When using existing guardian with credentials - completed, show summary */}
                  {cobrancaGerada && usingExistingGuardian && existingGuardian?.hasCredentials && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Cadastro do segundo filho concluído!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        O novo aluno foi vinculado ao responsável <strong>{existingGuardian.nome}</strong>, 
                        que já possui acesso ao sistema. A cobrança aparecerá automaticamente quando o responsável acessar o aplicativo.
                      </p>
                      {existingGuardian.childrenNames.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600/80 dark:text-emerald-400/80">
                          <Check className="w-3 h-3" />
                          <span>Filho(s) anterior(es): {existingGuardian.childrenNames.join(', ')}</span>
                        </div>
                      )}
                      <Button
                        onClick={handleCancelEnrollmentCharge}
                        disabled={cancellingCharge}
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                      >
                        {cancellingCharge ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        Cancelar Cobrança (se os valores estiverem errados)
                      </Button>
                    </div>
                  )}

                  {/* Using existing guardian without credentials - need to send */}
                  {cobrancaGerada && usingExistingGuardian && existingGuardian && !existingGuardian.hasCredentials && !credentiaisEnviadas && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Cobrança gerada!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        O responsável <strong>{existingGuardian.nome}</strong> ainda não possui acesso. Envie os dados de acesso para que ele possa visualizar a cobrança.
                      </p>
                      <Button
                        onClick={handleSendCredentials}
                        disabled={sendingCredentials}
                        className="w-full"
                      >
                        {sendingCredentials ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar Dados de Acesso
                      </Button>
                    </div>
                  )}

                  {/* Credentials sent (new guardian) */}
                  {credentiaisEnviadas && !usingExistingGuardian && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Cadastro concluído!</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        O responsável recebeu os dados de acesso por e-mail. Ao fazer o primeiro login, 
                        a cobrança de matrícula aparecerá automaticamente na tela inicial do aplicativo.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pending credentials card for existing students - never sent */}
            {!isNewStudent && guardianData && !credentiaisEnviadas && (
              <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Pendência de Cadastro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O responsável <strong>{guardianData.nome}</strong> ainda não recebeu os dados de acesso ao sistema.
                    {cobrancaGerada && " A cobrança de matrícula já foi gerada."}
                  </p>
                  
                  <Button
                    onClick={handleSendCredentials}
                    disabled={sendingCredentials}
                    className="w-full"
                  >
                    {sendingCredentials ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Dados de Acesso para {guardianData.email}
                  </Button>
                  
                  {tempPassword && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <Label className="text-xs">Senha Temporária (caso precise informar manualmente):</Label>
                      <div className="flex gap-2">
                        <Input value={tempPassword} readOnly className="font-mono" />
                        <Button variant="outline" size="icon" onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          setCopied(true);
                          toast.success('Senha copiada!');
                          setTimeout(() => setCopied(false), 2000);
                        }}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Resend credentials card for existing students - already sent */}
            {!isNewStudent && guardianData && credentiaisEnviadas && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Acesso do Responsável
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">O responsável já possui acesso ao sistema</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Caso o responsável tenha esquecido a senha ou precise de um novo acesso, 
                    você pode reenviar as credenciais por e-mail.
                  </p>
                  
                  <Button
                    onClick={handleSendCredentials}
                    disabled={sendingCredentials}
                    variant="outline"
                    className="w-full"
                  >
                    {sendingCredentials ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Reenviar Credenciais para {guardianData.email}
                  </Button>
                  
                  {tempPassword && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <Label className="text-xs">Nova Senha Temporária:</Label>
                      <div className="flex gap-2">
                        <Input value={tempPassword} readOnly className="font-mono" />
                        <Button variant="outline" size="icon" onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          setCopied(true);
                          toast.success('Senha copiada!');
                          setTimeout(() => setCopied(false), 2000);
                        }}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Uma nova senha foi gerada e enviada por e-mail. O responsável deverá trocar a senha no primeiro acesso.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Enrollment charge management for existing students */}
            {!isNewStudent && guardianData && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Cobrança de Matrícula
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {enrollmentCharge?.status === 'pago' ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Matrícula paga em {enrollmentCharge.data_pagamento ? format(new Date(enrollmentCharge.data_pagamento), 'dd/MM/yyyy') : 'N/A'}</span>
                    </div>
                  ) : enrollmentCharge?.status === 'pendente' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Cobrança pendente - R$ {enrollmentCharge.valor_total.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEnrollmentDialogOpen(true)}
                          variant="outline"
                          size="sm"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Ver QR Code
                        </Button>
                        <Button
                          onClick={handleCancelEnrollmentCharge}
                          disabled={cancellingCharge}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          {cancellingCharge ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                          Cancelar Cobrança
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma cobrança de matrícula ativa. Você pode gerar uma nova cobrança com os valores abaixo.
                      </p>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Matrícula</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorMatricula}
                            onChange={(e) => setValorMatricula(e.target.value)}
                            placeholder="100.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Uniforme</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorUniforme}
                            onChange={(e) => setValorUniforme(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Primeira Mensalidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorMensalidade}
                            onChange={(e) => setValorMensalidade(e.target.value)}
                            placeholder="170.00"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold text-primary">
                          R$ {((parseFloat(valorMatricula) || 0) + (parseFloat(valorUniforme) || 0) + (parseFloat(valorMensalidade) || 0)).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <Button
                        onClick={handleGenerateEnrollmentChargeExisting}
                        disabled={generatingCharge}
                        className="w-full"
                      >
                        {generatingCharge ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                        Gerar Cobrança de Matrícula
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial info card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && !isNewStudent ? (
                  <>
                    {/* Campos de Entrada - Matrícula, Uniforme, Mensalidade */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4 mb-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Valores de Entrada</span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Matrícula</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorMatricula}
                            onChange={(e) => setValorMatricula(e.target.value)}
                            placeholder="100.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Uniforme</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorUniforme}
                            onChange={(e) => setValorUniforme(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Primeira Mensalidade</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorMensalidade}
                            onChange={(e) => setValorMensalidade(e.target.value)}
                            placeholder="170.00"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor da Mensalidade *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorMensalidade}
                          onChange={(e) => setValorMensalidade(e.target.value)}
                          placeholder="170.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dia de Vencimento</Label>
                        <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                Dia {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Forma de Cobrança</Label>
                        <div className="flex items-center h-10 px-3 border rounded-md bg-muted/30">
                          <span className="text-sm">Mensal</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Status Financeiro</Label>
                        <Select value={statusFinanceiro} onValueChange={(v) => setStatusFinanceiro(v as 'ativo' | 'suspenso' | 'isento')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                            <SelectItem value="isento">Isento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Início da Cobrança</Label>
                      <Input
                        type="date"
                        value={dataInicioCobranca}
                        onChange={(e) => setDataInicioCobranca(e.target.value)}
                      />
                    </div>
                  </>
                ) : isNewStudent && resumoSaved ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dia de Vencimento</Label>
                      <Select value={diaVencimento} onValueChange={setDiaVencimento} disabled={financeiroSaved}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              Dia {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Forma de Cobrança</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-muted/30">
                        <span className="text-sm">Mensal</span>
                      </div>
                    </div>
                  </div>
                ) : student ? (
                  <>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">Valor Mensalidade</p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          R$ {(student?.valor_mensalidade ?? 170).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">Dia de Vencimento</p>
                        <p className="text-2xl font-bold mt-1">
                          {student?.dia_vencimento ?? 8}
                        </p>
                      </div>
                      <div className={`p-4 border rounded-lg text-center text-white ${finInfo.color}`}>
                        <p className="text-sm opacity-90">Status</p>
                        <p className="text-lg font-semibold mt-1 flex items-center justify-center gap-2">
                          <FinIcon className="w-5 h-5" />
                          {finInfo.text}
                        </p>
                      </div>
                    </div>

                    {student?.financeiroStatus && (student.financeiroStatus.pendentes > 0 || student.financeiroStatus.atrasadas > 0) && (
                      <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                        <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">Atenção</p>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                          {student.financeiroStatus.pendentes > 0 && (
                            <li>• {student.financeiroStatus.pendentes} mensalidade(s) pendente(s)</li>
                          )}
                          {student.financeiroStatus.atrasadas > 0 && (
                            <li>• {student.financeiroStatus.atrasadas} mensalidade(s) atrasada(s)</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {student?.data_inicio_cobranca && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Início da cobrança:</span>{' '}
                        {format(new Date(student.data_inicio_cobranca + 'T12:00:00'), 'dd/MM/yyyy')}
                      </div>
                    )}

                    {/* Button to generate individual billing */}
                    {student?.status_financeiro === 'ativo' && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setBillingDialogOpen(true)}
                          disabled={generatingBilling}
                        >
                          {generatingBilling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Gerar Mensalidade
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Cadastre o aluno primeiro
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Cobranças - with delete capability */}
            {student && (
              <FinanceiroHistoricoUnificado criancaId={student.id} canDelete={true} />
            )}
          </TabsContent>

          {/* Jornada - eventos esportivos */}
          <TabsContent value="jornada" className="mt-0">
            {student && <AlunoHistoricoSection criancaId={student.id} />}
          </TabsContent>

          {/* Aulas - histórico de presença */}
          <TabsContent value="aulas" className="mt-0">
            {student && <AlunoAulasSection criancaId={student.id} />}
          </TabsContent>
        </Tabs>

        {/* Enrollment Checkout Dialog */}
        {student && effectiveEscolinhaId && (
          <EnrollmentPixCheckoutDialog
            open={enrollmentDialogOpen}
            onOpenChange={setEnrollmentDialogOpen}
            criancaId={student.id}
            criancaNome={student.nome}
            escolinhaId={effectiveEscolinhaId}
            valorMensalidade={student.valor_mensalidade ?? 170}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['school-children'] });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
    
    {/* Confirmation dialog for closing with unsaved data */}
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar cadastro?</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem dados não salvos no formulário de cadastro. Se sair agora, os dados serão mantidos para continuar depois. Deseja descartar completamente ou manter o rascunho?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={cancelClose}>
            Continuar editando
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              // Try to save to server if all required fields are filled
              if (nome.trim() && dataNascimento && responsavelNome.trim() && responsavelEmail.trim()) {
                // Save to server then close
                saveResumoMutation.mutate(undefined, {
                  onSuccess: () => {
                    clearDraft();
                    setShowCloseConfirm(false);
                    setPendingClose(false);
                    toast.success('Aluno salvo com sucesso!');
                    onOpenChange(false);
                  },
                  onError: () => {
                    // If server save fails, keep as draft
                    saveDraft();
                    setShowCloseConfirm(false);
                    setPendingClose(false);
                    toast.info('Não foi possível salvar no servidor. Rascunho mantido.');
                    onOpenChange(false);
                  }
                });
              } else {
                // Not enough data for server save, keep as draft
                saveDraft();
                setShowCloseConfirm(false);
                setPendingClose(false);
                onOpenChange(false);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar e sair
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={confirmClose}
            className="bg-destructive hover:bg-destructive/90"
          >
            Descartar tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Individual Billing Generation Dialog */}
    <GenerateIndividualBillingDialog
      open={billingDialogOpen}
      onOpenChange={setBillingDialogOpen}
      onConfirm={handleGenerateBilling}
      isLoading={generatingBilling}
      studentName={student?.nome || nome || ''}
    />
    </>
  );
};

export default AlunoFichaDialog;
