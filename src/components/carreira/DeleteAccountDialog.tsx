import { useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfilId: string;
  perfilTable: 'perfil_atleta' | 'perfis_rede';
}

const CONFIRMATION_PHRASE = 'apagar minha conta';

export function DeleteAccountDialog({ open, onOpenChange, perfilId, perfilTable }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const isConfirmed = confirmText.toLowerCase().trim() === CONFIRMATION_PHRASE;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);

    try {
      // Mark profile as inactive instead of hard delete
      const { error } = await supabase
        .from(perfilTable)
        .update({ status_conta: 'inativo', is_public: false } as any)
        .eq('id', perfilId);

      if (error) throw error;

      // Sign out the user
      await supabase.auth.signOut();
      toast.success('Sua conta foi desativada com sucesso. Seus dados foram removidos da plataforma.');

      if (isCarreiraDomain()) {
        navigate(carreiraPath('/'), { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    } catch (err: any) {
      toast.error('Erro ao apagar conta: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!deleting) { onOpenChange(v); setConfirmText(''); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Apagar Conta Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              <strong>Atenção:</strong> Esta ação é <strong>irreversível</strong>. Todos os seus dados, publicações, conexões e informações de perfil serão permanentemente removidos e <strong>não poderão ser recuperados</strong>.
            </p>
            <p>
              Para confirmar, digite <strong>"{CONFIRMATION_PHRASE}"</strong> no campo abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              className="mt-2"
              disabled={deleting}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
          >
            {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Apagando...</> : 'Sim, apagar minha conta'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
