import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical, Plus, ArrowRight, Wifi, Bell, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsSafari(isSafariBrowser || isIOSDevice);

    // Listen for install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Already installed view
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 bg-white/10 backdrop-blur-lg shadow-2xl">
          <CardHeader className="pb-4">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">App Instalado!</CardTitle>
            <CardDescription className="text-slate-300">
              O ATLETA ID já está instalado no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Você pode encontrar o app na sua tela inicial.
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6"
              size="lg"
            >
              Abrir o App
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo Section */}
      <div className="mb-8 text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20">
          <img 
            src="/pwa-icon-512.png" 
            alt="ATLETA ID" 
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">ATLETA ID</h1>
        <p className="text-slate-400">Sistema de Gestão de Escolinhas</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md border-0 bg-white/10 backdrop-blur-lg shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl text-white flex items-center justify-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Instale o App
          </CardTitle>
          <CardDescription className="text-slate-300">
            Acesse mais rápido, mesmo offline
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Benefits Section */}
          <div className="grid grid-cols-3 gap-3 py-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-slate-300">Mais Rápido</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Wifi className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-slate-300">Offline</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-slate-300">Notificações</span>
            </div>
          </div>

          {/* Installation Instructions */}
          {deferredPrompt ? (
            // Chrome/Edge/Android - Direct install button
            <div className="space-y-4">
              <Button 
                onClick={handleInstall} 
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg shadow-lg shadow-primary/30"
                size="lg"
              >
                <Download className="w-6 h-6 mr-2" />
                Instalar Agora
              </Button>
              <p className="text-xs text-slate-400 text-center">
                Clique para adicionar à sua tela inicial
              </p>
            </div>
          ) : isIOS || isSafari ? (
            // iOS/Safari Instructions
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-sm text-slate-300 mb-4 text-center font-medium">
                  No Safari, siga os passos:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>Toque em</span>
                      <Share className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">Compartilhar</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      2
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>Toque em</span>
                      <Plus className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">Tela de Início</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      3
                    </div>
                    <div className="text-sm text-white">
                      <span>Toque em </span>
                      <span className="font-medium">Adicionar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            // Android (without prompt) Instructions
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-sm text-slate-300 mb-4 text-center font-medium">
                  No Chrome, siga os passos:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>Toque em</span>
                      <MoreVertical className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium">Menu</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      2
                    </div>
                    <div className="text-sm text-white">
                      <span>Toque em </span>
                      <span className="font-medium">"Instalar app"</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      3
                    </div>
                    <div className="text-sm text-white">
                      <span>Confirme tocando em </span>
                      <span className="font-medium">Instalar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Desktop/Other browsers
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-sm text-slate-300 mb-4 text-center font-medium">
                  Para instalar o app:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      1
                    </div>
                    <div className="text-sm text-white">
                      <span>Clique no ícone de </span>
                      <span className="font-medium">instalação</span>
                      <span> na barra de endereço</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                      2
                    </div>
                    <div className="text-sm text-white">
                      <span>Ou acesse pelo </span>
                      <span className="font-medium">menu do navegador</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Continue in Browser */}
          <div className="pt-2 border-t border-slate-700">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth")} 
              className="w-full text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              Continuar no Navegador
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-500 text-center">
        Funciona em Android, iPhone e computadores
      </p>
    </div>
  );
};

export default InstallApp;
