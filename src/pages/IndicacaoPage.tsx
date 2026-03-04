import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, User, Phone, Baby, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

// Schema de validação
const indicacaoSchema = z.object({
  nomeResponsavel: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  telefoneResponsavel: z.string().trim().min(10, 'Telefone inválido').max(15),
  nomeCrianca: z.string().trim().min(2, 'Nome da criança deve ter pelo menos 2 caracteres').max(100),
  idadeCrianca: z.number().min(3, 'Idade mínima: 3 anos').max(17, 'Idade máxima: 17 anos'),
});

interface EscolaInfo {
  id: string;
  nome: string;
  logo_url: string | null;
  whatsapp_indicacoes: string | null;
  telefone: string | null;
}

interface IndicadorInfo {
  id: string;
  nome: string;
}

export default function IndicacaoPage() {
  const [searchParams] = useSearchParams();

  // Alguns clientes do WhatsApp/in-app browsers podem “colar” pontuação ou caracteres
  // extras no final do link. Aqui sanitizamos para garantir que os UUIDs sejam válidos.
  const extractUuid = (value: string | null): string | null => {
    if (!value) return null;
    const match = value.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    return match?.[0] ?? null;
  };

  // Compatibilidade: alguns links antigos/externos podem usar escolinha_id.
  const escolaId = extractUuid(searchParams.get('escola_id') ?? searchParams.get('escolinha_id'));
  const refId = extractUuid(searchParams.get('ref'));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [escola, setEscola] = useState<EscolaInfo | null>(null);
  const [indicador, setIndicador] = useState<IndicadorInfo | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  // Form state
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const [nomeCrianca, setNomeCrianca] = useState('');
  const [idadeCrianca, setIdadeCrianca] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados da escola e indicador
  useEffect(() => {
    async function loadData() {
      if (!escolaId) {
        setLoading(false);
        return;
      }

      try {
        // Buscar escola da view pública (inclui campos de contato para indicações)
        const { data: escolaPublica, error: escolaError } = await (supabase
          .from('escolinhas_publico')
          .select('id, nome, logo_url, telefone, whatsapp_indicacoes') as any)
          .eq('id', escolaId)
          .maybeSingle();

        if (escolaError || !escolaPublica) {
          console.error('Escola não encontrada:', escolaError);
          setLoading(false);
          return;
        }

        setEscola({
          id: escolaPublica.id,
          nome: escolaPublica.nome,
          logo_url: escolaPublica.logo_url || null,
          whatsapp_indicacoes: escolaPublica.whatsapp_indicacoes || null,
          telefone: escolaPublica.telefone || null,
        });

        // Buscar indicador (view pública)
        if (refId) {
          const { data: indicadorData } = await supabase
            .from('responsaveis_publico')
            .select('id, nome')
            .eq('id', refId)
            .single();

          if (indicadorData) {
            setIndicador(indicadorData);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [escolaId, refId]);

  // Formatar telefone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Normalizar número de WhatsApp para o formato internacional
  const normalizeWhatsAppNumber = (phone: string): string => {
    let digits = phone.replace(/\D/g, '');
    // Adicionar código do país se não tiver
    if (!digits.startsWith('55')) {
      digits = '55' + digits;
    }
    return digits;
  };

  // Gerar link do WhatsApp
  const generateWhatsAppLink = (phone: string, message: string): string => {
    const normalizedPhone = normalizeWhatsAppNumber(phone);
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  };

  // Validar formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    try {
      indicacaoSchema.parse({
        nomeResponsavel,
        telefoneResponsavel: telefoneResponsavel.replace(/\D/g, ''),
        nomeCrianca,
        idadeCrianca: parseInt(idadeCrianca) || 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    if (!escola) {
      toast.error('Escola não identificada');
      return;
    }

    setSubmitting(true);

    try {
      // Salvar indicação no banco
      const { error } = await supabase.from('indicacoes').insert({
        escolinha_id: escola.id,
        pai_indicador_id: refId || 'unknown',
        nome_pai_indicador: indicador?.nome || 'Indicação direta',
        nome_responsavel_indicado: nomeResponsavel.trim(),
        telefone_responsavel_indicado: telefoneResponsavel.replace(/\D/g, ''),
        nome_crianca: nomeCrianca.trim(),
        idade_crianca: parseInt(idadeCrianca),
        status: 'novo',
      });

      if (error) {
        console.error('Erro ao salvar indicação:', error);
        toast.error('Erro ao enviar dados. Tente novamente.');
        setSubmitting(false);
        return;
      }

      // Notificar escola por e-mail (fire and forget)
      try {
        await supabase.functions.invoke('notify-school-indicacao', {
          body: {
            escolinha_id: escola.id,
            nome_indicador: indicador?.nome || 'Indicação direta',
            nome_responsavel: nomeResponsavel.trim(),
            telefone_responsavel: telefoneResponsavel.replace(/\D/g, ''),
            nome_crianca: nomeCrianca.trim(),
            idade_crianca: parseInt(idadeCrianca),
          },
        });
      } catch (notifyError) {
        // Não bloquear o fluxo se a notificação falhar
        console.error('Erro ao notificar escola:', notifyError);
      }

      // Determinar número do WhatsApp da escola
      const whatsappNumber = escola.whatsapp_indicacoes || escola.telefone;

      if (!whatsappNumber) {
        toast.success('Dados enviados! A escola entrará em contato.');
        setSubmitted(true);
        setSubmitting(false);
        return;
      }

      // Montar mensagem para WhatsApp
      const message = 
        `Olá! Recebi uma indicação${indicador ? ` de ${indicador.nome}` : ''} e gostaria de agendar uma aula experimental para meu filho(a).\n\n` +
        `📋 *Dados do responsável:*\n` +
        `Nome: ${nomeResponsavel}\n` +
        `Telefone: ${telefoneResponsavel}\n\n` +
        `👦 *Dados da criança:*\n` +
        `Nome: ${nomeCrianca}\n` +
        `Idade: ${idadeCrianca} anos\n\n` +
        `Aguardo o contato para agendar!`;

      const link = generateWhatsAppLink(whatsappNumber, message);
      setWhatsappLink(link);
      setSubmitted(true);
      toast.success('Dados enviados com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // Escola não encontrada
  if (!escolaId || !escola) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-800">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-destructive">Link inválido</CardTitle>
              <CardDescription>
                Este link de indicação não é válido ou a escola não está mais ativa.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Sucesso - mostrar botão do WhatsApp
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-800">
        {/* Header da escola */}
        <div className="bg-slate-800 px-6 py-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            {escola.logo_url ? (
              <img 
                src={escola.logo_url} 
                alt={escola.nome} 
                className="w-20 h-20 rounded-lg object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold">{escola.nome.charAt(0)}</span>
              </div>
            )}
            <h1 className="text-xl font-bold">{escola.nome}</h1>
          </div>
        </div>

        {/* Card de sucesso */}
        <div className="flex-1 bg-slate-100 rounded-t-3xl -mt-4 p-6">
          <div className="max-w-md mx-auto">
            <div className="text-center py-8">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Dados enviados!</h2>
              <p className="text-muted-foreground text-lg mb-8">
                {whatsappLink
                  ? 'Agora clique no botão abaixo para falar diretamente com a escola pelo WhatsApp.'
                  : 'A escola entrará em contato em breve.'}
              </p>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
                >
                  <Send className="w-6 h-6" />
                  Falar com a escola no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulário
  return (
    <div className="min-h-screen flex flex-col bg-slate-800">
      {/* Header da escola */}
      <div className="bg-slate-800 px-6 py-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          {escola.logo_url ? (
            <img 
              src={escola.logo_url} 
              alt={escola.nome} 
              className="w-20 h-20 rounded-lg object-cover bg-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{escola.nome.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-xl font-bold">{escola.nome}</h1>
        </div>

        {/* Mensagem de convite */}
        <p className="text-lg leading-relaxed">
          {indicador ? (
            <>
              <span className="font-bold">{indicador.nome}</span> convidou você para conhecer a escolinha{' '}
              <span className="font-bold">{escola.nome}</span>
            </>
          ) : (
            <>
              Você foi convidado para conhecer a escolinha{' '}
              <span className="font-bold">{escola.nome}</span>
            </>
          )}
        </p>
      </div>

      {/* Formulário */}
      <div className="flex-1 bg-slate-100 rounded-t-3xl -mt-2 p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            Preencha suas informações abaixo:
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="nomeResponsavel" className="text-slate-700 font-medium">
                Nome do responsável *
              </Label>
              <Input
                id="nomeResponsavel"
                type="text"
                placeholder="Digite seu nome completo"
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                maxLength={100}
                className={`h-12 bg-white border-slate-300 ${errors.nomeResponsavel ? 'border-destructive' : ''}`}
              />
              {errors.nomeResponsavel && (
                <p className="text-sm text-destructive">{errors.nomeResponsavel}</p>
              )}
            </div>

            {/* Telefone do Responsável */}
            <div className="space-y-2">
              <Label htmlFor="telefoneResponsavel" className="text-slate-700 font-medium">
                Telefone (WhatsApp) *
              </Label>
              <Input
                id="telefoneResponsavel"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefoneResponsavel}
                onChange={(e) => setTelefoneResponsavel(formatPhone(e.target.value))}
                className={`h-12 bg-white border-slate-300 ${errors.telefoneResponsavel ? 'border-destructive' : ''}`}
              />
              {errors.telefoneResponsavel && (
                <p className="text-sm text-destructive">{errors.telefoneResponsavel}</p>
              )}
            </div>

            {/* Nome da Criança */}
            <div className="space-y-2">
              <Label htmlFor="nomeCrianca" className="text-slate-700 font-medium">
                Nome da criança *
              </Label>
              <Input
                id="nomeCrianca"
                type="text"
                placeholder="Nome do seu filho(a)"
                value={nomeCrianca}
                onChange={(e) => setNomeCrianca(e.target.value)}
                maxLength={100}
                className={`h-12 bg-white border-slate-300 ${errors.nomeCrianca ? 'border-destructive' : ''}`}
              />
              {errors.nomeCrianca && (
                <p className="text-sm text-destructive">{errors.nomeCrianca}</p>
              )}
            </div>

            {/* Idade da Criança */}
            <div className="space-y-2">
              <Label htmlFor="idadeCrianca" className="text-slate-700 font-medium">
                Idade da criança *
              </Label>
              <Input
                id="idadeCrianca"
                type="number"
                placeholder="Ex: 7"
                min={3}
                max={17}
                value={idadeCrianca}
                onChange={(e) => setIdadeCrianca(e.target.value)}
                className={`h-12 bg-white border-slate-300 ${errors.idadeCrianca ? 'border-destructive' : ''}`}
              />
              {errors.idadeCrianca && (
                <p className="text-sm text-destructive">{errors.idadeCrianca}</p>
              )}
            </div>

            {/* CTA */}
            <div className="pt-4">
              <p className="text-center text-lg font-semibold text-slate-700 mb-4">
                🎉 Vamos agendar uma aula experimental?
              </p>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar e falar com a escola
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
