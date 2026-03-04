import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { isBirthdayToday, calculateAge, getTurmaDisplayName } from '@/hooks/useSchoolData';
import { 
  useAdminAulasForDay, 
  useAdminSaveAttendance,
  type AulaForAdmin,
  type AdminAlunoPresenca,
} from '@/hooks/useAdminAulasData';
import { 
  Calendar,
  Clock,
  Users,
  Check,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserCheck,
  UserX,
  HelpCircle,
  ClipboardCheck,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import BirthdayBadge from '@/components/shared/BirthdayBadge';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const SchoolChamadaPage = () => {
  const { user } = useAuth();
  const escolinhaId = user?.escolinhaId;
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAula, setSelectedAula] = useState<AulaForAdmin | null>(null);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | null>>({});

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: aulas = [], isLoading } = useAdminAulasForDay(escolinhaId || undefined, dateStr);
  const saveAttendance = useAdminSaveAttendance();

  // Date navigation
  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  // Select a class
  const handleSelectAula = (aula: AulaForAdmin) => {
    setSelectedAula(aula);
    // Initialize attendance state from existing data
    const initialAttendance: Record<string, 'present' | 'absent' | null> = {};
    aula.alunos.forEach(aluno => {
      if (aluno.presente === true) {
        initialAttendance[aluno.crianca_id] = 'present';
      } else if (aluno.presente === false) {
        initialAttendance[aluno.crianca_id] = 'absent';
      } else {
        initialAttendance[aluno.crianca_id] = null;
      }
    });
    setAttendance(initialAttendance);
  };

  // Handle marking attendance
  const handleMarkAttendance = (criancaId: string, status: 'present' | 'absent') => {
    if (selectedAula?.chamada_salva) return;
    
    setAttendance(prev => ({
      ...prev,
      [criancaId]: prev[criancaId] === status ? null : status
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    if (!selectedAula || selectedAula.chamada_salva) return;
    
    const newAttendance: Record<string, 'present'> = {};
    selectedAula.alunos.forEach(aluno => {
      newAttendance[aluno.crianca_id] = 'present';
    });
    setAttendance(prev => ({ ...prev, ...newAttendance }));
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!selectedAula) return;

    const attendanceData = selectedAula.alunos.map(aluno => ({
      crianca_id: aluno.crianca_id,
      presente: attendance[aluno.crianca_id] === 'present',
    }));

    const unmarked = selectedAula.alunos.filter(a => !attendance[a.crianca_id]);
    if (unmarked.length > 0) {
      toast.error(`Marque a presença de todos os alunos (${unmarked.length} pendentes)`);
      return;
    }

    try {
      await saveAttendance.mutateAsync({
        aulaId: selectedAula.id,
        attendanceData,
        closedBy: 'escola', // School admin is saving
      });
      toast.success('Chamada salva com sucesso!');
      setSelectedAula(null);
    } catch (error) {
      toast.error('Erro ao salvar chamada');
    }
  };

  // Get guardian status badge
  const getGuardianStatusBadge = (aluno: AdminAlunoPresenca) => {
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

  if (!escolinhaId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render class detail view
  if (selectedAula) {
    const presentCount = Object.values(attendance).filter(a => a === 'present').length;
    const absentCount = Object.values(attendance).filter(a => a === 'absent').length;
    const pendingCount = selectedAula.alunos.filter(a => !attendance[a.crianca_id]).length;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAula(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              {getTurmaDisplayName(selectedAula.turma)}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(selectedAula.data + 'T12:00:00'), "dd/MM/yyyy")}
              </span>
              {selectedAula.horario_inicio && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedAula.horario_inicio.slice(0, 5)} - {selectedAula.horario_fim?.slice(0, 5)}
                </span>
              )}
              {selectedAula.turma.campo && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {selectedAula.turma.campo}
                </span>
              )}
            </div>
            {selectedAula.turma.professor && (
              <p className="text-sm text-muted-foreground mt-1">
                Professor: {selectedAula.turma.professor.nome}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!selectedAula.chamada_salva && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMarkAllPresent} className="flex-1 sm:flex-none">
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar Todos
            </Button>
            <Button onClick={handleSaveAttendance} disabled={saveAttendance.isPending} className="flex-1 sm:flex-none">
              {saveAttendance.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Chamada
            </Button>
          </div>
        )}

        {/* Saved indicator */}
        {selectedAula.chamada_salva && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">
                Chamada já salva
              </span>
            </div>
            {(selectedAula.chamada_fechada_por_nome || selectedAula.chamada_fechada_por) && (
              <p className="text-xs text-muted-foreground ml-6">
                {selectedAula.chamada_fechada_por_nome 
                  ? `Por: ${selectedAula.chamada_fechada_por_nome}`
                  : selectedAula.chamada_fechada_por === 'escola' 
                    ? 'Por: Administração da escola' 
                    : 'Por: Professor'}
                {selectedAula.chamada_fechada_em && (
                  <> — {new Date(selectedAula.chamada_fechada_em).toLocaleString('pt-BR')}</>
                )}
              </p>
            )}
          </div>
        )}

        {/* Attendance summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span><strong>{presentCount}</strong> Presentes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span><strong>{absentCount}</strong> Faltas</span>
          </div>
          {!selectedAula.chamada_salva && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span><strong>{pendingCount}</strong> Pendentes</span>
            </div>
          )}
        </div>

        {/* Student list */}
        <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {selectedAula.alunos.map((aluno) => {
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
                      <div className="absolute -top-1 -right-1">
                        <BirthdayBadge isToday showLabel={false} />
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
                  {selectedAula.chamada_salva && (
                    <Badge 
                      variant={aluno.presente ? 'default' : 'destructive'}
                      className={`shrink-0 ${aluno.presente ? 'bg-success' : ''}`}
                    >
                      {aluno.presente ? 'Presente' : 'Faltou'}
                    </Badge>
                  )}
                </div>

                {/* Attendance buttons - full width below info */}
                {!selectedAula.chamada_salva && (
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
      </div>
    );
  }

  // Render class list view
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Chamada
          </h1>
          <p className="text-muted-foreground">
            Confirme a presença dos alunos nas aulas
          </p>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevDay}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
          {isToday(selectedDate) && (
            <Badge variant="default" className="ml-2">Hoje</Badge>
          )}
        </div>
        
        <Button variant="outline" size="icon" onClick={handleNextDay}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {!isToday(selectedDate) && (
        <div className="flex justify-center">
          <Button variant="link" onClick={handleToday} className="text-sm">
            Voltar para hoje
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && aulas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma aula agendada para esta data.</p>
          </CardContent>
        </Card>
      )}

      {/* Class list */}
      {!isLoading && aulas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aulas.map((aula) => (
            <Card 
              key={aula.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                aula.chamada_salva ? 'border-success/30 bg-success/5' : ''
              }`}
              onClick={() => handleSelectAula(aula)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{getTurmaDisplayName(aula.turma)}</CardTitle>
                  {aula.chamada_salva ? (
                    <Badge variant="outline" className="border-success/50 text-success gap-1">
                      <Check className="w-3 h-3" />
                      Feita
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/50 text-warning">
                      Pendente
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {aula.horario_inicio && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {aula.horario_inicio.slice(0, 5)}
                    </span>
                  )}
                  {aula.turma.campo && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {aula.turma.campo}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {aula.alunos.length} alunos
                  </span>
                </div>
                {aula.turma.professor && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Prof. {aula.turma.professor.nome}
                  </p>
                )}
                {aula.chamada_salva && aula.chamada_fechada_por_nome && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Chamada por: {aula.chamada_fechada_por_nome}
                    {aula.chamada_fechada_em && (
                      <> — {new Date(aula.chamada_fechada_em).toLocaleString('pt-BR')}</>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolChamadaPage;
