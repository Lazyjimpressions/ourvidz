
-- Fix search_path on check_valid_tasks (already set, but recreate to be safe with SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.check_valid_tasks(arr text[])
RETURNS boolean AS $$
DECLARE
  elem text;
  valid_tasks text[] := ARRAY['t2i', 'i2i', 'i2i_multi', 't2v', 'i2v', 'extend', 'multi', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding', 'vision'];
BEGIN
  IF arr IS NULL OR array_length(arr, 1) IS NULL OR array_length(arr, 1) = 0 THEN
    RETURN false;
  END IF;
  FOREACH elem IN ARRAY arr LOOP
    IF NOT (elem = ANY(valid_tasks)) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = public;
