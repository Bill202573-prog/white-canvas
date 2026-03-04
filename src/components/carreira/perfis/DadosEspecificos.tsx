import { Card } from '@/components/ui/card';
import type { ProfileType } from '../ProfileTypeSelector';

interface Props {
  tipo: ProfileType;
  dados: Record<string, any> | null;
}

interface FieldDisplay {
  key: string;
  label: string;
  type?: 'text' | 'list' | 'multiline';
}

const FIELDS_BY_TYPE: Record<ProfileType, FieldDisplay[]> = {
  professor: [
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'modalidade', label: 'Modalidade' },
    { key: 'categorias', label: 'Categorias', type: 'list' },
    { key: 'certificacoes', label: 'Certificações', type: 'multiline' },
    { key: 'experiencia', label: 'Experiência', type: 'multiline' },
  ],
  tecnico: [
    { key: 'clube_atual', label: 'Clube / Organização' },
    { key: 'categorias', label: 'Categorias', type: 'list' },
    { key: 'posicoes', label: 'Posições que observa', type: 'list' },
    { key: 'licencas', label: 'Licenças', type: 'multiline' },
    { key: 'historico', label: 'Histórico', type: 'multiline' },
  ],
  dono_escola: [
    { key: 'nome_escola', label: 'Nome da Escola' },
    { key: 'localizacao', label: 'Localização' },
    { key: 'modalidades', label: 'Modalidades', type: 'list' },
    { key: 'categorias', label: 'Categorias', type: 'list' },
    { key: 'site', label: 'Site' },
  ],
  preparador_fisico: [
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'areas_atuacao', label: 'Áreas de Atuação', type: 'list' },
    { key: 'cref', label: 'CREF' },
    { key: 'formacao', label: 'Formação', type: 'multiline' },
    { key: 'certificacoes', label: 'Certificações', type: 'multiline' },
  ],
  empresario: [
    { key: 'empresa', label: 'Empresa / Agência' },
    { key: 'areas_atuacao', label: 'Áreas de Atuação', type: 'list' },
    { key: 'credenciais', label: 'Credenciais', type: 'multiline' },
    { key: 'site', label: 'Site / Contato' },
  ],
  influenciador: [
    { key: 'nicho', label: 'Nicho' },
    { key: 'rede_principal', label: 'Rede Principal' },
    { key: 'arroba', label: 'Perfil Principal' },
    { key: 'outras_redes', label: 'Outras Redes', type: 'multiline' },
  ],
  atleta_filho: [],
  scout: [
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'regioes', label: 'Regiões de Atuação' },
    { key: 'clubes_anteriores', label: 'Clubes Anteriores', type: 'multiline' },
    { key: 'categorias', label: 'Categorias', type: 'list' },
    { key: 'posicoes', label: 'Posições que busca', type: 'list' },
  ],
  agente_clube: [
    { key: 'clube', label: 'Clube' },
    { key: 'categorias', label: 'Categorias', type: 'list' },
    { key: 'posicoes', label: 'Posições de Interesse', type: 'list' },
    { key: 'tempo_clube', label: 'Tempo no Clube' },
    { key: 'contato', label: 'Contato' },
  ],
  fotografo: [
    { key: 'especialidade', label: 'Especialidade' },
    { key: 'regiao', label: 'Região de Atuação' },
    { key: 'portfolio', label: 'Portfólio' },
    { key: 'site_whatsapp', label: 'Site / WhatsApp' },
  ],
};

export function DadosEspecificos({ tipo, dados }: Props) {
  if (!dados) return null;

  const fields = FIELDS_BY_TYPE[tipo] || [];
  const hasData = fields.some((f) => {
    const val = dados[f.key];
    return val && (Array.isArray(val) ? val.length > 0 : true);
  });

  if (!hasData) return null;

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-foreground mb-3">Informações Profissionais</h2>
      <div className="space-y-3">
        {fields.map((field) => {
          const val = dados[field.key];
          if (!val || (Array.isArray(val) && val.length === 0)) return null;

          return (
            <div key={field.key}>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
              </span>
              {field.type === 'list' && Array.isArray(val) ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {val.map((item: string) => (
                    <span key={item} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border">
                      {item}
                    </span>
                  ))}
                </div>
              ) : field.type === 'multiline' ? (
                <p className="text-sm text-foreground mt-0.5 whitespace-pre-line">{val}</p>
              ) : (
                <p className="text-sm text-foreground mt-0.5">{val}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
