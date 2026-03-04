import { useState, useEffect } from 'react';
import { useSchoolIndicacoes, useUpdateIndicacaoStatus, Indicacao } from '@/hooks/useIndicacoesData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Users, MoreVertical, Phone, Search, Filter, MessageCircle, Settings, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type IndicacaoStatus = Database['public']['Enums']['indicacao_status'];

const statusLabels: Record<IndicacaoStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  matriculado: 'Matriculado',
  nao_convertido: 'Não Convertido',
};

const statusColors: Record<IndicacaoStatus, string> = {
  novo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  contatado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  matriculado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  nao_convertido: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const IndicacoesManagement = () => {
  const { user } = useAuth();
  const { data: indicacoes = [], isLoading } = useSchoolIndicacoes();
  const updateStatus = useUpdateIndicacaoStatus();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [whatsappIndicacoes, setWhatsappIndicacoes] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  // Load WhatsApp number from escolinha
  useEffect(() => {
    const fetchWhatsApp = async () => {
      if (!user?.escolinhaId) return;
      
      const { data, error } = await supabase
        .from('escolinhas')
        .select('whatsapp_indicacoes')
        .eq('id', user.escolinhaId)
        .single();
      
      if (data?.whatsapp_indicacoes) {
        setWhatsappIndicacoes(data.whatsapp_indicacoes);
        setWhatsappInput(data.whatsapp_indicacoes);
      }
    };
    
    fetchWhatsApp();
  }, [user?.escolinhaId]);

  const handleStatusChange = (id: string, newStatus: IndicacaoStatus) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  const handleSaveWhatsApp = async () => {
    if (!user?.escolinhaId) return;
    
    // Validate phone number (only digits, min 10, max 11)
    const cleanPhone = whatsappInput.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast.error('Telefone inválido. Use DDD + número (10 ou 11 dígitos)');
      return;
    }
    
    setSavingWhatsapp(true);
    
    const { error } = await supabase
      .from('escolinhas')
      .update({ whatsapp_indicacoes: cleanPhone })
      .eq('id', user.escolinhaId);
    
    setSavingWhatsapp(false);
    
    if (error) {
      toast.error('Erro ao salvar WhatsApp');
      return;
    }
    
    setWhatsappIndicacoes(cleanPhone);
    setShowWhatsAppConfig(false);
    toast.success('WhatsApp configurado com sucesso!');
  };

  const openWhatsApp = (indicacao: Indicacao) => {
    // Use the school's configured WhatsApp number
    if (!whatsappIndicacoes) {
      toast.error('Configure o WhatsApp da escola primeiro');
      setShowWhatsAppConfig(true);
      return;
    }
    
    // Clean the phone number
    const cleanPhone = whatsappIndicacoes.replace(/\D/g, '');
    // Add Brazil country code if not present
    const phoneWithCode = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Pre-filled message
    const message = encodeURIComponent(
      `Olá! Recebemos a indicação de um novo aluno e gostaríamos de conversar 😊\n\n` +
      `📋 *Dados da indicação:*\n` +
      `• Indicado por: ${indicacao.nome_pai_indicador}\n` +
      `• Responsável: ${indicacao.nome_responsavel_indicado}\n` +
      `• Criança: ${indicacao.nome_crianca} (${indicacao.idade_crianca} anos)\n` +
      `• Telefone: ${indicacao.telefone_responsavel_indicado}`
    );
    
    window.open(`https://wa.me/${phoneWithCode}?text=${message}`, '_blank');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Filter indicacoes
  const filteredIndicacoes = indicacoes.filter((indicacao) => {
    const matchesSearch = 
      indicacao.nome_responsavel_indicado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicacao.nome_crianca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indicacao.nome_pai_indicador.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || indicacao.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: indicacoes.length,
    novos: indicacoes.filter(i => i.status === 'novo').length,
    contatados: indicacoes.filter(i => i.status === 'contatado').length,
    matriculados: indicacoes.filter(i => i.status === 'matriculado').length,
    naoConvertidos: indicacoes.filter(i => i.status === 'nao_convertido').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicações</h1>
          <p className="text-muted-foreground">
            Gerencie as indicações recebidas de pais de alunos
          </p>
        </div>
        
        {/* WhatsApp Config Button */}
        <Button 
          variant="outline" 
          onClick={() => setShowWhatsAppConfig(true)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          {whatsappIndicacoes ? (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-600" />
              WhatsApp configurado
            </span>
          ) : (
            'Configurar WhatsApp'
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.novos}</div>
            <div className="text-xs text-muted-foreground">Novos</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.contatados}</div>
            <div className="text-xs text-muted-foreground">Contatados</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.matriculados}</div>
            <div className="text-xs text-muted-foreground">Matriculados</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.naoConvertidos}</div>
            <div className="text-xs text-muted-foreground">Não Convertidos</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">Novos</SelectItem>
                <SelectItem value="contatado">Contatados</SelectItem>
                <SelectItem value="matriculado">Matriculados</SelectItem>
                <SelectItem value="nao_convertido">Não Convertidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Indicações
          </CardTitle>
          <CardDescription>
            {filteredIndicacoes.length} indicaç{filteredIndicacoes.length === 1 ? 'ão' : 'ões'} encontrada{filteredIndicacoes.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIndicacoes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {indicacoes.length === 0 
                  ? 'Nenhuma indicação recebida ainda'
                  : 'Nenhuma indicação encontrada com os filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Indicado por</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Criança</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndicacoes.map((indicacao) => (
                    <TableRow key={indicacao.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(indicacao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{indicacao.nome_pai_indicador}</TableCell>
                      <TableCell className="font-medium">{indicacao.nome_responsavel_indicado}</TableCell>
                      <TableCell>{indicacao.nome_crianca}</TableCell>
                      <TableCell>{indicacao.idade_crianca} anos</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {indicacao.telefone_responsavel_indicado}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[indicacao.status]}>
                          {statusLabels[indicacao.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* WhatsApp Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openWhatsApp(indicacao)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            title="Falar no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          
                          {/* Status Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(indicacao.id, 'contatado')}
                                disabled={indicacao.status === 'contatado'}
                              >
                                Marcar como Contatado
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(indicacao.id, 'matriculado')}
                                disabled={indicacao.status === 'matriculado'}
                                className="text-green-600"
                              >
                                Marcar como Matriculado
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(indicacao.id, 'nao_convertido')}
                                disabled={indicacao.status === 'nao_convertido'}
                                className="text-red-600"
                              >
                                Marcar como Não Convertido
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Config Dialog */}
      <Dialog open={showWhatsAppConfig} onOpenChange={setShowWhatsAppConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp para Indicações
            </DialogTitle>
            <DialogDescription>
              Configure o número de WhatsApp que será usado para entrar em contato com os pais indicados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone WhatsApp (com DDD)</label>
              <Input
                placeholder="(11) 99999-9999"
                value={formatPhone(whatsappInput)}
                onChange={(e) => setWhatsappInput(e.target.value.replace(/\D/g, ''))}
                maxLength={16}
              />
              <p className="text-xs text-muted-foreground">
                Este número será usado para iniciar conversas sobre novas indicações.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppConfig(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveWhatsApp} 
              disabled={savingWhatsapp || !whatsappInput}
              className="gap-2"
            >
              {savingWhatsapp && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndicacoesManagement;