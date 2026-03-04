-- Replace get_responsavel_id using CREATE OR REPLACE with row_security disabled
-- The recursion happens because the policy on crianca_responsavel calls get_responsavel_id()
-- which tries to read responsaveis – but responsaveis also has RLS enabled.
-- By using SECURITY DEFINER + SET row_security = off, the function bypasses RLS checks.

CREATE OR REPLACE FUNCTION public.get_responsavel_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT r.id
  FROM public.responsaveis r
  WHERE r.user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_responsavel(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.responsaveis r
    WHERE r.user_id = _user_id
  )
$$;