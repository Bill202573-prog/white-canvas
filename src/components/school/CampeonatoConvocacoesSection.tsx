import { useState, useMemo, useEffect } from 'react';
import { differenceInYears } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Search, Users, Loader2, Save, UserCheck, DollarSign, Gift, Send, Check, X, Clock, BadgeDollarSign, Filter } from 'lucide-react';
import {
  useEligibleAthletes,
  useCampeonatoConvocacoes,
  useUpsertConvocacoes,
  type CreateConvocacaoInput,
} from '@/hooks/useCampeonatoConvocacoesData';
import { useSchoolTurmas, getTurmaCategoriaBadge } from '@/hooks/useSchoolData';

interface CampeonatoConvocacoesSectionProps {
  campeonatoId: string;
  escolinhaId: string;
  categoria: string | null;
  valorCampeonato: number | null;
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
  status: string | null; // pago, recusado, aguardando_pagamento, etc.
}

export function CampeonatoConvocacoesSection({
  campeonatoId,
  escolinhaId,
  categoria,
  valorCampeonato,
}: CampeonatoConvocacoesSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [convocacoes, setConvocacoes] = useState<Map<string, AtletaConvocacao>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);

  const { data: turmas = [] } = useSchoolTurmas();
  const activeTurmas = useMemo(() => turmas.filter(t => t.ativo), [turmas]);

  const toggleTurma = (turmaId: string) => {
    setSelectedTurmaIds(prev =>
      prev.includes(turmaId) ? prev.filter(id => id !== turmaId) : [...prev, turmaId]
    );
    setInitialized(false);
  };

  const { data: eligibleAthletes, isLoading: loadingAthletes } = useEligibleAthletes(
    selectedTurmaIds.length > 0 ? null : categoria,
    escolinhaId,
    selectedTurmaIds.length > 0 ? selectedTurmaIds : undefined,
  );
  const { data: existingConvocacoes, isLoading: loadingConvocacoes } = useCampeonatoConvocacoes(campeonatoId);
  const upsertConvocacoes = useUpsertConvocacoes();

  // Initialize convocacoes state from existing data and eligible athletes
  // Re-sync when existingConvocacoes changes (e.g., after payment confirmation)
  useEffect(() => {
    if (!eligibleAthletes) return;

    const map = new Map<string, AtletaConvocacao>();

    // First, add all eligible athletes as not convocado
    eligibleAthletes.forEach(atleta => {
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
        status: null,
      });
    });

    // Then, update with existing convocacoes
    if (existingConvocacoes) {
      existingConvocacoes.forEach(conv => {
        const existing = map.get(conv.crianca_id);
        // Get the status from the server data
        const serverStatus = conv.status;
        const serverIsento = conv.isento;
        const serverValor = conv.valor;
        
        if (existing) {
          map.set(conv.crianca_id, {
            ...existing,
            convocado: true,
            valor: serverValor,
            isento: serverIsento,
            useValorPadrao: serverValor === null && !serverIsento,
            status: serverStatus,
          });
        } else if (conv.crianca) {
          // Atleta was convocado but might not be in eligible list anymore
          const birthDate = new Date(conv.crianca.data_nascimento);
          const idade = differenceInYears(new Date(), birthDate);
          map.set(conv.crianca_id, {
            crianca_id: conv.crianca_id,
            nome: conv.crianca.nome,
            idade,
            categoria: categoria || 'Livre',
            foto_url: conv.crianca.foto_url,
            convocado: true,
            valor: serverValor,
            isento: serverIsento,
            useValorPadrao: serverValor === null && !serverIsento,
            status: serverStatus,
          });
        }
      });
    }

    setConvocacoes(map);
    setInitialized(true);
  }, [eligibleAthletes, existingConvocacoes, categoria]);

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

  const isentosCount = useMemo(() => {
    return Array.from(convocacoes.values()).filter(a => a.convocado && a.isento).length;
  }, [convocacoes]);

  // Stats for status breakdown
  // "Confirmados" = pago OR confirmado (paying = confirming)
  const statusCounts = useMemo(() => {
    const values = Array.from(convocacoes.values()).filter(a => a.convocado);
    return {
      confirmados: values.filter(a => a.status === 'pago' || a.status === 'confirmado').length,
      recusado: values.filter(a => a.status === 'recusado').length,
      aguardando: values.filter(a => a.status === 'aguardando_pagamento').length,
    };
  }, [convocacoes]);

  const valorPagoTotal = useMemo(() => {
    const pagosList = Array.from(convocacoes.values())
      .filter(a => a.convocado && (a.status === 'pago' || a.status === 'confirmado'));
    
    return pagosList.reduce((total, a) => {
      const valor = a.valor ?? valorCampeonato ?? 0;
      return total + valor;
    }, 0);
  }, [convocacoes, valorCampeonato]);

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

  const handleSave = async (sendNotifications: boolean = false) => {
    const convocados = Array.from(convocacoes.values())
      .filter(a => a.convocado)
      .map(a => ({
        campeonato_id: campeonatoId,
        crianca_id: a.crianca_id,
        // Use valor padrão do campeonato quando useValorPadrao é true
        valor: a.isento ? null : (a.useValorPadrao ? valorCampeonato : a.valor),
        isento: a.isento,
      })) as CreateConvocacaoInput[];

    try {
      const result = await upsertConvocacoes.mutateAsync({ 
        campeonatoId, 
        convocacoes: convocados,
        sendNotifications,
      });
      
      if (sendNotifications) {
        toast.success(`Convocações enviadas! ${result.inserted} atletas notificados.`);
      } else {
        toast.success(`${convocados.length} atleta(s) convocado(s) com sucesso!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar convocações');
    }
  };

  // Count how many new (not notified) athletes are being convoked
  const newConvocadosCount = useMemo(() => {
    if (!existingConvocacoes) return convocadosCount;
    
    const notifiedIds = new Set(
      existingConvocacoes
        .filter(c => c.notificado_em)
        .map(c => c.crianca_id)
    );
    
    return Array.from(convocacoes.values())
      .filter(a => a.convocado && !notifiedIds.has(a.crianca_id))
      .length;
  }, [convocacoes, existingConvocacoes, convocadosCount]);

  const isLoading = loadingAthletes || loadingConvocacoes;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Convocações
            </CardTitle>
            <CardDescription>
              Selecione os atletas que serão convocados para este campeonato
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline" 
              onClick={() => handleSave(false)} 
              disabled={upsertConvocacoes.isPending}
            >
              {upsertConvocacoes.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Rascunho
            </Button>
            <Button 
              onClick={() => handleSave(true)} 
              disabled={upsertConvocacoes.isPending || newConvocadosCount === 0}
            >
              {upsertConvocacoes.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Convocações
              {newConvocadosCount > 0 && (
                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {newConvocadosCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats - Row 1: Convocação */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              Elegíveis
            </div>
            <p className="text-2xl font-bold mt-1">{convocacoes.size}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 text-primary text-sm">
              <UserCheck className="w-4 h-4" />
              Convocados
            </div>
            <p className="text-2xl font-bold mt-1">{convocadosCount}</p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <DollarSign className="w-4 h-4" />
              Valor Padrão
            </div>
            <p className="text-2xl font-bold mt-1">
              {valorCampeonato ? `R$ ${valorCampeonato.toFixed(2)}` : 'Não definido'}
            </p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <Gift className="w-4 h-4" />
              Isentos
            </div>
            <p className="text-2xl font-bold mt-1">{isentosCount}</p>
          </div>
        </div>

        {/* Stats - Row 2: Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <BadgeDollarSign className="w-4 h-4" />
              Valor Confirmado
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-700">
              R$ {valorPagoTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <Check className="w-4 h-4" />
              Confirmados
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.confirmados}</p>
          </div>
          <div className="p-4 bg-red-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <X className="w-4 h-4" />
              Recusados
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.recusado}</p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <Clock className="w-4 h-4" />
              Aguardando
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.aguardando}</p>
          </div>
        </div>

        {/* Turma Filter */}
        <div className="mb-4">
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atleta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Convocar</TableHead>
                <TableHead>Atleta</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-[80px]">Isento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAtletas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        : (atleta.status === 'pago' || atleta.status === 'confirmado')
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
                        <span className="font-medium">{atleta.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{atleta.idade} anos</TableCell>
                    <TableCell>
                      <Badge variant="outline">{atleta.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      {atleta.convocado && !atleta.isento ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder={valorCampeonato ? `R$ ${valorCampeonato}` : 'Valor'}
                            value={atleta.valor ?? ''}
                            onChange={(e) => handleValorChange(atleta.crianca_id, e.target.value)}
                            className="w-28 h-8"
                            step="0.01"
                            min="0"
                          />
                          {!atleta.useValorPadrao && atleta.valor !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleUseValorPadrao(atleta.crianca_id)}
                            >
                              Usar padrão
                            </Button>
                          )}
                          {atleta.useValorPadrao && (
                            <Badge variant="secondary" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      ) : atleta.isento ? (
                        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                          Isento
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {atleta.convocado && (
                        <Checkbox
                          checked={atleta.isento}
                          onCheckedChange={() => handleToggleIsento(atleta.crianca_id)}
                          disabled={atleta.status === 'pago' || atleta.status === 'recusado'}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {(atleta.status === 'pago' || atleta.status === 'confirmado') ? (
                        <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                          Confirmado
                        </Badge>
                      ) : atleta.status === 'recusado' ? (
                        <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
                          Recusado
                        </Badge>
                      ) : atleta.status === 'aguardando_pagamento' ? (
                        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                          Aguardando
                        </Badge>
                      ) : atleta.convocado ? (
                        <Badge variant="secondary">Pendente</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            💡 <strong>Valor padrão:</strong> Se deixar o campo de valor em branco, será usado o valor padrão do campeonato (R$ {valorCampeonato?.toFixed(2) || '0,00'}).
          </p>
          <p className="mt-1">
            💡 <strong>Isenção:</strong> Atletas isentos não terão cobrança gerada futuramente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
