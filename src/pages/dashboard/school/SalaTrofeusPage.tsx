import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Medal, ChevronDown, ChevronRight, Calendar, Users, Loader2 } from 'lucide-react';
import { useEscolinhaConquistas, COLOCACOES } from '@/hooks/useConquistasData';
import { useAuth } from '@/contexts/AuthContext';

const SalaTrofeusPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conquistas, isLoading } = useEscolinhaConquistas(user?.escolinhaId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getColocacaoInfo = (colocacao: string) => {
    return COLOCACOES.find(c => c.value === colocacao) || { label: colocacao, emoji: '🏅' };
  };

  const getColocacaoStyle = (colocacao: string) => {
    switch (colocacao) {
      case 'campeao':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400';
      case 'vice':
        return 'bg-slate-300/30 border-slate-400/50 text-slate-600 dark:text-slate-300';
      case 'terceiro':
        return 'bg-orange-600/20 border-orange-600/50 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getTrophyIcon = (colocacao: string) => {
    switch (colocacao) {
      case 'campeao':
        return <Trophy className="w-8 h-8 text-amber-500" />;
      case 'vice':
        return <Medal className="w-8 h-8 text-slate-400" />;
      case 'terceiro':
        return <Medal className="w-8 h-8 text-orange-600" />;
      default:
        return <Trophy className="w-8 h-8 text-muted-foreground" />;
    }
  };

  // Agrupar conquistas por ano
  const conquistasPorAno = conquistas?.reduce((acc, conquista) => {
    const ano = conquista.ano;
    if (!acc[ano]) {
      acc[ano] = [];
    }
    acc[ano].push(conquista);
    return acc;
  }, {} as Record<number, typeof conquistas>) || {};

  const anosOrdenados = Object.keys(conquistasPorAno)
    .map(Number)
    .sort((a, b) => b - a);

  // Estatísticas
  const stats = {
    total: conquistas?.length || 0,
    campeao: conquistas?.filter(c => c.colocacao === 'campeao').length || 0,
    vice: conquistas?.filter(c => c.colocacao === 'vice').length || 0,
    terceiro: conquistas?.filter(c => c.colocacao === 'terceiro').length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-500" />
              Sala de Troféus
            </h1>
            <p className="text-sm text-muted-foreground">
              Conquistas e títulos da escolinha
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total de Troféus</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-500">{stats.campeao}</div>
              <div className="text-xs text-muted-foreground">Títulos</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-400/10 to-slate-400/5 border-slate-400/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-slate-400">{stats.vice}</div>
              <div className="text-xs text-muted-foreground">Vice-campeonatos</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-600/10 to-orange-600/5 border-orange-600/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.terceiro}</div>
              <div className="text-xs text-muted-foreground">3º Lugares</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Conquistas */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma conquista registrada
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              As conquistas aparecem aqui automaticamente quando você encerra um campeonato 
              e registra a colocação da escolinha.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {anosOrdenados.map(ano => (
            <div key={ano}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {ano}
                <Badge variant="secondary" className="ml-2">
                  {conquistasPorAno[ano].length} {conquistasPorAno[ano].length === 1 ? 'conquista' : 'conquistas'}
                </Badge>
              </h2>
              <div className="grid gap-3">
                {conquistasPorAno[ano].map(conquista => {
                  const colocacaoInfo = getColocacaoInfo(conquista.colocacao);
                  const isExpanded = expandedItems.has(conquista.id);

                  return (
                    <Collapsible
                      key={conquista.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(conquista.id)}
                    >
                      <Card className={`transition-all hover:shadow-md ${getColocacaoStyle(conquista.colocacao)}`}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                {getTrophyIcon(conquista.colocacao)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-2">
                                  <span className="truncate">{conquista.nome_campeonato}</span>
                                  {conquista.categoria && (
                                    <Badge variant="outline" className="text-xs">
                                      {conquista.categoria}
                                    </Badge>
                                  )}
                                </CardTitle>
                                <p className="text-sm font-medium mt-1">
                                  {colocacaoInfo.emoji} {colocacaoInfo.label}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-4">
                            <div className="border-t pt-4 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Trophy className="w-4 h-4" />
                                <span>Campeonato: {conquista.nome_campeonato}</span>
                              </div>
                              {conquista.categoria && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span>Categoria: {conquista.categoria}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Ano: {conquista.ano}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Medal className="w-4 h-4" />
                                <span>Colocação: {colocacaoInfo.label}</span>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalaTrofeusPage;
