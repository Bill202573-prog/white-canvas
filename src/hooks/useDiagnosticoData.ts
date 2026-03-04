import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticoResult {
  tabela: string;
  status: 'success' | 'error' | 'pending';
  count: number | null;
  error?: string;
  errorCode?: string;
  sample?: any[];
}

export interface UserDiagnostico {
  id: string;
  email: string;
  role: string | null;
  escolinhaId: string | null;
  escolinhaNome: string | null;
}

export interface DiagnosticoData {
  userInfo: UserDiagnostico | null;
  queries: DiagnosticoResult[];
  isLoading: boolean;
  runDiagnostico: () => Promise<void>;
}

const TABELAS = [
  'profiles',
  'user_roles',
  'escolinhas',
  'criancas',
  'turmas',
  'professores',
  'responsaveis',
  'crianca_escolinha',
  'crianca_turma',
  'crianca_responsavel',
  'aulas',
  'presencas',
  'mensalidades',
  'motivos_cancelamento',
  'motivos_aula_extra',
];

export function useDiagnosticoData(): DiagnosticoData {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<UserDiagnostico | null>(null);
  const [queries, setQueries] = useState<DiagnosticoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostico = useCallback(async () => {
    setIsLoading(true);
    
    // Initialize all queries as pending
    setQueries(TABELAS.map(t => ({ tabela: t, status: 'pending', count: null })));

    try {
      // Get current user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setUserInfo(null);
        setIsLoading(false);
        return;
      }

      // Get role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // Get escolinha if school role
      let escolinhaId: string | null = null;
      let escolinhaNome: string | null = null;
      
      if (roleData?.role === 'school') {
        const { data: escolinhaData } = await supabase
          .from('escolinhas')
          .select('id, nome')
          .eq('admin_user_id', authUser.id)
          .maybeSingle();
        
        if (escolinhaData) {
          escolinhaId = escolinhaData.id;
          escolinhaNome = escolinhaData.nome;
        }
      }

      setUserInfo({
        id: authUser.id,
        email: authUser.email || '',
        role: roleData?.role || null,
        escolinhaId,
        escolinhaNome,
      });

      // Run queries for each table
      const results: DiagnosticoResult[] = [];
      
      for (const tabela of TABELAS) {
        try {
          const { data, error, count } = await supabase
            .from(tabela as any)
            .select('*', { count: 'exact', head: false })
            .limit(3);

          if (error) {
            results.push({
              tabela,
              status: 'error',
              count: null,
              error: error.message,
              errorCode: error.code,
            });
          } else {
            results.push({
              tabela,
              status: 'success',
              count: count ?? data?.length ?? 0,
              sample: data?.slice(0, 2),
            });
          }
        } catch (err: any) {
          results.push({
            tabela,
            status: 'error',
            count: null,
            error: err.message || 'Erro desconhecido',
          });
        }
        
        // Update UI progressively
        setQueries([...results, ...TABELAS.slice(results.length).map(t => ({ tabela: t, status: 'pending' as const, count: null }))]);
      }

      setQueries(results);
    } catch (err: any) {
      console.error('Erro no diagnóstico:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    userInfo,
    queries,
    isLoading,
    runDiagnostico,
  };
}
