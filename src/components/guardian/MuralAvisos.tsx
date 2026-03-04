import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGuardianComunicados, Comunicado } from '@/hooks/useComunicadosData';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, AlertTriangle, Info, Megaphone, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const tipoConfig = {
  informativo: {
    icon: Info,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    label: 'Informativo',
  },
  importante: {
    icon: Megaphone,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Importante',
  },
  urgente: {
    icon: AlertTriangle,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Urgente',
  },
};

const MuralAvisos = () => {
  const { data: comunicados = [], isLoading } = useGuardianComunicados();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (comunicados.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum aviso no momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Mural de Avisos
          {comunicados.some(c => c.tipo === 'urgente') && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 p-4 pt-0">
            {comunicados.map((comunicado) => {
              const config = tipoConfig[comunicado.tipo];
              const Icon = config.icon;
              
              return (
                <div
                  key={comunicado.id}
                  className={`p-3 rounded-lg border ${
                    comunicado.tipo === 'urgente'
                      ? 'bg-destructive/5 border-destructive/20'
                      : comunicado.tipo === 'importante'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-secondary/30 border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md ${config.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-sm text-foreground">
                          {comunicado.titulo}
                        </h4>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comunicado.mensagem}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(comunicado.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {comunicado.escolinha && (
                          <>
                            <span>•</span>
                            <span>{comunicado.escolinha.nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MuralAvisos;
