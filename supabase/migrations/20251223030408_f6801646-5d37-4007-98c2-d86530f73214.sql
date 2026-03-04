-- Allow creating professores without an existing auth user
-- This fixes: insert violates foreign key constraint professores_user_id_fkey

ALTER TABLE public.professores
  DROP CONSTRAINT IF EXISTS professores_user_id_fkey;

ALTER TABLE public.professores
  ALTER COLUMN user_id DROP NOT NULL;
