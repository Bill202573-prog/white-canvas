-- Create table to track user access/logins
CREATE TABLE public.acessos_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE SET NULL,
  user_role TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for efficient queries
CREATE INDEX idx_acessos_log_escolinha ON public.acessos_log(escolinha_id);
CREATE INDEX idx_acessos_log_accessed_at ON public.acessos_log(accessed_at DESC);
CREATE INDEX idx_acessos_log_user_id ON public.acessos_log(user_id);

-- Enable RLS
ALTER TABLE public.acessos_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read all access logs
CREATE POLICY "Admins can view all access logs"
ON public.acessos_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Any authenticated user can insert their own access log
CREATE POLICY "Users can log their own access"
ON public.acessos_log
FOR INSERT
WITH CHECK (user_id = auth.uid());