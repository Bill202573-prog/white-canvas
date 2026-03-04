
-- Function to cleanup stale temporary passwords (7+ days old)
CREATE OR REPLACE FUNCTION public.cleanup_expired_temp_passwords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear stale temp passwords from responsaveis
  UPDATE responsaveis 
  SET senha_temporaria = NULL, senha_temporaria_ativa = false
  WHERE senha_temporaria IS NOT NULL 
    AND senha_temporaria_ativa = true
    AND created_at < NOW() - INTERVAL '7 days';

  -- Clear stale temp passwords from professores
  UPDATE professores 
  SET senha_temporaria = NULL, senha_temporaria_ativa = false
  WHERE senha_temporaria IS NOT NULL 
    AND senha_temporaria_ativa = true
    AND created_at < NOW() - INTERVAL '7 days';

  -- Clear stale temp passwords from escolinhas (admin)
  UPDATE escolinhas 
  SET senha_temporaria = NULL, senha_temporaria_ativa = false
  WHERE senha_temporaria IS NOT NULL 
    AND senha_temporaria_ativa = true
    AND created_at < NOW() - INTERVAL '7 days';

  -- Clear stale temp passwords from escolinhas (sócio)
  UPDATE escolinhas 
  SET senha_temporaria_socio = NULL, senha_temporaria_socio_ativa = false
  WHERE senha_temporaria_socio IS NOT NULL 
    AND senha_temporaria_socio_ativa = true
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;
