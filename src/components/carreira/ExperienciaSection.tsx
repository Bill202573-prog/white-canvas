import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  GraduationCap, 
  Trophy, 
  Calendar, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Dumbbell,
  Target,
  Award
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AtividadeExternaPublica, PerfilAtleta, EscolinhaCarreira } from '@/hooks/useCarreiraData';
import { TIPO_ATIVIDADE_LABELS, ABRANGENCIA_LABELS } from '@/hooks/useAtividadesExternasData';

interface ExperienciaSectionProps {
  perfil: PerfilAtleta;
  escolinhas?: EscolinhaCarreira[];
  atividades?: AtividadeExternaPublica[];
  isOwner?: boolean;
  onAddExperiencia?: () => void;
  accentColor?: string;
}

const getActivityIcon = (tipo: string) => {
  switch (tipo) {
    case 'clinica_camp':
      return <GraduationCap className="w-5 h-5" />;
    case 'treino_preparador_fisico':
    case 'treino_tecnico':
      return <Dumbbell className="w-5 h-5" />;
    case 'competicao_torneio':
      return <Trophy className="w-5 h-5" />;
    case 'avaliacao':
      return <Target className="w-5 h-5" />;
    case 'jogo_amistoso_externo':
      return <Award className="w-5 h-5" />;
    default:
      return <Calendar className="w-5 h-5" />;
  }
};

export function ExperienciaSection({
  perfil,
  escolinhas = [],
  atividades = [],
  isOwner = false,
  onAddExperiencia,
  accentColor = '#3b82f6',
}: ExperienciaSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Combine escolinhas and atividades into a timeline
  const experiencias = [
    ...escolinhas.map(esc => ({
      type: 'escolinha' as const,
      id: `esc-${esc.id}`,
      title: esc.nome,
      subtitle: 'Futebol de Campo',
      logo: esc.logo_url,
      startDate: esc.data_inicio,
      endDate: esc.data_fim,
      isActive: esc.ativo,
      details: null as string | null,
      data: esc,
    })),
    ...atividades.map(atv => ({
      type: 'atividade' as const,
      id: `atv-${atv.id}`,
      title: atv.tipo === 'competicao_torneio' 
        ? atv.torneio_nome || TIPO_ATIVIDADE_LABELS[atv.tipo as keyof typeof TIPO_ATIVIDADE_LABELS] || atv.tipo
        : TIPO_ATIVIDADE_LABELS[atv.tipo as keyof typeof TIPO_ATIVIDADE_LABELS] || atv.tipo,
      subtitle: atv.profissional_instituicao || atv.local_atividade,
      startDate: atv.data,
      endDate: atv.data_fim,
      isActive: false,
      details: atv.observacoes,
      abrangencia: atv.torneio_abrangencia,
      data: atv,
    })),
  ].sort((a, b) => {
    // Sort by most recent start date
    const dateA = new Date(a.startDate || '1900-01-01');
    const dateB = new Date(b.startDate || '1900-01-01');
    return dateB.getTime() - dateA.getTime();
  });

  const formatDateRange = (start?: string, end?: string | null, isActive?: boolean) => {
    if (!start) return '';
    
    const startFormatted = format(new Date(start), "MMM yyyy", { locale: ptBR });
    
    if (isActive) {
      return `${startFormatted} - Atual`;
    }
    
    if (end) {
      const endFormatted = format(new Date(end), "MMM yyyy", { locale: ptBR });
      return `${startFormatted} - ${endFormatted}`;
    }
    
    return startFormatted;
  };

  if (experiencias.length === 0 && !isOwner) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: accentColor }} />
            Experiência
          </CardTitle>
          {isOwner && onAddExperiencia && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 border-dashed"
              onClick={onAddExperiencia}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {experiencias.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma experiência registrada</p>
            {isOwner && (
              <p className="text-xs mt-1">
                Adicione escolinhas ou atividades externas para mostrar sua jornada
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            {experiencias.map((exp, idx) => (
              <div key={exp.id} className="relative pl-12 pb-4 last:pb-0">
                {/* Timeline dot */}
                <div className={`absolute left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center`}
                  style={exp.type === 'escolinha' 
                    ? { backgroundColor: `${accentColor}18`, borderColor: accentColor, color: accentColor }
                    : { backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  {exp.type === 'escolinha' 
                    ? <GraduationCap className="w-3 h-3" />
                    : getActivityIcon((exp.data as AtividadeExternaPublica).tipo)
                  }
                </div>

                {/* Content */}
                <div 
                  className={`p-3 rounded-lg transition-colors ${
                    expandedItems.has(exp.id) ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleExpand(exp.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">
                            {exp.type === 'escolinha' && (exp.data as EscolinhaCarreira).slug ? (
                              <Link 
                                to={`/escola/${(exp.data as EscolinhaCarreira).slug}`}
                                className="hover:underline"
                                style={{ color: accentColor }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {exp.title}
                              </Link>
                            ) : exp.title}
                          </h4>
                          {exp.type === 'atividade' && exp.abrangencia && (
                            <Badge variant="outline" className="text-xs">
                              {ABRANGENCIA_LABELS[exp.abrangencia as keyof typeof ABRANGENCIA_LABELS] || exp.abrangencia}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {exp.subtitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateRange(exp.startDate, exp.endDate, exp.isActive)}
                        </p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground p-1">
                        {expandedItems.has(exp.id) 
                          ? <ChevronUp className="w-4 h-4" /> 
                          : <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedItems.has(exp.id) && exp.details && (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                      {exp.details}
                    </div>
                  )}

                  {/* Photos for atividades */}
                  {expandedItems.has(exp.id) && 
                    exp.type === 'atividade' && 
                    (exp.data as AtividadeExternaPublica).fotos_urls?.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex gap-2 overflow-x-auto">
                        {(exp.data as AtividadeExternaPublica).fotos_urls.slice(0, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
