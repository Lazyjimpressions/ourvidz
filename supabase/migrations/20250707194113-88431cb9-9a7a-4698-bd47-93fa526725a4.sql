-- Add missing metadata column to videos table to fix callback errors
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS metadata JSONB;