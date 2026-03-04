import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/shared/StatsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  useTeacherProfile,
  useTeacherTurmas,
  useTeacherTodayAulas,
  useTeacherAulaDetails,
  useTeacherPastAulas,
  useSaveAttendance,
  type AlunoPresenca,
} from '@/hooks/useTeacherData';
import { calculateAge, isBirthdayToday } from '@/hooks/useSchoolData';
import { 
  Users, 
  CalendarCheck, 
  Cake,
  Clock,
  CheckCircle,
  Save,
  Loader2,
  AlertCircle,
  Calendar,
  History,
  Check,
  X,
  Lock,
  UserCheck,
  UserX,
  HelpCircle,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import logoAtletaId from '@/assets/logo-atleta-id.png';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { data: teacher, isLoading: teacherLoading } = useTeacherProfile();
  const { data: turmas = [], isLoading: turmasLoading } = useTeacherTurmas(teacher?.id);
  const { data: todayAulas = [], isLoading: todayAulasLoading } = useTeacherTodayAulas(teacher?.id);
  const { data: pastAulas = [], isLoading: pastAulasLoading } = useTeacherPastAulas(teacher?.id);
  const saveAttendance = useSaveAttendance();

  // Selected aula for attendance
  const [selectedAulaId, setSelectedAulaId] = useState<string | null>(null);
  
  // Get details for selected aula
  const { data: selectedAulaDetails, isLoading: detailsLoading } = useTeacherAulaDetails(selectedAulaId || undefined);

  // Auto-select first aula when available
  useEffect(() => {
    if (todayAulas.length > 0 && !selectedAulaId) {
      setSelectedAulaId(todayAulas[0].id);
    }
  }, [todayAulas, selectedAulaId]);

  // Local attendance state (for the current class)
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | null>>({});
  const [activeTab, setActiveTab] = useState<'proxima' | 'historico'>('proxima');

  // Reset attendance when aula changes
  useEffect(() => {
    setAttendance({});
  }, [selectedAulaId]);

  // Initialize attendance from saved data
  useEffect(() => {
    if (selectedAulaDetails && !selectedAulaDetails.chamada_salva) {
      const savedAttendance: Record<string, 'present' | 'absent' | null> = {};
      selectedAulaDetails.alunos.forEach(aluno => {
        if (aluno.presente === true) {
          savedAttendance[aluno.crianca_id] = 'present';
        } else if (aluno.presente === false) {
          savedAttendance[aluno.crianca_id] = 'absent';
        }
      });
      setAttendance(savedAttendance);
    }
  }, [selectedAulaDetails]);

  const isLoading = teacherLoading || turmasLoading || todayAulasLoading;

  // Stats
  const totalStudents = turmas.reduce((acc, t) => acc + t.alunos_count, 0);
  const birthdaysToday = selectedAulaDetails?.alunos.filter(a => isBirthdayToday(a.crianca.data_nascimento)).length || 0;

  // Handle marking attendance
  const handleMarkAttendance = (criancaId: string, status: 'present' | 'absent') => {
    if (selectedAulaDetails?.chamada_salva) return; // Don't allow changes if saved
    
    setAttendance(prev => ({
      ...prev,
      [criancaId]: prev[criancaId] === status ? null : status
    }));
  };

  // Handle mark all present
  const handleMarkAllPresent = () => {
    if (!selectedAulaDetails || selectedAulaDetails.chamada_salva) return;
    
    const newAttendance: Record<string, 'present'> = {};
    selectedAulaDetails.alunos.forEach(aluno => {
      newAttendance[aluno.crianca_id] = 'present';
    });
    setAttendance(prev => ({ ...prev, ...newAttendance }));
  };

  // Handle save attendance
  const handleSaveAttendance = async () => {
    if (!selectedAulaDetails) return;

    // Build attendance data
    const attendanceData = selectedAulaDetails.alunos.map(aluno => ({
      crianca_id: aluno.crianca_id,
      presente: attendance[aluno.crianca_id] === 'present',
    }));

    // Check if all students have been marked
    const unmarked = selectedAulaDetails.alunos.filter(a => !attendance[a.crianca_id]);
    if (unmarked.length > 0) {
      toast.error(`Marque a presença de todos os alunos (${unmarked.length} pendentes)`);
      return;
    }

    try {
      await saveAttendance.mutateAsync({
        aulaId: selectedAulaDetails.id,
        attendanceData,
        professorId: teacher?.id,
      });
      toast.success('Chamada salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar chamada');
    }
  };

  // Get status badge for guardian confirmation
  const getGuardianStatusBadge = (aluno: AlunoPresenca) => {
    if (aluno.confirmado_responsavel === true) {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-success/50 text-success">
          <UserCheck className="w-3 h-3" />
          Confirmado
        </Badge>
      );
    }
    if (aluno.confirmado_responsavel === false) {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-destructive/50 text-destructive">
          <UserX className="w-3 h-3" />
          Não irá
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs border-muted-foreground/50 text-muted-foreground">
        <HelpCircle className="w-3 h-3" />
        Sem resposta
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Perfil de professor não encontrado.</p>
      </div>
    );
  }

  // Format date for display
  const formatAulaDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const isToday = date.toDateString() === today.toDateString();
    
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    if (isToday) {
      return { label: `Hoje – ${day}/${month}`, isToday: true };
    }
    
    return { 
      label: `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}/${month}`, 
      isToday: false 
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Mobile Header with Logo */}
      <div className="flex items-center gap-4 p-4 -mx-4 sm:mx-0 sm:p-0 bg-card sm:bg-transparent border-b sm:border-none">
        {/* School Logo - Larger on mobile */}
        <div className="shrink-0">
          {teacher.escolinha?.logo_url ? (
            <img 
              src={teacher.escolinha.logo_url} 
              alt={teacher.escolinha.nome || 'Logo'} 
              className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-border shadow-sm"
            />
          ) : (
            <img 
              src={logoAtletaId} 
              alt="ATLETA ID" 
              className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl object-contain border-2 border-border shadow-sm p-1.5 bg-background"
            />
          )}
        </div>
        
        {/* Welcome text */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            Olá, {teacher.nome.split(' ')[0]}! 🏆
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {teacher.escolinha?.nome && (
            <p className="text-xs text-muted-foreground truncate">
              {teacher.escolinha.nome}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid - Horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible">
        <div className="shrink-0 w-36 sm:w-auto">
          <StatsCard
            title="Turmas"
            value={turmas.length}
            icon={<CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            description="Ativas"
          />
        </div>
        <div className="shrink-0 w-36 sm:w-auto">
          <StatsCard
            title="Alunos"
            value={totalStudents}
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
            description="Total"
          />
        </div>
        <div className="shrink-0 w-36 sm:w-auto">
          <StatsCard
            title="Aulas Hoje"
            value={todayAulas.length}
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
            description={todayAulas.length > 0 ? 'Programadas' : 'Nenhuma'}
          />
        </div>
        <div className="shrink-0 w-36 sm:w-auto">
          <StatsCard
            title="Aniversários"
            value={birthdaysToday}
            icon={<Cake className="w-5 h-5 sm:w-6 sm:h-6" />}
            description={birthdaysToday > 0 ? 'Hoje! 🎉' : 'Hoje'}
          />
        </div>
      </div>

      {/* Tabs: Próxima Aula / Histórico */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'proxima' | 'historico')}>
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="proxima" className="gap-1.5 text-sm sm:text-base">
            <Calendar className="w-4 h-4" />
            <span className="hidden xs:inline">Aulas do</span> Dia
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 text-sm sm:text-base">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* AULAS DO DIA */}
        <TabsContent value="proxima">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 sm:px-6 pb-3 sm:pb-6">
              <div className="flex flex-col gap-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                    Chamada
                  </CardTitle>
                </div>

                {/* Class selector - Show when multiple classes today */}
                {todayAulas.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {todayAulas.map((aula) => {
                      const isSelected = aula.id === selectedAulaId;
                      return (
                        <Button
                          key={aula.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={`shrink-0 h-auto py-2 px-3 flex-col items-start gap-0.5 ${
                            isSelected ? '' : 'opacity-70'
                          }`}
                          onClick={() => setSelectedAulaId(aula.id)}
                        >
                          <span className="text-xs font-medium">
                            {aula.horario_inicio?.slice(0, 5)} - {aula.horario_fim?.slice(0, 5)}
                          </span>
                          <span className="text-[10px] opacity-80 truncate max-w-[120px]">
                            {aula.turma.nome}
                          </span>
                          {aula.status === 'extra' && (
                            <Badge className="text-[8px] px-1 py-0 h-3 mt-0.5">Extra</Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
                
                {/* Action buttons - Full width on mobile */}
                {selectedAulaDetails && !selectedAulaDetails.chamada_salva && (
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="outline" 
                      size="default" 
                      onClick={handleMarkAllPresent}
                      className="flex-1 sm:flex-none h-11"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="sm:hidden">Todos</span>
                      <span className="hidden sm:inline">Marcar Todos</span>
                    </Button>
                    <Button 
                      size="default" 
                      onClick={handleSaveAttendance}
                      disabled={saveAttendance.isPending}
                      className="flex-1 sm:flex-none h-11"
                    >
                      {saveAttendance.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {todayAulas.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Nenhuma aula programada para hoje.
                  </p>
                </div>
              ) : detailsLoading || !selectedAulaDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Class Info Card - Enhanced for mobile */}
                  <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    {/* Date - Most prominent */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge 
                        variant="default"
                        className="text-sm font-semibold px-3 py-1 bg-primary text-primary-foreground"
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {formatAulaDate(selectedAulaDetails.data).label}
                      </Badge>
                      {selectedAulaDetails.status === 'extra' && (
                        <Badge className="text-xs bg-amber-500">Extra</Badge>
                      )}
                    </div>
                    
                    {/* Class name - Second priority */}
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {selectedAulaDetails.turma.nome}
                    </h3>
                    
                    {/* Time and students - Third priority */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {selectedAulaDetails.horario_inicio && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {selectedAulaDetails.horario_inicio.slice(0, 5)} - {selectedAulaDetails.horario_fim?.slice(0, 5)}
                        </span>
                      )}
                      {selectedAulaDetails.turma.campo && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {selectedAulaDetails.turma.campo}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {selectedAulaDetails.alunos.length} alunos
                      </span>
                    </div>
                  </div>

                  {/* Chamada salva indicator */}
                  {selectedAulaDetails.chamada_salva && (
                    <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        Chamada já salva - edição bloqueada
                      </span>
                    </div>
                  )}

                  {/* Attendance Summary - Compact on mobile */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success" />
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">
                          {selectedAulaDetails.chamada_salva 
                            ? selectedAulaDetails.alunos.filter(a => a.presente === true).length
                            : Object.values(attendance).filter(a => a === 'present').length}
                        </strong>
                        <span className="hidden xs:inline"> Presentes</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">
                          {selectedAulaDetails.chamada_salva 
                            ? selectedAulaDetails.alunos.filter(a => a.presente === false).length
                            : Object.values(attendance).filter(a => a === 'absent').length}
                        </strong>
                        <span className="hidden xs:inline"> Faltas</span>
                      </span>
                    </div>
                    {!selectedAulaDetails.chamada_salva && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">
                            {selectedAulaDetails.alunos.filter(a => !attendance[a.crianca_id]).length}
                          </strong>
                          <span className="hidden xs:inline"> Pendentes</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Grid - Optimized for mobile */}
                  <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    {selectedAulaDetails.alunos.map((aluno, index) => {
                      const status = attendance[aluno.crianca_id];
                      const isPresent = status === 'present';
                      const isAbsent = status === 'absent';
                      const isBirthday = isBirthdayToday(aluno.crianca.data_nascimento);

                      return (
                        <div 
                          key={aluno.crianca_id}
                          className={`p-3 sm:p-4 rounded-xl border transition-all ${
                            isPresent 
                              ? 'bg-success/10 border-success/30' 
                              : isAbsent 
                                ? 'bg-destructive/10 border-destructive/30'
                                : 'bg-card border-border'
                          } ${isBirthday ? 'ring-2 ring-warning/50' : ''}`}
                        >
                          {/* Header row with avatar and info */}
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="w-12 h-12">
                                {aluno.crianca.foto_url && (
                                  <AvatarImage src={aluno.crianca.foto_url} alt={aluno.crianca.nome} />
                                )}
                                <AvatarFallback className="text-sm font-medium">{aluno.crianca.nome.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {isBirthday && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning flex items-center justify-center">
                                  <Cake className="w-3 h-3 text-warning-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight">{aluno.crianca.nome}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {calculateAge(aluno.crianca.data_nascimento)} anos
                              </p>
                              <div className="mt-1.5">
                                {getGuardianStatusBadge(aluno)}
                              </div>
                            </div>

                            {/* Show final status badge if saved */}
                            {selectedAulaDetails.chamada_salva && (
                              <Badge 
                                variant={aluno.presente ? 'default' : 'destructive'}
                                className={`shrink-0 ${aluno.presente ? 'bg-success' : ''}`}
                              >
                                {aluno.presente ? 'Presente' : 'Faltou'}
                              </Badge>
                            )}
                          </div>

                          {/* Attendance buttons - full width below info */}
                          {!selectedAulaDetails.chamada_salva && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                              <Button
                                variant={isPresent ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 h-10 gap-2 font-medium transition-all ${
                                  isPresent 
                                    ? 'bg-success hover:bg-success/90 text-success-foreground shadow-sm' 
                                    : 'hover:bg-success/10 hover:text-success hover:border-success/50'
                                }`}
                                onClick={() => handleMarkAttendance(aluno.crianca_id, 'present')}
                              >
                                <Check className="w-4 h-4" />
                                Presente
                              </Button>
                              <Button
                                variant={isAbsent ? 'default' : 'outline'}
                                size="sm"
                                className={`flex-1 h-10 gap-2 font-medium transition-all ${
                                  isAbsent 
                                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm' 
                                    : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50'
                                }`}
                                onClick={() => handleMarkAttendance(aluno.crianca_id, 'absent')}
                              >
                                <X className="w-4 h-4" />
                                Faltou
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AULAS PASSADAS */}
        <TabsContent value="historico">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="px-0 sm:px-6 pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <History className="w-5 h-5 text-muted-foreground" />
                Histórico
              </CardTitle>
              <CardDescription className="text-sm">
                Chamadas anteriores (somente consulta)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {pastAulasLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pastAulas.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Nenhuma aula passada encontrada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastAulas.map((aula) => {
                    const presentes = aula.alunos.filter(a => a.presente === true).length;
                    const faltas = aula.alunos.filter(a => a.presente === false).length;
                    const semRegistro = aula.alunos.filter(a => a.presente === null).length;
                    const dateInfo = formatAulaDate(aula.data);

                    return (
                      <div 
                        key={aula.id}
                        className="p-3 sm:p-4 rounded-xl border bg-card"
                      >
                        {/* Header with date prominent */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            {/* Date - Most prominent */}
                            <Badge variant="secondary" className="text-xs font-medium mb-1.5">
                              <Calendar className="w-3 h-3 mr-1" />
                              {dateInfo.label}
                            </Badge>
                            {/* Class name */}
                            <h4 className="font-medium text-foreground text-sm sm:text-base truncate">
                              {aula.turma.nome}
                            </h4>
                            {/* Time */}
                            {aula.horario_inicio && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {aula.horario_inicio.slice(0, 5)}
                              </span>
                            )}
                          </div>
                          
                          {/* Summary badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-xs border-success/50 text-success gap-1 px-1.5">
                              <Check className="w-3 h-3" />
                              {presentes}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-destructive/50 text-destructive gap-1 px-1.5">
                              <X className="w-3 h-3" />
                              {faltas}
                            </Badge>
                          </div>
                        </div>

                        {/* Student list - horizontal scroll on mobile */}
                        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                          {aula.alunos.map(aluno => (
                            <Badge 
                              key={aluno.crianca_id}
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                aluno.presente === true 
                                  ? 'border-success/50 text-success bg-success/5' 
                                  : aluno.presente === false 
                                    ? 'border-destructive/50 text-destructive bg-destructive/5'
                                    : 'border-muted-foreground/50 text-muted-foreground'
                              }`}
                            >
                              {aluno.presente === true && <Check className="w-3 h-3 mr-0.5" />}
                              {aluno.presente === false && <X className="w-3 h-3 mr-0.5" />}
                              {aluno.crianca.nome.split(' ')[0]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;