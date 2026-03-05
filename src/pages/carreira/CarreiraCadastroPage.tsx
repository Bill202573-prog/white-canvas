import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { ProfileTypeSelector, type ProfileType } from '@/components/carreira/ProfileTypeSelector';
import { ProfileTypeForm } from '@/components/carreira/ProfileTypeForm';
import { AtletaFilhoForm } from '@/components/carreira/AtletaFilhoForm';
import { OnboardingTutorial } from '@/components/carreira/OnboardingTutorial';
import { InvitePage } from '@/components/carreira/InvitePage';
import logoAtletaId from '@/assets/logo-atleta-id.png';
import logoCarreiraId from '@/assets/logo-carreira-id-dark.png';
import { carreiraPath, isCarreiraDomain } from '@/hooks/useCarreiraBasePath';
import { lovable } from '@/integrations/lovable';
import PwaInstallButton from '@/components/shared/PwaInstallButton';

type Step = 'tutorial' | 'auth' | 'profile-type' | 'profile-form' | 'invites';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export default function CarreiraCadastroPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('convite');

  const [step, setStep] = useState<Step>('tutorial');
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Auth check + cross-domain session transfer
  useEffect(() => {
    const CANONICAL_ORIGINS = ['https://atletaid.com.br', 'https://carreiraid.com.br'];
    const isCanonical = CANONICAL_ORIGINS.includes(window.location.origin)
      || window.location.origin.includes('localhost')
      || window.location.origin.includes('www.atletaid.com.br')
      || window.location.origin.includes('www.carreiraid.com.br');
    const isWrongDomain = !isCanonical;

    let handled = false;

    const handleSession = async (session: any): Promise<boolean> => {
      if (!session?.user) return false;
      if (handled) return true;
      handled = true;

      // If on wrong domain (Lovable preview), transfer session to canonical domain
      if (isWrongDomain && session.access_token && session.refresh_token) {
        const { data: existing } = await supabase
          .from('perfis_rede')
          .select('id, slug')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // Determine target origin based on context
        const targetOrigin = 'https://carreiraid.com.br';
        const targetPath = existing?.slug ? carreiraPath(`/${existing.slug}`) : carreiraPath('/cadastro');
        const tokenHash = `#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=recovery`;
        window.location.href = `${targetOrigin}${targetPath}${inviteCode ? `?convite=${inviteCode}` : ''}${tokenHash}`;
        return true;
      }

      // Normal flow on correct domain
      setUserId(session.user.id);

      try {
        const { data: perfilAtleta } = await supabase
          .from('perfil_atleta')
          .select('id, slug')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (perfilAtleta?.slug) {
          navigate(carreiraPath(`/${perfilAtleta.slug}`), { replace: true });
          return true;
        }

        const { data: perfilRede } = await supabase
          .from('perfis_rede')
          .select('id, slug')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (perfilRede?.slug) {
          navigate(carreiraPath(`/${perfilRede.slug}`), { replace: true });
          return true;
        }
      } catch (err) {
        console.error('Erro ao verificar perfil:', err);
      }

      const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.nome;
      if (fullName) setNome(fullName);
      setStep('profile-type');
      setCheckingAuth(false);
      return true;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const result = await handleSession(session);
      if (!result) setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const result = await handleSession(session);
        if (!result) setCheckingAuth(false);
      }
    });

    const timeout = setTimeout(() => {
      if (checkingAuth) {
        console.warn('[CarreiraCadastro] Auth check timed out, releasing UI');
        setCheckingAuth(false);
      }
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, inviteCode]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message.includes('Invalid login') ? 'Email ou senha incorretos' : error.message);
        } else if (data.user) {
          setUserId(data.user.id);
          const { data: perfilAtleta } = await supabase
            .from('perfil_atleta')
            .select('id, slug')
            .eq('user_id', data.user.id)
            .maybeSingle();
          if (perfilAtleta?.slug) {
            navigate(carreiraPath(`/${perfilAtleta.slug}`), { replace: true });
          } else {
            const { data: perfilRede } = await supabase
              .from('perfis_rede')
              .select('id, slug')
              .eq('user_id', data.user.id)
              .maybeSingle();
            if (perfilRede?.slug) {
              navigate(carreiraPath(`/${perfilRede.slug}`), { replace: true });
            } else {
              setStep('profile-type');
            }
          }
        }
      } else {
        const validation = signupSchema.safeParse({ nome, email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${carreiraPath('/cadastro')}`,
            data: { nome, full_name: nome },
          },
        });

        if (error) {
          const msg = error.message.includes('already registered') 
            ? 'Este email já está cadastrado. Faça login.' 
            : error.message;
          toast.error(msg, { duration: 6000 });
          if (error.message.includes('already registered')) {
            setIsLogin(true);
          }
        } else if (data.user) {
          if (data.session) {
            setUserId(data.user.id);
            setStep('profile-type');
          } else {
            toast.success('Conta criada! Verifique seu email para confirmar.');
            setIsLogin(true);
          }
        }
      }
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = `${window.location.origin}${carreiraPath('/cadastro')}${inviteCode ? `?convite=${inviteCode}` : ''}`;
      
      const isCustomDomain = isCarreiraDomain() || 
        window.location.hostname === 'atletaid.com.br' || 
        window.location.hostname === 'www.atletaid.com.br';

      if (isCustomDomain) {
        // Custom domains: use Supabase OAuth directly (redirect URL configured in Google Console)
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        // Lovable preview / other domains: use Lovable OAuth broker
        const result = await lovable.auth.signInWithOAuth('google', {
          redirect_uri: redirectUrl,
        });
        if (result.error) throw result.error;
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Erro ao fazer login com Google');
    }
  };

  const handleProfileCreated = async () => {
    if (userId) {
      const { data: perfilAtleta } = await supabase
        .from('perfil_atleta')
        .select('slug')
        .eq('user_id', userId)
        .maybeSingle();

      if (perfilAtleta?.slug) {
        navigate(carreiraPath(`/${perfilAtleta.slug}`));
        return;
      }

      const { data: perfilRede } = await supabase
        .from('perfis_rede')
        .select('slug')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (perfilRede?.slug) {
        navigate(carreiraPath(`/${perfilRede.slug}`));
        return;
      }
    }
    setStep('invites');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCarreira = isCarreiraDomain();
  const currentLogo = isCarreira ? logoCarreiraId : logoAtletaId;
  const brandName = isCarreira ? 'CARREIRA ID' : 'Atleta ID';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate(carreiraPath('/'))} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <img src={currentLogo} alt={brandName} className="h-7" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {['Tutorial', 'Conta', 'Perfil', 'Rede'].map((label, i) => (
              <span key={label} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">›</span>}
                <span className={
                  (i === 0 && step === 'tutorial') ||
                  (i === 1 && step === 'auth') || 
                  (i === 2 && (step === 'profile-type' || step === 'profile-form')) || 
                  (i === 3 && step === 'invites')
                    ? 'text-primary font-semibold' : ''
                }>
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="container max-w-lg px-4 py-4">
        {step === 'tutorial' && (
          <OnboardingTutorial
            brandName={brandName}
            onStart={() => setStep('auth')}
          />
        )}

        {step === 'auth' && (
          <div className="animate-fade-in">
            <div className="text-center mb-3">
              <h1 className="text-xl font-bold text-foreground">Entre na rede {brandName}</h1>
              <p className="text-muted-foreground text-sm">O LinkedIn do Esporte</p>
            </div>

            <div className="mb-3">
              <PwaInstallButton />
            </div>

            <Button variant="outline" size="lg" className="w-full mb-3 gap-2" onClick={handleGoogleLogin}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou com email</span>
              </div>
            </div>

            <Card>
              <CardContent className="pt-4 pb-4">
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {!isLogin && (
                    <div className="space-y-1">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="nome" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className="pl-10" disabled={isLoading} maxLength={100} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" disabled={isLoading} maxLength={255} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" disabled={isLoading} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLogin ? 'Entrar' : 'Criar Conta'}
                  </Button>
                </form>
                {isLogin && (
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email.trim()) {
                          toast.error('Digite seu email para recuperar a senha');
                          return;
                        }
                        try {
                          setIsLoading(true);
                          const { error } = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: `${window.location.origin}${carreiraPath('/cadastro')}`,
                          });
                          if (error) throw error;
                          toast.success('Link de recuperação enviado para seu email!', { duration: 6000 });
                        } catch (err: any) {
                          toast.error(err.message || 'Erro ao enviar email de recuperação');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
                <div className="mt-3 text-center text-sm text-muted-foreground">
                  {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
                    {isLogin ? 'Cadastre-se' : 'Faça login'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'profile-type' && (
          <ProfileTypeSelector
            onSelect={(type) => {
              setSelectedType(type);
              setStep('profile-form');
            }}
          />
        )}

        {step === 'profile-form' && selectedType === 'atleta_filho' && userId && (
          <AtletaFilhoForm
            userId={userId}
            defaultName={nome}
            inviteCode={inviteCode}
            onBack={() => setStep('profile-type')}
            onComplete={handleProfileCreated}
          />
        )}

        {step === 'profile-form' && selectedType && selectedType !== 'atleta_filho' && userId && (
          <ProfileTypeForm
            type={selectedType}
            userId={userId}
            defaultName={nome}
            inviteCode={inviteCode}
            onBack={() => setStep('profile-type')}
            onComplete={handleProfileCreated}
          />
        )}

        {step === 'invites' && userId && (
          <InvitePage
            userId={userId}
            onSkip={() => navigate(carreiraPath('/'))}
          />
        )}

        {step === 'auth' && (
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Ao criar uma conta, você concorda com os{' '}
            <button onClick={() => navigate(carreiraPath('/termos'))} className="text-primary hover:underline">Termos de Uso</button>
            {' '}e a{' '}
            <button onClick={() => navigate(carreiraPath('/privacidade'))} className="text-primary hover:underline">Política de Privacidade</button>.
          </div>
        )}
      </main>
    </div>
  );
}