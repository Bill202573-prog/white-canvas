import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionsSection } from '@/components/carreira/ConnectionsSection';
import { CarreiraBottomNav } from '@/components/carreira/CarreiraBottomNav';
import { Loader2 } from 'lucide-react';
import logoCarreira from '@/assets/logo-carreira-id-dark.png';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';

export default function CarreiraConexoesPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mySlug, setMySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        const { data: pa } = await supabase.from('perfil_atleta').select('slug').eq('user_id', uid).maybeSingle();
        const { data: pr } = await supabase.from('perfis_rede').select('slug').eq('user_id', uid).maybeSingle();
        setMySlug(pa?.slug || pr?.slug || null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-theme="dark-orange" style={{ background: 'hsl(0 0% 4%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUserId) {
    navigate(carreiraPath('/cadastro'));
    return null;
  }

  return (
    <div className="min-h-screen bg-background" data-theme="dark-orange">
      <div className="h-1 w-full bg-[hsl(25_95%_55%)]" />
      <header className="sticky top-0 z-50 bg-[hsl(0_0%_0%/0.97)] border-b border-[hsl(25_95%_55%/0.4)]">
        <div className="container flex items-center h-14 px-4 max-w-2xl">
          <Link to={carreiraPath('/explorar')} className="flex items-center gap-2 shrink-0">
            <img src={logoCarreira} alt="Carreira" className="h-16 lg:h-20" />
          </Link>
          <h1 className="ml-4 text-lg font-semibold text-foreground">Conexões</h1>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6 pb-24">
        <ConnectionsSection userId={currentUserId} currentUserId={currentUserId} />
      </main>

      <CarreiraBottomNav currentUserId={currentUserId} profileSlug={mySlug} />
    </div>
  );
}
