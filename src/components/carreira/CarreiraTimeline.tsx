import { useState } from 'react';
import { PerfilAtleta, usePostsAtleta, useAtividadesPublicas, useEscolinhasCarreira } from '@/hooks/useCarreiraData';
import { useCarreiraExperiencias } from '@/hooks/useCarreiraExperienciasData';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { AtividadePublicaCard } from './AtividadePublicaCard';
import { ExperienciaSection } from './ExperienciaSection';
import { CarreiraStatsCards } from './CarreiraStatsCards';
import { JornadaTimeline } from './JornadaTimeline';
import { CarreiraAtividadeFormDialog } from './CarreiraAtividadeFormDialog';
import { ExperienciaFormDialog } from './ExperienciaFormDialog';
import { useCarreiraAtividadeLimit } from '@/hooks/useCarreiraFreemium';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Building2, BarChart3, Dumbbell, Swords, Medal, Plus, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CarreiraTimelineProps {
  perfil: PerfilAtleta;
  isOwner?: boolean;
}

// Tabs for athletes WITH escolinha (institutional)
const INSTITUTIONAL_TABS = [
  { value: 'experiencia', label: 'Experiência', icon: Building2 },
  { value: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { value: 'atividades', label: 'Atividades Extras', icon: Dumbbell },
  { value: 'jornada', label: 'Jornada Esportiva', icon: Swords },
  { value: 'premiacoes', label: 'Premiações', icon: Medal },
];

// Tabs for Carreira-origin athletes (LinkedIn-style curriculum)
const CARREIRA_TABS = [
  { value: 'carreira-experiencia', label: 'Experiência', icon: Building2 },
  { value: 'carreira-atividades', label: 'Atividades', icon: Dumbbell },
];

export function CarreiraTimeline({ perfil, isOwner = false }: CarreiraTimelineProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [atividadeFormOpen, setAtividadeFormOpen] = useState(false);
  const [experienciaFormOpen, setExperienciaFormOpen] = useState(false);
  const { data: posts, isLoading: postsLoading } = usePostsAtleta(perfil.id);
  const isPlatformProfile = perfil.modalidade === 'Plataforma' || !perfil.crianca_id;
  const { data: atividades, isLoading: atividadesLoading } = useAtividadesPublicas(isPlatformProfile ? undefined : perfil.crianca_id);
  const { data: escolinhas, isLoading: escolinhasLoading } = useEscolinhasCarreira(isPlatformProfile ? undefined : perfil.crianca_id);
  const { data: experiencias, isLoading: experienciasLoading } = useCarreiraExperiencias(isPlatformProfile ? undefined : perfil.crianca_id);
  const { data: limitResult } = useCarreiraAtividadeLimit(isOwner && perfil.crianca_id ? perfil.crianca_id : null);

  // Determine if athlete has institutional (escolinha) data
  const hasEscolinhaData = (escolinhas?.length || 0) > 0;
  const isCarreiraOnly = !isPlatformProfile && !hasEscolinhaData;

  const dadosPublicos = (perfil as any).dados_publicos as {
    gols?: boolean;
    campeonatos?: boolean;
    amistosos?: boolean;
    premiacoes?: boolean;
    conquistas?: boolean;
  } | undefined;

  const accentColor = perfil.cor_destaque || '#3b82f6';

  // Choose which tabs to show
  const activeTabs = isCarreiraOnly ? CARREIRA_TABS : INSTITUTIONAL_TABS;

  const handleTabClick = (value: string) => {
    setActiveTab(prev => prev === value ? null : value);
  };

  const renderNewAtividadeButton = (label: string, onClick: () => void) => (
    isOwner && perfil.crianca_id && (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={onClick}
        style={{ borderColor: `${accentColor}40`, color: accentColor }}
      >
        <Plus className="w-4 h-4" />
        {label}
        {limitResult?.source === 'freemium' && limitResult.limit > 0 && (
          <span className="text-xs opacity-70">
            ({limitResult.count}/{limitResult.limit})
          </span>
        )}
      </Button>
    )
  );

  const formatDateRange = (start: string, end?: string | null, isAtual?: boolean) => {
    const startFormatted = format(new Date(start), "MMM yyyy", { locale: ptBR });
    if (isAtual) return `${startFormatted} - Atual`;
    if (end) return `${startFormatted} - ${format(new Date(end), "MMM yyyy", { locale: ptBR })}`;
    return startFormatted;
  };

  const renderTabContent = () => {
    if (!activeTab) return null;

    switch (activeTab) {
      // --- Carreira-only tabs ---
      case 'carreira-experiencia':
        return experienciasLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {renderNewAtividadeButton('Nova Experiência', () => setExperienciaFormOpen(true))}
            {(experiencias?.length || 0) > 0 ? (
              experiencias?.map((exp) => (
                <div key={exp.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {exp.nome_escola?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm" style={{ color: accentColor }}>{exp.nome_escola}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(exp.data_inicio, exp.data_fim, exp.atual)}
                    </p>
                    {(exp.bairro || exp.cidade || exp.estado) && (
                      <p className="text-xs text-muted-foreground">
                        {[exp.bairro, exp.cidade, exp.estado].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {exp.observacoes && (
                      <p className="text-xs text-muted-foreground mt-1">{exp.observacoes}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto opacity-40 mb-2" />
                <p className="text-sm">Nenhuma experiência registrada.</p>
                <p className="text-xs mt-1">Adicione escolas e clubes onde treinou.</p>
              </div>
            )}
          </div>
        );
      case 'carreira-atividades':
        return atividadesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {renderNewAtividadeButton('Nova Atividade', () => setAtividadeFormOpen(true))}
            {(atividades?.length || 0) > 0 ? (
              atividades?.map((atv) => (
                <AtividadePublicaCard key={atv.id} atividade={atv} isOwner={isOwner} accentColor={accentColor} onEdit={(a) => {
                  // Open the form dialog for editing - for now just open new form
                  setAtividadeFormOpen(true);
                }} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Dumbbell className="w-10 h-10 mx-auto opacity-40 mb-2" />
                <p className="text-sm">Nenhuma atividade registrada.</p>
                <p className="text-xs mt-1">Adicione clínicas, camps, torneios e treinos.</p>
              </div>
            )}
          </div>
        );

      // --- Institutional tabs (existing) ---
      case 'experiencia':
        return escolinhasLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ExperienciaSection
            perfil={perfil}
            escolinhas={escolinhas}
            atividades={[]}
            isOwner={isOwner}
            accentColor={accentColor}
          />
        );
      case 'estatisticas':
        return <CarreiraStatsCards criancaId={perfil.crianca_id} accentColor={accentColor} />;
      case 'atividades':
        return atividadesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {renderNewAtividadeButton('Nova Atividade Extra', () => setAtividadeFormOpen(true))}
            {(atividades?.length || 0) > 0 ? (
              atividades?.map((atv) => (
                <AtividadePublicaCard key={atv.id} atividade={atv} isOwner={isOwner} accentColor={accentColor} onEdit={() => setAtividadeFormOpen(true)} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Dumbbell className="w-10 h-10 mx-auto opacity-40 mb-2" />
                <p className="text-sm">Nenhuma atividade extra registrada.</p>
              </div>
            )}
          </div>
        );
      case 'jornada':
        return (
          <JornadaTimeline
            criancaId={perfil.crianca_id}
            dadosPublicos={{ ...dadosPublicos, premiacoes: false, conquistas: false }}
            accentColor={accentColor}
          />
        );
      case 'premiacoes':
        return (
          <JornadaTimeline
            criancaId={perfil.crianca_id}
            dadosPublicos={{ gols: false, amistosos: false, campeonatos: false, premiacoes: dadosPublicos?.premiacoes !== false, conquistas: dadosPublicos?.conquistas !== false }}
            accentColor={accentColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      {!isPlatformProfile && (
      <div className="flex flex-wrap gap-2 justify-center">
        {activeTabs.map(({ value, label, icon: Icon }) => {
          const isActive = activeTab === value;
          return (
            <button
              key={value}
              onClick={() => handleTabClick(value)}
              className="flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1.5 transition-all duration-200"
              style={{
                backgroundColor: isActive ? accentColor : 'transparent',
                color: isActive ? '#fff' : accentColor,
                borderColor: isActive ? accentColor : `${accentColor}40`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
      )}

      {/* Tab content (collapsible) */}
      {activeTab && (
        <div className="rounded-xl border bg-card p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {renderTabContent()}
        </div>
      )}

      {/* Posts feed - always visible, priority */}
      {isOwner && <CreatePostForm perfil={perfil} />}

      {postsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (posts?.length || 0) > 0 ? (
        <div className="space-y-4">
          {posts?.map((post) => (
            <PostCard key={`post-${post.id}`} post={post} showAuthor={true} />
          ))}
        </div>
      ) : isOwner ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto opacity-40 mb-2" />
          <p className="text-sm">Nenhuma publicação ainda.</p>
          <p className="text-xs">Use o campo acima para compartilhar sua jornada!</p>
        </div>
      ) : null}

      {/* Atividade form dialog for Carreira */}
      {isOwner && perfil.crianca_id && (
        <>
          <CarreiraAtividadeFormDialog
            open={atividadeFormOpen}
            onOpenChange={setAtividadeFormOpen}
            criancaId={perfil.crianca_id}
            childName={perfil.nome}
          />
          <ExperienciaFormDialog
            open={experienciaFormOpen}
            onOpenChange={setExperienciaFormOpen}
            criancaId={perfil.crianca_id}
            childName={perfil.nome}
          />
        </>
      )}
    </div>
  );
}
