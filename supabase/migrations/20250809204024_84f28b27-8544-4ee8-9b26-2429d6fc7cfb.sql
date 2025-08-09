-- Add user_character_id to conversations table for roleplay sessions
ALTER TABLE public.conversations 
ADD COLUMN user_character_id uuid REFERENCES public.characters(id);

-- Add index for better performance
CREATE INDEX idx_conversations_user_character_id ON public.conversations(user_character_id);

-- Update RLS policies to handle user characters with role='user'
-- Add check constraint to ensure characters table supports role field
ALTER TABLE public.characters 
ADD COLUMN role text DEFAULT 'ai' CHECK (role IN ('ai', 'user', 'narrator'));

-- Create index for role queries
CREATE INDEX idx_characters_role ON public.characters(role);
CREATE INDEX idx_characters_user_id_role ON public.characters(user_id, role);