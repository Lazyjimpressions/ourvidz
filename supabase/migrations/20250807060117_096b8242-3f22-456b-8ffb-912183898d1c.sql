-- Add character_id column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL;