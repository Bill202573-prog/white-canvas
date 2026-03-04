-- Criar enum para roles de usuario
CREATE TYPE public.user_role AS ENUM ('admin', 'school', 'teacher', 'guardian');

-- Tabela de roles de usuario (seguranca)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Funcao para verificar role do usuario (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Funcao para obter role do usuario
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Tabela de profiles (dados adicionais do usuario)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de escolinhas
CREATE TABLE public.escolinhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endereco TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de professores
CREATE TABLE public.professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de responsaveis
CREATE TABLE public.responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de criancas (nucleo do sistema)
CREATE TABLE public.criancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf_hash TEXT, -- CPF criptografado para uso interno
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vinculo crianca-responsavel
CREATE TABLE public.crianca_responsavel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE NOT NULL,
  responsavel_id UUID REFERENCES public.responsaveis(id) ON DELETE CASCADE NOT NULL,
  parentesco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (crianca_id, responsavel_id)
);

-- Tabela de vinculo crianca-escolinha
CREATE TABLE public.crianca_escolinha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE NOT NULL,
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE CASCADE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (crianca_id, escolinha_id)
);

-- Tabela de turmas
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE CASCADE NOT NULL,
  professor_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
  dias_semana TEXT[] NOT NULL DEFAULT '{}',
  horario_inicio TIME,
  horario_fim TIME,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vinculo crianca-turma
CREATE TABLE public.crianca_turma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (crianca_id, turma_id)
);

-- Tabela de aulas
CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  horario_inicio TIME,
  horario_fim TIME,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de presenca
CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
  crianca_id UUID REFERENCES public.criancas(id) ON DELETE CASCADE NOT NULL,
  presente BOOLEAN,
  confirmado_responsavel BOOLEAN DEFAULT false,
  confirmado_professor BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (aula_id, crianca_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolinhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_escolinha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crianca_turma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- Policies para user_roles
CREATE POLICY "Usuarios podem ver suas proprias roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies para profiles
CREATE POLICY "Usuarios podem ver seu proprio profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem atualizar seu proprio profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem inserir seu proprio profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem ver todos os profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies para escolinhas
CREATE POLICY "Admins podem ver todas as escolinhas"
  ON public.escolinhas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem ver sua escolinha"
  ON public.escolinhas FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Professores podem ver sua escolinha"
  ON public.escolinhas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professores
      WHERE professores.user_id = auth.uid()
      AND professores.escolinha_id = escolinhas.id
    )
  );

CREATE POLICY "Admins podem gerenciar escolinhas"
  ON public.escolinhas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem atualizar sua escolinha"
  ON public.escolinhas FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid());

-- Policies para professores
CREATE POLICY "Professores podem ver seu proprio cadastro"
  ON public.professores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar professores"
  ON public.professores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem ver professores da sua escolinha"
  ON public.escolinhas FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Admins de escolinha podem gerenciar professores"
  ON public.professores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE escolinhas.id = professores.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
    )
  );

-- Policies para responsaveis
CREATE POLICY "Responsaveis podem ver seu proprio cadastro"
  ON public.responsaveis FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar responsaveis"
  ON public.responsaveis FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies para criancas
CREATE POLICY "Admins podem gerenciar todas as criancas"
  ON public.criancas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Responsaveis podem ver suas criancas"
  ON public.criancas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE cr.crianca_id = criancas.id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Professores podem ver criancas das suas turmas"
  ON public.criancas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_turma ct
      JOIN public.turmas t ON t.id = ct.turma_id
      JOIN public.professores p ON p.id = t.professor_id
      WHERE ct.crianca_id = criancas.id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins de escolinha podem gerenciar criancas da sua escolinha"
  ON public.criancas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_escolinha ce
      JOIN public.escolinhas e ON e.id = ce.escolinha_id
      WHERE ce.crianca_id = criancas.id
      AND e.admin_user_id = auth.uid()
    )
  );

-- Policies para crianca_responsavel
CREATE POLICY "Admins podem gerenciar vinculos crianca-responsavel"
  ON public.crianca_responsavel FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Responsaveis podem ver seus vinculos"
  ON public.crianca_responsavel FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.responsaveis
      WHERE responsaveis.id = crianca_responsavel.responsavel_id
      AND responsaveis.user_id = auth.uid()
    )
  );

-- Policies para crianca_escolinha
CREATE POLICY "Admins podem gerenciar vinculos crianca-escolinha"
  ON public.crianca_escolinha FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem gerenciar vinculos da sua escolinha"
  ON public.crianca_escolinha FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE escolinhas.id = crianca_escolinha.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
    )
  );

-- Policies para turmas
CREATE POLICY "Admins podem gerenciar todas as turmas"
  ON public.turmas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores podem ver suas turmas"
  ON public.turmas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professores
      WHERE professores.id = turmas.professor_id
      AND professores.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins de escolinha podem gerenciar turmas da sua escolinha"
  ON public.turmas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE escolinhas.id = turmas.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
    )
  );

-- Policies para crianca_turma
CREATE POLICY "Admins podem gerenciar vinculos crianca-turma"
  ON public.crianca_turma FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores podem ver alunos das suas turmas"
  ON public.crianca_turma FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.professores p ON p.id = t.professor_id
      WHERE t.id = crianca_turma.turma_id
      AND p.user_id = auth.uid()
    )
  );

-- Policies para aulas
CREATE POLICY "Admins podem gerenciar todas as aulas"
  ON public.aulas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores podem gerenciar aulas das suas turmas"
  ON public.aulas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.professores p ON p.id = t.professor_id
      WHERE t.id = aulas.turma_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Responsaveis podem ver aulas das turmas dos filhos"
  ON public.aulas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_turma ct
      JOIN public.crianca_responsavel cr ON cr.crianca_id = ct.crianca_id
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE ct.turma_id = aulas.turma_id
      AND r.user_id = auth.uid()
    )
  );

-- Policies para presencas
CREATE POLICY "Admins podem gerenciar todas as presencas"
  ON public.presencas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores podem gerenciar presencas das suas aulas"
  ON public.presencas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas a
      JOIN public.turmas t ON t.id = a.turma_id
      JOIN public.professores p ON p.id = t.professor_id
      WHERE a.id = presencas.aula_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Responsaveis podem ver e confirmar presenca dos filhos"
  ON public.presencas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE cr.crianca_id = presencas.crianca_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Responsaveis podem atualizar confirmacao de presenca"
  ON public.presencas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE cr.crianca_id = presencas.crianca_id
      AND r.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escolinhas_updated_at BEFORE UPDATE ON public.escolinhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_professores_updated_at BEFORE UPDATE ON public.professores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_responsaveis_updated_at BEFORE UPDATE ON public.responsaveis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_criancas_updated_at BEFORE UPDATE ON public.criancas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_aulas_updated_at BEFORE UPDATE ON public.aulas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_presencas_updated_at BEFORE UPDATE ON public.presencas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile automaticamente quando usuario se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();