import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSchoolChildrenWithRelations, 
  useSchoolTurmas,
  useUpdateCrianca,
  useUpdateCriancaEscolinhaStatus,
  useAddCriancaToTurma,
  useRemoveCriancaFromTurma,
  calculateAge,
  isBirthdayToday,
  isBirthdayThisMonth,
  formatDate,
  getBirthYear,
  getTurmaDisplayName,
  type CriancaWithRelations,
  type Turma,
  type MensalidadeStatus,
} from '@/hooks/useSchoolData';
import StudentReportPDF from '@/components/school/StudentReportPDF';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  X,
  ChevronDown,
  Trophy,
  Copy,
  KeyRound,
  Eye,
  Mail,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import AlunoHistoricoSection from '@/components/school/AlunoHistoricoSection';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MensagemIndividualDialog from '@/components/school/MensagemIndividualDialog';
import DeactivateStudentDialog from '@/components/school/DeactivateStudentDialog';
import { useStudentRegistration } from '@/contexts/StudentRegistrationContext';

const ChildrenManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Use global student registration context
  const { openCreateDialog, openEditDialog } = useStudentRegistration();
  
  // Get escolinhaId from URL query param, location state, or user context
  const queryEscolinhaId = searchParams.get('escolinhaId');
  const stateEscolinhaId = (location.state as any)?.escolinhaId;
  const escolinhaId = queryEscolinhaId || stateEscolinhaId || user?.escolinhaId;
  
  // Pass escolinhaId to hooks so they work for both school admins and system admins
  const { data: children = [], isLoading: isLoadingChildren } = useSchoolChildrenWithRelations(escolinhaId);
  const { data: turmas = [] } = useSchoolTurmas(escolinhaId);
  
  // Only show loading spinner on initial load (no cached data), not on background refetch
  const isInitialLoading = isLoadingChildren && children.length === 0;
  
  const updateCrianca = useUpdateCrianca();
  const updateCriancaEscolinhaStatus = useUpdateCriancaEscolinhaStatus();
  const addToTurma = useAddCriancaToTurma();
  const removeFromTurma = useRemoveCriancaFromTurma();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterTurma, setFilterTurma] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterMensalidade, setFilterMensalidade] = useState<'all' | 'pagante' | 'isento'>('all');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  
  const [historicoStudent, setHistoricoStudent] = useState<CriancaWithRelations | null>(null);
  const [mensagemStudent, setMensagemStudent] = useState<CriancaWithRelations | null>(null);
  const [deactivateStudent, setDeactivateStudent] = useState<CriancaWithRelations | null>(null);

  const handleResetPassword = useCallback(async (responsavelId: string, responsavelEmail: string) => {
    setResettingPassword(responsavelId);
    try {
      const { data, error } = await supabase.functions.invoke('reset-responsavel-password', {
        body: { responsavelId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      if (data.emailSent) {
        toast.success(`Senha resetada e enviada por email para ${responsavelEmail}`, {
          duration: 6000,
        });
      } else {
        toast.success(`Senha resetada! Nova senha: ${data.tempPassword}`, {
          duration: 10000,
          action: {
            label: 'Copiar',
            onClick: () => {
              navigator.clipboard.writeText(data.tempPassword);
              toast.success('Senha copiada!');
            }
          }
        });
      }
      
      // Refresh the data to show new password
      queryClient.invalidateQueries({ queryKey: ['school-children-relations'] });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Erro ao resetar senha: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setResettingPassword(null);
    }
  }, [queryClient]);

  // Get unique birth years from children
  const birthYears = useMemo(() => {
    if (!children) return [];
    const years = [...new Set(children.map(c => getBirthYear(c.data_nascimento)))];
    return years.sort((a, b) => b - a);
  }, [children]);

  // Days for filtering
  const daysOfWeek = [
    { value: 'segunda', label: 'Segunda' },
    { value: 'terca', label: 'Terça' },
    { value: 'quarta', label: 'Quarta' },
    { value: 'quinta', label: 'Quinta' },
    { value: 'sexta', label: 'Sexta' },
    { value: 'sabado', label: 'Sábado' },
  ];

  const filteredChildren = useMemo(() => {
    return children?.filter(child => {
      const matchesSearch = child.nome.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && child.ativo) ||
        (filterStatus === 'inactive' && !child.ativo);
      const matchesYear = filterYear === 'all' || 
        getBirthYear(child.data_nascimento).toString() === filterYear;
      const matchesTurma = filterTurma === 'all' ||
        (filterTurma === 'sem_turma' ? child.turmas.length === 0 : child.turmas.some(t => t.turma?.id === filterTurma));
      const matchesDay = filterDay === 'all' ||
        child.turmas.some(t => t.turma?.dias_semana.includes(filterDay));
      const matchesMensalidade = filterMensalidade === 'all' ||
        (filterMensalidade === 'isento' && child.status_financeiro === 'isento') ||
        (filterMensalidade === 'pagante' && child.status_financeiro !== 'isento');
      
      return matchesSearch && matchesStatus && matchesYear && matchesTurma && matchesDay && matchesMensalidade;
    }) || [];
  }, [children, search, filterStatus, filterYear, filterTurma, filterDay, filterMensalidade]);

  const handleToggleStatus = async (child: CriancaWithRelations) => {
    if (!escolinhaId) {
      toast.error('Escola não identificada');
      return;
    }
    
    // If deactivating, show the deactivation dialog with options
    if (child.ativo) {
      setDeactivateStudent(child);
      return;
    }
    
    // If reactivating, just do it directly
    try {
      await updateCriancaEscolinhaStatus.mutateAsync({ 
        criancaId: child.id, 
        escolinhaId,
        ativo: true 
      });
      toast.success('Aluno ativado nesta escola');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleRemoveFromTurma = async (child: CriancaWithRelations, turmaId: string) => {
    try {
      await removeFromTurma.mutateAsync({ criancaId: child.id, turmaId });
      toast.success('Aluno removido da turma');
    } catch {
      toast.error('Erro ao remover da turma');
    }
  };

  const getAvailableTurmas = (child: CriancaWithRelations): Turma[] => {
    const linkedTurmaIds = child.turmas.map(t => t.turma?.id);
    return turmas?.filter(t => !linkedTurmaIds.includes(t.id) && t.ativo) || [];
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Gerenciar Alunos
            </h1>
            <p className="text-sm text-muted-foreground">
              {children?.length || 0} aluno(s) cadastrado(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <StudentReportPDF children={children || []} escolaNome={user?.escolinhaNome} />
          <Button onClick={() => openCreateDialog(escolinhaId)} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            Novo Aluno
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Ano nasc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {birthYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTurma} onValueChange={setFilterTurma}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas turmas</SelectItem>
                <SelectItem value="sem_turma">Sem turma</SelectItem>
                {turmas?.filter(t => t.ativo).map(turma => (
                  <SelectItem key={turma.id} value={turma.id}>{getTurmaDisplayName(turma)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="text-sm col-span-2 sm:col-span-1">
                <SelectValue placeholder="Dia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dias</SelectItem>
                {daysOfWeek.map(day => (
                  <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
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
            <div className="border-l mx-2 h-6" />
            <Button 
              variant={filterMensalidade === 'all' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterMensalidade('all')}
            >
              Todas Mensalidades
            </Button>
            <Button 
              variant={filterMensalidade === 'pagante' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterMensalidade('pagante')}
            >
              Pagantes
            </Button>
            <Button 
              variant={filterMensalidade === 'isento' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFilterMensalidade('isento')}
            >
              Isentos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Children List - Mobile Cards or Desktop Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lista de Alunos</CardTitle>
          <CardDescription>
            {filteredChildren.length} aluno(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile View - Cards */}
          <div className="block lg:hidden space-y-3 px-4">
            {filteredChildren.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</p>
            ) : (
              filteredChildren.map((child) => (
                <div 
                  key={child.id} 
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  onClick={() => openEditDialog(child, escolinhaId)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                      <AvatarFallback>{child.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{child.nome}</p>
                        {isBirthdayToday(child.data_nascimento) && (
                          <BirthdayBadge isToday showLabel={false} />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(child.data_nascimento)} anos • {getBirthYear(child.data_nascimento)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {child.turmas.length === 0 ? (
                          <Badge variant="outline" className="text-xs">Sem turma</Badge>
                        ) : (
                          child.turmas.slice(0, 2).map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {t.turma?.nome}
                            </Badge>
                          ))
                        )}
                        <Badge variant={child.ativo ? 'default' : 'secondary'} className="text-xs">
                          {child.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {!child.ativo && child.motivo_inativacao && (
                          <span className="text-xs text-muted-foreground italic truncate max-w-[120px]" title={child.motivo_inativacao}>
                            {child.motivo_inativacao}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setMensagemStudent(child); }}
                      >
                        <Mail className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setHistoricoStudent(child); }}
                      >
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {child.responsaveis[0]?.responsavel?.nome || 'Sem responsável'}
                    </div>
                    {(() => {
                      const finStatus = child.financeiroStatus;
                      if (!finStatus || finStatus.status === 'em_dia') {
                        return <Badge className="bg-emerald-500 text-white text-xs">Em dia</Badge>;
                      }
                      if (finStatus.status === 'isento') {
                        return <Badge variant="secondary" className="text-xs">Isento</Badge>;
                      }
                      if (finStatus.status === 'atrasado') {
                        return <Badge className="bg-red-500 text-white text-xs">Atrasado</Badge>;
                      }
                      return <Badge className="bg-amber-500 text-white text-xs">Pendente</Badge>;
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Ano Nasc.</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Tempo na Escola</TableHead>
                  <TableHead>Turma(s)</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChildren.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChildren.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                            <AvatarFallback>{child.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{child.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {calculateAge(child.data_nascimento)} anos
                            </p>
                          </div>
                          {isBirthdayToday(child.data_nascimento) && (
                            <BirthdayBadge isToday showLabel={false} />
                          )}
                          {isBirthdayThisMonth(child.data_nascimento) && !isBirthdayToday(child.data_nascimento) && (
                            <BirthdayBadge isThisMonth showLabel={false} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getBirthYear(child.data_nascimento)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(child.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const createdDate = new Date(child.created_at);
                          const now = new Date();
                          const totalMonths = differenceInMonths(now, createdDate);
                          const years = Math.floor(totalMonths / 12);
                          const months = totalMonths % 12;
                          
                          if (years > 0) {
                            return (
                              <span className="text-sm">
                                {years} {years === 1 ? 'ano' : 'anos'}
                                {months > 0 && ` e ${months} ${months === 1 ? 'mês' : 'meses'}`}
                              </span>
                            );
                          } else if (months > 0) {
                            return (
                              <span className="text-sm">
                                {months} {months === 1 ? 'mês' : 'meses'}
                              </span>
                            );
                          } else {
                            return <span className="text-sm text-muted-foreground">Recém cadastrado</span>;
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-1 font-normal">
                              <div className="flex flex-wrap items-center gap-1">
                                {child.turmas.length === 0 ? (
                                  <span className="text-muted-foreground text-sm">Sem turma</span>
                                ) : (
                                  child.turmas.map((t, i) => (
                                    <Badge key={i} variant="secondary">
                                      {t.turma?.nome}
                                    </Badge>
                                  ))
                                )}
                                <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground px-2">Turmas vinculadas</p>
                              {child.turmas.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-2">Nenhuma turma</p>
                              ) : (
                                child.turmas.map((t, i) => (
                                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted">
                                    <span className="text-sm">{t.turma?.nome}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleRemoveFromTurma(child, t.turma?.id || '')}
                                    >
                                      <X className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              {getAvailableTurmas(child).length > 0 && (
                                <>
                                  <div className="border-t my-2" />
                                  <p className="text-xs font-medium text-muted-foreground px-2">Adicionar turma</p>
                                  {getAvailableTurmas(child).map(turma => (
                                    <Button
                                      key={turma.id}
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-sm"
                                      onClick={async () => {
                                        try {
                                          await addToTurma.mutateAsync({ criancaId: child.id, turmaId: turma.id });
                                          toast.success('Aluno adicionado à turma');
                                        } catch {
                                          toast.error('Erro ao adicionar à turma');
                                        }
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-2" />
                                      {getTurmaDisplayName(turma)}
                                    </Button>
                                  ))}
                                </>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        {child.responsaveis.length === 0 ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-1 font-normal text-left">
                                <div className="text-sm">
                                  {child.responsaveis[0]?.responsavel?.nome}
                                  {child.responsaveis[0]?.parentesco && (
                                    <span className="text-muted-foreground ml-1">
                                      ({child.responsaveis[0].parentesco})
                                    </span>
                                  )}
                                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 inline" />
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" align="start">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Dados do Responsável</p>
                                <div className="space-y-1 text-sm">
                                  <p><span className="font-medium">Nome:</span> {child.responsaveis[0]?.responsavel?.nome}</p>
                                  <p><span className="font-medium">Email:</span> {child.responsaveis[0]?.responsavel?.email}</p>
                                  {child.responsaveis[0]?.responsavel?.telefone && (
                                    <p><span className="font-medium">Telefone:</span> {child.responsaveis[0]?.responsavel?.telefone}</p>
                                  )}
                                  {child.responsaveis[0]?.responsavel?.senha_temporaria_ativa && child.responsaveis[0]?.responsavel?.senha_temporaria && (
                                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Senha Provisória</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="font-mono text-sm">{child.responsaveis[0]?.responsavel?.senha_temporaria}</p>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            navigator.clipboard.writeText(child.responsaveis[0]?.responsavel?.senha_temporaria || '');
                                            toast.success('Senha copiada!');
                                          }}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">O responsável deve trocar no primeiro login</p>
                                    </div>
                                  )}
                                  <div className="mt-3 pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      disabled={resettingPassword === child.responsaveis[0]?.responsavel?.id}
                                      onClick={() => handleResetPassword(
                                        child.responsaveis[0]?.responsavel?.id || '',
                                        child.responsaveis[0]?.responsavel?.email || ''
                                      )}
                                    >
                                      {resettingPassword === child.responsaveis[0]?.responsavel?.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <KeyRound className="w-4 h-4 mr-2" />
                                      )}
                                      Resetar Senha
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={child.ativo ? 'default' : 'secondary'}>
                            {child.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {!child.ativo && child.motivo_inativacao && (
                            <p className="text-xs text-muted-foreground max-w-[150px] truncate" title={child.motivo_inativacao}>
                              {child.motivo_inativacao}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const finStatus = child.financeiroStatus;
                          if (!finStatus || finStatus.status === 'em_dia') {
                            return (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                Em dia
                              </Badge>
                            );
                          }
                          if (finStatus.status === 'isento') {
                            return (
                              <Badge variant="secondary">
                                Isento
                              </Badge>
                            );
                          }
                          if (finStatus.status === 'atrasado') {
                            return (
                              <Badge className="bg-red-500 hover:bg-red-600 text-white">
                                Atrasado
                              </Badge>
                            );
                          }
                          return (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                              Pendente
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setMensagemStudent(child)}
                            title="Enviar Mensagem"
                          >
                            <Mail className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(child, escolinhaId)}
                            title="Ver Ficha"
                          >
                            <Eye className="w-4 h-4 text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setHistoricoStudent(child)}
                            title="Histórico Esportivo"
                          >
                            <Trophy className="w-4 h-4 text-amber-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleStatus(child)}
                            title={child.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {child.ativo ? (
                              <X className="w-4 h-4 text-destructive" />
                            ) : (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* AlunoFichaDialog is now rendered globally in SchoolDashboardLayout */}

      {/* Histórico Esportivo Dialog */}
      <Dialog open={!!historicoStudent} onOpenChange={(open) => !open && setHistoricoStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Histórico Esportivo - {historicoStudent?.nome}
            </DialogTitle>
          </DialogHeader>
          {historicoStudent && (
            <AlunoHistoricoSection criancaId={historicoStudent.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Mensagem Individual Dialog */}
      {mensagemStudent && (
        <MensagemIndividualDialog
          open={!!mensagemStudent}
          onOpenChange={(open) => !open && setMensagemStudent(null)}
          escolinhaId={escolinhaId}
          crianca={{
            id: mensagemStudent.id,
            nome: mensagemStudent.nome,
            foto_url: mensagemStudent.foto_url,
          }}
        />
      )}

      {/* Deactivate Student Dialog */}
      {deactivateStudent && escolinhaId && (
        <DeactivateStudentDialog
          open={!!deactivateStudent}
          onOpenChange={(open) => !open && setDeactivateStudent(null)}
          student={{
            id: deactivateStudent.id,
            nome: deactivateStudent.nome,
          }}
          escolinhaId={escolinhaId}
        />
      )}

    </div>
  );
};

export default ChildrenManagement;
