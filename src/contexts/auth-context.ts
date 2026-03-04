import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  escolinhaId?: string;
  escolinhaNome?: string;
  passwordNeedsChange?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, nome: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

// Keep the context instance in a dedicated module to avoid Vite HMR “context duplication”
// where Provider and consumer end up referencing different context singletons.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
