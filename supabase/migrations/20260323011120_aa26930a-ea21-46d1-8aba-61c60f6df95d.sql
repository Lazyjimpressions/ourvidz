
-- Create tag_presets table for DB-driven tag taxonomy
CREATE TABLE public.tag_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  group_key text NOT NULL,
  group_label text NOT NULL,
  tag_value text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, group_key, tag_value)
);

-- RLS
ALTER TABLE public.tag_presets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active presets
CREATE POLICY "Authenticated users can read active tag presets"
  ON public.tag_presets FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage all presets
CREATE POLICY "Admins can manage tag presets"
  ON public.tag_presets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed data from positionTags.ts
INSERT INTO public.tag_presets (category, group_key, group_label, tag_value, sort_order) VALUES
-- Position > Composition
('position', 'composition', 'Composition', 'solo', 0),
('position', 'composition', 'Composition', 'duo', 1),
('position', 'composition', 'Composition', 'group', 2),
-- Position > Framing
('position', 'framing', 'Framing', 'full-body', 0),
('position', 'framing', 'Framing', 'half-body', 1),
('position', 'framing', 'Framing', 'close-up', 2),
('position', 'framing', 'Framing', 'bust', 3),
('position', 'framing', 'Framing', 'overhead', 4),
-- Position > Angle
('position', 'angle', 'Angle', 'front', 0),
('position', 'angle', 'Angle', 'side', 1),
('position', 'angle', 'Angle', 'rear', 2),
('position', 'angle', 'Angle', '3/4', 3),
('position', 'angle', 'Angle', 'low-angle', 4),
('position', 'angle', 'Angle', 'birds-eye', 5),
-- Position > Body
('position', 'body', 'Body', 'standing', 0),
('position', 'body', 'Body', 'sitting', 1),
('position', 'body', 'Body', 'lying', 2),
('position', 'body', 'Body', 'kneeling', 3),
('position', 'body', 'Body', 'leaning', 4),
('position', 'body', 'Body', 'crouching', 5),
-- Position > Action
('position', 'action', 'Action', 'hugging', 0),
('position', 'action', 'Action', 'holding-hands', 1),
('position', 'action', 'Action', 'carrying', 2),
('position', 'action', 'Action', 'piggyback', 3),
('position', 'action', 'Action', 'dancing', 4),
('position', 'action', 'Action', 'fighting', 5),
('position', 'action', 'Action', 'running', 6),
('position', 'action', 'Action', 'massage', 7),
('position', 'action', 'Action', 'feeding', 8),
('position', 'action', 'Action', 'lifting', 9),
-- Position > Intimate
('position', 'intimate', 'Intimate', 'kissing', 0),
('position', 'intimate', 'Intimate', 'kissing-deeply', 1),
('position', 'intimate', 'Intimate', 'cuddling', 2),
('position', 'intimate', 'Intimate', 'spooning', 3),
('position', 'intimate', 'Intimate', 'lap-sitting', 4),
('position', 'intimate', 'Intimate', 'forehead-touch', 5),
('position', 'intimate', 'Intimate', 'nuzzling', 6),
('position', 'intimate', 'Intimate', 'embracing', 7),
-- Position > Mood
('position', 'mood', 'Mood', 'tender', 0),
('position', 'mood', 'Mood', 'playful', 1),
('position', 'mood', 'Mood', 'passionate', 2),
('position', 'mood', 'Mood', 'dramatic', 3),
('position', 'mood', 'Mood', 'casual', 4),
('position', 'mood', 'Mood', 'intense', 5),
-- Clothing > Style
('clothing', 'clothingStyle', 'Style', 'casual', 0),
('clothing', 'clothingStyle', 'Style', 'formal', 1),
('clothing', 'clothingStyle', 'Style', 'fantasy', 2),
('clothing', 'clothingStyle', 'Style', 'uniform', 3),
('clothing', 'clothingStyle', 'Style', 'athletic', 4),
('clothing', 'clothingStyle', 'Style', 'sleepwear', 5),
('clothing', 'clothingStyle', 'Style', 'swimwear', 6),
('clothing', 'clothingStyle', 'Style', 'armor', 7),
('clothing', 'clothingStyle', 'Style', 'lingerie', 8),
('clothing', 'clothingStyle', 'Style', 'costume', 9),
-- Clothing > Season
('clothing', 'season', 'Season', 'summer', 0),
('clothing', 'season', 'Season', 'winter', 1),
('clothing', 'season', 'Season', 'spring', 2),
('clothing', 'season', 'Season', 'autumn', 3),
-- Clothing > Coverage
('clothing', 'coverage', 'Coverage', 'full', 0),
('clothing', 'coverage', 'Coverage', 'partial', 1),
('clothing', 'coverage', 'Coverage', 'minimal', 2),
('clothing', 'coverage', 'Coverage', 'layered', 3),
-- Scene > Setting
('scene', 'setting', 'Setting', 'indoor', 0),
('scene', 'setting', 'Setting', 'outdoor', 1),
('scene', 'setting', 'Setting', 'urban', 2),
('scene', 'setting', 'Setting', 'nature', 3),
('scene', 'setting', 'Setting', 'fantasy-setting', 4),
('scene', 'setting', 'Setting', 'studio', 5),
-- Scene > Time
('scene', 'timeOfDay', 'Time', 'day', 0),
('scene', 'timeOfDay', 'Time', 'night', 1),
('scene', 'timeOfDay', 'Time', 'sunset', 2),
('scene', 'timeOfDay', 'Time', 'sunrise', 3),
('scene', 'timeOfDay', 'Time', 'twilight', 4),
-- Scene > Mood
('scene', 'sceneMood', 'Mood', 'cozy', 0),
('scene', 'sceneMood', 'Mood', 'dramatic', 1),
('scene', 'sceneMood', 'Mood', 'romantic', 2),
('scene', 'sceneMood', 'Mood', 'eerie', 3),
('scene', 'sceneMood', 'Mood', 'serene', 4),
('scene', 'sceneMood', 'Mood', 'vibrant', 5),
-- Style > Medium
('style', 'medium', 'Medium', 'watercolor', 0),
('style', 'medium', 'Medium', 'digital', 1),
('style', 'medium', 'Medium', 'photo', 2),
('style', 'medium', 'Medium', 'oil-painting', 3),
('style', 'medium', 'Medium', 'pencil', 4),
('style', 'medium', 'Medium', 'ink', 5),
-- Style > Aesthetic
('style', 'aesthetic', 'Aesthetic', 'anime', 0),
('style', 'aesthetic', 'Aesthetic', 'realistic', 1),
('style', 'aesthetic', 'Aesthetic', 'painterly', 2),
('style', 'aesthetic', 'Aesthetic', 'cel-shade', 3),
('style', 'aesthetic', 'Aesthetic', 'comic', 4),
('style', 'aesthetic', 'Aesthetic', 'retro', 5);
