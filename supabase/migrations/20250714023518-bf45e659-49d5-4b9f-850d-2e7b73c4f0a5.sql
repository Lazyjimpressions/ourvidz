-- Clean slate: Delete all existing data
DELETE FROM images;
DELETE FROM videos;
DELETE FROM jobs;

-- Add job_id column to images table for 1-to-many relationship
ALTER TABLE images ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_images_job_id ON images(job_id);