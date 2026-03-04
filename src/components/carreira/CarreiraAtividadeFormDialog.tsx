import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Loader2, X, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  useCreateAtividadeExterna,
  useUpdateAtividadeExterna,
  AtividadeExterna,
  AtividadeExternaTipo,
  TorneioAbrangencia,
  TIPO_ATIVIDADE_LABELS,
  ABRANGENCIA_LABELS,
  OBJETIVOS_OPTIONS,
  METODOLOGIA_OPTIONS,
  FREQUENCIA_OPTIONS,
  getFieldsForType,
} from '@/hooks/useAtividadesExternasData';
import AtividadeExternaPhotoUpload from '@/components/guardian/AtividadeExternaPhotoUpload';
import { useCarreiraAtividadeLimit } from '@/hooks/useCarreiraFreemium';
import { CarreiraPaywall } from './CarreiraPaywall';

const formSchema = z.object({
  tipo: z.string().min(1, 'Selecione o tipo de atividade'),
  tipo_outro_descricao: z.string().optional(),
  data: z.string().min(1, 'Informe a data'),
  data_fim: z.string().optional(),
  frequencia_semanal: z.coerce.number().optional(),
  carga_horaria_horas: z.coerce.number().optional(),
  local_atividade: z.string().min(1, 'Informe o local'),
  profissional_instituicao: z.string().optional(),
  profissionais_envolvidos: z.array(z.string()).optional(),
  organizador: z.string().optional(),
  torneio_abrangencia: z.string().optional(),
  torneio_nome: z.string().optional(),
  objetivos: z.array(z.string()).optional(),
  metodologia: z.string().optional(),
  observacoes: z.string().optional(),
}).superRefine((data, ctx) => {
  const tipo = data.tipo as AtividadeExternaTipo;
  const fields = getFieldsForType(tipo);
  
  if (tipo === 'outro' && !data.tipo_outro_descricao) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Descreva o tipo de atividade', path: ['tipo_outro_descricao'] });
  }
  if (fields.required.includes('profissional_instituicao') && !data.profissional_instituicao) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o profissional ou instituição', path: ['profissional_instituicao'] });
  }
  if (fields.required.includes('torneio_nome') && !data.torneio_nome) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o nome do torneio', path: ['torneio_nome'] });
  }
  if (fields.required.includes('organizador') && !data.organizador) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o organizador', path: ['organizador'] });
  }
  if (fields.required.includes('torneio_abrangencia') && !data.torneio_abrangencia) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione a abrangência', path: ['torneio_abrangencia'] });
  }
  if (fields.required.includes('data_fim') && !data.data_fim) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a data de fim', path: ['data_fim'] });
  }
  if (fields.required.includes('carga_horaria_horas') && (!data.carga_horaria_horas || data.carga_horaria_horas <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a carga horária', path: ['carga_horaria_horas'] });
  }
});

type FormData = z.infer<typeof formSchema>;

interface CarreiraAtividadeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
  childName: string;
  editingActivity?: AtividadeExterna | null;
}

export function CarreiraAtividadeFormDialog({
  open,
  onOpenChange,
  criancaId,
  childName,
  editingActivity = null,
}: CarreiraAtividadeFormDialogProps) {
  const createAtividade = useCreateAtividadeExterna();
  const updateAtividade = useUpdateAtividadeExterna();
  const { data: limitResult, isLoading: limitLoading, refetch: refetchLimit } = useCarreiraAtividadeLimit(criancaId);
  const [selectedObjetivos, setSelectedObjetivos] = useState<string[]>([]);
  const [profissionalInput, setProfissionalInput] = useState('');
  const [profissionaisList, setProfissionaisList] = useState<string[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [tornarPublico, setTornarPublico] = useState(true); // Default true for Carreira

  const isEditing = !!editingActivity;
  const isPending = createAtividade.isPending || updateAtividade.isPending;
  const showPaywall = !isEditing && limitResult?.status === 'limit_reached';

  // Force refetch limit every time dialog opens to prevent stale cache bypass
  useEffect(() => {
    if (open && !isEditing) {
      refetchLimit();
    }
  }, [open, isEditing, refetchLimit]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: '', tipo_outro_descricao: '', data: '', data_fim: '',
      frequencia_semanal: undefined, carga_horaria_horas: undefined,
      local_atividade: '', profissional_instituicao: '',
      profissionais_envolvidos: [], organizador: '',
      torneio_abrangencia: '', torneio_nome: '',
      objetivos: [], metodologia: '', observacoes: '',
    },
  });

  useEffect(() => {
    if (editingActivity && open) {
      form.reset({
        tipo: editingActivity.tipo,
        tipo_outro_descricao: editingActivity.tipo_outro_descricao || '',
        data: editingActivity.data,
        data_fim: editingActivity.data_fim || '',
        frequencia_semanal: editingActivity.frequencia_semanal || undefined,
        carga_horaria_horas: editingActivity.carga_horaria_horas || undefined,
        local_atividade: editingActivity.local_atividade,
        profissional_instituicao: editingActivity.profissional_instituicao || '',
        profissionais_envolvidos: editingActivity.profissionais_envolvidos || [],
        organizador: editingActivity.organizador || '',
        torneio_abrangencia: editingActivity.torneio_abrangencia || '',
        torneio_nome: editingActivity.torneio_nome || '',
        objetivos: editingActivity.objetivos || [],
        metodologia: editingActivity.metodologia || '',
        observacoes: editingActivity.observacoes || '',
      });
      setSelectedObjetivos(editingActivity.objetivos || []);
      setProfissionaisList(editingActivity.profissionais_envolvidos || []);
      setFotos(editingActivity.fotos_urls || []);
      setTornarPublico(editingActivity.tornar_publico || false);
    }
  }, [editingActivity, open, form]);

  const tipoValue = form.watch('tipo') as AtividadeExternaTipo;
  const fieldConfig = tipoValue ? getFieldsForType(tipoValue) : null;

  useEffect(() => {
    if (tipoValue && !isEditing) {
      const fields = getFieldsForType(tipoValue);
      fields.hidden.forEach((field) => {
        if (field === 'objetivos') { setSelectedObjetivos([]); form.setValue('objetivos', []); }
        else if (field === 'profissionais_envolvidos') { setProfissionaisList([]); form.setValue('profissionais_envolvidos', []); }
        else { form.setValue(field as keyof FormData, '' as any); }
      });
    }
  }, [tipoValue, form, isEditing]);

  const isFieldVisible = (fieldName: string): boolean => {
    if (!fieldConfig) return false;
    return fieldConfig.required.includes(fieldName) || fieldConfig.optional.includes(fieldName);
  };

  const isFieldRequired = (fieldName: string): boolean => {
    if (!fieldConfig) return false;
    return fieldConfig.required.includes(fieldName);
  };

  const handleObjetivoChange = (value: string, checked: boolean) => {
    const updated = checked ? [...selectedObjetivos, value] : selectedObjetivos.filter((v) => v !== value);
    setSelectedObjetivos(updated);
    form.setValue('objetivos', updated);
  };

  const addProfissional = () => {
    if (profissionalInput.trim()) {
      const updated = [...profissionaisList, profissionalInput.trim()];
      setProfissionaisList(updated);
      form.setValue('profissionais_envolvidos', updated);
      setProfissionalInput('');
    }
  };

  const removeProfissional = (index: number) => {
    const updated = profissionaisList.filter((_, i) => i !== index);
    setProfissionaisList(updated);
    form.setValue('profissionais_envolvidos', updated);
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Double-check limit before submitting (server-fresh)
      if (!isEditing) {
        const { data: freshLimit } = await refetchLimit();
        if (freshLimit?.status === 'limit_reached') {
          toast.error('Limite de atividades gratuitas atingido. Assine o plano PRO para continuar.');
          return;
        }
      }

      const payload = {
        crianca_id: criancaId,
        tipo: data.tipo as AtividadeExternaTipo,
        tipo_outro_descricao: data.tipo_outro_descricao || undefined,
        data: data.data,
        data_fim: data.data_fim || undefined,
        frequencia_semanal: data.frequencia_semanal || undefined,
        carga_horaria_horas: data.carga_horaria_horas || undefined,
        local_atividade: data.local_atividade,
        profissional_instituicao: data.profissional_instituicao || '',
        profissionais_envolvidos: profissionaisList.length > 0 ? profissionaisList : undefined,
        organizador: data.organizador || undefined,
        torneio_abrangencia: data.torneio_abrangencia as TorneioAbrangencia | undefined,
        torneio_nome: data.torneio_nome || undefined,
        objetivos: data.objetivos || [],
        metodologia: data.metodologia || undefined,
        observacoes: data.observacoes || undefined,
        fotos_urls: fotos,
        tornar_publico: tornarPublico,
      };

      if (isEditing && editingActivity) {
        await updateAtividade.mutateAsync({ id: editingActivity.id, crianca_id: criancaId, ...payload });
        toast.success('Atividade atualizada com sucesso!');
      } else {
        await createAtividade.mutateAsync(payload);
        toast.success('Atividade registrada com sucesso!');
      }
      handleClose();
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar atividade' : 'Erro ao registrar atividade');
      console.error('[CarreiraAtividadeForm] Submit error:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedObjetivos([]);
    setProfissionaisList([]);
    setFotos([]);
    setPhotosUploading(false);
    setTornarPublico(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showPaywall ? 'Limite atingido' : isEditing ? 'Editar Atividade Extra' : 'Nova Atividade Extra'}
          </DialogTitle>
          {!showPaywall && (
            <p className="text-sm text-muted-foreground">
              {isEditing ? 'Editando' : 'Registrar para'} {childName.split(' ')[0]}
            </p>
          )}
        </DialogHeader>

        {limitLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : showPaywall && limitResult ? (
          <CarreiraPaywall limitResult={limitResult} childName={childName.split(' ')[0]} criancaId={criancaId} onClose={() => onOpenChange(false)} onSubscribed={() => {
            // After subscription, refetch limit and allow creation
            onOpenChange(false);
          }} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Freemium counter */}
              {limitResult?.source === 'freemium' && !isEditing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {limitResult.count} de {limitResult.limit} atividades gratuitas utilizadas
                  </span>
                </div>
              )}

              {/* Tipo */}
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Atividade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TIPO_ATIVIDADE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {tipoValue === 'outro' && (
                <FormField control={form.control} name="tipo_outro_descricao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Atividade *</FormLabel>
                    <FormControl><Input {...field} placeholder="Descreva a atividade" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {tipoValue && (
                <>
                  {isFieldVisible('torneio_nome') && (
                    <FormField control={form.control} name="torneio_nome" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Torneio {isFieldRequired('torneio_nome') && '*'}</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: Copa Regional Sub-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Datas */}
                  <div className={`grid gap-4 ${isFieldVisible('data_fim') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <FormField control={form.control} name="data" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isFieldVisible('data_fim') ? 'Data de Início' : 'Data'} *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="date" {...field} />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {isFieldVisible('data_fim') && (
                      <FormField control={form.control} name="data_fim" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Fim {isFieldRequired('data_fim') && '*'}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="date" {...field} />
                              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  {/* Frequência e Carga */}
                  {(isFieldVisible('frequencia_semanal') || isFieldVisible('carga_horaria_horas')) && (
                    <div className="grid grid-cols-2 gap-4">
                      {isFieldVisible('frequencia_semanal') && (
                        <FormField control={form.control} name="frequencia_semanal" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequência Semanal</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {FREQUENCIA_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                      {isFieldVisible('carga_horaria_horas') && (
                        <FormField control={form.control} name="carga_horaria_horas" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carga Horária (h) {isFieldRequired('carga_horaria_horas') && '*'}</FormLabel>
                            <FormControl><Input type="number" step="0.5" min="0.5" {...field} placeholder="Ex: 8" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  )}

                  {/* Local */}
                  <FormField control={form.control} name="local_atividade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local *</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: CT do clube, Ginásio Municipal..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Profissional/Instituição */}
                  {isFieldVisible('profissional_instituicao') && (
                    <FormField control={form.control} name="profissional_instituicao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional / Instituição {isFieldRequired('profissional_instituicao') && '*'}</FormLabel>
                        <FormControl><Input {...field} placeholder="Nome do profissional ou instituição" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Organizador */}
                  {isFieldVisible('organizador') && (
                    <FormField control={form.control} name="organizador" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizador {isFieldRequired('organizador') && '*'}</FormLabel>
                        <FormControl><Input {...field} placeholder="Quem organizou o evento" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Abrangência */}
                  {isFieldVisible('torneio_abrangencia') && (
                    <FormField control={form.control} name="torneio_abrangencia" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abrangência {isFieldRequired('torneio_abrangencia') && '*'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ABRANGENCIA_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Objetivos */}
                  {isFieldVisible('objetivos') && (
                    <div className="space-y-2">
                      <FormLabel>Objetivos</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {OBJETIVOS_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Checkbox
                              checked={selectedObjetivos.includes(opt.value)}
                              onCheckedChange={(checked) => handleObjetivoChange(opt.value, !!checked)}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metodologia */}
                  {isFieldVisible('metodologia') && (
                    <FormField control={form.control} name="metodologia" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metodologia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {METODOLOGIA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Profissionais envolvidos */}
                  {isFieldVisible('profissionais_envolvidos') && (
                    <div className="space-y-2">
                      <FormLabel>Profissionais Envolvidos</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          value={profissionalInput}
                          onChange={(e) => setProfissionalInput(e.target.value)}
                          placeholder="Nome do profissional"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProfissional(); } }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addProfissional}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {profissionaisList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {profissionaisList.map((p, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {p}
                              <button type="button" onClick={() => removeProfissional(i)}>
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observações */}
                  <FormField control={form.control} name="observacoes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl><Textarea {...field} placeholder="Informações adicionais (opcional)" rows={3} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Fotos */}
                  <AtividadeExternaPhotoUpload
                    criancaId={criancaId}
                    existingPhotos={fotos}
                    onPhotosChange={setFotos}
                    onUploadingChange={setPhotosUploading}
                  />

                  {/* Tornar público toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Exibir no perfil público</p>
                      <p className="text-xs text-muted-foreground">Visível para quem acessar o currículo</p>
                    </div>
                    <Switch checked={tornarPublico} onCheckedChange={setTornarPublico} />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={isPending || photosUploading}>
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />{isEditing ? 'Salvando...' : 'Registrando...'}</>
                ) : isEditing ? 'Salvar Alterações' : 'Registrar Atividade'}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
