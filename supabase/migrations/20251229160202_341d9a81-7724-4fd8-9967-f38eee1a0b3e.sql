-- Create table to track read confirmations
CREATE TABLE public.comunicado_leituras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  lido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lido_por UUID NOT NULL,
  UNIQUE(comunicado_id, escolinha_id)
);

-- Enable RLS
ALTER TABLE public.comunicado_leituras ENABLE ROW LEVEL SECURITY;

-- School admins can insert/view their own confirmations
CREATE POLICY "School admins can insert read confirmations"
  ON public.comunicado_leituras
  FOR INSERT
  WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "School admins can view their read confirmations"
  ON public.comunicado_leituras
  FOR SELECT
  USING (is_admin_of_escolinha(escolinha_id));

-- Platform admins can view all confirmations
CREATE POLICY "Platform admins can view all read confirmations"
  ON public.comunicado_leituras
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));