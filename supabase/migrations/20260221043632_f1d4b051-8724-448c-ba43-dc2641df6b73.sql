ALTER TABLE scenes ADD COLUMN default_clothing text;
ALTER TABLE scenes ADD COLUMN character_clothing_overrides jsonb DEFAULT '{}';