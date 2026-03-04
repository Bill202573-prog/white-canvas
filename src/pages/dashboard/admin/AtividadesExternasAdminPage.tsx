import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Building2, Users, Loader2, Search, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ModoAtividadesExternas = 'desativado' | 'beta' | 'pago';
type MotivoEscola = 'piloto' | 'cortesia' | 'parceria' | null;
type TipoIsencao = 'beta_tester' | 'cortesia';

export default function AtividadesExternasAdminPage() {
  const queryClient = useQueryClient();
  const [searchEscola, setSearchEscola] = useState('');
  const [searchAtleta, setSearchAtleta] = useState('');

  // 1️⃣ CONTROLE GLOBAL
  const { data: modoGlobal, isLoading: loadingModo } = useQuery({
    queryKey: ['atividades-externas-modo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_config')
        .select('valor')
        .eq('chave', 'atividades_externas_modo')
        .single();
      if (error) throw error;
      return data?.valor as ModoAtividadesExternas;
    },
  });

  const updateModoGlobal = useMutation({
    mutationFn: async (modo: ModoAtividadesExternas) => {
      const { error } = await supabase
        .from('saas_config')
        .update({ valor: modo })
        .eq('chave', 'atividades_externas_modo');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-externas-modo'] });
      toast.success('Modo global atualizado');
    },
    onError: () => toast.error('Erro ao atualizar modo global'),
  });

  // 2️⃣ CONTROLE POR ESCOLINHA
  const { data: escolinhas, isLoading: loadingEscolinhas } = useQuery({
    queryKey: ['admin-escolinhas-atividades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolinhas')
        .select('id, nome, atividades_externas_liberado, atividades_externas_motivo, atividades_externas_liberado_ate')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const updateEscolinha = useMutation({
    mutationFn: async ({
      id,
      liberado,
      motivo,
      liberadoAte,
    }: {
      id: string;
      liberado: boolean;
      motivo: MotivoEscola;
      liberadoAte: string | null;
    }) => {
      const { error } = await supabase
        .from('escolinhas')
        .update({
          atividades_externas_liberado: liberado,
          atividades_externas_motivo: motivo,
          atividades_externas_liberado_ate: liberadoAte,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-escolinhas-atividades'] });
      toast.success('Escolinha atualizada');
    },
    onError: () => toast.error('Erro ao atualizar escolinha'),
  });

  // 3️⃣ CONTROLE POR ATLETA (whitelist)
  const { data: whitelist, isLoading: loadingWhitelist } = useQuery({
    queryKey: ['atividades-externas-whitelist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades_externas_whitelist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addToWhitelist = useMutation({
    mutationFn: async ({
      email,
      motivo,
      tipoIsencao,
    }: {
      email: string;
      motivo: string;
      tipoIsencao: TipoIsencao;
    }) => {
      const { error } = await supabase
        .from('atividades_externas_whitelist')
        .insert({
          user_email: email,
          motivo,
          tipo_isencao: tipoIsencao,
          ativo: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-externas-whitelist'] });
      toast.success('Atleta adicionado à whitelist');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar'),
  });

  const toggleWhitelistItem = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('atividades_externas_whitelist')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-externas-whitelist'] });
      toast.success('Whitelist atualizada');
    },
    onError: () => toast.error('Erro ao atualizar whitelist'),
  });

  const deleteWhitelistItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('atividades_externas_whitelist')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades-externas-whitelist'] });
      toast.success('Entrada removida');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  // Filtered lists
  const filteredEscolinhas = escolinhas?.filter((e) =>
    e.nome.toLowerCase().includes(searchEscola.toLowerCase())
  );

  const filteredWhitelist = whitelist?.filter((w) =>
    w.user_email.toLowerCase().includes(searchAtleta.toLowerCase())
  );

  // New entry form state
  const [newEmail, setNewEmail] = useState('');
  const [newMotivo, setNewMotivo] = useState('');
  const [newTipoIsencao, setNewTipoIsencao] = useState<TipoIsencao>('beta_tester');

  const handleAddToWhitelist = () => {
    if (!newEmail.includes('@')) {
      toast.error('E-mail inválido');
      return;
    }
    addToWhitelist.mutate(
      { email: newEmail, motivo: newMotivo || 'Adicionado pelo admin', tipoIsencao: newTipoIsencao },
      {
        onSuccess: () => {
          setNewEmail('');
          setNewMotivo('');
        },
      }
    );
  };

  const getModoColor = (modo: ModoAtividadesExternas) => {
    switch (modo) {
      case 'desativado':
        return 'destructive';
      case 'beta':
        return 'secondary';
      case 'pago':
        return 'default';
    }
  };

  const getModoLabel = (modo: ModoAtividadesExternas) => {
    switch (modo) {
      case 'desativado':
        return 'Desativado';
      case 'beta':
        return 'Beta (Liberado)';
      case 'pago':
        return 'Pago';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Controle: Atividades Externas</h1>
        <p className="text-muted-foreground">
          Gerencie a funcionalidade de Atividades Externas em toda a plataforma
        </p>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global" className="gap-2">
            <Settings className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="escolinhas" className="gap-2">
            <Building2 className="h-4 w-4" />
            Escolinhas
          </TabsTrigger>
          <TabsTrigger value="atletas" className="gap-2">
            <Users className="h-4 w-4" />
            Exceções Atletas
          </TabsTrigger>
        </TabsList>

        {/* TAB: CONTROLE GLOBAL */}
        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Global
              </CardTitle>
              <CardDescription>
                Define o comportamento padrão da funcionalidade para toda a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingModo ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Label className="min-w-32">Modo Atual:</Label>
                    <Badge variant={getModoColor(modoGlobal || 'beta')}>
                      {getModoLabel(modoGlobal || 'beta')}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card
                      className={`cursor-pointer transition-all ${modoGlobal === 'desativado' ? 'ring-2 ring-destructive' : ''}`}
                      onClick={() => updateModoGlobal.mutate('desativado')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Desativado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Ninguém pode usar a funcionalidade. Bloqueia para todos os usuários.
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${modoGlobal === 'beta' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => updateModoGlobal.mutate('beta')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Beta</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Todos os usuários autenticados podem usar. Ideal para testes amplos.
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${modoGlobal === 'pago' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => updateModoGlobal.mutate('pago')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Pago</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Apenas escolinhas liberadas ou atletas isentos podem usar.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="font-medium mb-2">Lógica de Verificação:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Se modo = <strong>desativado</strong> → Bloqueia todos</li>
                      <li>Se modo = <strong>beta</strong> → Libera todos</li>
                      <li>Se modo = <strong>pago</strong> → Verifica escola liberada → Verifica atleta isento</li>
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CONTROLE POR ESCOLINHA */}
        <TabsContent value="escolinhas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Liberação por Escolinha
              </CardTitle>
              <CardDescription>
                Libere ou bloqueie a funcionalidade para escolinhas específicas (apenas em modo "Pago")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar escolinha..."
                  value={searchEscola}
                  onChange={(e) => setSearchEscola(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {loadingEscolinhas ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escolinha</TableHead>
                      <TableHead>Liberado</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Até</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEscolinhas?.map((escola) => (
                      <TableRow key={escola.id}>
                        <TableCell className="font-medium">{escola.nome}</TableCell>
                        <TableCell>
                          <Switch
                            checked={escola.atividades_externas_liberado || false}
                            onCheckedChange={(checked) =>
                              updateEscolinha.mutate({
                                id: escola.id,
                                liberado: checked,
                                motivo: checked ? 'piloto' : null,
                                liberadoAte: escola.atividades_externas_liberado_ate,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={escola.atividades_externas_motivo || ''}
                            onValueChange={(value) =>
                              updateEscolinha.mutate({
                                id: escola.id,
                                liberado: escola.atividades_externas_liberado || false,
                                motivo: value as MotivoEscola,
                                liberadoAte: escola.atividades_externas_liberado_ate,
                              })
                            }
                            disabled={!escola.atividades_externas_liberado}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="piloto">Piloto</SelectItem>
                              <SelectItem value="cortesia">Cortesia</SelectItem>
                              <SelectItem value="parceria">Parceria</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={escola.atividades_externas_liberado_ate || ''}
                            onChange={(e) =>
                              updateEscolinha.mutate({
                                id: escola.id,
                                liberado: escola.atividades_externas_liberado || false,
                                motivo: escola.atividades_externas_motivo as MotivoEscola,
                                liberadoAte: e.target.value || null,
                              })
                            }
                            disabled={!escola.atividades_externas_liberado}
                            className="w-36"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {escola.atividades_externas_liberado && (
                            <Badge variant="outline">Ativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: EXCEÇÕES ATLETAS */}
        <TabsContent value="atletas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Exceções por Atleta
              </CardTitle>
              <CardDescription>
                Libere atletas específicos independentemente da escola (apenas em modo "Pago")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulário para adicionar */}
              <div className="grid gap-4 md:grid-cols-5 items-end border rounded-lg p-4 bg-muted/50">
                <div className="md:col-span-2">
                  <Label htmlFor="new-email">E-mail do Responsável</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-motivo">Motivo</Label>
                  <Input
                    id="new-motivo"
                    placeholder="Ex: Beta tester inicial"
                    value={newMotivo}
                    onChange={(e) => setNewMotivo(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-tipo">Tipo Isenção</Label>
                  <Select value={newTipoIsencao} onValueChange={(v) => setNewTipoIsencao(v as TipoIsencao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beta_tester">Beta Tester</SelectItem>
                      <SelectItem value="cortesia">Cortesia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddToWhitelist} disabled={addToWhitelist.isPending}>
                  {addToWhitelist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>

              {/* Busca */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por e-mail..."
                  value={searchAtleta}
                  onChange={(e) => setSearchAtleta(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {/* Lista */}
              {loadingWhitelist ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWhitelist?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.tipo_isencao === 'beta_tester' ? 'Beta Tester' : 'Cortesia'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-48 truncate">
                          {item.motivo}
                        </TableCell>
                        <TableCell>
                          {item.expires_at
                            ? format(new Date(item.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.ativo}
                            onCheckedChange={(checked) =>
                              toggleWhitelistItem.mutate({ id: item.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteWhitelistItem.mutate(item.id)}
                          >
                            Remover
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredWhitelist?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma exceção cadastrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
