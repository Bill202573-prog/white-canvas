import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { AtletaFilhoForm } from './AtletaFilhoForm';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  userId: string;
  perfilNome: string;
  onMigrated: () => void;
}

export function MigrarPerfilBanner({ userId, perfilNome, onMigrated }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Atualize seu perfil!
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              O Carreira ID agora é focado no perfil do atleta. Crie o perfil esportivo do seu filho para ele ter uma vitrine profissional completa.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setShowForm(true)}
              >
                Criar Perfil do Atleta <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-700 dark:text-amber-400"
                onClick={() => setDismissed(true)}
              >
                Depois
              </Button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500 hover:text-amber-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Criar Perfil do Atleta</DialogTitle>
          <AtletaFilhoForm
            userId={userId}
            defaultName=""
            inviteCode={null}
            onBack={() => setShowForm(false)}
            onComplete={() => {
              setShowForm(false);
              onMigrated();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
