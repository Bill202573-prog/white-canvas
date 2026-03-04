import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateCampeonato,
  useUpdateCampeonato,
  type Campeonato,
  type CampeonatoStatus,
} from '@/hooks/useCampeonatosData';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  nome_time: z.string().optional(),
  ano: z.number().min(2000).max(2100),
  categoria: z.string().optional(),
  status: z.enum(['em_andamento', 'finalizado'] as const),
  observacoes: z.string().optional(),
  valor: z.number().min(0).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface CampeonatoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campeonato?: Campeonato | null;
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

export function CampeonatoFormDialog({ open, onOpenChange, campeonato }: CampeonatoFormDialogProps) {
  const createCampeonato = useCreateCampeonato();
  const updateCampeonato = useUpdateCampeonato();
  const isEditing = !!campeonato;

  const currentYear = new Date().getFullYear();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      nome_time: '',
      ano: currentYear,
      categoria: '',
      status: 'em_andamento',
      observacoes: '',
      valor: null,
    },
  });

  useEffect(() => {
    if (campeonato) {
      form.reset({
        nome: campeonato.nome,
        nome_time: campeonato.nome_time || '',
        ano: campeonato.ano,
        categoria: campeonato.categoria || '',
        status: campeonato.status as CampeonatoStatus,
        observacoes: campeonato.observacoes || '',
        valor: (campeonato as any).valor ?? null,
      });
    } else {
      form.reset({
        nome: '',
        nome_time: '',
        ano: currentYear,
        categoria: '',
        status: 'em_andamento',
        observacoes: '',
        valor: null,
      });
    }
  }, [campeonato, form, currentYear]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        nome: data.nome,
        nome_time: data.nome_time || null,
        ano: data.ano,
        categoria: data.categoria || null,
        status: data.status as CampeonatoStatus,
        observacoes: data.observacoes || null,
        valor: data.valor ?? null,
      };

      if (isEditing && campeonato) {
        await updateCampeonato.mutateAsync({ id: campeonato.id, ...payload });
        toast.success('Campeonato atualizado com sucesso!');
      } else {
        await createCampeonato.mutateAsync(payload);
        toast.success('Campeonato criado com sucesso!', {
          description: 'Para convocar os atletas, entre no campeonato e selecione-os na aba de convocação.',
          duration: 6000,
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar campeonato');
    }
  };

  const isLoading = createCampeonato.isPending || updateCampeonato.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Campeonato' : 'Novo Campeonato'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Campeonato</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Copa Trivela" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Time da Escolinha</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Fluminense" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Nome reduzido do time (ex: "Fluminense" ao invés de "Escola de Futebol Fluminense")
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
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

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Campeonato (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 50.00"
                      step="0.01"
                      min="0"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Valor padrão que será cobrado de cada atleta convocado. Pode ser personalizado por atleta.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
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
                {isEditing ? 'Salvar' : 'Criar Campeonato'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
