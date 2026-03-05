import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calendar, Loader2, School } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCarreiraExperiencia, useUpdateCarreiraExperiencia, useEscolinhasAutocomplete, CarreiraExperiencia } from '@/hooks/useCarreiraExperienciasData';

const formSchema = z.object({
  nome_escola: z.string().min(2, 'Informe o nome da escola/clube'),
  data_inicio: z.string().min(1, 'Informe a data de início'),
  data_fim: z.string().optional(),
  atual: z.boolean().default(false),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

interface ExperienciaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criancaId: string;
  childName: string;
  editingExperiencia?: CarreiraExperiencia | null;
}

export function ExperienciaFormDialog({ open, onOpenChange, criancaId, childName, editingExperiencia = null }: ExperienciaFormDialogProps) {
  const createExperiencia = useCreateCarreiraExperiencia();
  const updateExperiencia = useUpdateCarreiraExperiencia();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEscolinhaId, setSelectedEscolinhaId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { data: suggestions } = useEscolinhasAutocomplete(searchTerm);

  const isEditing = !!editingExperiencia;
  const isPending = createExperiencia.isPending || updateExperiencia.isPending;

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) setUserId(data.session.user.id);
    };
    if (open) getUser();
  }, [open]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_escola: '', data_inicio: '', data_fim: '', atual: false,
      bairro: '', cidade: '', estado: '', observacoes: '',
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editingExperiencia && open) {
      form.reset({
        nome_escola: editingExperiencia.nome_escola,
        data_inicio: editingExperiencia.data_inicio,
        data_fim: editingExperiencia.data_fim || '',
        atual: editingExperiencia.atual,
        bairro: editingExperiencia.bairro || '',
        cidade: editingExperiencia.cidade || '',
        estado: editingExperiencia.estado || '',
        observacoes: editingExperiencia.observacoes || '',
      });
      setSearchTerm(editingExperiencia.nome_escola);
      setSelectedEscolinhaId(editingExperiencia.escolinha_id);
    }
  }, [editingExperiencia, open, form]);

  const isAtual = form.watch('atual');

  useEffect(() => {
    if (isAtual) form.setValue('data_fim', '');
  }, [isAtual, form]);

  const handleSelectEscolinha = (esc: { id: string; nome: string; cidade: string | null; estado: string | null }) => {
    form.setValue('nome_escola', esc.nome);
    setSelectedEscolinhaId(esc.id);
    setSearchTerm(esc.nome);
    if (esc.cidade) form.setValue('cidade', esc.cidade);
    if (esc.estado) form.setValue('estado', esc.estado);
    setShowSuggestions(false);
  };

  const onSubmit = async (data: FormData) => {
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const payload = {
        crianca_id: criancaId,
        user_id: userId,
        nome_escola: data.nome_escola,
        escolinha_id: selectedEscolinhaId,
        data_inicio: data.data_inicio,
        data_fim: data.atual ? null : (data.data_fim || null),
        atual: data.atual,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        observacoes: data.observacoes || null,
      };

      if (isEditing && editingExperiencia) {
        await updateExperiencia.mutateAsync({ id: editingExperiencia.id, ...payload });
        toast.success('Experiência atualizada!');
      } else {
        await createExperiencia.mutateAsync(payload);
        toast.success('Experiência registrada!');
      }
      handleClose();
    } catch (err) {
      toast.error(isEditing ? 'Erro ao atualizar experiência' : 'Erro ao registrar experiência');
      console.error(err);
    }
  };

  const handleClose = () => {
    form.reset();
    setSearchTerm('');
    setSelectedEscolinhaId(null);
    setShowSuggestions(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Experiência' : 'Nova Experiência'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Editando experiência de' : 'Onde'} {childName.split(' ')[0]} {isEditing ? '' : 'treina ou treinou'}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome da escola - com autocomplete */}
            <FormField control={form.control} name="nome_escola" render={({ field }) => (
              <FormItem className="relative">
                <FormLabel>Nome da Escola / Clube *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="Ex: Flamengo, Escolinha do Bairro..."
                      className="pl-10"
                      onChange={(e) => {
                        field.onChange(e);
                        setSearchTerm(e.target.value);
                        setSelectedEscolinhaId(null);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                  </div>
                </FormControl>
                {showSuggestions && suggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((esc) => (
                      <button
                        key={esc.id}
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-left"
                        onClick={() => handleSelectEscolinha(esc)}
                      >
                        {esc.logo_url ? (
                          <img src={esc.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {esc.nome?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{esc.nome}</p>
                          {(esc.cidade || esc.estado) && (
                            <p className="text-[10px] text-muted-foreground">
                              {[esc.cidade, esc.estado].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="date" {...field} />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_fim" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Fim</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="date" {...field} disabled={isAtual} />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Atual */}
            <FormField control={form.control} name="atual" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer">Treina atualmente nesta escola</FormLabel>
              </FormItem>
            )} />

            {/* Localização */}
            <FormField control={form.control} name="bairro" render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl><Input {...field} placeholder="Ex: Tijuca" /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: Rio de Janeiro" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ESTADOS.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* Observações */}
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Posição, conquistas, detalhes..." rows={2} />
                </FormControl>
              </FormItem>
            )} />

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
