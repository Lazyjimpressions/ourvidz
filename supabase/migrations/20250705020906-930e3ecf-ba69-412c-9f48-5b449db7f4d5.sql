-- Create storage buckets for Enhanced WAN Worker job types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('image7b_fast_enhanced', 'image7b_fast_enhanced', false, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('image7b_high_enhanced', 'image7b_high_enhanced', false, 20971520, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('video7b_fast_enhanced', 'video7b_fast_enhanced', false, 104857600, ARRAY['video/mp4', 'video/webm']),
  ('video7b_high_enhanced', 'video7b_high_enhanced', false, 104857600, ARRAY['video/mp4', 'video/webm']);

-- Create RLS policies for enhanced image buckets
CREATE POLICY "Users can view their own enhanced fast images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'image7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own enhanced fast images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'image7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own enhanced fast images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'image7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own enhanced fast images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'image7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own enhanced high images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'image7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own enhanced high images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'image7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own enhanced high images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'image7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own enhanced high images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'image7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for enhanced video buckets
CREATE POLICY "Users can view their own enhanced fast videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own enhanced fast videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own enhanced fast videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'video7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own enhanced fast videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video7b_fast_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own enhanced high videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own enhanced high videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own enhanced high videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'video7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own enhanced high videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video7b_high_enhanced' AND auth.uid()::text = (storage.foldername(name))[1]);