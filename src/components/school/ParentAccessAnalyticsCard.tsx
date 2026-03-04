import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  ChevronDown,
  Clock,
  CalendarDays,
  RefreshCw
} from 'lucide-react';
import { useParentAccessAnalytics } from '@/hooks/useParentAccessAnalytics';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ParentAccessAnalyticsCardProps {
  escolinhaId: string;
}

export function ParentAccessAnalyticsCard({ escolinhaId }: ParentAccessAnalyticsCardProps) {
  const { parentAccessData, stats, isLoading, refetch } = useParentAccessAnalytics(escolinhaId);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Acesso dos Pais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const semAcessoList = parentAccessData.filter(p => !p.tem_acesso);
  const comAcessoList = parentAccessData.filter(p => p.tem_acesso);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Acesso dos Pais ao App
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{stats.total_responsaveis}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <UserCheck className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Acessaram</p>
              <p className="text-lg font-bold text-green-600">{stats.com_acesso}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
            <UserX className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Nunca acessou</p>
              <p className="text-lg font-bold text-amber-600">{stats.sem_acesso}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Ativos (7d)</p>
              <p className="text-lg font-bold text-primary">{stats.ativos_7_dias}</p>
            </div>
          </div>
        </div>

        {/* Adoption rate progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de adesão</span>
            <span className="font-medium">{stats.taxa_adesao}%</span>
          </div>
          <Progress value={stats.taxa_adesao} className="h-2" />
        </div>

        {/* Expandable list */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline w-full justify-center py-2">
            <span>{isOpen ? 'Ocultar' : 'Ver'} detalhes</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Never accessed list */}
            {semAcessoList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <UserX className="h-4 w-4" />
                  Nunca acessaram ({semAcessoList.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {semAcessoList.map(parent => (
                    <div 
                      key={parent.responsavel_id} 
                      className="flex items-center justify-between p-2 rounded bg-amber-500/5 text-sm"
                    >
                      <span>{parent.responsavel_nome}</span>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Sem acesso
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessed list */}
            {comAcessoList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <UserCheck className="h-4 w-4" />
                  Já acessaram ({comAcessoList.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {comAcessoList.map(parent => (
                    <div 
                      key={parent.responsavel_id} 
                      className="flex items-center justify-between p-2 rounded bg-green-500/5 text-sm gap-2"
                    >
                      <span className="truncate flex-1">{parent.responsavel_nome}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        {parent.primeiro_acesso && (
                          <span className="flex items-center gap-1" title="Primeiro acesso">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(parent.primeiro_acesso), 'dd/MM/yy', { locale: ptBR })}
                          </span>
                        )}
                        {parent.ultimo_acesso && (
                          <span className="flex items-center gap-1" title="Último acesso">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(parent.ultimo_acesso), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          parent.acessos_7_dias > 0 
                            ? "text-green-600 border-green-300" 
                            : "text-muted-foreground"
                        )}
                      >
                        {parent.total_acessos}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
