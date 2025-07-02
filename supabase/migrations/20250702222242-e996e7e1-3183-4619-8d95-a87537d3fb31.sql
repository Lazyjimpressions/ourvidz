-- Verify that the queue-job function properly sends 6 images to the worker
-- First, let's check the current jobs table to see what's being stored
SELECT 
  id,
  job_type,
  format,
  metadata,
  created_at,
  status
FROM jobs 
WHERE job_type LIKE '%image%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Let's also check the images table to see if image_urls is being populated
SELECT 
  id,
  prompt,
  image_url,
  image_urls,
  metadata,
  status,
  created_at
FROM images 
WHERE status = 'completed'
ORDER BY created_at DESC 
LIMIT 3;