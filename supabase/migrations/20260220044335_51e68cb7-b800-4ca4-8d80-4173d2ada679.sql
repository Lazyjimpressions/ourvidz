
ALTER TABLE public.characters
ADD COLUMN clothing_tags text[] DEFAULT '{}'::text[];
