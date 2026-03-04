import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types';
import { AuthContext, type AuthContextType, type AuthUser } from './auth-context';
import { useQueryClient } from '@tanstack/react-query';

// Função para registrar acesso (definida aqui para evitar dependência circular)
async function registrarAcesso(
  userId: string,
  userRole: string,
  escolinhaId?: string | null
) {
  try {
    const { error } = await supabase
      .from('acessos_log')
      .insert({
        user_id: userId,
        user_role: userRole,
        escolinha_id: escolinhaId || null,
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Erro ao registrar acesso:', error);
    }
  } catch (err) {
    console.error('Erro ao registrar acesso:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const sessionRef = useRef<Session | null>(null);
  const fetchingRef = useRef(false);

  // Mantém referência atualizada para comparar eventos de auth (ex: TOKEN_REFRESHED)
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const fetchUserData = async (userId: string): Promise<AuthUser | null> => {
    try {
      console.log('[AuthContext] fetchUserData starting for:', userId);
      // Buscar role do usuario
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Buscar profile do usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nome, avatar_url, email, password_needs_change')
        .eq('user_id', userId)
        .single();

      if (!profileData) {
        console.warn('[AuthContext] fetchUserData: missing profile', { profileError });
        return null;
      }

      // If no role exists yet (e.g. Google OAuth race condition), default to 'guardian'
      const userRole = roleData?.role || 'guardian';

      let escolinhaId: string | undefined;
      let escolinhaNome: string | undefined;

      // Se for escola, buscar a escolinha
      if (userRole === 'school') {
        // Primeiro tenta como admin principal
        const { data: escolinhaAdmin } = await supabase
          .from('escolinhas')
          .select('id, nome')
          .eq('admin_user_id', userId)
          .single();

        if (escolinhaAdmin) {
          escolinhaId = escolinhaAdmin.id;
          escolinhaNome = escolinhaAdmin.nome;
        } else {
          // Se não encontrou como admin, tenta como sócio
          const { data: escolinhaSocio } = await supabase
            .from('escolinhas')
            .select('id, nome')
            .eq('socio_user_id', userId)
            .single();
          escolinhaId = escolinhaSocio?.id;
          escolinhaNome = escolinhaSocio?.nome;
        }
      }

      // Se for professor, buscar a escolinha
      if (userRole === 'teacher') {
        const { data: professorData } = await supabase
          .from('professores')
          .select('escolinha_id')
          .eq('user_id', userId)
          .single();
        escolinhaId = professorData?.escolinha_id;
      }

      console.log('[AuthContext] fetchUserData success:', roleData.role, profileData.nome);

      return {
        id: userId,
        email: profileData.email,
        role: userRole as UserRole,
        name: profileData.nome,
        avatarUrl: profileData.avatar_url,
        escolinhaId,
        escolinhaNome,
        passwordNeedsChange: profileData.password_needs_change || false,
      };
    } catch (error) {
      console.error('[AuthContext] fetchUserData error:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userData = await fetchUserData(session.user.id);
      setUser(userData);
    }
  };

  useEffect(() => {
    // Configurar listener de autenticacao PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        const prevUserId = sessionRef.current?.user?.id ?? null;
        const nextUserId = nextSession?.user?.id ?? null;
        const isSameUser = !!prevUserId && prevUserId === nextUserId;

        console.log('[AuthContext] onAuthStateChange:', event, 'userId:', nextUserId, 'isSameUser:', isSameUser);

        // Sempre atualiza a sessão (necessário para manter token atualizado)
        setSession(nextSession);
        sessionRef.current = nextSession;

        // Se não há usuário, encerra e limpa estado
        if (!nextSession?.user) {
          console.log('[AuthContext] No session user, clearing state');
          setUser(null);
          setIsLoading(false);
          fetchingRef.current = false;
          return;
        }

        // Evita "piscar/loading" ao voltar para a aba ou re-login do mesmo user
        if (isSameUser && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          console.log(`[AuthContext] ${event} same user, skipping re-fetch`);
          return;
        }

        // Evita fetch duplicado se já está carregando
        if (fetchingRef.current) {
          console.log('[AuthContext] Already fetching, skipping duplicate');
          return;
        }

        // Para SIGNED_IN / USER_UPDATED / outros eventos relevantes, atualiza dados do usuário
        console.log('[AuthContext] Setting isLoading=true, fetching user data...');
        setIsLoading(true);
        fetchingRef.current = true;
        setTimeout(() => {
          fetchUserData(nextSession.user.id).then(userData => {
            console.log('[AuthContext] onAuthStateChange fetchUserData result:', userData?.role);
            setUser(userData);
            setIsLoading(false);
            fetchingRef.current = false;
          }).catch(() => {
            setIsLoading(false);
            fetchingRef.current = false;
          });
        }, 0);
      }
    );

    // DEPOIS verificar sessao existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] getSession result:', session?.user?.id ? 'has session' : 'no session');
      setSession(session);
      sessionRef.current = session;

      if (session?.user) {
        if (fetchingRef.current) {
          console.log('[AuthContext] getSession: already fetching from onAuthStateChange, skipping');
          return;
        }
        setIsLoading(true);
        fetchingRef.current = true;
        fetchUserData(session.user.id).then(userData => {
          console.log('[AuthContext] getSession fetchUserData result:', userData?.role);
          setUser(userData);
          setIsLoading(false);
          fetchingRef.current = false;
        }).catch(() => {
          setIsLoading(false);
          fetchingRef.current = false;
        });
      } else {
        setIsLoading(false);
      }
    });

    // Safety timeout - prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn('[AuthContext] Safety timeout triggered - forcing isLoading=false');
          fetchingRef.current = false;
          return false;
        }
        return prev;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Clear all cached queries before login to ensure fresh data
      queryClient.clear();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou senha incorretos' };
        }
        return { success: false, error: error.message };
      }

      // Carregar dados do usuário ANTES de retornar sucesso
      // Isso evita race condition onde Dashboard redireciona para /auth
      // antes do onAuthStateChange terminar de carregar os dados
      if (data.user) {
        const userId = data.user.id;
        console.log('[AuthContext] login: loading user data before returning...');
        
        // Marcar como fetching para evitar duplicata com onAuthStateChange
        fetchingRef.current = true;
        setIsLoading(true);
        
        try {
          const userData = await fetchUserData(userId);
          console.log('[AuthContext] login: user data loaded:', userData?.role);
          setUser(userData);
          setSession(data.session);
          sessionRef.current = data.session;
          setIsLoading(false);
          fetchingRef.current = false;
          
          // Fire-and-forget: registra acesso sem bloquear
          if (userData) {
            registrarAcesso(userId, userData.role, userData.escolinhaId || null).catch(() => {});
          }
        } catch (fetchErr) {
          console.error('[AuthContext] login: fetchUserData failed:', fetchErr);
          setIsLoading(false);
          fetchingRef.current = false;
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const signup = async (email: string, password: string, nome: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Este email ja esta cadastrado' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao criar conta' };
    }
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        return { success: false, error: 'Sessão expirada' };
      }

      // Use a direct fetch to get proper status/error messages (invoke hides the body on non-2xx)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

      if (!supabaseUrl || !publishableKey) {
        return { success: false, error: 'Configuração do app incompleta' };
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const message = payload?.error || payload?.message || `Erro (${res.status}) ao alterar senha`;
        return { success: false, error: message };
      }

      // Refresh user data to update passwordNeedsChange
      await refreshUser();

      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, error: 'Erro ao alterar senha' };
    }
  };

  const logout = async () => {
    // Clear all cached queries on logout to ensure fresh data on next login
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, signup, logout, changePassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
