-- Add temporary password fields to escolinhas
ALTER TABLE public.escolinhas 
ADD COLUMN IF NOT EXISTS senha_temporaria TEXT,
ADD COLUMN IF NOT EXISTS senha_temporaria_ativa BOOLEAN DEFAULT false;

-- Create a function to generate random password
CREATE OR REPLACE FUNCTION public.generate_random_password(length integer DEFAULT 10)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Add password_needs_change to profiles table for tracking temporary passwords
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_needs_change BOOLEAN DEFAULT false;

-- RLS policy for admins to manage senha_temporaria on escolinhas (already exists for escolinhas table)