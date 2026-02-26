
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

CREATE TABLE public.playground_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  prompt_text text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  task_type text NOT NULL DEFAULT 't2i',
  is_standard boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playground_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own and standard prompts"
  ON public.playground_prompts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_standard = true);

CREATE POLICY "Users can insert own prompts"
  ON public.playground_prompts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prompts"
  ON public.playground_prompts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_standard = false)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own prompts"
  ON public.playground_prompts FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND is_standard = false);

CREATE POLICY "Admins can manage all prompts"
  ON public.playground_prompts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_playground_prompts_updated_at
  BEFORE UPDATE ON public.playground_prompts
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
