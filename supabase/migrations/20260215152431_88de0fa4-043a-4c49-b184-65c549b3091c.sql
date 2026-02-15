
ALTER TABLE public.character_role_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage character role audit"
ON public.character_role_audit
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
