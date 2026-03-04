import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Copy, Eye, EyeOff, MessageCircle, Upload, User, X, Mail, Check } from 'lucide-react';
import { useCreateProfessor, useUpdateProfessor, type Professor } from '@/hooks/useSchoolData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Professor | null;
}

const TeacherFormDialog = ({ open, onOpenChange, teacher }: TeacherFormDialogProps) => {
  const isEditing = !!teacher;
  const { user } = useAuth();
  const createTeacher = useCreateProfessor();
  const updateTeacher = useUpdateProfessor();
  
  // Basic fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [tipoProfissional, setTipoProfissional] = useState('professor');
  
  // Extended fields
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [horaAula, setHoraAula] = useState('');
  const [tipoContratacao, setTipoContratacao] = useState('');
  
  // Temp password display
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Photo upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch escola name for email
  const { data: escolinha } = useQuery({
    queryKey: ['escolinha-for-email', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return null;
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome')
        .eq('id', user.escolinhaId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.escolinhaId,
  });

  // Reset form when dialog opens or teacher changes
  useEffect(() => {
    if (open) {
      setNome(teacher?.nome || '');
      setEmail(teacher?.email || '');
      setTelefone(teacher?.telefone || '');
      setFotoUrl(teacher?.foto_url || '');
      setTipoProfissional(teacher?.tipo_profissional || 'professor');
      setCpf(teacher?.cpf || '');
      setEndereco(teacher?.endereco || '');
      setCidade(teacher?.cidade || '');
      setEstado(teacher?.estado || '');
      setCep(teacher?.cep || '');
      setHoraAula(teacher?.hora_aula?.toString() || '');
      setTipoContratacao(teacher?.tipo_contratacao || '');
      setTempPassword(null);
      setShowPassword(false);
      setEmailSent(false);
    }
  }, [open, teacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !email.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (isEditing && teacher) {
        await updateTeacher.mutateAsync({
          id: teacher.id,
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone || null,
          foto_url: fotoUrl || null,
          tipo_profissional: tipoProfissional,
          cpf: cpf || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          hora_aula: horaAula ? parseFloat(horaAula) : null,
          tipo_contratacao: tipoContratacao || null,
        });
        toast.success(tipoProfissional === 'assistente' ? 'Assistente atualizado' : 'Professor atualizado');
        onOpenChange(false);
      } else {
        const result = await createTeacher.mutateAsync({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone || undefined,
          fotoUrl: fotoUrl || undefined,
          tipoProfissional: tipoProfissional,
          cpf: cpf || undefined,
          endereco: endereco || undefined,
          cidade: cidade || undefined,
          estado: estado || undefined,
          cep: cep || undefined,
          horaAula: horaAula ? parseFloat(horaAula) : undefined,
          tipoContratacao: tipoContratacao || undefined,
        });
        
        if (result.tempPassword) {
          setTempPassword(result.tempPassword);
          toast.success(tipoProfissional === 'assistente' ? 'Assistente cadastrado com login criado!' : 'Professor cadastrado com login criado!');
        } else {
          toast.success(tipoProfissional === 'assistente' ? 'Assistente cadastrado' : 'Professor cadastrado');
          onOpenChange(false);
        }
      }
    } catch (err) {
      toast.error(tipoProfissional === 'assistente' ? 'Erro ao salvar assistente' : 'Erro ao salvar professor');
    }
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Senha copiada!');
    }
  };

  const openWhatsApp = () => {
    if (telefone) {
      const phone = telefone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  const sendCredentialsByEmail = async () => {
    if (!tempPassword || !email || !nome) {
      toast.error('Dados insuficientes para enviar email');
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-teacher-welcome-email', {
        body: {
          teacherName: nome,
          teacherEmail: email,
          schoolName: escolinha?.nome || 'Escolinha',
          tempPassword: tempPassword,
          tipoProfissional: tipoProfissional,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEmailSent(true);
      toast.success('Credenciais enviadas por email com sucesso!');
    } catch (err: any) {
      console.error('Erro ao enviar email:', err);
      toast.error('Erro ao enviar email: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `professor-${Date.now()}.${fileExt}`;
      const filePath = `professores/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escolinha-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escolinha-logos')
        .getPublicUrl(filePath);

      setFotoUrl(publicUrl);
      toast.success('Foto carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setFotoUrl('');
  };

  const isPending = createTeacher.isPending || updateTeacher.isPending;

  // If we have a temp password to show, display success screen
  if (tempPassword) {
    const tipoLabel = tipoProfissional === 'assistente' ? 'Assistente Técnico' : 'Professor';
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tipoLabel} Cadastrado com Sucesso!</DialogTitle>
            <DialogDescription>
              Envie as credenciais por email ou copie a senha temporária abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Email de acesso</Label>
                <p className="font-medium">{email}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Senha temporária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded text-lg font-mono">
                    {showPassword ? tempPassword : '••••••••••••'}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={copyPassword}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Email sending section */}
            <div className="space-y-2">
              <Button 
                onClick={sendCredentialsByEmail} 
                disabled={isSendingEmail || emailSent}
                className="w-full"
                variant={emailSent ? "outline" : "default"}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : emailSent ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-success" />
                    Email Enviado!
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Credenciais por Email
                  </>
                )}
              </Button>
              {emailSent && (
                <p className="text-sm text-success text-center">
                  ✓ As credenciais foram enviadas para {email}
                </p>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              ⚠️ Esta senha só será exibida uma vez. Certifique-se de anotá-la ou enviá-la ao professor.
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? (tipoProfissional === 'assistente' ? 'Editar Assistente Técnico' : 'Editar Professor')
              : 'Cadastrar Novo Profissional'
            }
          </DialogTitle>
          {!isEditing && (
            <DialogDescription>
              Um login será criado automaticamente para o profissional acessar o sistema.
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Tipo de Profissional */}
          <div className="space-y-2">
            <Label htmlFor="tipoProfissional">Tipo de Profissional *</Label>
            <Select value={tipoProfissional} onValueChange={setTipoProfissional}>
              <SelectTrigger id="tipoProfissional">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="assistente">Assistente Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@email.com"
                  required
                  disabled={isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                <div className="flex gap-2">
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(21) 99999-0000"
                    className="flex-1"
                  />
                  {telefone && (
                    <Button type="button" variant="outline" size="icon" onClick={openWhatsApp}>
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados Profissionais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Dados Profissionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horaAula">Valor Hora-Aula (R$)</Label>
                <Input
                  id="horaAula"
                  type="number"
                  step="0.01"
                  value={horaAula}
                  onChange={(e) => setHoraAula(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoContratacao">Tipo de Contratação</Label>
                <Select value={tipoContratacao || "none"} onValueChange={(v) => setTipoContratacao(v === "none" ? "" : v)}>
                  <SelectTrigger id="tipoContratacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="contratado">Contratado</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Foto do Professor (opcional)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20 cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <AvatarImage src={fotoUrl} alt="Foto do professor" />
                      <AvatarFallback className="bg-muted">
                        {isUploadingPhoto ? (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {fotoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="w-full"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {fotoUrl ? 'Alterar foto' : 'Enviar foto'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG ou WEBP até 2MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Salvar' : 'Cadastrar Professor'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherFormDialog;