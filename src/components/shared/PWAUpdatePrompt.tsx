import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const CARREIRA_DOMAINS = ['carreiraid.com.br', 'www.carreiraid.com.br'];
    const isCarreiraDomain = CARREIRA_DOMAINS.includes(window.location.hostname);

    const isRelevantSW = (sw: ServiceWorker | null) => {
      if (!sw?.scriptURL) return false;
      if (isCarreiraDomain) {
        // On carreira domain, only listen to carreira-sw.js
        return sw.scriptURL.includes('carreira-sw.js');
      }
      // On atletaid domain, only listen to workbox sw.js (not carreira or push)
      return !sw.scriptURL.includes('carreira-sw.js') && !sw.scriptURL.includes('push-sw.js');
    };

    const listenForUpdates = (registration: ServiceWorkerRegistration) => {
      if (!isRelevantSW(registration.active) && !isRelevantSW(registration.installing) && !isRelevantSW(registration.waiting)) return;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker && isRelevantSW(newWorker)) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setNeedsRefresh(true);
            }
          });
        }
      });
      // Check if already waiting
      if (registration.waiting && isRelevantSW(registration.waiting)) {
        setWaitingWorker(registration.waiting);
        setNeedsRefresh(true);
      }
    };

    // Listen on relevant service workers only
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach(listenForUpdates);
    });

    // Check for updates every 5 minutes
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          if (isRelevantSW(reg.active)) reg.update();
        });
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // Wait a bit for the new SW to take over, then reload
      setTimeout(() => window.location.reload(), 300);
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!needsRefresh || dismissed) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={handleDismiss}
      />
      
      {/* Centered modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 rounded-full p-4">
              <RefreshCw className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nova versão disponível!
            </h3>
            <p className="text-muted-foreground text-sm">
              Uma atualização está pronta para ser instalada. Atualize agora para ter acesso às últimas melhorias e correções.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRefresh}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Atualizar Agora
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              Depois
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
