import { useParams, Link } from 'react-router-dom';
import { useEscolaBySlug, useAtletasVinculados } from '@/hooks/useEscolaPublicaData';
import { carreiraPath } from '@/hooks/useCarreiraBasePath';
import { usePostsEscola } from '@/hooks/useEscolaPostsData';
import { EscolaPostCard } from '@/components/school/EscolaPostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, MapPin, Users, Loader2, GraduationCap, Instagram, ChevronDown } from 'lucide-react';

const ACCENT = '#16a34a'; // green-600 default for schools

export default function EscolaPerfilPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: escola, isLoading, error } = useEscolaBySlug(slug || '');
  const { data: atletas = [] } = useAtletasVinculados(escola?.id);
  const { data: posts = [] } = usePostsEscola(escola?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !escola) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold">Escola não encontrada</h2>
          <p className="text-sm text-muted-foreground">Este perfil não existe ou não está disponível.</p>
        </div>
      </div>
    );
  }

  const initials = escola.nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const instagramUrl = escola.instagram_url
    ? escola.instagram_url.startsWith('http')
      ? escola.instagram_url
      : `https://instagram.com/${escola.instagram_url.replace('@', '')}`
    : null;

  const instagramHandle = escola.instagram_url
    ? escola.instagram_url.includes('instagram.com')
      ? '@' + escola.instagram_url.split('/').filter(Boolean).pop()
      : escola.instagram_url.startsWith('@') ? escola.instagram_url : '@' + escola.instagram_url
    : null;

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${ACCENT}08 0%, hsl(var(--background)) 50%)` }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}66)` }} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header - Avatar left, info right */}
        <Card className="overflow-hidden border" style={{ borderColor: `${ACCENT}25` }}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar
                className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 border-2 shadow-lg ring-2"
                style={{
                  borderColor: `${ACCENT}33`,
                  boxShadow: `0 0 0 2px ${ACCENT}22`,
                }}
              >
                <AvatarImage src={escola.logo_url || undefined} alt={escola.nome} />
                <AvatarFallback
                  className="text-xl font-bold"
                  style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">{escola.nome}</h1>

                <Badge
                  variant="secondary"
                  className="gap-1 text-xs mt-1.5"
                  style={{
                    backgroundColor: `${ACCENT}18`,
                    color: ACCENT,
                    borderColor: `${ACCENT}30`,
                  }}
                >
                  <GraduationCap className="w-3 h-3" />
                  Escolinha de Esportes
                </Badge>

                {(escola.cidade || escola.estado) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                    <MapPin className="w-3 h-3" style={{ color: ACCENT }} />
                    <span>{[escola.cidade, escola.estado].filter(Boolean).join(', ')}</span>
                  </div>
                )}

                {escola.bio && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{escola.bio}</p>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs hover:underline"
                    style={{ color: ACCENT }}
                  >
                    <Instagram className="w-4 h-4" />
                    {instagramHandle}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Athletes - Collapsible */}
        <Card className="border" style={{ borderColor: `${ACCENT}15` }}>
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="w-5 h-5" style={{ color: ACCENT }} />
                  Atletas ({atletas.length})
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                {atletas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum atleta com perfil público vinculado.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {atletas.map(atleta => (
                      <Link
                        key={atleta.id}
                        to={carreiraPath(`/${atleta.slug}`)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={atleta.foto_url || undefined} alt={atleta.nome} />
                          <AvatarFallback
                            className="text-sm"
                            style={{ backgroundColor: `${ACCENT}10`, color: ACCENT }}
                          >
                            {atleta.nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <p className="text-xs font-medium truncate max-w-[100px]">{atleta.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{atleta.modalidade}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Posts - no title */}
        {posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <EscolaPostCard
                key={post.id}
                post={post}
                escolaNome={escola.nome}
                escolaLogo={escola.logo_url}
                escolaSlug={escola.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
