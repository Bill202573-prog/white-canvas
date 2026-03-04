import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Rota curta /i que redireciona para /indicacao
 * Parâmetros:
 *   e = escola_id (escolinha_id)
 *   r = ref (pai indicador)
 */
export default function ShortIndicacaoRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const escolaId = searchParams.get('e');
    const refId = searchParams.get('r');

    // Montar a URL completa de redirecionamento
    const params = new URLSearchParams();
    if (escolaId) {
      params.set('escola_id', escolaId);
      params.set('escolinha_id', escolaId); // compatibilidade
    }
    if (refId) {
      params.set('ref', refId);
    }

    // Redirecionar para a página de indicação
    navigate(`/indicacao?${params.toString()}`, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
}
