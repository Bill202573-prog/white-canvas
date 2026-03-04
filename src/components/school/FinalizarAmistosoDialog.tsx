import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  Loader2,
  Goal,
  Medal,
  Users,
  Calendar,
  MapPin,
  Tag,
  Check,
  X,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { EventoEsportivo } from '@/hooks/useEventosData';
import { useFinalizarEvento } from '@/hooks/useEventosData';
import { useAmistosoConvocacoes, type ConvocacaoWithCrianca } from '@/hooks/useAmistosoConvocacoesData';
import {
  useEventoGols,
  useCreateEventoGol,
  useDeleteEventoGol,
  type EventoGol,
} from '@/hooks/useEventoGolsData';
import {
  useEventoPremiacoes,
  useCreateEventoPremiacao,
  useDeleteEventoPremiacao,
  TIPOS_PREMIACAO,
} from '@/hooks/useEventoPremiacoesData';
import { useEventoTimes, useCreateEventoTime, useAddAlunoToTime } from '@/hooks/useEventoTimesData';

interface FinalizarAmistosoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: EventoEsportivo | null;
  onSuccess?: () => void;
}

interface PresencaState {
  [criancaId: string]: {
    presente: boolean | null;
    motivo_ausencia: string | null;
  };
}

const MOTIVOS_AUSENCIA = [
  { value: '', label: '—' },
  { value: 'sem_aviso', label: 'Sem aviso' },
  { value: 'justificado', label: 'Justificado' },
];

export default function FinalizarAmistosoDialog({
  open,
  onOpenChange,
  evento,
  onSuccess,
}: FinalizarAmistosoDialogProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [adversario, setAdversario] = useState('');
  const [placarTime1, setPlacarTime1] = useState('');
  const [placarTime2, setPlacarTime2] = useState('');
  const [presencas, setPresencas] = useState<PresencaState>({});
  const [selectedGolJogador, setSelectedGolJogador] = useState('');
  const [golQuantidade, setGolQuantidade] = useState('1');
  const [selectedPremiacao, setSelectedPremiacao] = useState('');
  const [selectedPremiacaoJogador, setSelectedPremiacaoJogador] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Data hooks
  const { data: convocacoes = [], isLoading: loadingConvocacoes } = useAmistosoConvocacoes(evento?.id || null);
  const { data: times = [], isLoading: loadingTimes } = useEventoTimes(evento?.id);
  const { data: gols = [], isLoading: loadingGols } = useEventoGols(evento?.id || '');
  const { data: premiacoes = [], isLoading: loadingPremiacoes } = useEventoPremiacoes(evento?.id || '');
  
  // Mutations
  const finalizarMutation = useFinalizarEvento();
  const createTimeMutation = useCreateEventoTime();
  const addAlunoToTimeMutation = useAddAlunoToTime();
  const createGolMutation = useCreateEventoGol();
  const deleteGolMutation = useDeleteEventoGol();
  const createPremiacaoMutation = useCreateEventoPremiacao();
  const deletePremiacaoMutation = useDeleteEventoPremiacao();

  // Determine if we have a score set
  const hasScore = evento?.placar_time1 !== null && evento?.placar_time2 !== null;
  // Treat empty string as 0 for validation, but allow user to leave empty
  const getPlacar = (value: string, fallback: number | null) => {
    if (value === '') return 0; // Default to 0 if empty
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  };
  const localPlacar1 = hasScore ? evento?.placar_time1 : getPlacar(placarTime1, 0);
  const localPlacar2 = hasScore ? evento?.placar_time2 : getPlacar(placarTime2, 0);

  // Get team info - extract school team name from evento.nome (e.g., "Fluminense x Taquara" -> "Fluminense")
  // Or use existing team name, or fall back to categoria
  const schoolTeam = times[0];
  const getSchoolTeamName = () => {
    // First check if there's an existing team
    if (schoolTeam?.nome) return schoolTeam.nome;
    
    // Try to extract from evento.nome if it contains " x " (format: "School x Opponent")
    if (evento?.nome && evento.nome.includes(' x ')) {
      return evento.nome.split(' x ')[0].trim();
    }
    
    // Fall back to categoria or default
    return evento?.categoria || 'Time da Escola';
  };
  const schoolTeamName = getSchoolTeamName();

  // Get confirmed athletes (those who paid or are exempt)
  const confirmedAthletes = useMemo(() => {
    return convocacoes.filter(c => c.status === 'pago' || c.isento);
  }, [convocacoes]);

  // Athletes for goals - those present
  const presentAthletes = useMemo(() => {
    return confirmedAthletes.filter(c => presencas[c.crianca_id]?.presente === true);
  }, [confirmedAthletes, presencas]);

  // Calculate goal totals
  const totalGolsRegistrados = useMemo(() => {
    return gols.reduce((acc, g) => acc + g.quantidade, 0);
  }, [gols]);
  const maxGols = localPlacar1 ?? 0;
  const remainingGols = maxGols - totalGolsRegistrados;

  // Athletes who haven't registered goals yet
  const availableForGoals = useMemo(() => {
    const registeredIds = new Set(gols.map(g => g.crianca_id));
    return presentAthletes.filter(a => !registeredIds.has(a.crianca_id));
  }, [presentAthletes, gols]);

  // Available award types
  const availablePremiacoes = useMemo(() => {
    const usedTipos = new Set(premiacoes.map(p => p.tipo_premiacao));
    return TIPOS_PREMIACAO.filter(t => !usedTipos.has(t.value));
  }, [premiacoes]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (evento && open) {
      setAdversario(evento.adversario || '');
      setPlacarTime1(evento.placar_time1?.toString() || '');
      setPlacarTime2(evento.placar_time2?.toString() || '');
      
      // Initialize presencas from convocacoes with existing presente values
      const initialPresencas: PresencaState = {};
      convocacoes.forEach(c => {
        const existing = (c as any).presente;
        const existingMotivo = (c as any).motivo_ausencia;
        initialPresencas[c.crianca_id] = {
          presente: existing ?? (c.status === 'pago' || c.isento ? null : false),
          motivo_ausencia: existingMotivo || null,
        };
      });
      setPresencas(initialPresencas);
    }
  }, [evento, open, convocacoes]);

  if (!evento) return null;

  const isLoading = loadingConvocacoes || loadingTimes || loadingGols || loadingPremiacoes;

  const handlePresencaChange = (criancaId: string, presente: boolean) => {
    setPresencas(prev => ({
      ...prev,
      [criancaId]: {
        ...prev[criancaId],
        presente,
        motivo_ausencia: presente ? null : prev[criancaId]?.motivo_ausencia || null,
      },
    }));
  };

  const handleMotivoChange = (criancaId: string, motivo: string) => {
    setPresencas(prev => ({
      ...prev,
      [criancaId]: {
        ...prev[criancaId],
        motivo_ausencia: motivo || null,
      },
    }));
  };

  const handleAddGol = async () => {
    if (!selectedGolJogador) {
      toast.error('Selecione um jogador');
      return;
    }
    
    const qtd = parseInt(golQuantidade, 10);
    if (isNaN(qtd) || qtd <= 0 || qtd > remainingGols) {
      toast.error(`Máximo de ${remainingGols} gol(s) permitido(s)`);
      return;
    }

    try {
      // Create team if needed
      let teamId = schoolTeam?.id;
      
      if (!teamId) {
        const newTeam = await createTimeMutation.mutateAsync({
          eventoId: evento.id,
          nome: schoolTeamName,
        });
        teamId = newTeam.id;
      }

      await createGolMutation.mutateAsync({
        eventoId: evento.id,
        timeId: teamId,
        criancaId: selectedGolJogador,
        quantidade: qtd,
      });
      setSelectedGolJogador('');
      setGolQuantidade('1');
      toast.success('Gol registrado');
    } catch (error: any) {
      console.error('Error adding goal:', error);
      toast.error('Erro ao registrar gol');
    }
  };

  const handleDeleteGol = async (golId: string) => {
    try {
      await deleteGolMutation.mutateAsync({ id: golId, eventoId: evento.id });
      toast.success('Gol removido');
    } catch {
      toast.error('Erro ao remover gol');
    }
  };

  const handleAddPremiacao = async () => {
    if (!selectedPremiacao || !selectedPremiacaoJogador) return;

    try {
      await createPremiacaoMutation.mutateAsync({
        eventoId: evento.id,
        criancaId: selectedPremiacaoJogador,
        tipoPremiacao: selectedPremiacao,
      });
      setSelectedPremiacao('');
      setSelectedPremiacaoJogador('');
      toast.success('Premiação registrada');
    } catch {
      toast.error('Erro ao registrar premiação');
    }
  };

  const handleDeletePremiacao = async (premiacaoId: string) => {
    try {
      await deletePremiacaoMutation.mutateAsync({ id: premiacaoId, eventoId: evento.id });
      toast.success('Premiação removida');
    } catch {
      toast.error('Erro ao remover premiação');
    }
  };

  const getTipoEmoji = (tipo: string) => {
    switch (tipo) {
      case 'melhor_jogador': return '🏆';
      case 'melhor_goleiro': return '🧤';
      case 'artilheiro': return '⚽';
      case 'melhor_defesa': return '🛡️';
      case 'destaque': return '⭐';
      default: return '🏅';
    }
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_PREMIACAO.find(t => t.value === tipo)?.label || tipo;
  };

  const handleSave = async () => {
    // Validate score - treat empty as 0
    const placar1 = placarTime1 === '' ? 0 : parseInt(placarTime1, 10);
    const placar2 = placarTime2 === '' ? 0 : parseInt(placarTime2, 10);

    if (isNaN(placar1) || isNaN(placar2) || placar1 < 0 || placar2 < 0) {
      toast.error('Placar inválido');
      return;
    }

    // Check if all confirmed athletes have presence status
    const missingPresenca = confirmedAthletes.filter(c => presencas[c.crianca_id]?.presente === null);
    if (missingPresenca.length > 0) {
      toast.error('Confirme a presença de todos os atletas');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Create team if needed and add present athletes
      let teamId = schoolTeam?.id;
      
      if (!teamId) {
        const newTeam = await createTimeMutation.mutateAsync({
          eventoId: evento.id,
          nome: evento.categoria || 'Time Principal',
        });
        teamId = newTeam.id;
      }

      // Add present athletes to team if not already
      const existingAlunoIds = new Set(schoolTeam?.alunos?.map(a => a.crianca_id) || []);
      const presenteAtletas = confirmedAthletes.filter(c => presencas[c.crianca_id]?.presente === true);
      
      for (const atleta of presenteAtletas) {
        if (!existingAlunoIds.has(atleta.crianca_id)) {
          await addAlunoToTimeMutation.mutateAsync({
            timeId: teamId,
            criancaId: atleta.crianca_id,
            eventoId: evento.id,
          });
        }
      }

      // 2. Save score and finalize event
      await finalizarMutation.mutateAsync({
        id: evento.id,
        time1_id: teamId,
        adversario: adversario.trim() || null,
        placar_time1: placar1,
        placar_time2: placar2,
        status: 'realizado',
      });

      // 3. Update presence status in amistoso_convocacoes
      for (const [criancaId, status] of Object.entries(presencas)) {
        await supabase
          .from('amistoso_convocacoes')
          .update({
            presente: status.presente,
            motivo_ausencia: status.presente === false ? status.motivo_ausencia : null,
          })
          .eq('evento_id', evento.id)
          .eq('crianca_id', criancaId);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['school-eventos'] });
      queryClient.invalidateQueries({ queryKey: ['amistoso-convocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['evento-times'] });
      queryClient.invalidateQueries({ queryKey: ['evento-gols'] });
      queryClient.invalidateQueries({ queryKey: ['evento-premiacoes'] });
      queryClient.invalidateQueries({ queryKey: ['aluno-historico'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-historico-unificado'] });

      toast.success('Jogo finalizado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error finalizing match:', error);
      toast.error(error.message || 'Erro ao finalizar jogo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            Finalizar Jogo
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Event Info */}
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(evento.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Badge>
                {evento.local && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    {evento.local}
                  </Badge>
                )}
                {evento.categoria && (
                  <Badge variant="outline" className="gap-1">
                    <Tag className="w-3 h-3" />
                    {evento.categoria}
                  </Badge>
                )}
              </div>

              {/* Score Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Goal className="w-4 h-4" />
                  Placar
                </h3>

                {/* Score preview - always show since we default to 0 */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    {/* School Team */}
                    <div className="flex-1 text-center">
                      <span className="font-bold text-sm md:text-base text-primary block truncate">{schoolTeamName}</span>
                    </div>
                    
                    {/* Scores */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg shadow-sm border">
                      <span className="text-2xl md:text-3xl font-bold text-foreground min-w-[2rem] text-center">
                        {localPlacar1 ?? 0}
                      </span>
                      <span className="text-xl md:text-2xl font-bold text-muted-foreground">x</span>
                      <span className="text-2xl md:text-3xl font-bold text-foreground min-w-[2rem] text-center">
                        {localPlacar2 ?? 0}
                      </span>
                    </div>
                    
                    {/* Opponent */}
                    <div className="flex-1 text-center">
                      <span className="font-bold text-sm md:text-base text-muted-foreground block truncate">{adversario || evento?.adversario || 'Adversário'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{schoolTeamName}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={placarTime1}
                      onChange={(e) => setPlacarTime1(e.target.value)}
                      className="text-center text-xl font-bold h-12"
                      disabled={hasScore}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{adversario || evento?.adversario || 'Adversário'}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={placarTime2}
                      onChange={(e) => setPlacarTime2(e.target.value)}
                      className="text-center text-xl font-bold h-12"
                      disabled={hasScore}
                    />
                  </div>
                </div>

                {/* Adversary name input - only if not already set */}
                {!evento?.adversario && !hasScore && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nome do Adversário</Label>
                    <Input
                      placeholder="Ex: Botafogo, Vasco..."
                      value={adversario}
                      onChange={(e) => setAdversario(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Presence Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Confirmação de Presença
                  </h3>
                  <Badge variant="outline">
                    {confirmedAthletes.filter(c => presencas[c.crianca_id]?.presente === true).length}/{confirmedAthletes.length} presentes
                  </Badge>
                </div>

                {confirmedAthletes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum atleta confirmado para este amistoso.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {confirmedAthletes.map((conv) => {
                      const presencaStatus = presencas[conv.crianca_id];
                      const isPresente = presencaStatus?.presente === true;
                      const isAusente = presencaStatus?.presente === false;

                      return (
                        <div
                          key={conv.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isPresente
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : isAusente
                              ? 'bg-destructive/10 border-destructive/30'
                              : 'bg-muted/30'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={conv.crianca?.foto_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {conv.crianca?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <span className="flex-1 font-medium truncate">{conv.crianca?.nome}</span>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={isPresente ? 'default' : 'outline'}
                              className={isPresente ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                              onClick={() => handlePresencaChange(conv.crianca_id, true)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={isAusente ? 'destructive' : 'outline'}
                              onClick={() => handlePresencaChange(conv.crianca_id, false)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            
                            {isAusente && (
                              <Select
                                value={presencaStatus?.motivo_ausencia || ''}
                                onValueChange={(v) => handleMotivoChange(conv.crianca_id, v)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MOTIVOS_AUSENCIA.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                      {m.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Goals Section - Only show if we have a score and present athletes */}
              {(localPlacar1 ?? 0) > 0 && presentAthletes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Goal className="w-4 h-4" />
                        Gols da Partida
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={remainingGols === 0 ? 'bg-emerald-500/10 text-emerald-700' : ''}
                      >
                        {totalGolsRegistrados}/{maxGols} gols registrados
                      </Badge>
                    </div>

                    {totalGolsRegistrados > maxGols && (
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Total de gols excede o placar final!</span>
                      </div>
                    )}

                    {/* Add goal form */}
                    {remainingGols > 0 && availableForGoals.length > 0 && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label>Jogador</Label>
                          <Select value={selectedGolJogador} onValueChange={setSelectedGolJogador}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableForGoals.map((a) => (
                                <SelectItem key={a.crianca_id} value={a.crianca_id}>
                                  {a.crianca?.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-20 space-y-1">
                          <Label>Gols</Label>
                          <Input
                            type="number"
                            min="1"
                            max={remainingGols}
                            value={golQuantidade}
                            onChange={(e) => setGolQuantidade(e.target.value)}
                            className="text-center"
                          />
                        </div>
                        <Button
                          onClick={handleAddGol}
                          disabled={!selectedGolJogador || createGolMutation.isPending}
                        >
                          {createGolMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Goals list */}
                    {gols.length > 0 && (
                      <div className="space-y-2">
                        {gols.map((gol) => (
                          <div
                            key={gol.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="text-lg">⚽</span>
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={gol.crianca?.foto_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {gol.crianca?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 font-medium">{gol.crianca?.nome}</span>
                            <Badge variant="secondary">{gol.quantidade} gol(s)</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleDeleteGol(gol.id)}
                              disabled={deleteGolMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Awards Section */}
              {presentAthletes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Medal className="w-4 h-4" />
                        Premiações Individuais
                      </h3>
                      {premiacoes.length > 0 && (
                        <Badge variant="outline">{premiacoes.length} premiação(ões)</Badge>
                      )}
                    </div>

                    {/* Add award form */}
                    {availablePremiacoes.length > 0 && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label>Tipo</Label>
                          <Select value={selectedPremiacao} onValueChange={setSelectedPremiacao}>
                            <SelectTrigger>
                              <SelectValue placeholder="Premiação" />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePremiacoes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {getTipoEmoji(t.value)} {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label>Jogador</Label>
                          <Select value={selectedPremiacaoJogador} onValueChange={setSelectedPremiacaoJogador}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {presentAthletes.map((a) => (
                                <SelectItem key={a.crianca_id} value={a.crianca_id}>
                                  {a.crianca?.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleAddPremiacao}
                          disabled={!selectedPremiacao || !selectedPremiacaoJogador || createPremiacaoMutation.isPending}
                        >
                          {createPremiacaoMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Awards list */}
                    {premiacoes.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhuma premiação registrada.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {premiacoes.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                          >
                            <span className="text-xl">{getTipoEmoji(p.tipo_premiacao)}</span>
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={p.crianca?.foto_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {p.crianca?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{p.crianca?.nome}</div>
                              <div className="text-xs text-muted-foreground">{getTipoLabel(p.tipo_premiacao)}</div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleDeletePremiacao(p.id)}
                              disabled={deletePremiacaoMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Finalizar Jogo'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
