-- Add crianca_ids column to comunicados_escola table for individual student targeting
ALTER TABLE public.comunicados_escola 
ADD COLUMN crianca_ids uuid[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.comunicados_escola.crianca_ids IS 'Array of specific child IDs to target for individual messages. NULL means all matching filters.';