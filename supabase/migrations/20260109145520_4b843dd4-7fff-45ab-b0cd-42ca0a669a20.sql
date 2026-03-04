-- Corrigir função check_student_unique_in_event para ter search_path definido
CREATE OR REPLACE FUNCTION public.check_student_unique_in_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_evento_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get the event_id for the team being inserted
  SELECT evento_id INTO v_evento_id FROM public.evento_times WHERE id = NEW.time_id;
  
  -- Check if student already exists in another team of the same event
  SELECT EXISTS (
    SELECT 1 
    FROM public.evento_time_alunos eta
    JOIN public.evento_times et ON et.id = eta.time_id
    WHERE eta.crianca_id = NEW.crianca_id 
    AND et.evento_id = v_evento_id
    AND eta.time_id != NEW.time_id
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Aluno já está em outro time deste evento';
  END IF;
  
  RETURN NEW;
END;
$function$;