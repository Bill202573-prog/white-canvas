import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { School, Cake, Calendar, Clock, User } from 'lucide-react';
import { type CriancaForGuardian, getDayName, isBirthdayToday } from '@/hooks/useSchoolData';
import ChildPhotoUpload from './ChildPhotoUpload';

interface AthleteProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: CriancaForGuardian | null;
}

const AthleteProfileSheet = ({ open, onOpenChange, child }: AthleteProfileSheetProps) => {
  if (!child) return null;

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

  const activeEscolinhas = child.escolinhas.filter(e => e.ativo);
  const inactiveEscolinhas = child.escolinhas.filter(e => !e.ativo);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] pt-safe overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <ChildPhotoUpload 
              childId={child.id}
              childName={child.nome}
              currentPhotoUrl={child.foto_url}
              size="md"
            />
            <div>
              <span className="text-lg font-bold">{child.nome}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{age} anos</span>
                {isBirthdayToday(child.data_nascimento) && (
                  <Badge variant="secondary" className="bg-warning/20 text-warning gap-1">
                    <Cake className="w-3 h-3" />
                    Aniversário!
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* Info básica */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Nascimento: {formattedBirthDate}</span>
          </div>

          {/* Escolas Ativas com Turmas */}
          {activeEscolinhas.length > 0 && (
            <Card className="border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="w-4 h-4 text-success" />
                  Escolas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeEscolinhas.map((escola) => {
                  // Find turmas for this school
                  const escolaTurmas = child.turmas.filter(t => t.escolinha?.id === escola.id);
                  return (
                    <div key={escola.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{escola.nome}</span>
                        <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                          Ativo
                        </Badge>
                      </div>
                      
                      {escola.data_inicio && (
                        <p className="text-xs text-muted-foreground">
                          Desde {new Date(escola.data_inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      )}

                      {/* Turmas desta escola */}
                      {escolaTurmas.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {escolaTurmas.map((turma) => {
                            const hasClassToday = turma.dias_semana.includes(todayName);
                            
                            return (
                              <div 
                                key={turma.id} 
                                className={`p-3 rounded-lg ${hasClassToday ? 'bg-primary/10 border border-primary/30' : 'bg-background border border-border'}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{turma.nome}</span>
                                  {hasClassToday && (
                                    <Badge variant="default" className="text-xs">
                                      Hoje
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Dias e horário */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {turma.dias_semana.map((dia, i) => {
                                      const dayIndex = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(dia);
                                      return getDayName(dayIndex).slice(0, 3);
                                    }).join(', ')}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{turma.horario_inicio?.slice(0,5)} - {turma.horario_fim?.slice(0,5)}</span>
                                </div>

                                {turma.professor && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>Prof. {turma.professor.nome}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Escolas Inativas (Histórico) */}
          {inactiveEscolinhas.length > 0 && (
            <Card className="border-muted bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <School className="w-4 h-4" />
                  Histórico de Escolas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inactiveEscolinhas.map((escola) => (
                  <div key={escola.id} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-muted-foreground">{escola.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        Inativo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {escola.data_inicio && (
                        <>
                          De {new Date(escola.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                          {escola.data_fim && (
                            <> até {new Date(escola.data_fim).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Mensagem se não há escolas */}
          {child.escolinhas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <School className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma escola vinculada</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AthleteProfileSheet;
