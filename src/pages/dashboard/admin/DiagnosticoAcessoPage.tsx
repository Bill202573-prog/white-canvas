import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDiagnosticoData, DiagnosticoResult } from '@/hooks/useDiagnosticoData';
import { supabase } from '@/integrations/supabase/client';
import {
  RefreshCw, Copy, CheckCircle2, XCircle, Clock, User, Shield, Database,
  AlertTriangle, Zap, HardDrive, Activity, Server, Users, ImageIcon, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const StatusIcon = ({ status }: { status: DiagnosticoResult['status'] }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />;
  }
};

// ============ HOOK FOR EDGE FUNCTION DIAGNOSTICS ============
function useEdgeDiagnostico(tipo: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // Load cached result on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const { data: cached } = await supabase
          .from('diagnostico_resultados')
          .select('*')
          .eq('tipo', tipo)
          .maybeSingle();
        if (cached) {
          setData(cached.resultado);
          setLastRun(new Date(cached.executado_em));
          setDuration(cached.duracao_ms);
        }
      } catch { /* ignore */ }
      finally { setIsLoadingCache(false); }
    };
    loadCached();
  }, [tipo]);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('run-diagnostico', {
        body: { tipo },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (res.error) throw new Error(res.error.message || 'Erro ao executar diagnóstico');
      const elapsed = Date.now() - start;
      setData(res.data);
      setLastRun(new Date());
      setDuration(elapsed);

      // Persist result to DB (upsert by tipo)
      const userId = session?.user?.id;
      await supabase
        .from('diagnostico_resultados')
        .upsert({
          tipo,
          resultado: res.data,
          duracao_ms: elapsed,
          executado_por: userId,
          executado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tipo' });

      toast.success(`Diagnóstico "${tipo}" concluído em ${elapsed}ms`);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tipo]);

  return { data, isLoading, isLoadingCache, error, run, lastRun, duration };
}

// ============ RUN STATUS BANNER ============
function RunStatusBanner({ lastRun, duration, isLoading }: { lastRun: Date | null; duration: number | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span className="text-primary font-medium">Executando diagnóstico...</span>
      </div>
    );
  }
  if (!lastRun) return null;
  const isToday = new Date().toDateString() === lastRun.toDateString();
  const dateStr = isToday
    ? `hoje às ${lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : `${lastRun.toLocaleDateString('pt-BR')} às ${lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
      <CheckCircle2 className="w-4 h-4 text-green-600" />
      <span className="text-green-700 font-medium">
        Última execução: {dateStr} ({duration}ms)
      </span>
    </div>
  );
}

// ============ SECURITY TAB ============
function SecurityTab() {
  const { data, isLoading, isLoadingCache, run, lastRun, duration } = useEdgeDiagnostico('seguranca');

  const tabelas = data?.tabelas || [];
  const resumo = data?.resumo || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Verificação de Segurança (RLS)</h3>
          <p className="text-sm text-muted-foreground">
            Testa se tabelas estão protegidas contra acesso público não autenticado
          </p>
        </div>
        <Button onClick={run} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Executar
        </Button>
      </div>

      <RunStatusBanner lastRun={lastRun} duration={duration} isLoading={isLoading} />

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{resumo.protegidas ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tabelas protegidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">{resumo.expostas ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Tabelas expostas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{resumo.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total verificadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {tabelas.map((t: any) => (
                  <div
                    key={t.tabela}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      t.erro ? 'border-muted bg-muted/30' :
                      !t.rls_protegido ? 'border-amber-500/50 bg-amber-500/5' :
                      'border-green-500/30 bg-green-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.erro ? (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      ) : !t.rls_protegido ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-mono text-sm">{t.tabela}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t.registros} registros
                      </Badge>
                      {t.erro ? (
                        <Badge variant="secondary" className="text-xs">Não encontrada</Badge>
                      ) : !t.rls_protegido ? (
                        <Badge variant="destructive" className="text-xs">
                          {t.registros_publicos} público{t.registros_publicos !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                          Protegida
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !isLoading && !isLoadingCache && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado salvo. Clique em "Executar" para verificar a segurança</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ ERRORS TAB ============
function ErrorsTab() {
  const { data, isLoading, isLoadingCache, run, lastRun, duration } = useEdgeDiagnostico('erros');

  const checks = data?.checks || [];
  const warnings = checks.filter((c: any) => c.count > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Erros e Inconsistências</h3>
          <p className="text-sm text-muted-foreground">
            Detecta problemas nos dados e registros inconsistentes
          </p>
        </div>
        <Button onClick={run} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Executar
        </Button>
      </div>

      <RunStatusBanner lastRun={lastRun} duration={duration} isLoading={isLoading} />

      {data && (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-8 h-8 ${warnings.length > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                <div>
                  <p className="text-2xl font-bold">{warnings.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {warnings.length === 0 ? 'Nenhum problema encontrado' : 'Problemas detectados'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {checks.map((check: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {check.count > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{check.nome}</p>
                        <p className="text-xs text-muted-foreground">{check.descricao}</p>
                      </div>
                    </div>
                    <Badge
                      variant={check.count > 0 ? 'destructive' : 'outline'}
                      className={check.count === 0 ? 'text-green-600 border-green-500/30' : ''}
                    >
                      {check.count}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!data && !isLoading && !isLoadingCache && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado salvo. Clique em "Executar" para verificar erros</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ HEALTH TAB ============
function HealthTab() {
  const { data, isLoading, isLoadingCache, run, lastRun, duration } = useEdgeDiagnostico('saude');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Saúde do Banco de Dados</h3>
          <p className="text-sm text-muted-foreground">
            Contagem de registros, storage e integridade dos dados
          </p>
        </div>
        <Button onClick={run} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Executar
        </Button>
      </div>

      <RunStatusBanner lastRun={lastRun} duration={duration} isLoading={isLoading} />

      {data && (
        <>
          {/* Table counts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Registros por Tabela
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {(data.tableCounts || []).map((t: any) => (
                  <div key={t.tabela} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="font-mono text-sm">{t.tabela}</span>
                    <Badge variant="outline">{t.registros >= 0 ? t.registros : 'Erro'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Orphan checks */}
          {(data.criancasSemResponsavel?.length > 0 || data.criancasSemEscola?.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Registros Órfãos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.criancasSemResponsavel?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-600">
                      Crianças ativas sem responsável ({data.criancasSemResponsavel.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {data.criancasSemResponsavel.slice(0, 5).map((c: any) => (
                        <p key={c.id} className="text-xs text-muted-foreground pl-2">• {c.nome}</p>
                      ))}
                    </div>
                  </div>
                )}
                {data.criancasSemEscola?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-600">
                      Crianças ativas sem escola ({data.criancasSemEscola.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {data.criancasSemEscola.slice(0, 5).map((c: any) => (
                        <p key={c.id} className="text-xs text-muted-foreground pl-2">• {c.nome}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Storage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Storage (Arquivos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {(data.storageSizes || []).map((s: any) => (
                  <div key={s.bucket} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm">{s.bucket}</span>
                    <Badge variant="outline">{s.arquivos} arquivos</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !isLoading && !isLoadingCache && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado salvo. Clique em "Executar" para verificar a saúde</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ PERFORMANCE TAB ============
function PerformanceTab() {
  const { data, isLoading, isLoadingCache, run, lastRun, duration } = useEdgeDiagnostico('performance');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Performance de Queries</h3>
          <p className="text-sm text-muted-foreground">
            Mede tempo de consultas e identifica tabelas grandes
          </p>
        </div>
        <Button onClick={run} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Executar
        </Button>
      </div>

      <RunStatusBanner lastRun={lastRun} duration={duration} isLoading={isLoading} />

      {data && (
        <>
          {/* Table sizes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4" />
                Tabelas Monitoradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data.tabelas || []).map((t: any) => (
                  <div
                    key={t.tabela}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      t.status === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : t.status === 'info'
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-green-500/30 bg-green-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : t.status === 'info' ? (
                        <Activity className="w-4 h-4 text-blue-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <div>
                        <span className="font-mono text-sm">{t.tabela}</span>
                        {t.sugestao && (
                          <p className="text-xs text-amber-600 mt-0.5">{t.sugestao}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        t.status === 'warning' ? 'text-amber-600' :
                        t.status === 'info' ? 'text-blue-600' : 'text-green-600'
                      }
                    >
                      {t.registros?.toLocaleString('pt-BR')} registros
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Query speed tests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Velocidade de Consultas
              </CardTitle>
              <CardDescription>Tempo de resposta das queries mais comuns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data.queryTests || []).map((q: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">{q.query}</span>
                    <Badge
                      variant="outline"
                      className={
                        q.tempo_ms > 1000 ? 'text-destructive' :
                        q.tempo_ms > 500 ? 'text-amber-600' : 'text-green-600'
                      }
                    >
                      {q.tempo_ms}ms
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !isLoading && !isLoadingCache && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado salvo. Clique em "Executar" para verificar a performance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ STORAGE & USERS TAB ============
function StorageUsersTab() {
  const { data, isLoading, isLoadingCache, run, lastRun, duration } = useEdgeDiagnostico('armazenamento');

  const storage = data?.storage;
  const usuarios = data?.usuarios;

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Armazenamento & Usuários</h3>
          <p className="text-sm text-muted-foreground">
            Uso de storage, banco de dados e contagem de usuários
          </p>
        </div>
        <Button onClick={run} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Executar
        </Button>
      </div>

      <RunStatusBanner lastRun={lastRun} duration={duration} isLoading={isLoading} />

      {data && (
        <>
          {/* Storage Overview */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatSize(storage?.total_mb ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Storage usado</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{storage?.percentual_uso ?? 0}% do limite free (1 GB)</span>
                    <span>{storage?.total_arquivos ?? 0} arquivos</span>
                  </div>
                  <Progress value={Math.min(storage?.percentual_uso ?? 0, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{storage?.total_arquivos ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total de arquivos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{usuarios?.total_profiles ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storage per bucket */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Uso por Bucket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(storage?.buckets || []).map((b: any) => (
                  <div key={b.bucket} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{b.bucket}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{b.arquivos} arquivos</Badge>
                      <Badge variant="secondary">{formatSize(b.tamanho_mb)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Detalhamento de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Responsáveis', count: usuarios?.responsaveis ?? 0 },
                  { label: 'Professores', count: usuarios?.professores ?? 0 },
                  { label: 'Escolinhas ativas', count: usuarios?.escolinhas_ativas ?? 0 },
                  { label: 'Perfis Atleta ID', count: usuarios?.perfis_atleta ?? 0 },
                  { label: 'Perfis Rede (Carreira)', count: usuarios?.perfis_rede ?? 0 },
                  { label: 'Postagens', count: usuarios?.posts_atleta ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">{item.label}</span>
                    <Badge variant="outline" className="font-bold">{item.count.toLocaleString('pt-BR')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !isLoading && !isLoadingCache && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HardDrive className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado salvo. Clique em "Executar" para verificar armazenamento e usuários</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============
const DiagnosticoAcessoPage = () => {
  const { userInfo, queries, isLoading, runDiagnostico } = useDiagnosticoData();

  useEffect(() => {
    runDiagnostico();
  }, [runDiagnostico]);

  const copyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      user: userInfo,
      queries: queries.map(q => ({
        tabela: q.tabela,
        status: q.status,
        count: q.count,
        error: q.error,
        errorCode: q.errorCode,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast.success('Relatório copiado para a área de transferência');
  };

  const successCount = queries.filter(q => q.status === 'success').length;
  const errorCount = queries.filter(q => q.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">
            Verificação completa de acesso, segurança, saúde e performance
          </p>
        </div>
        <Button variant="outline" onClick={copyReport} disabled={isLoading}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar Relatório
        </Button>
      </div>

      <Tabs defaultValue="acesso">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="acesso" className="gap-1 text-xs sm:text-sm">
            <Database className="w-3.5 h-3.5 hidden sm:block" /> Acesso
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1 text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5 hidden sm:block" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="erros" className="gap-1 text-xs sm:text-sm">
            <AlertTriangle className="w-3.5 h-3.5 hidden sm:block" /> Erros
          </TabsTrigger>
          <TabsTrigger value="saude" className="gap-1 text-xs sm:text-sm">
            <Activity className="w-3.5 h-3.5 hidden sm:block" /> Saúde
          </TabsTrigger>
          <TabsTrigger value="armazenamento" className="gap-1 text-xs sm:text-sm">
            <HardDrive className="w-3.5 h-3.5 hidden sm:block" /> Storage
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm">
            <Zap className="w-3.5 h-3.5 hidden sm:block" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* ACCESS TAB (original) */}
        <TabsContent value="acesso" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={runDiagnostico} disabled={isLoading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Executar Diagnóstico
            </Button>
          </div>

          {/* User Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Usuário Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID</p>
                    <p className="text-sm font-mono break-all">{userInfo.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{userInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <Badge variant={userInfo.role === 'admin' ? 'default' : 'secondary'}>
                      {userInfo.role || 'Sem role'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Escolinha</p>
                    <p className="text-sm">{userInfo.escolinhaNome || userInfo.escolinhaId || '-'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Carregando informações do usuário...</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Resumo do Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-lg font-semibold">{successCount}</span>
                  <span className="text-muted-foreground">OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-lg font-semibold">{errorCount}</span>
                  <span className="text-muted-foreground">Erros</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Checklist de Tabelas
              </CardTitle>
              <CardDescription>Status de acesso a cada tabela</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {queries.map((query) => (
                  <div
                    key={query.tabela}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      query.status === 'error'
                        ? 'border-destructive/50 bg-destructive/5'
                        : query.status === 'success'
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={query.status} />
                      <span className="font-mono text-sm">{query.tabela}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {query.status === 'success' && (
                        <Badge variant="outline" className="text-green-600">
                          {query.count} registro{query.count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {query.status === 'error' && (
                        <div className="text-right">
                          {query.errorCode && (
                            <Badge variant="destructive" className="mb-1">{query.errorCode}</Badge>
                          )}
                          <p className="text-xs text-destructive max-w-xs truncate">{query.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="erros">
          <ErrorsTab />
        </TabsContent>

        <TabsContent value="saude">
          <HealthTab />
        </TabsContent>

        <TabsContent value="armazenamento">
          <StorageUsersTab />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiagnosticoAcessoPage;
