import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2, Landmark, Building2, User, MapPin, CreditCard, CheckCircle2, Send, Clock, AlertTriangle, RefreshCw, XCircle, Search, Info } from 'lucide-react';
import DocumentUploadSection from './DocumentUploadSection';
import AsaasStatusTimeline from './AsaasStatusTimeline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Faixas de faturamento para o Asaas
const INCOME_RANGES = [
  { value: '1000', label: 'Até R$ 1.000', numericValue: 1000 },
  { value: '5000', label: 'De R$ 1.001 a R$ 5.000', numericValue: 5000 },
  { value: '10000', label: 'De R$ 5.001 a R$ 10.000', numericValue: 10000 },
  { value: '50000', label: 'De R$ 10.001 a R$ 50.000', numericValue: 50000 },
  { value: '100000', label: 'Acima de R$ 50.000', numericValue: 100000 },
];

// Map Asaas error messages to form field names
const ASAAS_ERROR_FIELD_MAP: Record<string, string> = {
  'banco': 'banco',
  'informe o banco': 'banco',
  'informe o código do banco': 'banco',
  'birthdate': 'dataNascimento',
  'data de nascimento': 'dataNascimento',
  'renda': 'incomeValue',
  'faturamento': 'incomeValue',
  'incomevalue': 'incomeValue',
  'email': 'email',
  'cpfcnpj': 'tipoPessoa',
  'cpf': 'tipoPessoa',
  'cnpj': 'tipoPessoa',
  'telefone': 'telefone',
  'mobilephone': 'telefone',
  'cep': 'cep',
  'postalcode': 'cep',
  'rua': 'rua',
  'address': 'rua',
  'numero': 'numero',
  'addressnumber': 'numero',
  'bairro': 'bairro',
  'province': 'bairro',
  'agencia': 'agencia',
  'agency': 'agencia',
  'conta': 'conta',
  'account': 'conta',
  'nome': 'nome',
  'name': 'nome',
};

// Field labels for user-friendly messages
const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  dataNascimento: 'Data de Nascimento',
  incomeValue: 'Faturamento/Renda Mensal',
  cep: 'CEP',
  rua: 'Rua',
  numero: 'Número',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  banco: 'Banco',
  agencia: 'Agência',
  conta: 'Conta',
  tipoConta: 'Tipo de Conta',
};

const cadastroBancarioSchema = z.object({
  tipoPessoa: z.enum(['cpf', 'cnpj'], { required_error: 'Selecione o tipo de cadastro' }),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  dataNascimento: z.string().optional(),
  incomeValue: z.string().min(1, 'Faturamento mensal é obrigatório'),
  cep: z.string().min(1, 'CEP é obrigatório'),
  rua: z.string().min(1, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(1, 'Estado é obrigatório'),
  banco: z.string().min(1, 'Banco é obrigatório').max(100),
  agencia: z.string().min(1, 'Agência é obrigatória').max(20),
  conta: z.string().min(1, 'Conta é obrigatória').max(30),
  tipoConta: z.enum(['corrente', 'poupanca'], { required_error: 'Selecione o tipo de conta' }),
});

type CadastroBancarioFormData = z.infer<typeof cadastroBancarioSchema>;

interface Escolinha {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_documento: string | null;
}

interface CadastroBancario {
  id: string;
  escolinha_id: string;
  tipo_pessoa: 'cpf' | 'cnpj';
  nome: string;
  email: string;
  telefone: string | null;
  data_nascimento: string | null;
  income_value: number | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: 'corrente' | 'poupanca';
  asaas_account_id?: string | null;
  asaas_status?: string | null;
  asaas_enviado_em?: string | null;
  asaas_api_key?: string | null;
}

interface AsaasJob {
  id: string;
  escolinha_id: string;
  tipo: string;
  status: string;
  erro: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function CadastroBancarioForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [asaasStatusInfo, setAsaasStatusInfo] = useState<{
    status: string;
    statusLabel: string;
    statusDescription: string;
    issues?: string[];
    detailedStatus?: {
      general: string;
      commercialInfo: string;
      bankAccountInfo: string;
      documentation: string;
    };
    actionRequired?: boolean;
    actionInstructions?: string;
    accountEmail?: string;
  } | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const getEdgeFunctionErrorMessage = async (error: unknown): Promise<string> => {
    const fallback = error instanceof Error ? error.message : 'Erro ao processar solicitação';
    const anyErr = error as any;

    // supabase-js invoke errors commonly include context.response (Fetch Response)
    const response: Response | undefined = anyErr?.context?.response;
    if (!response || typeof response.text !== 'function') return fallback;

    try {
      const text = await response.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text);
        const msg = parsed?.error || parsed?.message;
        if (typeof msg === 'string' && msg.trim()) return msg;
        return text;
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  };

  // Fetch escola data for pre-filling
  const { data: escolinha, isLoading: loadingEscolinha } = useQuery({
    queryKey: ['escolinha-data', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;

      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome, email, telefone, cep, rua, numero, bairro, cidade, estado, tipo_documento')
        .eq('id', user.escolinhaId)
        .single();

      if (error) throw error;
      return data as Escolinha;
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch existing bank registration
  const { data: cadastroBancario, isLoading: loadingCadastro } = useQuery({
    queryKey: ['escola-cadastro-bancario', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;

      const { data, error } = await supabase
        .from('escola_cadastro_bancario')
        .select('*')
        .eq('escolinha_id', user.escolinhaId)
        .maybeSingle();

      if (error) throw error;
      return data as CadastroBancario | null;
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch uploaded documents (not just count - we need to know which types are uploaded)
  const { data: documentos = [], refetch: refetchDocumentos } = useQuery({
    queryKey: ['escola-documentos', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('escola_documentos')
        .select('id, tipo_documento')
        .eq('escolinha_id', user.escolinhaId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.escolinhaId,
  });

  // Fetch last Asaas job (for tracking attempts/status)
  const { data: lastAsaasJob } = useQuery({
    queryKey: ['escola-asaas-last-job', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;

      const { data, error } = await supabase
        .from('escola_asaas_jobs')
        .select('id, escolinha_id, tipo, status, erro, created_at, processed_at')
        .eq('escolinha_id', user.escolinhaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as AsaasJob) || null;
    },
    enabled: !!user?.escolinhaId,
  });

  const form = useForm<CadastroBancarioFormData>({
    resolver: zodResolver(cadastroBancarioSchema),
    defaultValues: {
      tipoPessoa: 'cnpj',
      nome: '',
      email: '',
      telefone: '',
      dataNascimento: '',
      incomeValue: '',
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      banco: '',
      agencia: '',
      conta: '',
      tipoConta: 'corrente',
    },
  });

  // Pre-fill form with escola data or existing cadastro
  useEffect(() => {
    if (cadastroBancario) {
      // Find the matching income range for the stored value
      const incomeValueStr = cadastroBancario.income_value 
        ? INCOME_RANGES.find(r => r.numericValue === cadastroBancario.income_value)?.value || ''
        : '';
      
      form.reset({
        tipoPessoa: cadastroBancario.tipo_pessoa,
        nome: cadastroBancario.nome,
        email: cadastroBancario.email,
        telefone: cadastroBancario.telefone || '',
        dataNascimento: cadastroBancario.data_nascimento || '',
        incomeValue: incomeValueStr,
        cep: cadastroBancario.cep || '',
        rua: cadastroBancario.rua || '',
        numero: cadastroBancario.numero || '',
        complemento: cadastroBancario.complemento || '',
        bairro: cadastroBancario.bairro || '',
        cidade: cadastroBancario.cidade || '',
        estado: cadastroBancario.estado || '',
        banco: cadastroBancario.banco,
        agencia: cadastroBancario.agencia,
        conta: cadastroBancario.conta,
        tipoConta: cadastroBancario.tipo_conta,
      });
      setShowForm(true);
    } else if (escolinha && !cadastroBancario) {
      form.reset({
        tipoPessoa: escolinha.tipo_documento === 'cpf' ? 'cpf' : 'cnpj',
        nome: escolinha.nome,
        email: escolinha.email || '',
        telefone: escolinha.telefone || '',
        dataNascimento: '',
        incomeValue: '',
        cep: escolinha.cep || '',
        rua: escolinha.rua || '',
        numero: escolinha.numero || '',
        complemento: '',
        bairro: escolinha.bairro || '',
        cidade: escolinha.cidade || '',
        estado: escolinha.estado || '',
        banco: '',
        agencia: '',
        conta: '',
        tipoConta: 'corrente',
      });
    }
  }, [escolinha, cadastroBancario, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CadastroBancarioFormData) => {
      if (!user?.escolinhaId) throw new Error('Escola não encontrada');

      // Convert the selected income range to numeric value
      const selectedIncomeRange = INCOME_RANGES.find(r => r.value === data.incomeValue);
      const incomeValueNumeric = selectedIncomeRange?.numericValue || null;

      const payload = {
        escolinha_id: user.escolinhaId,
        tipo_pessoa: data.tipoPessoa,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || null,
        data_nascimento: data.dataNascimento || null,
        income_value: incomeValueNumeric,
        cep: data.cep || null,
        rua: data.rua || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        banco: data.banco,
        agencia: data.agencia,
        conta: data.conta,
        tipo_conta: data.tipoConta,
      };

      if (cadastroBancario) {
        // Update existing
        const { error } = await supabase
          .from('escola_cadastro_bancario')
          .update(payload)
          .eq('id', cadastroBancario.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('escola_cadastro_bancario')
          .insert(payload);

        if (error) throw error;
      }

      // Evita regressão: não derrubar de APROVADO para EM_ANALISE ao salvar o formulário.
      // Só marcamos EM_ANALISE quando ainda não estava aprovado (ex.: NAO_CONFIGURADO/REPROVADO).
      const { error: statusError } = await supabase
        .from('escolinhas')
        .update({ status_financeiro_escola: 'EM_ANALISE' })
        .eq('id', user.escolinhaId)
        .in('status_financeiro_escola', ['NAO_CONFIGURADO', 'REPROVADO']);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      toast.success('Cadastro bancário salvo com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['escola-cadastro-bancario'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-financial-status'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-header'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Submit to Asaas mutation
  const submitToAsaasMutation = useMutation({
    mutationFn: async () => {
      if (!user?.escolinhaId) throw new Error('Escola não encontrada');

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Sessão não encontrada');

      const { data, error } = await supabase.functions.invoke('asaas-submit-registration', {
        body: { escolinha_id: user.escolinhaId },
      });

      if (error) {
        const detailed = await getEdgeFunctionErrorMessage(error);
        throw new Error(detailed);
      }

      const result: any = data;
      if (!result?.success) throw new Error(result?.error || 'Erro ao enviar cadastro');

      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Cadastro enviado para análise!');
      queryClient.invalidateQueries({ queryKey: ['escola-cadastro-bancario'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-financial-status'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-header'] });
      queryClient.invalidateQueries({ queryKey: ['escola-asaas-last-job'] });
    },
    onError: (error: Error) => {
      form.clearErrors();
      // Try to parse the error to highlight the specific field
      const fieldToHighlight = parseAsaasError(error.message);
      if (fieldToHighlight) {
        setHighlightedFields([fieldToHighlight]);
        form.setError(fieldToHighlight as keyof CadastroBancarioFormData, {
          type: 'server',
          message: error.message,
        });
        setTimeout(() => scrollToField(fieldToHighlight), 100);
        toast.error(`Erro no campo: ${FIELD_LABELS[fieldToHighlight] || fieldToHighlight}`, {
          description: error.message,
          duration: 6000,
        });
      } else {
        toast.error(`Erro ao enviar: ${error.message}`);
      }
    },
  });

  const onSubmit = (data: CadastroBancarioFormData) => {
    setHighlightedFields([]); // Clear any previous highlights
    saveMutation.mutate(data);
  };

  // Parse Asaas error message to identify the field
  const parseAsaasError = (errorMessage: string): string | null => {
    const lowerError = errorMessage.toLowerCase();
    for (const [keyword, fieldName] of Object.entries(ASAAS_ERROR_FIELD_MAP)) {
      if (lowerError.includes(keyword)) {
        return fieldName;
      }
    }
    return null;
  };

  // Scroll to the first error field
  const scrollToField = (fieldName: string) => {
    const root = formRef.current;
    if (!root) return;

    // 1) Direct form fields (inputs, textareas)
    const byName = root.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;

    // 2) Fallback for custom controls (Select, Trigger buttons, wrappers)
    const byDataField = root.querySelector(`[data-field="${fieldName}"]`) as HTMLElement | null;
    const byId = root.querySelector(`#field-${fieldName}`) as HTMLElement | null;

    const el = byName ?? byDataField ?? byId;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = (el.matches('input,textarea,select,button')
      ? el
      : (el.querySelector('input,textarea,select,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null))
      ?? el;
    focusable.focus?.();
  };

  // Validate all required fields before Asaas submission
  const validateBeforeAsaasSubmit = (): { valid: boolean; missingFields: string[] } => {
    const values = form.getValues();
    const missingFields: string[] = [];
    const tipoPessoa = values.tipoPessoa;

    // Common required fields
    const commonRequired = ['nome', 'email', 'telefone', 'incomeValue', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'banco', 'agencia', 'conta', 'tipoConta'];
    
    for (const field of commonRequired) {
      const value = values[field as keyof CadastroBancarioFormData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field);
      }
    }

    // CPF-specific: Data de Nascimento is required
    if (tipoPessoa === 'cpf') {
      if (!values.dataNascimento || values.dataNascimento.trim() === '') {
        missingFields.push('dataNascimento');
      }
    }

    return { valid: missingFields.length === 0, missingFields };
  };

  const handleSubmitToAsaas = () => {
    // Clear previous highlights
    setHighlightedFields([]);
    form.clearErrors();

    // Validate before submitting
    const validation = validateBeforeAsaasSubmit();
    
    if (!validation.valid) {
      // Highlight missing fields
      setHighlightedFields(validation.missingFields);

      // Mark missing fields in RHF so messages appear under each field
      for (const f of validation.missingFields) {
        const msg = f === 'dataNascimento'
          ? 'Este campo é obrigatório para CPF'
          : 'Este campo é obrigatório';
        form.setError(f as keyof CadastroBancarioFormData, { type: 'required', message: msg });
      }
      
      // Build user-friendly message
      const missingLabels = validation.missingFields.map(f => FIELD_LABELS[f] || f);
      toast.error(`Preencha todos os campos obrigatórios antes de enviar`, {
        description: `Faltam: ${missingLabels.join(', ')}`,
        duration: 6000,
      });
      
      // Scroll to first missing field
      if (validation.missingFields.length > 0) {
        setTimeout(() => scrollToField(validation.missingFields[0]), 100);
      }
      return;
    }

    submitToAsaasMutation.mutate();
  };

  // Check Asaas status mutation
  const checkAsaasStatusMutation = useMutation({
    mutationFn: async () => {
      if (!user?.escolinhaId) throw new Error('Escola não encontrada');

      const response = await supabase.functions.invoke('asaas-check-account-status', {
        body: { escolinha_id: user.escolinhaId },
      });

      if (response.error) throw new Error(response.error.message);
      
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Erro ao consultar status');
      
      return result;
    },
    onSuccess: (data) => {
      setAsaasStatusInfo({
        status: data.status,
        statusLabel: data.statusLabel,
        statusDescription: data.statusDescription,
        issues: data.issues || [],
        detailedStatus: data.detailedStatus,
        actionRequired: data.actionRequired,
        actionInstructions: data.actionInstructions,
        accountEmail: data.accountEmail,
      });
      toast.success('Status atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['escola-cadastro-bancario'] });
      queryClient.invalidateQueries({ queryKey: ['escolinha-financial-status'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao consultar: ${error.message}`);
    },
  });

  // Check if can submit to Asaas
  const tipoPessoa = form.watch('tipoPessoa');
  
  // For CPF: need documento_foto_pf
  // For CNPJ: need contrato_social AND documento_responsavel_pj
  const requiredDocTypes = tipoPessoa === 'cpf' 
    ? ['documento_foto_pf'] 
    : ['contrato_social', 'documento_responsavel_pj'];
  
  const uploadedDocTypes = documentos.map(d => d.tipo_documento);
  const hasAllRequiredDocs = requiredDocTypes.every(docType => uploadedDocTypes.includes(docType));
  
  const hasCadastro = !!cadastroBancario;
  const alreadySubmitted = !!cadastroBancario?.asaas_enviado_em;
  const isProcessingJob = lastAsaasJob?.status === 'processando';

  // Watch all required fields for real-time validation
  const watchedFields = form.watch(['nome', 'email', 'telefone', 'dataNascimento', 'incomeValue', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'banco', 'agencia', 'conta', 'tipoConta']);
  
  // Check if all required fields are filled (real-time)
  const checkRequiredFieldsFilled = (): { allFilled: boolean; missingFields: string[] } => {
    const values = form.getValues();
    const missingFields: string[] = [];
    
    const commonRequired = ['nome', 'email', 'telefone', 'incomeValue', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'banco', 'agencia', 'conta', 'tipoConta'];
    
    for (const field of commonRequired) {
      const value = values[field as keyof CadastroBancarioFormData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field);
      }
    }
    
    if (values.tipoPessoa === 'cpf') {
      if (!values.dataNascimento || values.dataNascimento.trim() === '') {
        missingFields.push('dataNascimento');
      }
    }
    
    return { allFilled: missingFields.length === 0, missingFields };
  };
  
  const requiredFieldsCheck = checkRequiredFieldsFilled();
  const hasAllRequiredFields = requiredFieldsCheck.allFilled;
  
  const canSubmitToAsaas = hasCadastro && hasAllRequiredDocs && hasAllRequiredFields && !alreadySubmitted && !isProcessingJob;
  
  // Generate tooltip message for disabled button
  const getSubmitButtonTooltip = (): string | null => {
    if (!hasCadastro) return 'Salve o cadastro bancário primeiro';
    if (!hasAllRequiredDocs) return 'Envie todos os documentos obrigatórios';
    if (!hasAllRequiredFields) {
      const missingLabels = requiredFieldsCheck.missingFields.slice(0, 3).map(f => FIELD_LABELS[f] || f);
      const remaining = requiredFieldsCheck.missingFields.length - 3;
      return `Preencha: ${missingLabels.join(', ')}${remaining > 0 ? ` e mais ${remaining}` : ''}`;
    }
    if (isProcessingJob) return 'Aguarde o processamento atual';
    if (alreadySubmitted) return 'Cadastro já enviado para análise';
    return null;
  };

  if (loadingEscolinha || loadingCadastro) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show initial state with button
  if (!showForm && !cadastroBancario) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <CardTitle>Cadastro Bancário da Escola</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-muted-foreground">
              Para emitir cobranças automáticas e receber pagamentos dos alunos, é necessário completar o cadastro bancário da escola.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Landmark className="w-4 h-4" />
            Iniciar cadastro bancário
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Helper to get status badge styling
  const getStatusBadge = () => {
    const status = asaasStatusInfo?.status || cadastroBancario?.asaas_status;
    if (!status) return null;

    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Aprovado' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <XCircle className="w-4 h-4" />, label: 'Rejeitado' },
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: <Clock className="w-4 h-4" />, label: 'Em Análise' },
      awaiting_action: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: <AlertTriangle className="w-4 h-4" />, label: 'Ação Necessária' },
      not_submitted: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: <Info className="w-4 h-4" />, label: 'Não Enviado' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        <span className="text-sm font-medium">{asaasStatusInfo?.statusLabel || config.label}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <CardTitle>Cadastro Bancário da Escola</CardTitle>
          </div>
          {(cadastroBancario?.asaas_status || asaasStatusInfo) && getStatusBadge()}
        </div>
        <CardDescription>
          Preencha os dados abaixo para habilitar o recebimento de pagamentos via PIX.
        </CardDescription>
        
        {/* Asaas Description */}
        <Alert className="mt-4 border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <strong>Integração com Asaas:</strong> As cobranças da sua escola serão processadas através do <strong>Asaas</strong>, 
            uma plataforma de pagamentos segura e automatizada. Após a aprovação do cadastro, você poderá gerar boletos 
            e receber pagamentos via PIX dos responsáveis dos alunos.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        {/* Status Timeline */}
        <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
          <AsaasStatusTimeline
            hasCadastro={hasCadastro}
            hasRequiredDocs={hasAllRequiredDocs}
            asaasStatus={asaasStatusInfo?.status || cadastroBancario?.asaas_status || null}
            submittedAt={cadastroBancario?.asaas_enviado_em || null}
            asaasAccountId={cadastroBancario?.asaas_account_id || null}
            lastJob={
              lastAsaasJob
                ? {
                    status: lastAsaasJob.status,
                    error: lastAsaasJob.erro,
                    createdAt: lastAsaasJob.created_at,
                  }
                : null
            }
          />
          
          {/* Detailed Status Info - Show when we have details from Asaas */}
          {asaasStatusInfo?.detailedStatus && cadastroBancario?.asaas_account_id && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <h4 className="text-sm font-medium text-foreground">Status Detalhado da Conta</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className={`p-2.5 rounded-lg ${asaasStatusInfo.detailedStatus.general === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-secondary border border-border'}`}>
                  <span className="text-muted-foreground block mb-1">Geral</span>
                  <span className={`font-medium ${asaasStatusInfo.detailedStatus.general === 'APPROVED' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {asaasStatusInfo.detailedStatus.general === 'APPROVED' ? '✓ Aprovado' :
                     asaasStatusInfo.detailedStatus.general === 'PENDING' ? 'Pendente' : 
                     asaasStatusInfo.detailedStatus.general}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg ${asaasStatusInfo.detailedStatus.commercialInfo === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-secondary border border-border'}`}>
                  <span className="text-muted-foreground block mb-1">Comercial</span>
                  <span className={`font-medium ${asaasStatusInfo.detailedStatus.commercialInfo === 'APPROVED' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {asaasStatusInfo.detailedStatus.commercialInfo === 'APPROVED' ? '✓ Aprovado' :
                     asaasStatusInfo.detailedStatus.commercialInfo === 'PENDING' ? 'Pendente' : 
                     asaasStatusInfo.detailedStatus.commercialInfo}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg ${asaasStatusInfo.detailedStatus.bankAccountInfo === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                  <span className="text-muted-foreground block mb-1">Bancário</span>
                  <span className={`font-medium ${asaasStatusInfo.detailedStatus.bankAccountInfo === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {asaasStatusInfo.detailedStatus.bankAccountInfo === 'APPROVED' ? '✓ Aprovado' :
                     asaasStatusInfo.detailedStatus.bankAccountInfo === 'PENDING' ? 'Pendente' : 
                     asaasStatusInfo.detailedStatus.bankAccountInfo}
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg ${asaasStatusInfo.detailedStatus.documentation === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-secondary border border-border'}`}>
                  <span className="text-muted-foreground block mb-1">Documentação</span>
                  <span className={`font-medium ${asaasStatusInfo.detailedStatus.documentation === 'APPROVED' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {asaasStatusInfo.detailedStatus.documentation === 'APPROVED' ? '✓ Aprovado' :
                     asaasStatusInfo.detailedStatus.documentation === 'PENDING' ? 'Pendente' : 
                     asaasStatusInfo.detailedStatus.documentation}
                  </span>
                </div>
              </div>
              
              {/* Issues Alert */}
              {asaasStatusInfo.issues && asaasStatusInfo.issues.length > 0 && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="font-medium mb-2">Pendências identificadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {asaasStatusInfo.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Action Instructions */}
              {asaasStatusInfo.actionInstructions && (
                <Alert className="border-blue-500/30 bg-blue-500/5">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <p className="font-medium mb-1">O que fazer agora:</p>
                    <p className="text-sm">{asaasStatusInfo.actionInstructions}</p>
                    {asaasStatusInfo.accountEmail && (
                      <p className="text-sm mt-2">
                        <strong>Email cadastrado no Asaas:</strong> {asaasStatusInfo.accountEmail}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          O Asaas pode enviar instruções adicionais para este email.
                        </span>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Bank Account Pending Specific Message */}
              {asaasStatusInfo.detailedStatus.bankAccountInfo === 'PENDING' && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="font-medium mb-2">Validação bancária pendente</p>
                    <p className="text-sm mb-2">
                      O Asaas está validando suas informações bancárias. Este processo pode levar de algumas horas até 2 dias úteis.
                    </p>
                    <p className="text-sm">
                      <strong>O que verificar:</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                      <li>Os dados bancários (agência e conta) estão corretos</li>
                      <li>O banco informado corresponde à sua conta</li>
                      <li>A conta está no nome do CPF/CNPJ cadastrado</li>
                    </ul>
                    <p className="text-sm mt-2 text-muted-foreground">
                      Se os dados estiverem corretos, aguarde o processamento do Asaas.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {/* Button to check status */}
          {cadastroBancario?.asaas_account_id && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => checkAsaasStatusMutation.mutate()}
                disabled={checkAsaasStatusMutation.isPending}
                className="gap-2"
              >
                {checkAsaasStatusMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Verificar Status no Asaas
              </Button>
            </div>
          )}
        </div>

        <Form {...form}>
          <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Tipo de Cadastro */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Tipo de Cadastro</h3>
              </div>
              <FormField
                control={form.control}
                name="tipoPessoa"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cpf" id="cpf" />
                          <Label htmlFor="cpf" className="cursor-pointer">Pessoa Física (CPF)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cnpj" id="cnpj" />
                          <Label htmlFor="cnpj" className="cursor-pointer">Pessoa Jurídica (CNPJ)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Dados Cadastrais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Dados Cadastrais</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Dados pré-preenchidos com base no cadastro da escola. Revise e edite se necessário.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('nome') && "text-destructive")}>
                        Nome Completo / Razão Social *
                        {highlightedFields.includes('nome') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Nome da escola ou responsável"
                          className={cn(highlightedFields.includes('nome') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('nome') && !form.formState.errors.nome && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('email') && "text-destructive")}>
                        Email *
                        {highlightedFields.includes('email') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="email@exemplo.com"
                          className={cn(highlightedFields.includes('email') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('email') && !form.formState.errors.email && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('telefone') && "text-destructive")}>
                        Telefone *
                        {highlightedFields.includes('telefone') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="(00) 00000-0000"
                          className={cn(highlightedFields.includes('telefone') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('telefone') && !form.formState.errors.telefone && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                {tipoPessoa === 'cpf' && (
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('dataNascimento') && "text-destructive")}>
                          Data de Nascimento *
                          {highlightedFields.includes('dataNascimento') && <AlertTriangle className="w-3.5 h-3.5" />}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            className={cn(highlightedFields.includes('dataNascimento') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                          />
                        </FormControl>
                        <FormMessage />
                        {highlightedFields.includes('dataNascimento') && !form.formState.errors.dataNascimento && (
                          <p className="text-sm font-medium text-destructive">Este campo é obrigatório para CPF</p>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="incomeValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('incomeValue') && "text-destructive")}>
                        {tipoPessoa === 'cpf' ? 'Renda Mensal' : 'Faturamento Mensal'} *
                        {highlightedFields.includes('incomeValue') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(highlightedFields.includes('incomeValue') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Selecione a faixa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INCOME_RANGES.map((range) => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {highlightedFields.includes('incomeValue') && !form.formState.errors.incomeValue && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Endereço</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('cep') && "text-destructive")}>
                        CEP *
                        {highlightedFields.includes('cep') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00000-000"
                          className={cn(highlightedFields.includes('cep') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('cep') && !form.formState.errors.cep && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rua"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('rua') && "text-destructive")}>
                        Rua *
                        {highlightedFields.includes('rua') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Rua, Avenida, etc."
                          className={cn(highlightedFields.includes('rua') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('rua') && !form.formState.errors.rua && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('numero') && "text-destructive")}>
                        Número *
                        {highlightedFields.includes('numero') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Nº"
                          className={cn(highlightedFields.includes('numero') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('numero') && !form.formState.errors.numero && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apto, Sala, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('bairro') && "text-destructive")}>
                        Bairro *
                        {highlightedFields.includes('bairro') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Bairro"
                          className={cn(highlightedFields.includes('bairro') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('bairro') && !form.formState.errors.bairro && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('cidade') && "text-destructive")}>
                        Cidade *
                        {highlightedFields.includes('cidade') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Cidade"
                          className={cn(highlightedFields.includes('cidade') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('cidade') && !form.formState.errors.cidade && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('estado') && "text-destructive")}>
                        Estado *
                        {highlightedFields.includes('estado') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="UF" 
                          maxLength={2}
                          className={cn(highlightedFields.includes('estado') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('estado') && !form.formState.errors.estado && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Dados Bancários */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Dados Bancários</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="banco"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('banco') && "text-destructive")}>
                        Banco *
                        {highlightedFields.includes('banco') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Código e nome do banco (ex: 001 Banco do Brasil, 237 Bradesco)"
                          className={cn(highlightedFields.includes('banco') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('banco') && !form.formState.errors.banco && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Informe o código numérico do banco seguido do nome (ex: 336 Banco C6, 237 Bradesco)
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('agencia') && "text-destructive")}>
                        Agência *
                        {highlightedFields.includes('agencia') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="0000"
                          className={cn(highlightedFields.includes('agencia') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('agencia') && !form.formState.errors.agencia && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('conta') && "text-destructive")}>
                        Conta *
                        {highlightedFields.includes('conta') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00000-0"
                          className={cn(highlightedFields.includes('conta') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}
                        />
                      </FormControl>
                      <FormMessage />
                      {highlightedFields.includes('conta') && !form.formState.errors.conta && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoConta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn("flex items-center gap-1", highlightedFields.includes('tipoConta') && "text-destructive")}>
                        Tipo de Conta *
                        {highlightedFields.includes('tipoConta') && <AlertTriangle className="w-3.5 h-3.5" />}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(highlightedFields.includes('tipoConta') && "border-destructive ring-destructive/20 focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupanca">Conta Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {highlightedFields.includes('tipoConta') && !form.formState.errors.tipoConta && (
                        <p className="text-sm font-medium text-destructive">Este campo é obrigatório</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Documentos */}
            <DocumentUploadSection tipoPessoa={form.watch('tipoPessoa')} onDocumentChange={refetchDocumentos} />

            {/* Status do envio */}
            {alreadySubmitted && (
              <Alert className="border-border bg-muted/40">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-foreground">
                  Seu cadastro foi enviado para análise. {asaasStatusInfo?.statusDescription || 'Você será notificado quando estiver concluído.'}
                </AlertDescription>
              </Alert>
            )}

            {!alreadySubmitted && lastAsaasJob?.status === 'processando' && (
              <Alert className="border-border bg-muted/40">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-foreground">
                  Envio em processamento. Aguarde alguns instantes antes de tentar novamente.
                </AlertDescription>
              </Alert>
            )}

            {!alreadySubmitted && lastAsaasJob?.status === 'erro' && (
              <Alert className="border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-foreground">
                  O último envio falhou. Revise os dados e tente novamente.
                </AlertDescription>
              </Alert>
            )}

            {!hasCadastro && !alreadySubmitted && (
              <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  Salve o cadastro bancário antes de enviar para validação.
                </AlertDescription>
              </Alert>
            )}

            {hasCadastro && !hasAllRequiredDocs && !alreadySubmitted && (
              <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  Envie todos os documentos obrigatórios antes de enviar para validação.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              {/* Consultar Status Button - only show if already submitted */}
              {alreadySubmitted && (
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={checkAsaasStatusMutation.isPending} 
                  className="gap-2"
                  onClick={() => checkAsaasStatusMutation.mutate()}
                >
                  {checkAsaasStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Consultar Cadastro Asaas
                </Button>
              )}

              <Button type="submit" disabled={saveMutation.isPending} variant="outline" className="gap-2">
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Salvar cadastro
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button 
                        type="button" 
                        disabled={!canSubmitToAsaas || submitToAsaasMutation.isPending} 
                        className="gap-2"
                        onClick={handleSubmitToAsaas}
                      >
                        {(submitToAsaasMutation.isPending || isProcessingJob) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {isProcessingJob ? 'Processando envio' : 'Enviar para validação'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {getSubmitButtonTooltip() && (
                    <TooltipContent>
                      <p>{getSubmitButtonTooltip()}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
