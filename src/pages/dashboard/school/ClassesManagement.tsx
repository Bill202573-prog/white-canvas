import { useState } from 'react';
import { 
  useSchoolTurmasWithRelations, 
  useSchoolTeachers,
  useSchoolChildrenWithRelations,
  useUpdateTurma,
  useAddCriancaToTurma,
  useRemoveCriancaFromTurma,
  calculateAge,
  formatDate,
  getTurmaDisplayName,
  getTurmaCategoriaBadge,
  type TurmaWithRelations,
} from '@/hooks/useSchoolData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CalendarCheck, 
  Search, 
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  UserPlus,
  X,
  ChevronRight,
  Plus,
  Edit2,
  Calendar,
  ArrowRightLeft,
  Settings2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ClassFormDialog from '@/components/school/ClassFormDialog';
import GenerateAulasDialog from '@/components/school/GenerateAulasDialog';
import MigrateStudentsDialog from '@/components/school/MigrateStudentsDialog';
import ChangeTurmaStatusDialog from '@/components/school/ChangeTurmaStatusDialog';
import { toast } from 'sonner';

type TurmaStatus = 'ativa' | 'inativa' | 'encerrada';

const getStatusBadge = (status: TurmaStatus) => {
  switch (status) {
    case 'ativa':
      return <Badge variant="default" className="bg-green-500">Ativa</Badge>;
    case 'inativa':
      return <Badge variant="secondary">Inativa</Badge>;
    case 'encerrada':
      return <Badge variant="destructive">Encerrada</Badge>;
    default:
      return <Badge variant="default" className="bg-green-500">Ativa</Badge>;
  }
};

const ClassesManagement = () => {
  const { data: turmas = [], isLoading } = useSchoolTurmasWithRelations();
  const { data: teachers = [] } = useSchoolTeachers();
  const { data: allChildren = [] } = useSchoolChildrenWithRelations();
  const updateTurma = useUpdateTurma();
  const addToTurma = useAddCriancaToTurma();
  const removeFromTurma = useRemoveCriancaFromTurma();
  
  const [search, setSearch] = useState('');
  const [filterProfessor, setFilterProfessor] = useState<string>('all');
  const [filterDia, setFilterDia] = useState<string>('all');
  const [selectedTurma, setSelectedTurma] = useState<TurmaWithRelations | null>(null);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [selectedCriancaId, setSelectedCriancaId] = useState<string>('');
  const [changeTeacherDialogOpen, setChangeTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<TurmaWithRelations | null>(null);
  const [generateAulasDialogOpen, setGenerateAulasDialogOpen] = useState(false);
  const [migrateStudentsDialogOpen, setMigrateStudentsDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);

  // Schedule edit state
  const [editHorarioInicio, setEditHorarioInicio] = useState('');
  const [editHorarioFim, setEditHorarioFim] = useState('');

  const diasSemana = [
    { value: 'segunda', label: 'Segunda' },
    { value: 'terca', label: 'Terça' },
    { value: 'quarta', label: 'Quarta' },
    { value: 'quinta', label: 'Quinta' },
    { value: 'sexta', label: 'Sexta' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' },
  ];

  const filteredTurmas = turmas?.filter(turma => {
    const matchesSearch = turma.nome.toLowerCase().includes(search.toLowerCase());
    const matchesProfessor = filterProfessor === 'all' || 
      (filterProfessor === 'none' ? !turma.professor_id : turma.professor_id === filterProfessor);
    const matchesDia = filterDia === 'all' || 
      turma.dias_semana.some(d => d.toLowerCase() === filterDia.toLowerCase());
    return matchesSearch && matchesProfessor && matchesDia;
  }) || [];

  const formatSchedule = (turma: TurmaWithRelations) => {
    const days = turma.dias_semana.map(d => {
      const dayMap: Record<string, string> = {
        'segunda': 'Seg',
        'terca': 'Ter',
        'quarta': 'Qua',
        'quinta': 'Qui',
        'sexta': 'Sex',
        'sabado': 'Sáb',
        'domingo': 'Dom',
      };
      return dayMap[d.toLowerCase()] || d;
    });
    const time = turma.horario_inicio && turma.horario_fim 
      ? `${turma.horario_inicio.slice(0,5)} - ${turma.horario_fim.slice(0,5)}`
      : '';
    return { days: days.join(', '), time };
  };

  const getAvailableChildren = () => {
    if (!selectedTurma || !allChildren) return [];
    const linkedIds = selectedTurma.criancas.map(c => c.crianca?.id);
    return allChildren.filter(c => !linkedIds.includes(c.id) && c.ativo);
  };

  const handleAddStudent = async () => {
    if (!selectedTurma || !selectedCriancaId) return;
    try {
      await addToTurma.mutateAsync({ criancaId: selectedCriancaId, turmaId: selectedTurma.id });
      toast.success('Aluno adicionado à turma');
      setAddStudentDialogOpen(false);
      setSelectedCriancaId('');
    } catch {
      toast.error('Erro ao adicionar aluno');
    }
  };

  const handleRemoveStudent = async (criancaId: string) => {
    if (!selectedTurma) return;
    try {
      await removeFromTurma.mutateAsync({ criancaId, turmaId: selectedTurma.id });
      toast.success('Aluno removido da turma');
    } catch {
      toast.error('Erro ao remover aluno');
    }
  };

  const handleChangeTeacher = async () => {
    if (!selectedTurma) return;
    try {
      await updateTurma.mutateAsync({ 
        id: selectedTurma.id, 
        professor_id: selectedTeacherId || null 
      });
      toast.success('Professor alterado');
      setChangeTeacherDialogOpen(false);
      setSelectedTeacherId('');
    } catch {
      toast.error('Erro ao alterar professor');
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedTurma) return;
    try {
      await updateTurma.mutateAsync({ 
        id: selectedTurma.id, 
        horario_inicio: editHorarioInicio || null,
        horario_fim: editHorarioFim || null,
      });
      toast.success('Horário atualizado');
      setEditScheduleDialogOpen(false);
    } catch {
      toast.error('Erro ao atualizar horário');
    }
  };

  const openScheduleEdit = () => {
    if (selectedTurma) {
      setEditHorarioInicio(selectedTurma.horario_inicio || '');
      setEditHorarioFim(selectedTurma.horario_fim || '');
      setEditScheduleDialogOpen(true);
    }
  };

  // Only show loading on initial load (no cached data)
  if (isLoading && turmas.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view for selected class
   if (selectedTurma) {
    const schedule = formatSchedule(selectedTurma);
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTurma(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{getTurmaDisplayName(selectedTurma)}</h1>
              {getTurmaCategoriaBadge(selectedTurma) && (
                <Badge variant="secondary" className="text-xs">{getTurmaCategoriaBadge(selectedTurma)}</Badge>
              )}
              {getStatusBadge((selectedTurma as any).status || 'ativa')}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedTurma.criancas.length} aluno(s) matriculado(s)
            </p>
          </div>
        </div>

        {/* Action buttons - scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setChangeStatusDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-1" />
            Status
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setGenerateAulasDialogOpen(true)}>
            <Calendar className="w-4 h-4 mr-1" />
            Gerar Aulas
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setMigrateStudentsDialogOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Migrar
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditingTurma(selectedTurma)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <UserPlus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Aluno</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select value={selectedCriancaId} onValueChange={setSelectedCriancaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableChildren().map(child => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddStudent} 
                  disabled={!selectedCriancaId || addToTurma.isPending}
                  className="w-full"
                >
                  {addToTurma.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Class Info */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedTurma.criancas.length}</p>
                  <p className="text-sm text-muted-foreground">Alunos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={openScheduleEdit}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent/10">
                  <CalendarCheck className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{schedule.days || 'Não definido'}</p>
                  <p className="text-sm text-muted-foreground">{schedule.time || 'Clique para editar'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    {selectedTurma.professor?.foto_url && (
                      <AvatarImage src={selectedTurma.professor.foto_url} />
                    )}
                    <AvatarFallback>
                      {selectedTurma.professor?.nome?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedTurma.professor?.nome || 'Sem professor'}</p>
                    <p className="text-sm text-muted-foreground">Professor</p>
                  </div>
                </div>
                <Dialog open={changeTeacherDialogOpen} onOpenChange={setChangeTeacherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">Alterar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Alterar Professor</DialogTitle>
                    </DialogHeader>
                      <div className="space-y-4 py-4">
                      <Select value={selectedTeacherId || "none"} onValueChange={(val) => setSelectedTeacherId(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um professor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem professor</SelectItem>
                          {teachers?.filter(t => t.ativo).map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleChangeTeacher} 
                        disabled={updateTurma.isPending}
                        className="w-full"
                      >
                        {updateTurma.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {/* Assistentes */}
              {selectedTurma.assistentes && selectedTurma.assistentes.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Assistentes Técnicos:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTurma.assistentes.map(assistente => (
                      <Badge key={assistente.id} variant="secondary" className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {assistente.foto_url && <AvatarImage src={assistente.foto_url} />}
                          <AvatarFallback className="text-[10px]">{assistente.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {assistente.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Schedule Dialog */}
        <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Horários</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário Início</Label>
                  <Input
                    type="time"
                    value={editHorarioInicio}
                    onChange={(e) => setEditHorarioInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário Fim</Label>
                  <Input
                    type="time"
                    value={editHorarioFim}
                    onChange={(e) => setEditHorarioFim(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleUpdateSchedule} 
                disabled={updateTurma.isPending}
                className="w-full"
              >
                {updateTurma.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Alunos da Turma</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden sm:table-cell">Nascimento</TableHead>
                  <TableHead className="hidden sm:table-cell">Idade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTurma.criancas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno nesta turma
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedTurma.criancas.map(({ crianca }) => crianca && (
                    <TableRow key={crianca.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            {crianca.foto_url && <AvatarImage src={crianca.foto_url} alt={crianca.nome} />}
                            <AvatarFallback className="text-xs">{crianca.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm">{crianca.nome}</span>
                            <span className="block sm:hidden text-xs text-muted-foreground">
                              {calculateAge(crianca.data_nascimento)} anos
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(crianca.data_nascimento)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{calculateAge(crianca.data_nascimento)} anos</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveStudent(crianca.id)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Turma Dialog */}
        <ClassFormDialog
          open={!!editingTurma}
          onOpenChange={(open) => !open && setEditingTurma(null)}
          turma={editingTurma}
        />

        {/* Generate Aulas Dialog */}
        <GenerateAulasDialog
          open={generateAulasDialogOpen}
          onOpenChange={setGenerateAulasDialogOpen}
          turma={selectedTurma}
        />

        {/* Migrate Students Dialog */}
        <MigrateStudentsDialog
          open={migrateStudentsDialogOpen}
          onOpenChange={setMigrateStudentsDialogOpen}
          turma={selectedTurma}
        />

        {/* Change Status Dialog */}
        <ChangeTurmaStatusDialog
          open={changeStatusDialogOpen}
          onOpenChange={setChangeStatusDialogOpen}
          turma={selectedTurma}
        />
      </div>
    );
  }

  // List view
  return (
     <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
              <span className="truncate">Gerenciar Turmas</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {turmas?.length || 0} turma(s) cadastrada(s)
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Nova Turma</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar turma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterProfessor} onValueChange={setFilterProfessor}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Professor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os professores</SelectItem>
                <SelectItem value="none">Sem professor</SelectItem>
                {teachers?.filter(t => t.ativo).map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDia} onValueChange={setFilterDia}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Dia da semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dias</SelectItem>
                {diasSemana.map(dia => (
                  <SelectItem key={dia.value} value={dia.value}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        {filteredTurmas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma turma encontrada
            </CardContent>
          </Card>
        ) : (
          filteredTurmas.map((turma) => {
            const schedule = formatSchedule(turma);
            const hasNoTeacher = !turma.professor;
            return (
              <Card 
                key={turma.id} 
                className={`cursor-pointer hover:shadow-card-hover transition-shadow ${hasNoTeacher ? 'border-amber-400 border-2' : ''}`}
                onClick={() => setSelectedTurma(turma)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{getTurmaDisplayName(turma)}</h3>
                        {getTurmaCategoriaBadge(turma) && (
                          <Badge variant="secondary" className="text-xs">{getTurmaCategoriaBadge(turma)}</Badge>
                        )}
                        {getStatusBadge((turma as any).status || 'ativa')}
                        {hasNoTeacher && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-400">
                            Sem Professor
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {turma.criancas.length} aluno(s)
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4" />
                          {schedule.days || 'Dias não definidos'}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {schedule.time || 'Horário não definido'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {turma.professor ? (
                          <Avatar>
                            {turma.professor.foto_url && (
                              <AvatarImage src={turma.professor.foto_url} alt={turma.professor.nome} />
                            )}
                            <AvatarFallback>{turma.professor.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-600" />
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTurma(turma);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                  {turma.professor ? (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Professor: </span>
                        <span className="font-medium">{turma.professor.nome}</span>
                      </p>
                      {turma.assistentes && turma.assistentes.length > 0 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Assistente(s): </span>
                          <span className="font-medium">{turma.assistentes.map(a => a.nome).join(', ')}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <p className="text-sm text-amber-600 font-medium">
                        ⚠️ Esta turma precisa de um professor
                      </p>
                      {turma.assistentes && turma.assistentes.length > 0 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Assistente(s): </span>
                          <span className="font-medium">{turma.assistentes.map(a => a.nome).join(', ')}</span>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <ClassFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog for list view */}
      <ClassFormDialog
        open={!!editingTurma}
        onOpenChange={(open) => !open && setEditingTurma(null)}
        turma={editingTurma}
      />
    </div>
  );
};

export default ClassesManagement;
