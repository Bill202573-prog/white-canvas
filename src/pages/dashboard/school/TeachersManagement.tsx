import { useState } from 'react';
import { 
  useSchoolTeachersWithTurmas, 
  useSchoolTurmas,
  useUpdateProfessor,
  useUpdateTurma,
  type ProfessorWithTurmas,
} from '@/hooks/useSchoolData';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GraduationCap, 
  Search, 
  ArrowLeft,
  Loader2,
  Check,
  X,
  Phone,
  Mail,
  Plus,
  Edit2,
  Link as LinkIcon,
  KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TeacherFormDialog from '@/components/school/TeacherFormDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const TeachersManagement = () => {
  const { user } = useAuth();
  const { data: teachers = [], isLoading, refetch } = useSchoolTeachersWithTurmas();
  const { data: turmas = [] } = useSchoolTurmas();
  
  // Only show loading on initial load (no cached data)
  const isInitialLoading = isLoading && teachers.length === 0;
  const updateProfessor = useUpdateProfessor();
  const updateTurma = useUpdateTurma();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<ProfessorWithTurmas | null>(null);
  const [linkTurmaDialogOpen, setLinkTurmaDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<ProfessorWithTurmas | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  
  // Resend credentials state
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [teacherToResend, setTeacherToResend] = useState<ProfessorWithTurmas | null>(null);
  const [isResending, setIsResending] = useState(false);

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

  const filteredTeachers = teachers?.filter(teacher => {
    const matchesSearch = teacher.nome.toLowerCase().includes(search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && teacher.ativo) ||
      (filterStatus === 'inactive' && !teacher.ativo);
    return matchesSearch && matchesStatus;
  }) || [];

  const handleToggleStatus = async (teacher: ProfessorWithTurmas) => {
    try {
      // If deactivating, unlink from all turmas first
      if (teacher.ativo && teacher.turmas.length > 0) {
        for (const turma of teacher.turmas) {
          await updateTurma.mutateAsync({ id: turma.id, professor_id: null });
        }
      }
      await updateProfessor.mutateAsync({ id: teacher.id, ativo: !teacher.ativo });
      toast.success(teacher.ativo ? 'Professor desativado e desvinculado das turmas' : 'Professor ativado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const getAvailableTurmas = (teacher: ProfessorWithTurmas) => {
    const linkedIds = teacher.turmas.map(t => t.id);
    return turmas?.filter(t => !linkedIds.includes(t.id) && t.ativo) || [];
  };

  const handleLinkToTurma = async () => {
    if (!selectedTeacher || !selectedTurmaId) return;
    try {
      await updateTurma.mutateAsync({ id: selectedTurmaId, professor_id: selectedTeacher.id });
      toast.success('Professor vinculado à turma');
      setLinkTurmaDialogOpen(false);
      setSelectedTurmaId('');
    } catch {
      toast.error('Erro ao vincular professor');
    }
  };

  const handleUnlinkFromTurma = async (turmaId: string) => {
    try {
      await updateTurma.mutateAsync({ id: turmaId, professor_id: null });
      toast.success('Professor desvinculado da turma');
    } catch {
      toast.error('Erro ao desvincular professor');
    }
  };

  const handleResendCredentials = async () => {
    if (!teacherToResend) return;
    
    setIsResending(true);
    try {
      // First, reset the teacher's password
      const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-teacher-password', {
        body: { professorId: teacherToResend.id },
      });

      if (resetError) throw resetError;
      if (resetData?.error) throw new Error(resetData.error);

      const newTempPassword = resetData.tempPassword;

      // Then, send the email with the new password
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-teacher-welcome-email', {
        body: {
          teacherName: teacherToResend.nome,
          teacherEmail: teacherToResend.email,
          schoolName: escolinha?.nome || 'Escolinha',
          tempPassword: newTempPassword,
          tipoProfissional: teacherToResend.tipo_profissional || 'professor',
        },
      });

      if (emailError) throw emailError;
      if (emailData?.error) throw new Error(emailData.error);

      toast.success(`Credenciais reenviadas para ${teacherToResend.email}`);
      setResendDialogOpen(false);
      setTeacherToResend(null);
      refetch();
    } catch (err: any) {
      console.error('Erro ao reenviar credenciais:', err);
      toast.error('Erro ao reenviar credenciais: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsResending(false);
    }
  };

  const openResendDialog = (teacher: ProfessorWithTurmas) => {
    setTeacherToResend(teacher);
    setResendDialogOpen(true);
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Gerenciar Profissionais
            </h1>
            <p className="text-muted-foreground">
              {teachers?.length || 0} profissional(is) cadastrado(s)
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todos
              </Button>
              <Button 
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Ativos
              </Button>
              <Button 
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
              >
                Inativos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum profissional encontrado
            </CardContent>
          </Card>
        ) : (
          filteredTeachers.map((teacher) => (
            <Card key={teacher.id} className={!teacher.ativo ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    {teacher.foto_url && <AvatarImage src={teacher.foto_url} alt={teacher.nome} />}
                    <AvatarFallback className="text-lg">{teacher.nome.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{teacher.nome}</h3>
                      <Badge 
                        variant={teacher.tipo_profissional === 'assistente' ? 'outline' : 'default'} 
                        className="shrink-0"
                      >
                        {teacher.tipo_profissional === 'assistente' ? 'Assistente' : 'Professor'}
                      </Badge>
                      <Badge variant={teacher.ativo ? 'secondary' : 'destructive'} className="shrink-0">
                        {teacher.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{teacher.email}</span>
                      </p>
                      {teacher.telefone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {teacher.telefone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Classes */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Turmas:</p>
                  <div className="flex flex-wrap gap-1">
                    {teacher.turmas.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Nenhuma turma</span>
                    ) : (
                      teacher.turmas.map((turma) => (
                        <Badge key={turma.id} variant="secondary" className="flex items-center gap-1">
                          {turma.nome}
                          <button 
                            onClick={() => handleUnlinkFromTurma(turma.id)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditingTeacher(teacher)}
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openResendDialog(teacher)}
                    title="Reenviar credenciais"
                  >
                    <KeyRound className="w-4 h-4" />
                  </Button>
                  <Dialog open={linkTurmaDialogOpen && selectedTeacher?.id === teacher.id} onOpenChange={(open) => {
                    setLinkTurmaDialogOpen(open);
                    if (open) setSelectedTeacher(teacher);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Vincular a turma">
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vincular à Turma</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                          Selecione a turma para vincular <strong>{teacher.nome}</strong>:
                        </p>
                        <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma turma" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTurmas(teacher).map(turma => (
                              <SelectItem key={turma.id} value={turma.id}>
                                {turma.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleLinkToTurma} 
                          disabled={!selectedTurmaId || updateTurma.isPending}
                          className="w-full"
                        >
                          {updateTurma.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleToggleStatus(teacher)}
                    title={teacher.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {teacher.ativo ? (
                      <X className="w-4 h-4 text-destructive" />
                    ) : (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <TeacherFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <TeacherFormDialog
        open={!!editingTeacher}
        onOpenChange={(open) => !open && setEditingTeacher(null)}
        teacher={editingTeacher}
      />

      {/* Resend Credentials Dialog */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar Credenciais</DialogTitle>
            <DialogDescription>
              Uma nova senha temporária será gerada e enviada por email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {teacherToResend && (
              <>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">{teacherToResend.nome}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {teacherToResend.email}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  ⚠️ A senha atual será invalidada e uma nova senha temporária será enviada para o email acima.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setResendDialogOpen(false)}
                    className="flex-1"
                    disabled={isResending}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleResendCredentials}
                    disabled={isResending}
                    className="flex-1"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersManagement;
