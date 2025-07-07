-- Add URL persistence columns to images and videos tables for caching optimization
-- This will reduce storage API calls from 4000+ per hour to <50 per hour

-- Add signed URL columns to images table
ALTER TABLE public.images 
ADD COLUMN IF NOT EXISTS signed_url TEXT,
ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP WITH TIME ZONE;

-- Add signed URL columns to videos table  
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS signed_url TEXT,
ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient URL expiry queries
CREATE INDEX IF NOT EXISTS idx_images_signed_url_expires_at 
ON public.images(signed_url_expires_at) 
WHERE signed_url_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_signed_url_expires_at 
ON public.videos(signed_url_expires_at) 
WHERE signed_url_expires_at IS NOT NULL;

-- Create function to check if URL is expired
CREATE OR REPLACE FUNCTION public.is_url_expired(expires_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT expires_at IS NULL OR expires_at <= NOW();
$$;