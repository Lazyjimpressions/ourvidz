
-- Create SDXL storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('sdxl_fast', 'sdxl_fast', false),
  ('sdxl_high', 'sdxl_high', false);

-- Create storage policies for SDXL buckets
CREATE POLICY "Users can upload to sdxl_fast bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sdxl_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view sdxl_fast bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sdxl_fast' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to sdxl_high bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sdxl_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view sdxl_high bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sdxl_high' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
