import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  School, 
  Search,
  Plus,
  Loader2,
  Edit,
  Eye,
  Key,
  Copy,
  Check,
  LogIn,
  Calendar,
  Users,
} from 'lucide-react';
import { useAdminData, EscolinhaStatus, StatusFinanceiro, EscolaStatusFinanceiro } from '@/hooks/useAdminData';
import EscolinhaFormDialog from '@/components/admin/EscolinhaFormDialog';
import EscolinhaDetailDialog from '@/components/admin/EscolinhaDetailDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<EscolinhaStatus, string> = {
  em_teste: 'Em Teste',
  ativa: 'Ativa',
  inativa: 'Inativa',
  suspensa: 'Suspensa'
};

const statusColors: Record<EscolinhaStatus, string> = {
  em_teste: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  ativa: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  inativa: 'bg-muted text-muted-foreground border-border',
  suspensa: 'bg-destructive/10 text-destructive border-destructive/20'
};

const financeiroColors: Record<StatusFinanceiro, string> = {
  em_dia: 'bg-emerald-500/10 text-emerald-500',
  atrasado: 'bg-amber-500/10 text-amber-500',
  suspenso: 'bg-destructive/10 text-destructive'
};

const statusFinanceiroEscolaLabels: Record<EscolaStatusFinanceiro, string> = {
  NAO_CONFIGURADO: 'Não Configurado',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado'
};

const statusFinanceiroEscolaColors: Record<EscolaStatusFinanceiro, string> = {
  NAO_CONFIGURADO: 'bg-destructive/10 text-destructive border-destructive/20',
  EM_ANALISE: 'bg-destructive/10 text-destructive border-destructive/20',
  APROVADO: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REPROVADO: 'bg-destructive/10 text-destructive border-destructive/20'
};

const AdminSchoolsPage = () => {
  const { escolinhas, planos, isLoading, resetEscolinhaPassword, createEscolinhaSocio, resetEscolinhaSocioPassword } = useAdminData();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEscolinha, setSelectedEscolinha] = useState<typeof escolinhas[0] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSocioId, setCopiedSocioId] = useState<string | null>(null);

  const filteredEscolinhas = escolinhas.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_socio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email_socio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewEscolinha = (escolinha: typeof escolinhas[0]) => {
    setSelectedEscolinha(escolinha);
    setDetailDialogOpen(true);
  };

  const handleEditEscolinha = (escolinha: typeof escolinhas[0]) => {
    setSelectedEscolinha(escolinha);
    setFormDialogOpen(true);
  };

  const handleNewEscolinha = () => {
    setSelectedEscolinha(null);
    setFormDialogOpen(true);
  };

  const handleCopyPassword = (escolinha: typeof escolinhas[0]) => {
    if (escolinha.senha_temporaria) {
      navigator.clipboard.writeText(escolinha.senha_temporaria);
      setCopiedId(escolinha.id);
      toast.success('Senha copiada!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopySocioPassword = (escolinha: typeof escolinhas[0]) => {
    if (escolinha.senha_temporaria_socio) {
      navigator.clipboard.writeText(escolinha.senha_temporaria_socio);
      setCopiedSocioId(escolinha.id);
      toast.success('Senha do sócio copiada!');
      setTimeout(() => setCopiedSocioId(null), 2000);
    }
  };

  const handleResetPassword = async (escolinha: typeof escolinhas[0]) => {
    if (confirm(`Deseja resetar a senha de ${escolinha.nome_responsavel || escolinha.nome}? O usuário precisará alterar a senha no próximo login.`)) {
      await resetEscolinhaPassword.mutateAsync(escolinha.id);
    }
  };

  const handleResetSocioPassword = async (escolinha: typeof escolinhas[0]) => {
    if (confirm(`Deseja resetar a senha do sócio ${escolinha.nome_socio}? O usuário precisará alterar a senha no próximo login.`)) {
      await resetEscolinhaSocioPassword.mutateAsync(escolinha.id);
    }
  };

  const handleCreateSocioUser = async (escolinha: typeof escolinhas[0]) => {
    if (!escolinha.nome_socio || !escolinha.email_socio) {
      toast.error('O sócio precisa ter nome e email cadastrados. Edite a escolinha primeiro.');
      return;
    }
    if (confirm(`Deseja criar login para o sócio ${escolinha.nome_socio}?`)) {
      await createEscolinhaSocio.mutateAsync({
        escolinha_id: escolinha.id,
        email_socio: escolinha.email_socio,
        nome_socio: escolinha.nome_socio
      });
    }
  };

  const handleEnterAsAdmin = (escolinha: typeof escolinhas[0]) => {
    navigate(`/dashboard/school-admin?escolinhaId=${escolinha.id}`, { 
      state: { escolinhaId: escolinha.id, escolinhaNome: escolinha.nome } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escolinhas</h1>
        <p className="text-muted-foreground">Gerencie todas as escolinhas do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Escolinhas</CardTitle>
              <CardDescription>{escolinhas.length} escolinhas cadastradas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar escolinha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={handleNewEscolinha}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Escolinha
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEscolinhas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma escolinha encontrada.' : 'Nenhuma escolinha cadastrada.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEscolinhas.map((escolinha, index) => (
                <div 
                  key={escolinha.id}
                  className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header row with school name and status */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                        <School className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{escolinha.nome}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          {escolinha.alunos_ativos !== undefined && escolinha.alunos_ativos > 0 && (
                            <span className="text-primary font-medium">{escolinha.alunos_ativos} alunos ativos</span>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Cadastrado em {format(new Date(escolinha.created_at), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={statusColors[escolinha.status]}>
                        {statusLabels[escolinha.status]}
                      </Badge>
                      <Badge className={statusFinanceiroEscolaColors[escolinha.status_financeiro_escola]}>
                        {statusFinanceiroEscolaLabels[escolinha.status_financeiro_escola]}
                      </Badge>
                      {escolinha.financeiro && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            R$ {escolinha.financeiro.plano?.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                          </Badge>
                          {escolinha.financeiro.plano && (
                            <span className="text-xs font-medium text-muted-foreground">{escolinha.financeiro.plano.nome}</span>
                          )}
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEnterAsAdmin(escolinha)}
                        title="Entrar como Admin"
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleViewEscolinha(escolinha)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditEscolinha(escolinha)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Responsáveis section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
                    {/* Responsável Principal */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                        <Users className="w-3 h-3" />
                        Responsável 1
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground/90 text-sm">
                          {escolinha.nome_responsavel || 'Não informado'}
                        </span>
                        {escolinha.telefone && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{escolinha.telefone}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {escolinha.email || 'Sem e-mail'}
                      </div>
                      
                      {/* Password and actions for main admin */}
                      <div className="flex items-center gap-2 mt-1">
                        {escolinha.admin_user_id && escolinha.senha_temporaria_ativa && escolinha.senha_temporaria && (
                          <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                            <Key className="w-3 h-3 text-amber-500" />
                            <code className="text-xs font-mono text-amber-600">{escolinha.senha_temporaria}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleCopyPassword(escolinha)}
                            >
                              {copiedId === escolinha.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        )}
                        {escolinha.admin_user_id && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResetPassword(escolinha)}
                            disabled={resetEscolinhaPassword.isPending}
                          >
                            <Key className="w-3 h-3 mr-1" />
                            Resetar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Sócio (Responsável 2) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                        <Users className="w-3 h-3" />
                        Responsável 2 (Sócio)
                      </div>
                      {escolinha.nome_socio ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground/90 text-sm">
                              {escolinha.nome_socio}
                            </span>
                            {escolinha.telefone_socio && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">{escolinha.telefone_socio}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {escolinha.email_socio || 'Sem e-mail'}
                          </div>
                          
                          {/* Password and actions for socio */}
                          <div className="flex items-center gap-2 mt-1">
                            {escolinha.socio_user_id && escolinha.senha_temporaria_socio_ativa && escolinha.senha_temporaria_socio && (
                              <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                                <Key className="w-3 h-3 text-amber-500" />
                                <code className="text-xs font-mono text-amber-600">{escolinha.senha_temporaria_socio}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleCopySocioPassword(escolinha)}
                                >
                                  {copiedSocioId === escolinha.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {escolinha.socio_user_id ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleResetSocioPassword(escolinha)}
                                disabled={resetEscolinhaSocioPassword.isPending}
                              >
                                <Key className="w-3 h-3 mr-1" />
                                Resetar
                              </Button>
                            ) : escolinha.email_socio && (
                              <Button 
                                variant="default" 
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleCreateSocioUser(escolinha)}
                                disabled={createEscolinhaSocio.isPending}
                              >
                                <Key className="w-3 h-3 mr-1" />
                                Criar Login
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Nenhum sócio cadastrado
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EscolinhaFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        escolinha={selectedEscolinha}
        planos={planos}
      />

      <EscolinhaDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        escolinha={selectedEscolinha}
      />
    </div>
  );
};

export default AdminSchoolsPage;
