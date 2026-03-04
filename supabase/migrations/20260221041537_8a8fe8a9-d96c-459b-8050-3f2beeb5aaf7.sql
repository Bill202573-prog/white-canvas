
-- Table to track PWA installations per user
CREATE TABLE public.pwa_installs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  os TEXT NOT NULL, -- 'android', 'ios', 'desktop', 'unknown'
  user_agent TEXT,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escolinha_id UUID REFERENCES public.escolinhas(id)
);

-- Enable RLS
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own install record
CREATE POLICY "Users can insert own install" ON public.pwa_installs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read own installs
CREATE POLICY "Users can read own installs" ON public.pwa_installs
  FOR SELECT USING (auth.uid() = user_id);

-- School admins can read installs for their school
CREATE POLICY "School admins can read school installs" ON public.pwa_installs
  FOR SELECT USING (
    escolinha_id IS NOT NULL AND is_admin_of_escolinha(escolinha_id)
  );

-- Index for school admin queries
CREATE INDEX idx_pwa_installs_escolinha ON public.pwa_installs(escolinha_id);
CREATE INDEX idx_pwa_installs_user ON public.pwa_installs(user_id);
