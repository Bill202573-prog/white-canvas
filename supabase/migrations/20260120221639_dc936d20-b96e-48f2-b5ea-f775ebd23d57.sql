-- Make user_id nullable in responsaveis table to allow pre-registration without auth user
ALTER TABLE public.responsaveis ALTER COLUMN user_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE public.responsaveis DROP CONSTRAINT responsaveis_user_id_fkey;

-- Re-add the foreign key constraint but allow NULL values
ALTER TABLE public.responsaveis ADD CONSTRAINT responsaveis_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;