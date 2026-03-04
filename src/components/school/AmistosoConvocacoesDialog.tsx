import { useState, useMemo, useEffect } from 'react';
import { differenceInYears } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, Loader2, Save, UserCheck, DollarSign, Gift, CheckCircle, Clock, Send, Bell, Filter } from 'lucide-react';
import { useEligibleAthletes } from '@/hooks/useCampeonatoConvocacoesData';
import {
  useAmistosoConvocacoes,
  useUpsertAmistosoConvocacoes,
  type CreateAmistosoConvocacaoInput,
} from '@/hooks/useAmistosoConvocacoesData';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolTurmas, getTurmaCategoriaBadge } from '@/hooks/useSchoolData';

interface AmistosoConvocacoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  eventoNome: string;
  categoria: string | null;
  taxaParticipacao: number | null;
  taxaJuiz: number | null;
  cobrarTaxaParticipacao: boolean;
  cobrarTaxaJuiz: boolean;
  /** When provided, only athletes with these IDs will be shown (e.g., for championship games) */
  allowedAtletaIds?: string[];
}

interface AtletaConvocacao {
  crianca_id: string;
  nome: string;
  idade: number;
  categoria: string;
  foto_url: string | null;
  convocado: boolean;
  valor: number | null;
  isento: boolean;
  useValorPadrao: boolean;
  status?: string;
  dataPagamento?: string | null;
  notificadoEm?: string | null;
}

export function AmistosoConvocacoesDialog({
  open,
  onOpenChange,
  eventoId,
  eventoNome,
  categoria,
  taxaParticipacao,
  taxaJuiz,
  cobrarTaxaParticipacao,
  cobrarTaxaJuiz,
  allowedAtletaIds,
}: AmistosoConvocacoesDialogProps) {
  const { user } = useAuth();
  const escolinhaId = user?.escolinhaId || null;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [convocacoes, setConvocacoes] = useState<Map<string, AtletaConvocacao>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);

  // Fetch school turmas for filter
  const { data: turmas = [] } = useSchoolTurmas();
  const activeTurmas = useMemo(() => turmas.filter(t => t.ativo), [turmas]);

  // Calculate total fee (taxa de participação + taxa de juiz if cobrar is true)
  const valorPadrao = useMemo(() => {
    let total = 0;
    if (cobrarTaxaParticipacao && taxaParticipacao) total += taxaParticipacao;
    if (cobrarTaxaJuiz && taxaJuiz) total += taxaJuiz;
    return total > 0 ? total : null;
  }, [taxaParticipacao, taxaJuiz, cobrarTaxaParticipacao, cobrarTaxaJuiz]);

  const { data: eligibleAthletes, isLoading: loadingAthletes } = useEligibleAthletes(
    selectedTurmaIds.length > 0 ? null : categoria,
    escolinhaId,
    selectedTurmaIds.length > 0 ? selectedTurmaIds : undefined,
  );
  const { data: existingConvocacoes, isLoading: loadingConvocacoes } = useAmistosoConvocacoes(eventoId);
  const upsertConvocacoes = useUpsertAmistosoConvocacoes();

  const toggleTurma = (turmaId: string) => {
    setSelectedTurmaIds(prev =>
      prev.includes(turmaId) ? prev.filter(id => id !== turmaId) : [...prev, turmaId]
    );
    setInitialized(false);
  };

  // Reset initialization when dialog opens
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setSearchTerm('');
      setSelectedTurmaIds([]);
    }
  }, [open]);

  // Initialize convocacoes state from existing data and eligible athletes
  useEffect(() => {
    if (!eligibleAthletes || initialized || !open) return;

    const map = new Map<string, AtletaConvocacao>();

    // Filter athletes by allowedAtletaIds if provided (for championship games)
    const filteredAthletes = allowedAtletaIds && allowedAtletaIds.length > 0
      ? eligibleAthletes.filter(a => allowedAtletaIds.includes(a.id))
      : eligibleAthletes;

    // First, add all eligible athletes as not convocado
    filteredAthletes.forEach(atleta => {
      map.set(atleta.id, {
        crianca_id: atleta.id,
        nome: atleta.nome,
        idade: atleta.idade,
        categoria: atleta.categoria,
        foto_url: atleta.foto_url,
        convocado: false,
        valor: null,
        isento: false,
        useValorPadrao: true,
      });
    });

    // Then, update with existing convocacoes
    if (existingConvocacoes) {
      existingConvocacoes.forEach(conv => {
        const existing = map.get(conv.crianca_id);
        if (existing) {
          map.set(conv.crianca_id, {
            ...existing,
            convocado: true,
            valor: conv.valor,
            isento: conv.isento,
            useValorPadrao: conv.valor === null && !conv.isento,
            status: conv.status,
            dataPagamento: conv.data_pagamento,
            notificadoEm: (conv as any).notificado_em,
          });
        } else if (conv.crianca) {
          const birthDate = new Date(conv.crianca.data_nascimento);
          const idade = differenceInYears(new Date(), birthDate);
          map.set(conv.crianca_id, {
            crianca_id: conv.crianca_id,
            nome: conv.crianca.nome,
            idade,
            categoria: categoria || 'Livre',
            foto_url: conv.crianca.foto_url,
            convocado: true,
            valor: conv.valor,
            isento: conv.isento,
            useValorPadrao: conv.valor === null && !conv.isento,
            status: conv.status,
            dataPagamento: conv.data_pagamento,
          });
        }
      });
    }

    setConvocacoes(map);
    setInitialized(true);
  }, [eligibleAthletes, existingConvocacoes, categoria, initialized, open]);

  const filteredAtletas = useMemo(() => {
    const atletas = Array.from(convocacoes.values());
    if (!searchTerm) return atletas;

    return atletas.filter(atleta =>
      atleta.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [convocacoes, searchTerm]);

  const convocadosCount = useMemo(() => {
    return Array.from(convocacoes.values()).filter(a => a.convocado).length;
  }, [convocacoes]);

  const pagosCount = useMemo(() => {
    return Array.from(convocacoes.values()).filter(a => a.convocado && a.status === 'pago').length;
  }, [convocacoes]);

  const isentosCount = useMemo(() => {
    return Array.from(convocacoes.values()).filter(a => a.convocado && a.isento).length;
  }, [convocacoes]);

  const handleToggleConvocado = (criancaId: string) => {
    setConvocacoes(prev => {
      const map = new Map(prev);
      const atleta = map.get(criancaId);
      if (atleta) {
        map.set(criancaId, { ...atleta, convocado: !atleta.convocado });
      }
      return map;
    });
  };

  const handleToggleIsento = (criancaId: string) => {
    setConvocacoes(prev => {
      const map = new Map(prev);
      const atleta = map.get(criancaId);
      if (atleta) {
        const newIsento = !atleta.isento;
        map.set(criancaId, { 
          ...atleta, 
          isento: newIsento,
          useValorPadrao: !newIsento && atleta.valor === null,
          valor: newIsento ? null : atleta.valor,
        });
      }
      return map;
    });
  };

  const handleValorChange = (criancaId: string, value: string) => {
    setConvocacoes(prev => {
      const map = new Map(prev);
      const atleta = map.get(criancaId);
      if (atleta) {
        const numValue = value ? parseFloat(value) : null;
        map.set(criancaId, { 
          ...atleta, 
          valor: numValue,
          useValorPadrao: false,
        });
      }
      return map;
    });
  };

  const handleUseValorPadrao = (criancaId: string) => {
    setConvocacoes(prev => {
      const map = new Map(prev);
      const atleta = map.get(criancaId);
      if (atleta) {
        map.set(criancaId, { 
          ...atleta, 
          valor: null,
          useValorPadrao: true,
          isento: false,
        });
      }
      return map;
    });
  };

  const handleSave = async (enviarNotificacoes = false) => {
    const convocados = Array.from(convocacoes.values())
      .filter(a => a.convocado)
      .map(a => ({
        evento_id: eventoId,
        crianca_id: a.crianca_id,
        valor: a.isento ? null : (a.useValorPadrao ? valorPadrao : a.valor),
        isento: a.isento,
      })) as CreateAmistosoConvocacaoInput[];

    try {
      const result = await upsertConvocacoes.mutateAsync({ 
        eventoId, 
        convocacoes: convocados,
        enviarNotificacoes,
        valorPadrao,
      });
      
      if (enviarNotificacoes && result.newNotifications > 0) {
        toast.success(`${result.newNotifications} convocação(ões) enviada(s) com cobrança PIX gerada!`);
      } else {
        toast.success(`${convocados.length} atleta(s) convocado(s) com sucesso!`);
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar convocações');
    }
  };

  const pendingNotifications = useMemo(() => {
    return Array.from(convocacoes.values()).filter(a => a.convocado && !a.notificadoEm).length;
  }, [convocacoes]);

  const isLoading = loadingAthletes || loadingConvocacoes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Convocação - {eventoNome}
          </DialogTitle>
          <DialogDescription>
            Selecione os atletas que serão convocados para este jogo
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Turma Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filtrar por turma:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTurmas.map(turma => {
                  const isSelected = selectedTurmaIds.includes(turma.id);
                  const categoriaLabel = getTurmaCategoriaBadge(turma);
                  return (
                    <Button
                      key={turma.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleTurma(turma.id)}
                    >
                      {turma.nome}
                      {categoriaLabel && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{categoriaLabel}</Badge>
                      )}
                    </Button>
                  );
                })}
                {selectedTurmaIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedTurmaIds([]); setInitialized(false); }}>
                    Limpar filtro
                  </Button>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Users className="w-3.5 h-3.5" />
                  Elegíveis
                </div>
                <p className="text-xl font-bold mt-1">{convocacoes.size}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 text-primary text-xs">
                  <UserCheck className="w-3.5 h-3.5" />
                  Convocados
                </div>
                <p className="text-xl font-bold mt-1">{convocadosCount}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-600 text-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Pagos
                </div>
                <p className="text-xl font-bold mt-1">{pagosCount}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 text-xs">
                  <Gift className="w-3.5 h-3.5" />
                  Isentos
                </div>
                <p className="text-xl font-bold mt-1">{isentosCount}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 text-xs">
                  <DollarSign className="w-3.5 h-3.5" />
                  Valor Padrão
                </div>
                <p className="text-xl font-bold mt-1">
                  {valorPadrao ? `R$ ${valorPadrao.toFixed(2)}` : '-'}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Convocar</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-[80px]">Isentar</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAtletas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {convocacoes.size === 0
                          ? 'Nenhum atleta elegível encontrado para esta categoria'
                          : 'Nenhum atleta encontrado com a busca'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAtletas.map(atleta => (
                      <TableRow 
                        key={atleta.crianca_id} 
                        className={
                          atleta.status === 'recusado' 
                            ? 'bg-red-500/10' 
                            : atleta.status === 'pago' || atleta.status === 'confirmado'
                              ? 'bg-emerald-500/10' 
                              : atleta.convocado 
                                ? 'bg-primary/5' 
                                : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={atleta.convocado}
                            onCheckedChange={() => handleToggleConvocado(atleta.crianca_id)}
                            disabled={atleta.status === 'pago' || atleta.status === 'confirmado' || atleta.status === 'recusado'}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={atleta.foto_url || ''} alt={atleta.nome} />
                              <AvatarFallback className="text-xs">
                                {atleta.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{atleta.nome}</span>
                              <Badge variant="outline" className="ml-2 text-xs">{atleta.categoria}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{atleta.idade} anos</TableCell>
                        <TableCell>
                          {atleta.convocado && !atleta.isento ? (
                            atleta.status === 'pago' ? (
                              <span className="font-medium text-emerald-600">
                                R$ {(atleta.valor ?? valorPadrao ?? 0).toFixed(2)}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder={valorPadrao ? `R$ ${valorPadrao}` : 'Valor'}
                                  value={atleta.valor ?? ''}
                                  onChange={(e) => handleValorChange(atleta.crianca_id, e.target.value)}
                                  className="w-24 h-8"
                                  step="0.01"
                                  min="0"
                                />
                                {atleta.useValorPadrao && (
                                  <Badge variant="secondary" className="text-xs">
                                    Padrão
                                  </Badge>
                                )}
                              </div>
                            )
                          ) : atleta.isento ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {atleta.convocado && atleta.status !== 'pago' && atleta.status !== 'confirmado' && atleta.status !== 'recusado' ? (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`isento-${atleta.crianca_id}`}
                                checked={atleta.isento}
                                onCheckedChange={() => handleToggleIsento(atleta.crianca_id)}
                              />
                              <label 
                                htmlFor={`isento-${atleta.crianca_id}`}
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                Isentar
                              </label>
                            </div>
                          ) : atleta.convocado && atleta.isento ? (
                            <span className="text-xs text-amber-600 font-medium">Isento</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {atleta.convocado && (
                            atleta.status === 'pago' || atleta.status === 'confirmado' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirmado
                              </Badge>
                            ) : atleta.status === 'recusado' ? (
                              <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
                                Recusado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendente
                              </Badge>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {pendingNotifications > 0 
                  ? `📨 ${pendingNotifications} atleta(s) ainda não notificado(s)`
                  : '✅ Todos os convocados já foram notificados'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={upsertConvocacoes.isPending}>
                  {upsertConvocacoes.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
                <Button onClick={() => handleSave(true)} disabled={upsertConvocacoes.isPending || pendingNotifications === 0}>
                  {upsertConvocacoes.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Convocações
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
