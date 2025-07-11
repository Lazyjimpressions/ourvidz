-- Create prompt_test_results table for SDXL testing
CREATE TABLE IF NOT EXISTS prompt_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('artistic', 'explicit', 'unrestricted')),
  series TEXT NOT NULL,
  overall_quality INTEGER CHECK (overall_quality >= 0 AND overall_quality <= 10),
  anatomical_accuracy INTEGER CHECK (anatomical_accuracy >= 0 AND anatomical_accuracy <= 10),
  content_level INTEGER CHECK (content_level >= 0 AND content_level <= 5),
  consistency INTEGER CHECK (consistency >= 0 AND consistency <= 10),
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_user_id ON prompt_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_tier ON prompt_test_results(tier);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_series ON prompt_test_results(series);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_created_at ON prompt_test_results(created_at);

-- Enable RLS
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own test results" ON prompt_test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results" ON prompt_test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results" ON prompt_test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test results" ON prompt_test_results
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_prompt_test_results_updated_at
  BEFORE UPDATE ON prompt_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 