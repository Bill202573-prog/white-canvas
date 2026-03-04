import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExistingGuardian {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  user_id: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  hasCredentials: boolean;
  childrenCount: number;
  childrenNames: string[];
}

interface LookupResult {
  found: boolean;
  guardian: ExistingGuardian | null;
  source: 'email' | 'cpf' | null;
}

export function useExistingGuardianLookup() {
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedEmail, setLastSearchedEmail] = useState('');
  const [lastSearchedCpf, setLastSearchedCpf] = useState('');

  const searchByEmail = useCallback(async (email: string): Promise<LookupResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { found: false, guardian: null, source: null };
    }

    // Avoid duplicate searches
    if (normalizedEmail === lastSearchedEmail) {
      return { found: false, guardian: null, source: null };
    }

    setIsSearching(true);
    setLastSearchedEmail(normalizedEmail);

    try {
      const { data: responsavel, error } = await supabase
        .from('responsaveis')
        .select('id, nome, email, telefone, cpf, user_id, cep, rua, numero, complemento, bairro, cidade, estado')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) throw error;

      if (!responsavel) {
        return { found: false, guardian: null, source: null };
      }

      // Get children linked to this guardian
      const { data: links, error: linksError } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id, crianca:criancas(nome)')
        .eq('responsavel_id', responsavel.id);

      if (linksError) throw linksError;

      const guardian: ExistingGuardian = {
        id: responsavel.id,
        nome: responsavel.nome,
        email: responsavel.email,
        telefone: responsavel.telefone,
        cpf: responsavel.cpf,
        user_id: responsavel.user_id,
        cep: responsavel.cep,
        rua: responsavel.rua,
        numero: responsavel.numero,
        complemento: responsavel.complemento,
        bairro: responsavel.bairro,
        cidade: responsavel.cidade,
        estado: responsavel.estado,
        hasCredentials: !!responsavel.user_id,
        childrenCount: links?.length || 0,
        childrenNames: links?.map(l => (l.crianca as any)?.nome || 'Sem nome') || [],
      };

      return { found: true, guardian, source: 'email' };
    } catch (error) {
      console.error('Error searching guardian by email:', error);
      return { found: false, guardian: null, source: null };
    } finally {
      setIsSearching(false);
    }
  }, [lastSearchedEmail]);

  const searchByCpf = useCallback(async (cpf: string): Promise<LookupResult> => {
    const normalizedCpf = cpf.replace(/\D/g, '');
    if (normalizedCpf.length !== 11) {
      return { found: false, guardian: null, source: null };
    }

    // Avoid duplicate searches
    if (normalizedCpf === lastSearchedCpf) {
      return { found: false, guardian: null, source: null };
    }

    setIsSearching(true);
    setLastSearchedCpf(normalizedCpf);

    try {
      const { data: responsavel, error } = await supabase
        .from('responsaveis')
        .select('id, nome, email, telefone, cpf, user_id, cep, rua, numero, complemento, bairro, cidade, estado')
        .eq('cpf', normalizedCpf)
        .maybeSingle();

      if (error) throw error;

      if (!responsavel) {
        return { found: false, guardian: null, source: null };
      }

      // Get children linked to this guardian
      const { data: links, error: linksError } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id, crianca:criancas(nome)')
        .eq('responsavel_id', responsavel.id);

      if (linksError) throw linksError;

      const guardian: ExistingGuardian = {
        id: responsavel.id,
        nome: responsavel.nome,
        email: responsavel.email,
        telefone: responsavel.telefone,
        cpf: responsavel.cpf,
        user_id: responsavel.user_id,
        cep: responsavel.cep,
        rua: responsavel.rua,
        numero: responsavel.numero,
        complemento: responsavel.complemento,
        bairro: responsavel.bairro,
        cidade: responsavel.cidade,
        estado: responsavel.estado,
        hasCredentials: !!responsavel.user_id,
        childrenCount: links?.length || 0,
        childrenNames: links?.map(l => (l.crianca as any)?.nome || 'Sem nome') || [],
      };

      return { found: true, guardian, source: 'cpf' };
    } catch (error) {
      console.error('Error searching guardian by CPF:', error);
      return { found: false, guardian: null, source: null };
    } finally {
      setIsSearching(false);
    }
  }, [lastSearchedCpf]);

  const resetSearch = useCallback(() => {
    setLastSearchedEmail('');
    setLastSearchedCpf('');
  }, []);

  return {
    isSearching,
    searchByEmail,
    searchByCpf,
    resetSearch,
  };
}
