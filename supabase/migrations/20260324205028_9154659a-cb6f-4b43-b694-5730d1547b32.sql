UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  allowed_mime_types,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
),
file_size_limit = GREATEST(file_size_limit, 209715200)
WHERE id = 'workspace-temp';