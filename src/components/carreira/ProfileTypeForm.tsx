import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Upload, Lock, Plus, Trash2 } from 'lucide-react';
import type { ProfileType } from './ProfileTypeSelector';
import { validateCPF, formatCPF, cleanCPF } from '@/lib/cpf-validator';
import { validateCNPJ, formatCNPJ } from '@/lib/cnpj-validator';

interface Props {
  type: ProfileType;
  userId: string;
  defaultName: string;
  inviteCode: string | null;
  onBack: () => void;
  onComplete: () => void;
}

// Field definitions per profile type
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  isProfileField?: boolean; // goes to perfis_rede columns directly
}

const CATEGORIAS = ['Sub-5', 'Sub-7', 'Sub-9', 'Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Profissional'];
const POSICOES = ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Atacante'];

function getFields(type: ProfileType): FieldDef[] {
  const common: FieldDef[] = [
    { key: 'bio', label: 'Bio / Apresentação', type: 'textarea', placeholder: 'Conte um pouco sobre você...', isProfileField: true },
    { key: 'instagram', label: 'Instagram', type: 'text', placeholder: '@seuusuario', isProfileField: true },
  ];

  switch (type) {
    case 'professor':
      return [
        { key: 'especialidade', label: 'Especialidade', type: 'select', required: true, options: ['Preparação Física', 'Técnico de Futebol', 'Goleiros', 'Tático', 'Coordenação Motora', 'Outro'] },
        { key: 'modalidade', label: 'Modalidade Principal', type: 'select', required: true, options: ['Futebol', 'Futsal', 'Society', 'Beach Soccer', 'Outro'] },
        { key: 'categorias', label: 'Categorias que trabalha', type: 'multiselect', required: true, options: CATEGORIAS },
        { key: 'certificacoes', label: 'Certificações / Cursos', type: 'textarea', placeholder: 'Liste suas certificações...' },
        { key: 'experiencia', label: 'Experiência Profissional', type: 'textarea', placeholder: 'Descreva sua experiência...' },
        ...common,
      ];
    case 'tecnico':
      return [
        { key: 'clube_atual', label: 'Clube / Organização Atual', type: 'text', required: true, placeholder: 'Ex: Flamengo Sub-15' },
        { key: 'categorias', label: 'Categorias de Interesse', type: 'multiselect', required: true, options: CATEGORIAS },
        { key: 'posicoes', label: 'Posições que mais observa', type: 'multiselect', required: true, options: POSICOES },
        { key: 'licencas', label: 'Licenças / Certificações', type: 'textarea', placeholder: 'Ex: CBF Pro, UEFA B...' },
        { key: 'historico', label: 'Histórico Profissional', type: 'textarea' },
        ...common,
      ];
    case 'dono_escola':
      return [
        { key: 'nome_escola', label: 'Nome da Escolinha / Clube', type: 'text', required: true, placeholder: 'Ex: Escola de Futebol Gol de Placa' },
        { key: 'localizacao', label: 'Localização (Cidade, Estado)', type: 'text', required: true, placeholder: 'Ex: São Paulo, SP' },
        { key: 'modalidades', label: 'Modalidades Oferecidas', type: 'multiselect', required: true, options: ['Futebol', 'Futsal', 'Society', 'Beach Soccer', 'Vôlei', 'Basquete'] },
        { key: 'categorias', label: 'Categorias Atendidas', type: 'multiselect', options: CATEGORIAS },
        { key: 'site', label: 'Site', type: 'text', placeholder: 'https://...' },
        ...common,
      ];
    case 'preparador_fisico':
      return [
        { key: 'especialidade', label: 'Especialidade', type: 'select', required: true, options: ['Força', 'Resistência', 'Reabilitação', 'Funcional', 'Velocidade', 'Outro'] },
        { key: 'areas_atuacao', label: 'Áreas de Atuação', type: 'multiselect', required: true, options: ['Atletas de Base', 'Profissional', 'Amador', 'Reabilitação'] },
        { key: 'cref', label: 'CREF', type: 'text', placeholder: 'Número do CREF' },
        { key: 'formacao', label: 'Formação Acadêmica', type: 'textarea' },
        { key: 'certificacoes', label: 'Certificações', type: 'textarea' },
        ...common,
      ];
    case 'empresario':
      return [
        { key: 'empresa', label: 'Empresa / Agência', type: 'text', required: true, placeholder: 'Nome da empresa' },
        { key: 'areas_atuacao', label: 'Áreas de Atuação', type: 'multiselect', required: true, options: ['Representação', 'Marketing Esportivo', 'Assessoria de Carreira', 'Direitos de Imagem', 'Outro'] },
        { key: 'credenciais', label: 'Credenciais / Licenças', type: 'textarea' },
        { key: 'site', label: 'Site / Contato', type: 'text' },
        ...common,
      ];
    case 'influenciador':
      return [
        { key: 'nicho', label: 'Nicho / Especialidade', type: 'select', required: true, options: ['Análise Tática', 'Treinos', 'Motivação', 'Bastidores', 'Humor', 'Notícias', 'Outro'] },
        { key: 'rede_principal', label: 'Principal Rede Social', type: 'select', required: true, options: ['Instagram', 'YouTube', 'TikTok', 'Twitter/X'] },
        { key: 'arroba', label: '@ da Rede Social', type: 'text', required: true, placeholder: '@seuusuario' },
        { key: 'outras_redes', label: 'Outras Redes Sociais', type: 'textarea', placeholder: 'YouTube: ...\nTikTok: ...' },
        ...common,
      ];
    case 'atleta_filho':
      return [
        { key: 'localizacao', label: 'Localização', type: 'text', placeholder: 'Cidade, Estado' },
        ...common,
      ];
    case 'scout':
      return [
        { key: 'especialidade', label: 'Especialidade', type: 'select', required: true, options: ['Futebol de Base', 'Profissional', 'Internacional', 'Feminino', 'Outro'] },
        { key: 'regioes', label: 'Regiões de Atuação', type: 'text', required: true, placeholder: 'Ex: SP, RJ, MG' },
        { key: 'clubes_anteriores', label: 'Clubes com quem já trabalhou', type: 'textarea' },
        { key: 'categorias', label: 'Categorias de Interesse', type: 'multiselect', options: CATEGORIAS },
        { key: 'posicoes', label: 'Posições que mais busca', type: 'multiselect', options: POSICOES },
        ...common,
      ];
    case 'agente_clube':
      return [
        { key: 'clube', label: 'Qual clube você representa?', type: 'text', required: true, placeholder: 'Ex: Santos FC' },
        { key: 'categorias', label: 'Categorias que observa', type: 'multiselect', required: true, options: CATEGORIAS },
        { key: 'posicoes', label: 'Posições de Interesse', type: 'multiselect', required: true, options: POSICOES },
        { key: 'tempo_clube', label: 'Tempo no Clube', type: 'text', placeholder: 'Ex: 3 anos' },
        { key: 'contato', label: 'Contato Profissional', type: 'text' },
        ...common,
      ];
    case 'fotografo':
      return [
        { key: 'especialidade', label: 'Especialidade', type: 'select', required: true, options: ['Esportes', 'Eventos Esportivos', 'Retratos de Atletas', 'Cobertura de Campeonatos', 'Outro'] },
        { key: 'regiao', label: 'Região de Atuação', type: 'text', required: true, placeholder: 'Cidade, Estado' },
        { key: 'portfolio', label: 'Portfólio (link)', type: 'text', placeholder: 'https://...' },
        { key: 'site_whatsapp', label: 'Site / WhatsApp', type: 'text' },
        ...common,
      ];
  }
}

const TYPE_LABELS: Record<ProfileType, string> = {
  professor: 'Professor / Treinador',
  tecnico: 'Técnico de Futebol',
  dono_escola: 'Dono de Escola',
  preparador_fisico: 'Preparador Físico',
  empresario: 'Empresário',
  influenciador: 'Influenciador',
  atleta_filho: 'Atleta (meu filho)',
  scout: 'Scout',
  agente_clube: 'Agente de Clube',
  fotografo: 'Fotógrafo',
};

interface Unidade {
  nome: string;
  bairro: string;
  referencia: string;
}

const EMPTY_UNIDADE: Unidade = { nome: '', bairro: '', referencia: '' };

export function ProfileTypeForm({ type, userId, defaultName, inviteCode, onBack, onComplete }: Props) {
  const fields = getFields(type);
  const [nome, setNome] = useState(defaultName || '');
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<'cpf' | 'cnpj'>('cpf');
  const [documento, setDocumento] = useState('');
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('');
  const [unidades, setUnidades] = useState<Unidade[]>([]);

  const isDono = type === 'dono_escola';

  const addUnidade = useCallback(() => {
    if (unidades.length < 5) setUnidades(prev => [...prev, { ...EMPTY_UNIDADE }]);
  }, [unidades.length]);

  const removeUnidade = useCallback((idx: number) => {
    setUnidades(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateUnidade = useCallback((idx: number, field: keyof Unidade, value: string) => {
    setUnidades(prev => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u));
  }, []);

  // PJ types that can use CNPJ
  const canUseCnpj = ['dono_escola', 'empresario'].includes(type);

  const setValue = (key: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key: string, option: string) => {
    const current = (values[key] as string[]) || [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setValue(key, next);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Validate CPF/CNPJ
    const cleanDoc = documento.replace(/\D/g, '');
    if (!cleanDoc) {
      toast.error(`${tipoDocumento === 'cnpj' ? 'CNPJ' : 'CPF'} é obrigatório`);
      return;
    }
    if (tipoDocumento === 'cpf' && !validateCPF(cleanDoc)) {
      toast.error('CPF inválido');
      return;
    }
    if (tipoDocumento === 'cnpj' && !validateCNPJ(cleanDoc)) {
      toast.error('CNPJ inválido');
      return;
    }

    // Validate WhatsApp
    const cleanPhone = telefoneWhatsapp.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('WhatsApp é obrigatório (com DDD)');
      return;
    }

    // Validate required fields
    for (const field of fields) {
      if (field.required && !field.isProfileField) {
        const val = values[field.key];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`${field.label} é obrigatório`);
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      // Upload photo if provided
      let fotoUrl: string | null = null;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const path = `perfis-rede/${userId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('atleta-fotos')
          .upload(path, fotoFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('atleta-fotos')
            .getPublicUrl(path);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Separate profile fields from dados_perfil
      const dadosPerfil: Record<string, unknown> = {};
      const profileFields: Record<string, string> = {};

      for (const field of fields) {
        const val = values[field.key];
        if (val !== undefined && val !== '') {
          if (field.isProfileField) {
            profileFields[field.key] = val as string;
          } else {
            dadosPerfil[field.key] = val;
          }
        }
      }

      // Include unidades for dono_escola
      if (isDono && unidades.length > 0) {
        const validUnidades = unidades.filter(u => u.nome.trim() || u.bairro.trim());
        if (validUnidades.length > 0) {
          dadosPerfil.unidades = validUnidades;
        }
      }

      const { error } = await supabase.from('perfis_rede').insert({
        user_id: userId,
        tipo: type,
        nome: nome.trim(),
        foto_url: fotoUrl,
        bio: profileFields.bio || null,
        instagram: profileFields.instagram || null,
        dados_perfil: dadosPerfil as any,
        cpf_cnpj: cleanDoc,
        tipo_documento: tipoDocumento,
        telefone_whatsapp: cleanPhone,
      } as any);

      if (error) throw error;

      // If there's an invite code, record the connection
      if (inviteCode) {
        const { data: inviterProfile } = await supabase
          .from('perfis_rede')
          .select('id, user_id')
          .eq('convite_codigo', inviteCode)
          .maybeSingle();

        if (inviterProfile) {
          // Record the invite
          await supabase.from('rede_convites').insert({
            convidante_perfil_id: inviterProfile.id,
            convidado_user_id: userId,
          });

          // Auto-create mutual connection
          await supabase.from('rede_conexoes').insert({
            solicitante_id: inviterProfile.user_id,
            destinatario_id: userId,
            status: 'aceita',
          });
        }
      }

      toast.success('Perfil criado com sucesso!');
      onComplete();
    } catch (err: any) {
      console.error('Erro ao criar perfil:', err);
      toast.error(err?.message || 'Erro ao criar perfil');
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">{TYPE_LABELS[type]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete seu perfil para entrar na rede</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required maxLength={100} />
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label>Foto de Perfil</Label>
          <div className="flex items-center gap-3">
            {fotoPreview ? (
              <img src={fotoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <label className="cursor-pointer">
              <span className="text-sm text-primary hover:underline">
                {fotoPreview ? 'Trocar foto' : 'Escolher foto'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>

        {/* CPF/CNPJ and WhatsApp - Private fields */}
        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="w-4 h-4" />
            Dados privados (não serão exibidos publicamente)
          </div>

          {canUseCnpj && (
            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select value={tipoDocumento} onValueChange={(v: 'cpf' | 'cnpj') => { setTipoDocumento(v); setDocumento(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                  <SelectItem value="cnpj">CNPJ (Pessoa Jurídica)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{tipoDocumento === 'cnpj' ? 'CNPJ *' : 'CPF *'}</Label>
            <Input
              value={documento}
              onChange={(e) => {
                const formatted = tipoDocumento === 'cnpj' ? formatCNPJ(e.target.value) : formatCPF(e.target.value);
                setDocumento(formatted);
              }}
              placeholder={tipoDocumento === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
              maxLength={tipoDocumento === 'cnpj' ? 18 : 14}
            />
          </div>

          <div className="space-y-2">
            <Label>WhatsApp *</Label>
            <Input
              value={telefoneWhatsapp}
              onChange={(e) => setTelefoneWhatsapp(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>
        </div>

        {/* Dynamic Fields */}
        {fields.map((field) => {
          if (field.isProfileField && field.key === 'bio') {
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Textarea
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={500}
                  rows={3}
                />
              </div>
            );
          }

          if (field.isProfileField && field.key === 'instagram') {
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={50}
                />
              </div>
            );
          }

          if (field.type === 'text') {
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                <Input
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  maxLength={200}
                />
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                <Textarea
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={1000}
                  rows={3}
                />
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                <Select
                  value={(values[field.key] as string) || ''}
                  onValueChange={(v) => setValue(field.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (field.type === 'multiselect') {
            const selected = (values[field.key] as string[]) || [];
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {field.options?.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMulti(field.key, opt)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        selected.includes(opt)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Unidades - only for dono_escola */}
        {isDono && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Unidades (opcional)</Label>
              {unidades.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={addUnidade} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Adicione até 5 unidades da sua escolinha (ex: franquias, filiais)
            </p>
            {unidades.map((unidade, idx) => (
              <div key={idx} className="space-y-2 rounded-md border border-border/60 p-3 bg-muted/20 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Unidade {idx + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeUnidade(idx)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input
                  value={unidade.nome}
                  onChange={(e) => updateUnidade(idx, 'nome', e.target.value)}
                  placeholder="Nome da unidade (ex: Unidade Tijuca)"
                  maxLength={100}
                />
                <Input
                  value={unidade.bairro}
                  onChange={(e) => updateUnidade(idx, 'bairro', e.target.value)}
                  placeholder="Bairro (ex: Tijuca)"
                  maxLength={100}
                />
                <Input
                  value={unidade.referencia}
                  onChange={(e) => updateUnidade(idx, 'referencia', e.target.value)}
                  placeholder="Referência (ex: Próximo ao Maracanã)"
                  maxLength={200}
                />
              </div>
            ))}
            {unidades.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-2">Nenhuma unidade adicionada</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Criar Perfil
        </Button>
      </form>
    </div>
  );
}
