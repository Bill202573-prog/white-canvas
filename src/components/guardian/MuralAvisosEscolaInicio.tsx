import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGuardianComunicadosEscola, useConfirmLeituraEscola, ComunicadoEscolaComLeitura } from '@/hooks/useComunicadosEscolaData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, AlertTriangle, Info, Megaphone, Loader2, CheckCircle2, School, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

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

const MuralAvisosEscolaInicio = () => {
  const { data: comunicados = [], isLoading } = useGuardianComunicadosEscola();
  const confirmLeitura = useConfirmLeituraEscola();
  const [showHistory, setShowHistory] = useState(false);

  const handleConfirmRead = async (comunicado: ComunicadoEscolaComLeitura) => {
    try {
      await confirmLeitura.mutateAsync(comunicado.id);
      toast.success('Leitura confirmada!');
    } catch (error) {
      toast.error('Erro ao confirmar leitura');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Avisos da Escola
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const unreadComunicados = comunicados.filter(c => !c.lido);
  const readComunicados = comunicados.filter(c => c.lido);

  if (comunicados.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Avisos da Escola
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum aviso da escola no momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderComunicado = (comunicado: ComunicadoEscolaComLeitura, showConfirmButton: boolean) => {
    const config = tipoConfig[comunicado.tipo as keyof typeof tipoConfig] || tipoConfig.informativo;
    const Icon = config.icon;
    
    return (
      <div
        key={comunicado.id}
        className={`p-3 rounded-lg border transition-all ${
          comunicado.lido
            ? 'bg-secondary/20 border-border opacity-70'
            : comunicado.tipo === 'urgente'
            ? 'bg-destructive/5 border-destructive/30'
            : comunicado.tipo === 'importante'
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-primary/5 border-primary/30'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-md ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            {comunicado.escolinha && (
              <div className="flex items-center gap-1.5 mb-1">
                <School className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {comunicado.escolinha.nome}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold text-sm text-foreground">
                {comunicado.titulo}
              </h4>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                {config.label}
              </Badge>
              {comunicado.lido && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  Lido
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {comunicado.mensagem}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comunicado.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {showConfirmButton && !comunicado.lido && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleConfirmRead(comunicado)}
                  disabled={confirmLeitura.isPending}
                >
                  {confirmLeitura.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  Confirmar Leitura
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={unreadComunicados.length > 0 ? 'border-primary/50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Avisos da Escola
          {unreadComunicados.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {unreadComunicados.length} não lido{unreadComunicados.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-4 pt-0">
          {/* Unread announcements */}
          {unreadComunicados.length > 0 ? (
            unreadComunicados.map((comunicado) => renderComunicado(comunicado, true))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">Todos os avisos foram lidos!</p>
            </div>
          )}

          {/* Read announcements (history) */}
          {readComunicados.length > 0 && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 text-muted-foreground">
                  <span className="flex items-center gap-2 text-sm">
                    <History className="w-4 h-4" />
                    Histórico ({readComunicados.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {readComunicados.map((comunicado) => renderComunicado(comunicado, false))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MuralAvisosEscolaInicio;
