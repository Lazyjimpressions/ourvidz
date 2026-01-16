-- Add first message and alternate greetings support to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS first_message TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS alternate_greetings JSONB DEFAULT '[]';

-- Add default presets for remembering user's last selections
ALTER TABLE characters ADD COLUMN IF NOT EXISTS default_presets JSONB DEFAULT '{}';