-- Fix SDXL storage buckets configuration to match WAN buckets

-- Update sdxl_fast bucket with proper configuration
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'sdxl_fast';

-- Update sdxl_high bucket with proper configuration  
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'sdxl_high';

-- Add missing UPDATE policies for SDXL buckets
CREATE POLICY "Users can update to sdxl_fast bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sdxl_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update to sdxl_high bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sdxl_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add missing DELETE policies for SDXL buckets
CREATE POLICY "Users can delete from sdxl_fast bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sdxl_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete from sdxl_high bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sdxl_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );