import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { School, Cake } from 'lucide-react';
import { type CriancaForGuardian, getDayName, isBirthdayToday } from '@/hooks/useSchoolData';
import ChildPhotoUpload from './ChildPhotoUpload';

interface ChildProfileTabProps {
  child: CriancaForGuardian;
}

const ChildProfileTab = ({ child }: ChildProfileTabProps) => {
  const today = new Date().getDay();
  const todayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][today];

  // Format birth date
  const birthDate = new Date(child.data_nascimento + 'T12:00:00');
  const formattedBirthDate = birthDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  // Calculate age
  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr + 'T12:00:00');
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  const age = calculateAge(child.data_nascimento);

  return (
    <div className="space-y-4">
      {/* Athlete Card - ID style */}
      <Card className={`overflow-hidden ${isBirthdayToday(child.data_nascimento) ? 'ring-2 ring-warning' : ''}`}>
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ChildPhotoUpload 
                childId={child.id}
                childName={child.nome}
                currentPhotoUrl={child.foto_url}
                size="xl"
              />
              {isBirthdayToday(child.data_nascimento) && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-warning flex items-center justify-center animate-bounce-subtle shadow-md">
                  <Cake className="w-4 h-4 text-warning-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-primary-foreground leading-tight">
                {child.nome}
              </h2>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-primary-foreground/80">
                  {age} anos
                </p>
                <p className="text-xs text-primary-foreground/60">
                  Nascimento: {formattedBirthDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Escolas */}
      {child.escolinhas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              Escolas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Escolas Ativas */}
            {child.escolinhas.filter(e => e.ativo).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ativas
                </p>
                {child.escolinhas.filter(e => e.ativo).map((escola) => (
                  <div key={escola.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{escola.nome}</span>
                      <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                        Ativo
                      </Badge>
                    </div>
                    {escola.data_inicio && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        Matriculado desde {new Date(escola.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Escolas Inativas (Histórico) */}
            {child.escolinhas.filter(e => !e.ativo).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Histórico
                </p>
                {child.escolinhas.filter(e => !e.ativo).map((escola) => (
                  <div key={escola.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 opacity-75">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-muted-foreground">{escola.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        Inativo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {escola.data_inicio && (
                        <>
                          De {new Date(escola.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {escola.data_fim ? (
                            <> até {new Date(escola.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                          ) : null}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Turmas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <School className="w-4 h-4 text-muted-foreground" />
            Turmas
          </CardTitle>
          <CardDescription className="text-xs">
            Onde {child.nome.split(' ')[0]} treina
          </CardDescription>
        </CardHeader>
        <CardContent>
          {child.turmas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma turma vinculada ainda.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {child.turmas.map((turma) => {
                const hasClassToday = turma.dias_semana.includes(todayName);

                return (
                  <div 
                    key={turma.id}
                    className="p-3 rounded-lg bg-secondary/20 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm">{turma.nome}</h4>
                      {hasClassToday && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Hoje
                        </Badge>
                      )}
                    </div>
                    
                    {turma.escolinha && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <School className="w-3 h-3" />
                        {turma.escolinha.nome}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {turma.dias_semana.map((dia, i) => {
                        const dayIndex = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(dia);
                        return (
                          <span 
                            key={i}
                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {getDayName(dayIndex).slice(0, 3)}
                          </span>
                        );
                      })}
                      <span className="text-xs text-muted-foreground">
                        {turma.horario_inicio?.slice(0,5)}-{turma.horario_fim?.slice(0,5)}
                      </span>
                    </div>

                    {turma.professor && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Avatar className="w-5 h-5">
                          {turma.professor.foto_url && <AvatarImage src={turma.professor.foto_url} alt={turma.professor.nome} />}
                          <AvatarFallback className="text-[10px]">{turma.professor.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>Prof. {turma.professor.nome}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChildProfileTab;
