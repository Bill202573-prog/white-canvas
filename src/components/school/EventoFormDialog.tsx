import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trophy, Plus, Users, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useCreateEvento,
  useUpdateEvento,
  type EventoEsportivo,
  type EventoTipo,
  type EventoStatus,
} from '@/hooks/useEventosData';
import { useSchoolCampeonatos, useCreateCampeonato } from '@/hooks/useCampeonatosData';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  nome: z.string().optional(), // Optional when locked to championship
  nome_time_escola: z.string().optional(),
  adversario: z.string().optional(),
  tipo: z.enum(['amistoso', 'campeonato'] as const),
  data: z.string().min(1, 'Data é obrigatória'),
  horario_inicio: z.string().optional(),
  horario_fim: z.string().optional(),
  local: z.string().optional(),
  endereco: z.string().optional(),
  categoria: z.string().optional(),
  status: z.enum(['agendado', 'realizado', 'finalizado'] as const),
  observacoes: z.string().optional(),
  campeonato_id: z.string().optional(),
  fase: z.string().optional(),
  novo_campeonato: z.string().optional(),
  taxa_participacao: z.coerce.number().optional(),
  cobrar_taxa_participacao: z.boolean().optional(),
  taxa_juiz: z.coerce.number().optional(),
  cobrar_taxa_juiz: z.boolean().optional(),
  data_limite_pagamento: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: EventoEsportivo | null;
  /** When true, forces the event type to 'amistoso' and hides campeonato fields */
  forceAmistoso?: boolean;
  /** When set, locks the campeonato selection to this ID and forces type to 'campeonato' */
  lockedCampeonatoId?: string;
  /** Name of the locked championship for display in the dialog title */
  lockedCampeonatoNome?: string;
}

const CATEGORIAS = [
  'Sub-5',
  'Sub-6',
  'Sub-7',
  'Sub-8',
  'Sub-9',
  'Sub-10',
  'Sub-11',
  'Sub-12',
  'Sub-13',
  'Sub-14',
  'Sub-15',
  'Sub-17',
  'Livre',
];

const FASES = [
  'Fase de Grupos',
  'Oitavas de Final',
  'Quartas de Final',
  'Semifinal',
  'Terceiro Lugar',
  'Final',
  'Rodada 1',
  'Rodada 2',
  'Rodada 3',
  'Rodada 4',
  'Rodada 5',
];

export function EventoFormDialog({ 
  open, 
  onOpenChange, 
  evento,
  forceAmistoso = false,
  lockedCampeonatoId,
  lockedCampeonatoNome,
}: EventoFormDialogProps) {
  const { user } = useAuth();
  const createEvento = useCreateEvento();
  const updateEvento = useUpdateEvento();
  const createCampeonato = useCreateCampeonato();
  const { data: campeonatos, refetch: refetchCampeonatos } = useSchoolCampeonatos();
  const isEditing = !!evento;
  
  const [showNewCampeonato, setShowNewCampeonato] = useState(false);
  const [newCampeonatoName, setNewCampeonatoName] = useState('');
  const [isCreatingCampeonato, setIsCreatingCampeonato] = useState(false);

  // Get escola name for display
  const escolaNome = user?.escolinhaNome || 'Time da Escola';

  // When locked to a championship, use its name in the title
  const dialogTitle = isEditing 
    ? 'Editar Jogo' 
    : lockedCampeonatoNome 
      ? lockedCampeonatoNome 
      : forceAmistoso 
        ? 'Novo Amistoso'
        : 'Novo Evento Esportivo';

  // Determine the effective type based on props
  const effectiveTipo = forceAmistoso ? 'amistoso' : (lockedCampeonatoId ? 'campeonato' : undefined);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      nome_time_escola: '',
      adversario: '',
      tipo: 'amistoso',
      data: '',
      horario_inicio: '',
      horario_fim: '',
      local: '',
      endereco: '',
      categoria: '',
      status: 'agendado',
      observacoes: '',
      campeonato_id: 'none',
      fase: 'none',
      novo_campeonato: '',
      taxa_participacao: undefined,
      cobrar_taxa_participacao: false,
      taxa_juiz: undefined,
      cobrar_taxa_juiz: false,
      data_limite_pagamento: '',
    },
  });

  const watchTipo = form.watch('tipo');

  useEffect(() => {
    if (evento) {
      const eventoWithFees = evento as EventoEsportivo & {
        taxa_participacao?: number | null;
        cobrar_taxa_participacao?: boolean;
        taxa_juiz?: number | null;
        cobrar_taxa_juiz?: boolean;
        data_limite_pagamento?: string | null;
        endereco?: string | null;
      };
      
      form.reset({
        nome: evento.nome,
        nome_time_escola: escolaNome,
        adversario: evento.adversario || '',
        tipo: evento.tipo,
        data: evento.data,
        horario_inicio: evento.horario_inicio || '',
        horario_fim: evento.horario_fim || '',
        local: evento.local || '',
        endereco: eventoWithFees.endereco || '',
        categoria: evento.categoria || '',
        status: evento.status,
        observacoes: evento.observacoes || '',
        campeonato_id: evento.campeonato_id || 'none',
        fase: evento.fase || 'none',
        novo_campeonato: '',
        taxa_participacao: eventoWithFees.taxa_participacao ?? undefined,
        cobrar_taxa_participacao: eventoWithFees.cobrar_taxa_participacao ?? false,
        taxa_juiz: eventoWithFees.taxa_juiz ?? undefined,
        cobrar_taxa_juiz: eventoWithFees.cobrar_taxa_juiz ?? false,
        data_limite_pagamento: eventoWithFees.data_limite_pagamento || '',
      });
      setShowNewCampeonato(false);
    } else {
      // Determine initial tipo based on props
      const initialTipo = forceAmistoso ? 'amistoso' : (lockedCampeonatoId ? 'campeonato' : 'amistoso');
      
      form.reset({
        nome: '',
        nome_time_escola: escolaNome,
        adversario: '',
        tipo: initialTipo,
        data: '',
        horario_inicio: '',
        horario_fim: '',
        local: '',
        endereco: '',
        categoria: '',
        status: 'agendado',
        observacoes: '',
        campeonato_id: lockedCampeonatoId || 'none',
        fase: 'none',
        novo_campeonato: '',
        taxa_participacao: undefined,
        cobrar_taxa_participacao: false,
        taxa_juiz: undefined,
        cobrar_taxa_juiz: false,
        data_limite_pagamento: '',
      });
      setShowNewCampeonato(false);
    }
  }, [evento, form, forceAmistoso, lockedCampeonatoId, escolaNome]);

  const onSubmit = async (data: FormData) => {
    try {
      const campeonatoId = data.campeonato_id && data.campeonato_id !== 'none' ? data.campeonato_id : null;
      
      // For amistoso, generate name from teams if not provided
      let eventName = data.nome || '';
      const nomeTimeEscola = data.nome_time_escola || escolaNome;
      if (forceAmistoso && !eventName && data.adversario) {
        eventName = `${nomeTimeEscola} x ${data.adversario}`;
      } else if (lockedCampeonatoId && !eventName) {
        const faseLabel = data.fase && data.fase !== 'none' ? data.fase : 'Jogo';
        const dateLabel = data.data ? new Date(data.data).toLocaleDateString('pt-BR') : '';
        eventName = `${faseLabel}${dateLabel ? ` - ${dateLabel}` : ''}`;
      }

      const payload: any = {
        nome: eventName,
        tipo: data.tipo as EventoTipo,
        data: data.data,
        horario_inicio: data.horario_inicio || null,
        horario_fim: data.horario_fim || null,
        local: data.local || null,
        categoria: lockedCampeonatoId ? null : (data.categoria || null),
        status: data.status as EventoStatus,
        observacoes: data.observacoes || null,
        campeonato_id: data.tipo === 'campeonato' ? campeonatoId : null,
        fase: data.tipo === 'campeonato' ? (data.fase && data.fase !== 'none' ? data.fase : null) : null,
        adversario: data.adversario || null,
      };

      // Add fee fields for amistosos and campeonatos
      if (forceAmistoso || lockedCampeonatoId || data.tipo === 'amistoso' || data.tipo === 'campeonato') {
        payload.taxa_juiz = data.taxa_juiz || null;
        payload.cobrar_taxa_juiz = data.cobrar_taxa_juiz || false;
        payload.data_limite_pagamento = data.data_limite_pagamento || null;
      }
      
      // Add additional fields for amistosos only
      if (forceAmistoso || data.tipo === 'amistoso') {
        payload.taxa_participacao = data.taxa_participacao || null;
        payload.cobrar_taxa_participacao = data.cobrar_taxa_participacao || false;
        payload.endereco = data.endereco || null;
      }

      if (isEditing && evento) {
        await updateEvento.mutateAsync({ id: evento.id, ...payload });
        toast.success('Evento atualizado com sucesso!');
      } else {
        await createEvento.mutateAsync(payload);
        toast.success('Evento criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar evento');
    }
  };

  const isLoading = createEvento.isPending || updateEvento.isPending;

  const activeCampeonatos = campeonatos?.filter(c => c.status === 'em_andamento') || [];

  const handleCreateNewCampeonato = async () => {
    if (!newCampeonatoName.trim()) {
      toast.error('Digite o nome do campeonato');
      return;
    }

    setIsCreatingCampeonato(true);
    try {
      const categoria = form.getValues('categoria') || undefined;
      const currentYear = new Date().getFullYear();
      
      const newCampeonato = await createCampeonato.mutateAsync({
        nome: newCampeonatoName.trim(),
        ano: currentYear,
        categoria,
        status: 'em_andamento',
      });

      await refetchCampeonatos();
      
      // Set the newly created campeonato as selected
      form.setValue('campeonato_id', newCampeonato.id);
      setNewCampeonatoName('');
      setShowNewCampeonato(false);
      toast.success('Campeonato criado e vinculado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar campeonato');
    } finally {
      setIsCreatingCampeonato(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lockedCampeonatoNome && <Trophy className="w-5 h-5 text-purple-600" />}
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fase/Rodada and Adversário - Show at top when locked to championship */}
            {lockedCampeonatoId && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Detalhes do Jogo
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Fase / Rodada</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a fase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Não especificada</SelectItem>
                            {FASES.map((fase) => (
                              <SelectItem key={fase} value={fase}>
                                {fase}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="adversario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Adversário</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Escolinha XYZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* For Amistoso: Show teams section */}
            {forceAmistoso && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Times
                </div>
                
                <div className="grid grid-cols-2 gap-4 items-center">
                  <FormField
                    control={form.control}
                    name="nome_time_escola"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Time da Escola</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Fluminense" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="adversario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Adversário</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Escolinha XYZ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Nome do Evento - Only show when NOT forceAmistoso and NOT locked to championship */}
            {!forceAmistoso && !lockedCampeonatoId && (
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Evento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Amistoso contra Escolinha ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Only show tipo selector if not locked by context */}
              {!forceAmistoso && !lockedCampeonatoId ? (
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="amistoso">Amistoso</SelectItem>
                          <SelectItem value="campeonato">Campeonato / Torneio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-end pb-2">
                  <Badge variant="outline" className={forceAmistoso ? "bg-orange-500/10 text-orange-600" : "bg-purple-500/10 text-purple-600"}>
                    {forceAmistoso ? 'Amistoso' : 'Campeonato'}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="realizado">Realizado</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campeonato fields - only show when tipo is campeonato AND NOT locked to a championship */}
            {watchTipo === 'campeonato' && !lockedCampeonatoId && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  Vincular a Campeonato
                </div>

                {!showNewCampeonato ? (
                  <>
                    <FormField
                      control={form.control}
                      name="campeonato_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campeonato</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um campeonato" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (jogo avulso)</SelectItem>
                              {activeCampeonatos.map((camp) => (
                                <SelectItem key={camp.id} value={camp.id}>
                                  {camp.nome} ({camp.ano})
                                  {camp.categoria && ` - ${camp.categoria}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCampeonato(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Novo Campeonato
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <FormLabel>Nome do Novo Campeonato</FormLabel>
                      <Input
                        placeholder="Ex: Copa Regional Sub-9 2026"
                        value={newCampeonatoName}
                        onChange={(e) => setNewCampeonatoName(e.target.value)}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Será criado com status "Em andamento" e ano atual
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewCampeonato(false);
                          setNewCampeonatoName('');
                        }}
                        disabled={isCreatingCampeonato}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateNewCampeonato}
                        disabled={isCreatingCampeonato || !newCampeonatoName.trim()}
                      >
                        {isCreatingCampeonato && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Criar e Vincular
                      </Button>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="fase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fase / Rodada</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a fase (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Não especificada</SelectItem>
                          {FASES.map((fase) => (
                            <SelectItem key={fase} value={fase}>
                              {fase}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Data and Categoria - hide categoria when locked to championship */}
            {lockedCampeonatoId ? (
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIAS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horario_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horario_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="local"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Campo do clube, Ginásio municipal..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address field for amistosos */}
            {forceAmistoso && (
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rua das Flores, 123 - Bairro Centro, Cidade - UF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fee fields - for amistosos show all, for campeonatos show only taxa_juiz */}
            {(forceAmistoso || lockedCampeonatoId) && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  {forceAmistoso ? 'Taxas do Amistoso' : 'Taxa de Arbitragem'}
                </div>
                
                {forceAmistoso ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="taxa_participacao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Taxa de Participação</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="0,00" 
                                  className="pl-9"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cobrar_taxa_participacao"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer">
                              Cobrar dos atletas
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="taxa_juiz"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Taxa de Juiz</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="0,00" 
                                  className="pl-9"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cobrar_taxa_juiz"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer">
                              Cobrar dos atletas
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  /* For campeonatos, show only taxa_juiz (arbitragem) */
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="taxa_juiz"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Taxa de Arbitragem</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="0,00" 
                                className="pl-9"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cobrar_taxa_juiz"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal cursor-pointer">
                            Cobrar dos atletas
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Separator />

                <FormField
                  control={form.control}
                  name="data_limite_pagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Data Limite para Pagamento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Data limite para confirmação e pagamento das taxas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o evento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : lockedCampeonatoId ? 'Criar Jogo' : forceAmistoso ? 'Criar Amistoso' : 'Criar Evento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
