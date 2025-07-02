-- Fix SDXL bucket naming to match job types  
-- Create correctly named buckets for SDXL jobs

-- Create sdxl_image_fast bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sdxl_image_fast',
  'sdxl_image_fast', 
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create sdxl_image_high bucket  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sdxl_image_high',
  'sdxl_image_high',
  false, 
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Move existing files from old buckets to new buckets (if any exist)
UPDATE storage.objects 
SET bucket_id = 'sdxl_image_fast' 
WHERE bucket_id = 'sdxl_fast';

UPDATE storage.objects 
SET bucket_id = 'sdxl_image_high' 
WHERE bucket_id = 'sdxl_high';

-- Create policies for sdxl_image_fast bucket
CREATE POLICY "Users can view from sdxl_image_fast bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sdxl_image_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can insert to sdxl_image_fast bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sdxl_image_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update to sdxl_image_fast bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sdxl_image_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete from sdxl_image_fast bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sdxl_image_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policies for sdxl_image_high bucket
CREATE POLICY "Users can view from sdxl_image_high bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sdxl_image_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can insert to sdxl_image_high bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sdxl_image_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update to sdxl_image_high bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sdxl_image_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete from sdxl_image_high bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sdxl_image_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Now safe to remove old incorrectly named buckets
DELETE FROM storage.buckets WHERE id IN ('sdxl_fast', 'sdxl_high');