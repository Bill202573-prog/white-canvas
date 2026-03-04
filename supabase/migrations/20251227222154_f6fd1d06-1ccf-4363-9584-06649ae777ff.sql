-- Create table for event teams
CREATE TABLE public.evento_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for student-team relationship
CREATE TABLE public.evento_time_alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_id UUID NOT NULL REFERENCES public.evento_times(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(time_id, crianca_id)
);

-- Function to prevent student in multiple teams of same event
CREATE OR REPLACE FUNCTION public.check_student_unique_in_event()
RETURNS TRIGGER AS $$
DECLARE
  v_evento_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get the event_id for the team being inserted
  SELECT evento_id INTO v_evento_id FROM public.evento_times WHERE id = NEW.time_id;
  
  -- Check if student already exists in another team of the same event
  SELECT EXISTS (
    SELECT 1 
    FROM public.evento_time_alunos eta
    JOIN public.evento_times et ON et.id = eta.time_id
    WHERE eta.crianca_id = NEW.crianca_id 
    AND et.evento_id = v_evento_id
    AND eta.time_id != NEW.time_id
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Aluno já está em outro time deste evento';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_student_unique_in_event_trigger
BEFORE INSERT OR UPDATE ON public.evento_time_alunos
FOR EACH ROW
EXECUTE FUNCTION public.check_student_unique_in_event();

-- Enable RLS
ALTER TABLE public.evento_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_time_alunos ENABLE ROW LEVEL SECURITY;

-- RLS for evento_times
CREATE POLICY "Admins de escolinha podem gerenciar times"
ON public.evento_times FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_times.evento_id AND esc.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_times.evento_id AND esc.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem gerenciar todos os times"
ON public.evento_times FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS for evento_time_alunos
CREATE POLICY "Admins de escolinha podem gerenciar alunos dos times"
ON public.evento_time_alunos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM evento_times t
    JOIN eventos_esportivos e ON e.id = t.evento_id
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE t.id = evento_time_alunos.time_id AND esc.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evento_times t
    JOIN eventos_esportivos e ON e.id = t.evento_id
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE t.id = evento_time_alunos.time_id AND esc.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem gerenciar todos os alunos dos times"
ON public.evento_time_alunos FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_evento_times_updated_at
BEFORE UPDATE ON public.evento_times
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();