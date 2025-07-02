-- Standardize file size limits for high-quality image buckets
UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB to match image_high
WHERE id = 'sdxl_image_high';