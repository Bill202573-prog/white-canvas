import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EscolaPublica {
  id: string;
  nome: string;
  logo_url: string | null;
  cidade: string | null;
  estado: string | null;
  slug: string | null;
  bio: string | null;
  instagram_url: string | null;
}

export interface AtletaVinculado {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
  modalidade: string;
  categoria: string | null;
}

export function useEscolaBySlug(slug: string) {
  return useQuery({
    queryKey: ['escola-publica', slug],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('escolinhas_publico')
        .select('*') as any)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as EscolaPublica | null;
    },
    enabled: !!slug,
  });
}

export function useAtletasVinculados(escolaId: string | undefined) {
  return useQuery({
    queryKey: ['atletas-vinculados', escolaId],
    queryFn: async () => {
      if (!escolaId) return [];

      // Get active student IDs linked to this school
      const { data: vinculos, error: vincError } = await supabase
        .from('crianca_escolinha')
        .select('crianca_id')
        .eq('escolinha_id', escolaId)
        .eq('ativo', true);

      if (vincError) throw vincError;
      if (!vinculos?.length) return [];

      const criancaIds = vinculos.map(v => v.crianca_id);

      // Get public athlete profiles linked to these students
      const { data: perfis, error: perfError } = await supabase
        .from('perfil_atleta')
        .select('id, nome, slug, foto_url, modalidade, categoria')
        .in('crianca_id', criancaIds)
        .eq('is_public', true);

      if (perfError) throw perfError;
      return (perfis || []) as AtletaVinculado[];
    },
    enabled: !!escolaId,
  });
}
