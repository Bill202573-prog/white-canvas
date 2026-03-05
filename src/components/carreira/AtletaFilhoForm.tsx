import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Upload, Shield, Lock } from 'lucide-react';
import { validateCPF, formatCPF } from '@/lib/cpf-validator';

interface Props {
  userId: string;
  defaultName: string;
  inviteCode: string | null;
  onBack: () => void;
  onComplete: () => void | Promise<void>;
}

const MODALIDADES = [
  'Futebol', 'Futsal', 'Beach Soccer', 'Society',
  'Basquete', 'Vôlei', 'Handebol', 'Natação',
  'Atletismo', 'Judô', 'Jiu-Jitsu', 'Tênis', 'Outro',
];

const CATEGORIAS = ['Sub-5', 'Sub-7', 'Sub-9', 'Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20'];

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    + '-' + Math.random().toString(36).substring(2, 6);
}

export function AtletaFilhoForm({ userId, defaultName, inviteCode, onBack, onComplete }: Props) {
  const [nome, setNome] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState(defaultName || '');
  const [dataNascimento, setDataNascimento] = useState('');
  const [modalidade, setModalidade] = useState('Futebol');
  const [categoria, setCategoria] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [bio, setBio] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Nome do atleta é obrigatório');
      return;
    }
    if (!dataNascimento) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }
    if (!nomeResponsavel.trim()) {
      toast.error('Nome do responsável é obrigatório');
      return;
    }
    const cleanDocInput = cpf.replace(/\D/g, '');
    let cleanDoc: string | null = null;

    const cleanPhoneInput = telefoneWhatsapp.replace(/\D/g, '');
    let cleanPhone: string | null = null;

    const ignoredFields: string[] = [];

    if (cleanDocInput.length === 11 && validateCPF(cleanDocInput)) {
      cleanDoc = cleanDocInput;
    } else if (cleanDocInput.length > 0) {
      ignoredFields.push('CPF');
    }

    if (cleanPhoneInput.length >= 10 && cleanPhoneInput.length <= 11) {
      cleanPhone = cleanPhoneInput;
    } else if (cleanPhoneInput.length > 0) {
      ignoredFields.push('WhatsApp');
    }

    if (ignoredFields.length > 0) {
      toast.warning(
        `${ignoredFields.join(' e ')} inválido(s). O cadastro vai continuar sem esses dados; você pode corrigir depois no perfil.`
      );
    }

    setIsLoading(true);

    try {
      // 1. Create crianca record (generate ID client-side to avoid SELECT after INSERT,
      // since RLS SELECT policies won't match until perfil_atleta is linked)
      const criancaId = crypto.randomUUID();
      const { error: criancaError } = await supabase
        .from('criancas')
        .insert({
          id: criancaId,
          nome: nome.trim(),
          data_nascimento: dataNascimento,
          ativo: true,
        });

      if (criancaError) throw criancaError;

      // 2. Upload photo if provided
      let fotoUrl: string | null = null;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const path = `${userId}/${criancaId}-${Date.now()}.${ext}`;
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

      // 3. Create perfil_atleta linked to crianca
      const slug = generateSlug(nome);
      const { error: perfilError } = await supabase
        .from('perfil_atleta')
        .insert({
          user_id: userId,
          nome: nome.trim(),
          slug,
          modalidade: modalidade || 'Futebol',
          categoria: categoria || null,
          cidade: cidade || null,
          estado: estado || null,
          bio: bio || null,
          foto_url: fotoUrl,
          crianca_id: criancaId,
          is_public: true,
          cpf_cnpj: cleanDoc || null,
          tipo_documento: cleanDoc ? 'cpf' : null,
          telefone_whatsapp: cleanPhone || null,
          origem: 'carreira',
        } as any);

      if (perfilError) throw perfilError;

      // 4. Handle invite code if present
      if (inviteCode) {
        const { data: inviterProfile } = await supabase
          .from('perfis_rede')
          .select('id, user_id')
          .eq('convite_codigo', inviteCode)
          .maybeSingle();

        if (inviterProfile) {
          await supabase.from('rede_convites').insert({
            convidante_perfil_id: inviterProfile.id,
            convidado_user_id: userId,
          });
          await supabase.from('rede_conexoes').insert({
            solicitante_id: inviterProfile.user_id,
            destinatario_id: userId,
            status: 'aceita',
          });
        }
      }

      toast.success('Perfil do atleta criado com sucesso!');
      await onComplete();
    } catch (err: any) {
      console.error('Erro ao criar perfil do atleta:', err);
      toast.error(err?.message || 'Erro ao criar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">⚽ Perfil do Atleta</h1>
        <p className="text-sm text-muted-foreground mt-1">Cadastre os dados do seu atleta</p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          <Shield className="w-3.5 h-3.5" />
          Perfil administrado por você (responsável)
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Atleta */}
        <div className="space-y-2">
          <Label htmlFor="nome-atleta">Nome do Atleta *</Label>
          <Input
            id="nome-atleta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo do atleta"
            required
            maxLength={100}
          />
        </div>

        {/* Data de Nascimento */}
        <div className="space-y-2">
          <Label htmlFor="data-nascimento">Data de Nascimento *</Label>
          <Input
            id="data-nascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
        </div>

        {/* CPF and WhatsApp - Private fields */}
        <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="w-4 h-4" />
            Dados do responsável (não serão exibidos publicamente)
          </div>
          <div className="space-y-2">
            <Label>Nome do Responsável *</Label>
            <Input
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
              placeholder="Nome completo do responsável"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>CPF do Responsável</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp do Responsável</Label>
            <Input
              value={telefoneWhatsapp}
              onChange={(e) => setTelefoneWhatsapp(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>
        </div>

        {/* Foto */}
        <div className="space-y-2">
          <Label>Foto do Atleta</Label>
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

        {/* Modalidade */}
        <div className="space-y-2">
          <Label>Modalidade Principal</Label>
          <Select value={modalidade} onValueChange={setModalidade}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {MODALIDADES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cidade / Estado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label>Sobre o atleta</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre a trajetória esportiva..."
            maxLength={280}
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Criar Perfil do Atleta
        </Button>
      </form>
    </div>
  );
}
