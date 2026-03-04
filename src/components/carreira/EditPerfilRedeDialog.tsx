import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Instagram, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { Separator } from '@/components/ui/separator';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  bio: z.string().max(500, 'Máximo de 500 caracteres').optional(),
  instagram: z.string().max(200).optional(),
  // dados_perfil fields
  escola_nome: z.string().optional(),
  localizacao: z.string().optional(),
  modalidades: z.string().optional(),
  categorias: z.string().optional(),
  experiencia_anos: z.string().optional(),
  certificacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditPerfilRedeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfil: any;
}

export function EditPerfilRedeDialog({ open, onOpenChange, perfil }: EditPerfilRedeDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(perfil?.foto_url || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const dados = (perfil?.dados_perfil || {}) as Record<string, any>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: perfil?.nome || '',
      bio: perfil?.bio || '',
      instagram: perfil?.instagram || '',
      escola_nome: dados.escola_nome || '',
      localizacao: dados.localizacao || '',
      modalidades: Array.isArray(dados.modalidades) ? dados.modalidades.join(', ') : (dados.modalidades || ''),
      categorias: Array.isArray(dados.categorias) ? dados.categorias.join(', ') : (dados.categorias || ''),
      experiencia_anos: dados.experiencia_anos?.toString() || '',
      certificacoes: dados.certificacoes || '',
    },
  });

  useEffect(() => {
    if (open && perfil) {
      const d = (perfil.dados_perfil || {}) as Record<string, any>;
      form.reset({
        nome: perfil.nome || '',
        bio: perfil.bio || '',
        instagram: perfil.instagram || '',
        escola_nome: d.escola_nome || '',
        localizacao: d.localizacao || '',
        modalidades: Array.isArray(d.modalidades) ? d.modalidades.join(', ') : (d.modalidades || ''),
        categorias: Array.isArray(d.categorias) ? d.categorias.join(', ') : (d.categorias || ''),
        experiencia_anos: d.experiencia_anos?.toString() || '',
        certificacoes: d.certificacoes || '',
      });
      setPhotoUrl(perfil.foto_url || '');
    }
  }, [open, perfil, form]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const newDados = {
        ...dados,
        escola_nome: data.escola_nome || null,
        localizacao: data.localizacao || null,
        modalidades: data.modalidades ? data.modalidades.split(',').map(s => s.trim()).filter(Boolean) : [],
        categorias: data.categorias ? data.categorias.split(',').map(s => s.trim()).filter(Boolean) : [],
        experiencia_anos: data.experiencia_anos ? parseInt(data.experiencia_anos) : null,
        certificacoes: data.certificacoes || null,
      };

      const { error } = await supabase
        .from('perfis_rede')
        .update({
          nome: data.nome,
          bio: data.bio || null,
          instagram: data.instagram || null,
          foto_url: photoUrl || null,
          dados_perfil: newDados,
        })
        .eq('id', perfil.id);

      if (error) throw error;
      toast.success('Perfil atualizado!');
      queryClient.invalidateQueries({ queryKey: ['perfil-rede'] });
      queryClient.invalidateQueries({ queryKey: ['meu-perfil-rede'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ProfilePhotoUpload
              currentPhotoUrl={photoUrl}
              currentBannerUrl=""
              onPhotoChange={setPhotoUrl}
              onBannerChange={() => {}}
            />

            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl><Textarea placeholder="Fale sobre você..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="instagram" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5"><Instagram className="w-4 h-4" /> Instagram</FormLabel>
                <FormControl><Input placeholder="@usuario" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="escola_nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Escola / Instituição</FormLabel>
                <FormControl><Input placeholder="Ex: Escola do Flamengo" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="localizacao" render={({ field }) => (
              <FormItem>
                <FormLabel>Localização</FormLabel>
                <FormControl><Input placeholder="Ex: Rio de Janeiro" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="modalidades" render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidades</FormLabel>
                <FormControl><Input placeholder="Futebol, Futsal (separar por vírgula)" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="categorias" render={({ field }) => (
              <FormItem>
                <FormLabel>Categorias</FormLabel>
                <FormControl><Input placeholder="Sub-7, Sub-9 (separar por vírgula)" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="experiencia_anos" render={({ field }) => (
              <FormItem>
                <FormLabel>Anos de Experiência</FormLabel>
                <FormControl><Input type="number" placeholder="Ex: 5" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="certificacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Certificações</FormLabel>
                <FormControl><Textarea placeholder="Suas certificações e formações" rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Alterações'}
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
          perfilId={perfil?.id}
          perfilTable="perfis_rede"
        />
      </DialogContent>
    </Dialog>
  );
}
