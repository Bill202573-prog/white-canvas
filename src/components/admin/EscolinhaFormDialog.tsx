import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Escolinha, EscolinhaStatus, PlanoSaas, useAdminData } from '@/hooks/useAdminData';
import { Loader2 } from 'lucide-react';

interface EscolinhaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolinha?: Escolinha | null;
  planos: PlanoSaas[];
}

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const EscolinhaFormDialog = ({ open, onOpenChange, escolinha, planos }: EscolinhaFormDialogProps) => {
  const { createEscolinha, updateEscolinha, createEscolinhaAdmin } = useAdminData();
  const isEditing = !!escolinha;

  const [formData, setFormData] = useState({
    nome: '',
    tipo_documento: 'cnpj' as 'cpf' | 'cnpj',
    documento: '',
    nome_responsavel: '',
    email: '',
    telefone: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    status: 'em_teste' as EscolinhaStatus,
    plano_id: '',
    // Second partner (sócio) fields
    nome_socio: '',
    email_socio: '',
    telefone_socio: ''
  });

  useEffect(() => {
    if (escolinha) {
      setFormData({
        nome: escolinha.nome || '',
        tipo_documento: escolinha.tipo_documento || 'cnpj',
        documento: escolinha.documento || '',
        nome_responsavel: escolinha.nome_responsavel || '',
        email: escolinha.email || '',
        telefone: escolinha.telefone || '',
        rua: escolinha.rua || '',
        numero: escolinha.numero || '',
        bairro: escolinha.bairro || '',
        cidade: escolinha.cidade || '',
        estado: escolinha.estado || '',
        cep: escolinha.cep || '',
        status: escolinha.status || 'em_teste',
        plano_id: escolinha.financeiro?.plano_id || '',
        nome_socio: escolinha.nome_socio || '',
        email_socio: escolinha.email_socio || '',
        telefone_socio: escolinha.telefone_socio || ''
      });
    } else {
      setFormData({
        nome: '',
        tipo_documento: 'cnpj',
        documento: '',
        nome_responsavel: '',
        email: '',
        telefone: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        status: 'em_teste',
        plano_id: '',
        nome_socio: '',
        email_socio: '',
        telefone_socio: ''
      });
    }
  }, [escolinha, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      ativo: formData.status === 'ativa'
    };

    if (isEditing && escolinha) {
      await updateEscolinha.mutateAsync({ id: escolinha.id, data: dataToSave });
    } else {
      // Create escolinha first
      const newEscolinha = await createEscolinha.mutateAsync(dataToSave);
      
      // Auto-create admin user if email and nome_responsavel are provided
      if (formData.email && formData.nome_responsavel && newEscolinha) {
        try {
          await createEscolinhaAdmin.mutateAsync({
            escolinha_id: newEscolinha.id,
            email: formData.email,
            nome_responsavel: formData.nome_responsavel
          });
        } catch (error) {
          console.error('Error creating admin user:', error);
        }
      }
    }
    
    onOpenChange(false);
  };

  const isPending = createEscolinha.isPending || updateEscolinha.isPending || createEscolinhaAdmin.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Escolinha' : 'Nova Escolinha'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="nome">Nome da Escolinha *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_documento: v as 'cpf' | 'cnpj' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documento">{formData.tipo_documento === 'cpf' ? 'CPF' : 'CNPJ'} *</Label>
              <Input
                id="documento"
                value={formData.documento}
                onChange={(e) => setFormData(prev => ({ ...prev, documento: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="nome_responsavel">Nome do Responsável Legal *</Label>
              <Input
                id="nome_responsavel"
                value={formData.nome_responsavel}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_responsavel: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail Principal *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as EscolinhaStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_teste">Em Teste</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                </SelectContent>
            </Select>
            </div>
          </div>

          {/* Second Partner (Sócio) */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Segundo Responsável (Sócio) - Opcional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome_socio">Nome do Sócio</Label>
                <Input
                  id="nome_socio"
                  value={formData.nome_socio}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_socio: e.target.value }))}
                  placeholder="Deixe em branco se não houver sócio"
                />
              </div>

              <div>
                <Label htmlFor="email_socio">E-mail do Sócio</Label>
                <Input
                  id="email_socio"
                  type="email"
                  value={formData.email_socio}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_socio: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="telefone_socio">Telefone do Sócio</Label>
                <Input
                  id="telefone_socio"
                  value={formData.telefone_socio}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone_socio: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={formData.rua}
                  onChange={(e) => setFormData(prev => ({ ...prev, rua: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, estado: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasil.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Plano SaaS</h3>
            <div>
              <Label htmlFor="plano">Plano Contratado</Label>
              <Select
                value={formData.plano_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, plano_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {planos.map(plano => (
                    <SelectItem key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {plano.valor_mensal.toFixed(2)} 
                      ({plano.min_alunos} a {plano.max_alunos || '∞'} alunos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Escolinha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EscolinhaFormDialog;
