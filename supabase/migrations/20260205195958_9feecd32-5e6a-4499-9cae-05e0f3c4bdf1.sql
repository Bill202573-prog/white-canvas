-- Adicionar coluna crianca_id na tabela perfil_atleta para vincular ao atleta
ALTER TABLE public.perfil_atleta 
ADD COLUMN crianca_id uuid REFERENCES public.criancas(id) ON DELETE SET NULL;

-- Criar índice para consultas
CREATE INDEX idx_perfil_atleta_crianca_id ON public.perfil_atleta(crianca_id);

-- Atualizar o perfil do Guilherme Andrade Nogueira com seu crianca_id
UPDATE public.perfil_atleta 
SET crianca_id = 'e1277a26-c847-483b-a3f9-e76fad2ce8ac'
WHERE id = '80f7441f-f544-40e9-80aa-59b4edec1e51';

-- Criar política RLS para permitir leitura pública das atividades externas quando tornar_publico = true
CREATE POLICY "Atividades publicas podem ser lidas por todos"
ON public.atividades_externas
FOR SELECT
USING (tornar_publico = true);

-- Criar índice para otimizar consultas de atividades públicas
CREATE INDEX idx_atividades_externas_publicas ON public.atividades_externas(crianca_id, tornar_publico) WHERE tornar_publico = true;