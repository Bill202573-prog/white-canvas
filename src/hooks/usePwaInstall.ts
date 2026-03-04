import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectOS(): 'android' | 'ios' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
  return 'unknown';
}

async function recordInstall(os: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    // Check if already recorded
    const { data: existing } = await supabase
      .from('pwa_installs')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Get escolinha_id from user context
    let escolinhaId: string | null = null;

    // Try as guardian
    const { data: guardianEscolinha } = await supabase.rpc('get_guardian_escolinha_id', { p_user_id: userId });
    if (guardianEscolinha) {
      escolinhaId = guardianEscolinha;
    } else {
      // Try as school admin
      const { data: escola } = await supabase
        .from('escolinhas')
        .select('id')
        .eq('admin_user_id', userId)
        .limit(1)
        .single();
      if (escola) escolinhaId = escola.id;
    }

    await supabase.from('pwa_installs').insert({
      user_id: userId,
      os,
      user_agent: navigator.userAgent,
      escolinha_id: escolinhaId,
    });
  } catch (err) {
    console.error('Erro ao registrar instalação PWA:', err);
  }
}

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTutorial, setShowIOSTutorial] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // If running standalone, record the install
    if (isStandalone) {
      recordInstall(detectOS());
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      recordInstall(detectOS());
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTutorial(true);
    }
  }, [deferredPrompt, isIOS]);

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS);

  return {
    canInstall,
    isInstalled,
    isIOS,
    install,
    showIOSTutorial,
    setShowIOSTutorial,
  };
};
