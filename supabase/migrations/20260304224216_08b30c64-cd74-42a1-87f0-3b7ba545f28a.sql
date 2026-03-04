
-- Trigger: auto-create user_roles with 'guardian' role when a new profile is created
-- This ensures users signing up via Google OAuth (or any method) always have a role
CREATE OR REPLACE FUNCTION public.handle_new_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if user doesn't already have a role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'guardian');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (fires after handle_new_user creates the profile)
DROP TRIGGER IF EXISTS on_profile_created_add_role ON public.profiles;
CREATE TRIGGER on_profile_created_add_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_role();
