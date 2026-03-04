import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  Phone, 
  Copy, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { validateCPF } from '@/lib/cpf-validator';

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

export interface GuardianData {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  senha_temporaria?: string | null;
  senha_temporaria_ativa?: boolean | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

interface GuardianEditCardProps {
  guardianData: GuardianData | null;
  parentesco: string;
  loading: boolean;
  onGuardianUpdated?: (data: GuardianData) => void;
  onParentescoChange?: (value: string) => void;
  criancaId?: string;
}

export default function GuardianEditCard({
  guardianData,
  parentesco,
  loading,
  onGuardianUpdated,
  onParentescoChange,
  criancaId,
}: GuardianEditCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [editParentesco, setEditParentesco] = useState('');
  
  // Email change warning
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const originalEmail = guardianData?.email || '';

  // Reset fields when guardian data changes
  useEffect(() => {
    if (guardianData) {
      setNome(guardianData.nome || '');
      setEmail(guardianData.email || '');
      setTelefone(guardianData.telefone || '');
      setCpf(guardianData.cpf || '');
    }
    setEditParentesco(parentesco || '');
  }, [guardianData, parentesco]);

  // Check if email changed
  useEffect(() => {
    const emailChanged = email.toLowerCase().trim() !== originalEmail.toLowerCase().trim();
    setShowEmailWarning(emailChanged && email.trim() !== '');
  }, [email, originalEmail]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!guardianData) throw new Error('Dados do responsável não encontrados');
      
      // Validate required fields
      if (!nome.trim()) throw new Error('Nome é obrigatório');
      if (!email.trim()) throw new Error('E-mail é obrigatório');
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) throw new Error('E-mail inválido');
      
      // Validate CPF if provided
      if (cpf && cpf.replace(/\D/g, '').length === 11 && !validateCPF(cpf)) {
        throw new Error('CPF inválido');
      }
      
      // Check if email is already used by another responsavel
      if (email.toLowerCase().trim() !== originalEmail.toLowerCase().trim()) {
        const { data: existing } = await supabase
          .from('responsaveis')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .neq('id', guardianData.id)
          .maybeSingle();
        
        if (existing) {
          throw new Error('Este e-mail já está cadastrado para outro responsável');
        }
      }
      
      // Update responsavel
      const { error: respError } = await supabase
        .from('responsaveis')
        .update({
          nome: nome.trim(),
          email: email.toLowerCase().trim(),
          telefone: telefone.replace(/\D/g, '') || null,
          cpf: cpf.replace(/\D/g, '') || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', guardianData.id);
      
      if (respError) throw respError;
      
      // Update parentesco if changed and criancaId is provided
      if (criancaId && editParentesco !== parentesco) {
        const { error: linkError } = await supabase
          .from('crianca_responsavel')
          .update({ parentesco: editParentesco || null })
          .eq('crianca_id', criancaId)
          .eq('responsavel_id', guardianData.id);
        
        if (linkError) throw linkError;
      }
      
      return {
        ...guardianData,
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        cpf: cpf.replace(/\D/g, '') || null,
      };
    },
    onSuccess: (updatedData) => {
      toast.success('Dados do responsável atualizados!');
      setIsEditing(false);
      onGuardianUpdated?.(updatedData);
      onParentescoChange?.(editParentesco);
      queryClient.invalidateQueries({ queryKey: ['school-children'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (guardianData) {
      setNome(guardianData.nome || '');
      setEmail(guardianData.email || '');
      setTelefone(guardianData.telefone || '');
      setCpf(guardianData.cpf || '');
    }
    setEditParentesco(parentesco || '');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!guardianData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Responsável não encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Responsável
            {parentesco && !isEditing && (
              <Badge variant="secondary" className="font-normal text-xs">
                {parentesco}
              </Badge>
            )}
          </CardTitle>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                disabled={saveMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo do responsável"
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
              {showEmailWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-400">
                    <p className="font-medium">Atenção: Alteração de e-mail</p>
                    <p className="text-xs mt-1">
                      Alterar o e-mail aqui <strong>não</strong> muda o login do responsável. 
                      Se ele já recebeu credenciais, continuará usando o e-mail anterior para acessar o sistema.
                      Para alterar o login, será necessário reenviar as credenciais.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formatPhone(telefone)}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={formatCpf(cpf)}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
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
            
            <div className="space-y-2">
              <Label>Parentesco</Label>
              <Select value={editParentesco || "none"} onValueChange={(v) => setEditParentesco(v === "none" ? "" : v)}>
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
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Nome</span>
              <p className="font-medium">{guardianData.nome}</p>
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">E-mail</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{guardianData.email}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(guardianData.email, 'Email')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {guardianData.telefone && (
              <>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Telefone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatPhone(guardianData.telefone)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(guardianData.telefone!, 'Telefone')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
            {guardianData.cpf && (
              <>
                <Separator />
                <div className="space-y-1 text-sm">
                  <span className="text-muted-foreground">CPF</span>
                  <p className="font-medium">{formatCpf(guardianData.cpf)}</p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
