-- Workspace Sessions Migration
-- Adds support for workspace-first generation flow
-- Run this as a one-shot migration in Supabase SQL Editor

-- Create workspace_sessions table for temporary workspace storage
CREATE TABLE IF NOT EXISTS public.workspace_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_name TEXT DEFAULT 'Workspace Session',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Create workspace_items table for temporary workspace content
CREATE TABLE IF NOT EXISTS public.workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workspace_sessions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content information
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
  model_type TEXT,
  quality TEXT CHECK (quality IN ('fast', 'high')),
  
  -- Storage information
  storage_path TEXT,
  bucket_name TEXT,
  url TEXT,
  thumbnail_url TEXT,
  
  -- Generation parameters
  generation_params JSONB DEFAULT '{}',
  seed INTEGER,
  reference_image_url TEXT,
  reference_strength DECIMAL(3,2),
  
  -- Status and metadata
  status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed', 'saved')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add destination field to jobs table for workspace-first flow
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'library' CHECK (destination IN ('library', 'workspace'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS workspace_session_id UUID REFERENCES public.workspace_sessions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_sessions_user_id ON public.workspace_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_sessions_active ON public.workspace_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_workspace_items_session_id ON public.workspace_items(session_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_job_id ON public.workspace_items(job_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_user_id ON public.workspace_items(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_status ON public.workspace_items(status);
CREATE INDEX IF NOT EXISTS idx_jobs_destination ON public.jobs(destination);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_session ON public.jobs(workspace_session_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_workspace_sessions_updated_at 
  BEFORE UPDATE ON public.workspace_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_workspace_items_updated_at 
  BEFORE UPDATE ON public.workspace_items 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create RLS policies for workspace_sessions
ALTER TABLE public.workspace_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace sessions" ON public.workspace_sessions
  USING (auth.uid() = user_id);

-- Create RLS policies for workspace_items
ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace items" ON public.workspace_items
  USING (auth.uid() = user_id);

-- Function to create a new workspace session
CREATE OR REPLACE FUNCTION public.create_workspace_session(
  p_user_id UUID,
  p_session_name TEXT DEFAULT 'Workspace Session'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Deactivate any existing active sessions for this user
  UPDATE public.workspace_sessions 
  SET is_active = false 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.workspace_sessions (user_id, session_name)
  VALUES (p_user_id, p_session_name)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Function to save workspace item to library
CREATE OR REPLACE FUNCTION public.save_workspace_item_to_library(
  p_workspace_item_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_item RECORD;
  new_image_id UUID;
  new_video_id UUID;
BEGIN
  -- Get workspace item details
  SELECT * INTO workspace_item 
  FROM public.workspace_items 
  WHERE id = p_workspace_item_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace item not found or access denied';
  END IF;
  
  -- Save to appropriate table based on content type
  IF workspace_item.content_type = 'image' THEN
    INSERT INTO public.images (
      user_id,
      job_id,
      prompt,
      enhanced_prompt,
      storage_path,
      bucket_name,
      image_url,
      thumbnail_url,
      quality,
      model_type,
      metadata,
      seed,
      reference,
      enhancement_original_prompt
    ) VALUES (
      workspace_item.user_id,
      workspace_item.job_id,
      workspace_item.prompt,
      workspace_item.enhanced_prompt,
      workspace_item.storage_path,
      workspace_item.bucket_name,
      workspace_item.url,
      workspace_item.thumbnail_url,
      workspace_item.quality,
      workspace_item.model_type,
      workspace_item.metadata,
      workspace_item.seed,
      workspace_item.reference_strength,
      workspace_item.enhanced_prompt
    ) RETURNING id INTO new_image_id;
    
    -- Update workspace item status
    UPDATE public.workspace_items 
    SET status = 'saved', metadata = jsonb_set(metadata, '{saved_to}', to_jsonb(new_image_id))
    WHERE id = p_workspace_item_id;
    
    RETURN new_image_id;
    
  ELSIF workspace_item.content_type = 'video' THEN
    INSERT INTO public.videos (
      user_id,
      job_id,
      video_url,
      thumbnail_url,
      status,
      duration,
      metadata
    ) VALUES (
      workspace_item.user_id,
      workspace_item.job_id,
      workspace_item.url,
      workspace_item.thumbnail_url,
      'completed',
      5, -- Default duration, could be extracted from metadata
      workspace_item.metadata
    ) RETURNING id INTO new_video_id;
    
    -- Update workspace item status
    UPDATE public.workspace_items 
    SET status = 'saved', metadata = jsonb_set(metadata, '{saved_to}', to_jsonb(new_video_id))
    WHERE id = p_workspace_item_id;
    
    RETURN new_video_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to clear workspace session
CREATE OR REPLACE FUNCTION public.clear_workspace_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all items in the session
  DELETE FROM public.workspace_items 
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  -- Delete the session
  DELETE FROM public.workspace_sessions 
  WHERE id = p_session_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.workspace_sessions TO authenticated;
GRANT ALL ON public.workspace_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_workspace_item_to_library(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_workspace_session(UUID, UUID) TO authenticated;

-- Verify the migration
SELECT 'Migration completed successfully' as status; 