-- Add columns to eventos_esportivos for match result
ALTER TABLE public.eventos_esportivos
ADD COLUMN time1_id uuid REFERENCES public.evento_times(id) ON DELETE SET NULL,
ADD COLUMN time2_id uuid REFERENCES public.evento_times(id) ON DELETE SET NULL,
ADD COLUMN placar_time1 integer,
ADD COLUMN placar_time2 integer;

-- Add comment for documentation
COMMENT ON COLUMN public.eventos_esportivos.time1_id IS 'Time da casa ou primeiro time selecionado';
COMMENT ON COLUMN public.eventos_esportivos.time2_id IS 'Time visitante ou segundo time selecionado';
COMMENT ON COLUMN public.eventos_esportivos.placar_time1 IS 'Gols marcados pelo time 1';
COMMENT ON COLUMN public.eventos_esportivos.placar_time2 IS 'Gols marcados pelo time 2';