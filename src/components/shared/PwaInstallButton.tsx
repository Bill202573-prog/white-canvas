import { Download, X, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const PwaInstallButton = () => {
  const { canInstall, isInstalled, isIOS, install, showIOSTutorial, setShowIOSTutorial } = usePwaInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
        onClick={install}
      >
        <Download className="w-5 h-5" />
        Instalar Aplicativo
      </Button>

      {/* iOS Tutorial Modal */}
      {showIOSTutorial && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in">
          <div className="w-full max-w-md bg-background rounded-t-2xl p-6 pb-10 animate-slide-up space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Instalar no iPhone</h3>
              <button
                onClick={() => setShowIOSTutorial(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Toque no botão <Share className="inline w-4 h-4 mb-0.5" /> Compartilhar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Na barra inferior do Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Toque em <PlusSquare className="inline w-4 h-4 mb-0.5" /> Adicionar à Tela de Início
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Role para baixo no menu se necessário
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Toque em "Adicionar"</p>
                  <p className="text-sm text-muted-foreground">
                    O app aparecerá na sua tela inicial
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowIOSTutorial(false)}
            >
              Entendi!
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaInstallButton;
