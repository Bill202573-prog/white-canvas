import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Eye, Instagram, Palette, Lock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PerfilAtleta, useUpdatePerfilAtleta } from '@/hooks/useCarreiraData';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  categoria: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  bio: z.string().max(280, 'Máximo de 280 caracteres').optional(),
  instagram_url: z.string().max(200, 'Máximo de 200 caracteres').optional(),
});

type FormData = z.infer<typeof formSchema>;

const MODALIDADES = [
  'Futebol',
  'Futsal',
  'Beach Soccer',
  'Futebol Society',
  'Futebol Americano',
  'Basquete',
  'Vôlei',
  'Handebol',
  'Natação',
  'Atletismo',
  'Judô',
  'Jiu-Jitsu',
  'Tênis',
  'Outro',
];

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface EditPerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfil: PerfilAtleta;
}

export function EditPerfilDialog({ open, onOpenChange, perfil }: EditPerfilDialogProps) {
  const updatePerfil = useUpdatePerfilAtleta();
  const [photoUrl, setPhotoUrl] = useState(perfil.foto_url || '');
  const [bannerUrl, setBannerUrl] = useState(perfil.banner_url || '');
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const [corDestaque, setCorDestaque] = useState(perfil.cor_destaque || '#3b82f6');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dadosPublicos, setDadosPublicos] = useState({
    gols: true,
    campeonatos: true,
    amistosos: true,
    premiacoes: true,
    conquistas: true,
  });

  // Detect if this is a platform/admin profile (no athlete-specific data needed)
  const isPlatformProfile = perfil.modalidade === 'Plataforma' || !perfil.crianca_id;

  // Check if athlete has active school link (Atleta ID)
  const { data: hasActiveSchoolLink } = useQuery({
    queryKey: ['has-school-link', perfil.crianca_id],
    queryFn: async () => {
      if (!perfil.crianca_id) return false;
      const { data } = await supabase
        .from('crianca_escolinha')
        .select('id')
        .eq('crianca_id', perfil.crianca_id)
        .eq('ativo', true)
        .limit(1);
      return (data?.length || 0) > 0;
    },
    enabled: !!perfil.crianca_id && open,
  });

  const isCarreiraOnly = !isPlatformProfile && !hasActiveSchoolLink;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: perfil.nome,
      categoria: perfil.categoria || '',
      cidade: perfil.cidade || '',
      estado: perfil.estado || '',
      bio: perfil.bio || '',
      instagram_url: (perfil as any).instagram_url || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome: perfil.nome,
        categoria: perfil.categoria || '',
        cidade: perfil.cidade || '',
        estado: perfil.estado || '',
        bio: perfil.bio || '',
        instagram_url: (perfil as any).instagram_url || '',
      });
      setPhotoUrl(perfil.foto_url || '');
      setBannerUrl(perfil.banner_url || '');
      setCorDestaque(perfil.cor_destaque || '#3b82f6');
      // Initialize modalidades from perfil
      const initialModalidades = perfil.modalidades || [perfil.modalidade];
      setSelectedModalidades(initialModalidades.filter(Boolean));
      // Initialize dados_publicos
      const dp = (perfil as any).dados_publicos;
      if (dp) {
        setDadosPublicos({
          gols: dp.gols !== false,
          campeonatos: dp.campeonatos !== false,
          amistosos: dp.amistosos !== false,
          premiacoes: dp.premiacoes !== false,
          conquistas: dp.conquistas !== false,
        });
      }
    }
  }, [open, perfil, form]);

  const handleModalidadeChange = (modalidade: string, checked: boolean) => {
    if (checked) {
      setSelectedModalidades(prev => [...prev, modalidade]);
    } else {
      setSelectedModalidades(prev => prev.filter(m => m !== modalidade));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!isPlatformProfile && selectedModalidades.length === 0) {
      return;
    }

    const updateData: any = {
      id: perfil.id,
      nome: data.nome,
      cidade: data.cidade || null,
      estado: data.estado || null,
      bio: data.bio || null,
      foto_url: photoUrl || null,
      banner_url: bannerUrl || null,
      instagram_url: data.instagram_url || null,
      cor_destaque: corDestaque,
    };

    if (!isPlatformProfile) {
      updateData.modalidade = selectedModalidades[0];
      updateData.modalidades = selectedModalidades;
      updateData.categoria = data.categoria || null;
      updateData.dados_publicos = dadosPublicos;
    }

    await updatePerfil.mutateAsync(updateData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Photo and Banner Upload */}
            <ProfilePhotoUpload
              currentPhotoUrl={photoUrl}
              currentBannerUrl={bannerUrl}
              onPhotoChange={setPhotoUrl}
              onBannerChange={setBannerUrl}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modalidades Multi-Select - only for athlete profiles */}
            {!isPlatformProfile && (
            <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modalidades *</label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione todas as modalidades que pratica
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MODALIDADES.map((mod) => (
                  <div key={mod} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mod-${mod}`}
                      checked={selectedModalidades.includes(mod)}
                      onCheckedChange={(checked) => handleModalidadeChange(mod, !!checked)}
                    />
                    <label
                      htmlFor={`mod-${mod}`}
                      className="text-sm cursor-pointer"
                    >
                      {mod}
                    </label>
                  </div>
                ))}
              </div>
              {selectedModalidades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedModalidades.map((mod) => (
                    <Badge key={mod} variant="secondary" className="gap-1">
                      {mod}
                      <button
                        type="button"
                        onClick={() => handleModalidadeChange(mod, false)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {selectedModalidades.length === 0 && (
                <p className="text-sm text-destructive">Selecione pelo menos uma modalidade</p>
              )}
            </div>

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sub-11, Profissional, Master" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </>
            )}

            {/* City and State */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte um pouco sobre você e sua trajetória esportiva"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Instagram */}
            <FormField
              control={form.control}
              name="instagram_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="@usuario ou link do perfil" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Ex: @joaoatleta ou https://instagram.com/joaoatleta
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cor de Destaque */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                Cor de destaque
              </label>
              <p className="text-xs text-muted-foreground">
                Escolha a cor que personaliza o perfil público do atleta
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
                  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#000000',
                ].map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setCorDestaque(cor)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${corDestaque === cor ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>

            {/* Dados Públicos - only for athlete profiles */}
            {!isPlatformProfile && (
            <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <label className="text-sm font-medium">Dados visíveis no perfil público</label>
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha quais informações da jornada esportiva serão exibidas na página pública do atleta.
              </p>
              {isCarreiraOnly && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/60 border border-border">
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Recurso disponível ao vincular-se a uma escolinha no Atleta ID
                  </p>
                </div>
              )}
              {[
                { key: 'gols' as const, label: 'Gols marcados' },
                { key: 'amistosos' as const, label: 'Amistosos disputados' },
                { key: 'campeonatos' as const, label: 'Campeonatos' },
                { key: 'premiacoes' as const, label: 'Premiações individuais' },
                { key: 'conquistas' as const, label: 'Conquistas coletivas' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${isCarreiraOnly ? 'text-muted-foreground' : ''}`}>{label}</span>
                  <Switch
                    checked={isCarreiraOnly ? false : dadosPublicos[key]}
                    disabled={isCarreiraOnly}
                    onCheckedChange={(checked) =>
                      setDadosPublicos((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
            </>
            )}

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updatePerfil.isPending || (!isPlatformProfile && selectedModalidades.length === 0)}
              >
                {updatePerfil.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>

            <Separator className="my-4" />
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Apagar minha conta
              </Button>
            </div>
          </form>
        </Form>

        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          perfilId={perfil.id}
          perfilTable="perfil_atleta"
        />
      </DialogContent>
    </Dialog>
  );
}
