import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAlunoHistorico } from '@/hooks/useAlunoHistoricoData';
import { 
  Trophy, 
  Target,
  Medal,
  Loader2,
  Award,
  Filter,
} from 'lucide-react';

interface DesempenhoTabProps {
  criancaId: string;
  childName: string;
}

const MESES = [
  { value: 'all', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const DesempenhoTab = ({ criancaId, childName }: DesempenhoTabProps) => {
  const { data: eventosData, isLoading } = useAlunoHistorico(criancaId);
  
  const [mesSelecionado, setMesSelecionado] = useState('all');
  const [anoSelecionado, setAnoSelecionado] = useState('all');

  // Get available years from data
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    eventosData?.eventos.forEach(e => {
      const ano = new Date(e.data).getFullYear().toString();
      anos.add(ano);
    });
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [eventosData?.eventos]);

  // Filter eventos by month/year
  const eventosFiltrados = useMemo(() => {
    if (!eventosData?.eventos) return [];
    return eventosData.eventos.filter(e => {
      const date = new Date(e.data);
      const matchMes = mesSelecionado === 'all' || (date.getMonth() + 1).toString() === mesSelecionado;
      const matchAno = anoSelecionado === 'all' || date.getFullYear().toString() === anoSelecionado;
      return matchMes && matchAno;
    });
  }, [eventosData?.eventos, mesSelecionado, anoSelecionado]);

  // Calculate filtered stats for eventos
  const statsFiltrados = useMemo(() => {
    const amistosos = eventosFiltrados.filter(e => e.tipo === 'amistoso');
    const campeonatos = eventosFiltrados.filter(e => e.tipo === 'campeonato');
    
    return {
      totalEventos: eventosFiltrados.length,
      totalGols: eventosFiltrados.reduce((acc, e) => acc + e.golsMarcados, 0),
      golsAmistosos: amistosos.reduce((acc, e) => acc + e.golsMarcados, 0),
      golsCampeonatos: campeonatos.reduce((acc, e) => acc + e.golsMarcados, 0),
      totalPremiacoes: eventosFiltrados.reduce((acc, e) => acc + e.premiacoes.length, 0),
      vitorias: eventosFiltrados.filter(e => e.resultado === 'vitoria').length,
      empates: eventosFiltrados.filter(e => e.resultado === 'empate').length,
      derrotas: eventosFiltrados.filter(e => e.resultado === 'derrota').length,
      totalAmistosos: amistosos.length,
      totalCampeonatos: campeonatos.length,
    };
  }, [eventosFiltrados]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(mes => (
                  <SelectItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {anosDisponiveis.map(ano => (
                  <SelectItem key={ano} value={ano}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Gols */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            Gols Marcados
          </CardTitle>
          <CardDescription className="text-xs">
            Detalhamento por tipo de evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-foreground">{statsFiltrados.totalGols}</p>
            <p className="text-xs text-muted-foreground">gols no total</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-600">{statsFiltrados.golsAmistosos}</p>
              <p className="text-xs text-muted-foreground">em amistosos</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {statsFiltrados.totalAmistosos} jogos
              </Badge>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/20">
              <p className="text-2xl font-bold text-purple-600">{statsFiltrados.golsCampeonatos}</p>
              <p className="text-xs text-muted-foreground">em campeonatos</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {statsFiltrados.totalCampeonatos} jogos
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
          <CardContent className="p-4 text-center">
            <Medal className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-3xl font-bold text-foreground">{statsFiltrados.totalEventos}</p>
            <p className="text-xs text-muted-foreground">Jogos disputados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <p className="text-3xl font-bold text-foreground">{statsFiltrados.totalPremiacoes}</p>
            <p className="text-xs text-muted-foreground">Premiações</p>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Resultados
          </CardTitle>
          <CardDescription className="text-xs">
            Performance de {childName.split(' ')[0]} nos jogos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around">
            <div className="text-center">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 mb-1">
                V
              </Badge>
              <p className="text-2xl font-bold text-success">{statsFiltrados.vitorias}</p>
              <p className="text-xs text-muted-foreground">Vitórias</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="bg-muted mb-1">
                E
              </Badge>
              <p className="text-2xl font-bold text-muted-foreground">{statsFiltrados.empates}</p>
              <p className="text-xs text-muted-foreground">Empates</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 mb-1">
                D
              </Badge>
              <p className="text-2xl font-bold text-destructive">{statsFiltrados.derrotas}</p>
              <p className="text-xs text-muted-foreground">Derrotas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premiações Recentes */}
      {eventosFiltrados.filter(e => e.premiacoes.length > 0).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              Premiações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventosFiltrados
              .filter(e => e.premiacoes.length > 0)
              .slice(0, 5)
              .map(evento => (
                <div key={evento.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{evento.nome}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {evento.tipo === 'campeonato' ? 'Campeonato' : 'Amistoso'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evento.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {evento.premiacoes.map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.tipo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DesempenhoTab;
