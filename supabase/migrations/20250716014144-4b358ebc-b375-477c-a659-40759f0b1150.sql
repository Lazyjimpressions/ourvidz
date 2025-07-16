-- Create reference_images storage bucket for reference image functionality
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'reference_images', 
  'reference_images', 
  false, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for reference_images bucket
CREATE POLICY "Users can view their own reference images"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reference_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own reference images"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reference_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own reference images"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'reference_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own reference images"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'reference_images' AND auth.uid()::text = (storage.foldername(name))[1]);