import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { ComunicadoEscolaComLeitura } from '@/hooks/useComunicadosEscolaData';

interface ComunicadoLeiturasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comunicado: ComunicadoEscolaComLeitura | null;
  escolinhaId: string;
}

interface DestinatarioInfo {
  criancaId: string;
  criancaNome: string;
  responsavelId: string;
  responsavelNome: string;
  userId: string;
  lido: boolean;
  lidoEm: string | null;
}

export default function ComunicadoLeiturasDialog({
  open,
  onOpenChange,
  comunicado,
  escolinhaId,
}: ComunicadoLeiturasDialogProps) {
  
  const { data: destinatarios = [], isLoading } = useQuery({
    queryKey: ['comunicado-leituras-detail', comunicado?.id],
    queryFn: async () => {
      if (!comunicado) return [];

      // Get the target children IDs based on comunicado config
      let targetCriancaIds: string[] = [];

      if (comunicado.crianca_ids && comunicado.crianca_ids.length > 0) {
        // Individual recipients - use stored snapshot
        targetCriancaIds = comunicado.crianca_ids;
      } else if (comunicado.turma_id) {
        // Turma - use snapshot if available, otherwise current
        if (comunicado.crianca_ids && comunicado.crianca_ids.length > 0) {
          targetCriancaIds = comunicado.crianca_ids;
        } else {
          // Fallback: get current turma members (legacy comunicados)
          const { data: turmaMembers } = await supabase
            .from('crianca_turma')
            .select('crianca_id')
            .eq('turma_id', comunicado.turma_id)
            .eq('ativo', true);
          targetCriancaIds = turmaMembers?.map(m => m.crianca_id) || [];
        }
      } else {
        // All school - get active children
        const { data: escolaCriancas } = await supabase
          .from('crianca_escolinha')
          .select('crianca_id')
          .eq('escolinha_id', escolinhaId)
          .eq('ativo', true);
        targetCriancaIds = escolaCriancas?.map(c => c.crianca_id) || [];
      }

      if (targetCriancaIds.length === 0) return [];

      // Get children info
      const { data: criancas } = await supabase
        .from('criancas')
        .select('id, nome')
        .in('id', targetCriancaIds);

      // Get responsaveis for these children
      const { data: criancaResponsaveis } = await supabase
        .from('crianca_responsavel')
        .select('crianca_id, responsavel_id')
        .in('crianca_id', targetCriancaIds);

      const responsavelIds = [...new Set(criancaResponsaveis?.map(cr => cr.responsavel_id) || [])];

      // Get responsavel details
      const { data: responsaveis } = await supabase
        .from('responsaveis')
        .select('id, nome, user_id')
        .in('id', responsavelIds);

      // Get leituras for this comunicado
      const { data: leituras } = await supabase
        .from('comunicado_escola_leituras')
        .select('*')
        .eq('comunicado_id', comunicado.id);

      const leiturasMap = new Map(leituras?.map(l => [l.user_id, l]) || []);

      // Build destinatarios list
      const result: DestinatarioInfo[] = [];

      for (const crianca of (criancas || [])) {
        const criancaResps = criancaResponsaveis?.filter(cr => cr.crianca_id === crianca.id) || [];
        
        for (const cr of criancaResps) {
          const resp = responsaveis?.find(r => r.id === cr.responsavel_id);
          if (resp) {
            const leitura = leiturasMap.get(resp.user_id);
            result.push({
              criancaId: crianca.id,
              criancaNome: crianca.nome,
              responsavelId: resp.id,
              responsavelNome: resp.nome,
              userId: resp.user_id,
              lido: !!leitura,
              lidoEm: leitura?.lido_em || null,
            });
          }
        }
      }

      // Sort: not read first, then by child name
      result.sort((a, b) => {
        if (a.lido !== b.lido) return a.lido ? 1 : -1;
        return a.criancaNome.localeCompare(b.criancaNome);
      });

      return result;
    },
    enabled: open && !!comunicado,
    refetchInterval: open ? 10000 : false, // Refresh every 10s when open
  });

  const lidos = destinatarios.filter(d => d.lido);
  const naoLidos = destinatarios.filter(d => !d.lido);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Extrato de Leituras
          </DialogTitle>
          <DialogDescription>
            {comunicado?.titulo}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {lidos.length} leram
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="w-3 h-3 mr-1" />
                  {naoLidos.length} pendentes
                </Badge>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Não leram */}
                {naoLidos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-500" />
                      Ainda não leram ({naoLidos.length})
                    </h4>
                    <div className="space-y-2">
                      {naoLidos.map((d, idx) => (
                        <div 
                          key={`${d.criancaId}-${d.responsavelId}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{d.criancaNome}</p>
                              <p className="text-xs text-muted-foreground">{d.responsavelNome}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Pendente
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leram */}
                {lidos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Já leram ({lidos.length})
                    </h4>
                    <div className="space-y-2">
                      {lidos.map((d, idx) => (
                        <div 
                          key={`${d.criancaId}-${d.responsavelId}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{d.criancaNome}</p>
                              <p className="text-xs text-muted-foreground">{d.responsavelNome}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                              Lido
                            </Badge>
                            {d.lidoEm && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(d.lidoEm), "dd/MM HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {destinatarios.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum destinatário encontrado
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
