-- Add gender field to characters table to improve SDXL generation accuracy
ALTER TABLE public.characters 
ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'non-binary', 'unspecified')) DEFAULT 'unspecified';