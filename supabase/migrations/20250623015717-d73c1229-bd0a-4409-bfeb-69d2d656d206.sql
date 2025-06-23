
-- Add missing updated_at column to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at trigger to videos table
CREATE TRIGGER handle_videos_updated_at 
  BEFORE UPDATE ON public.videos 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Also add error_message column if it doesn't exist (for better error handling)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS error_message TEXT;
