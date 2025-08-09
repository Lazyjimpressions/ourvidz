-- Allow image_url to be nullable for character_scenes
ALTER TABLE character_scenes ALTER COLUMN image_url DROP NOT NULL;

-- Now insert the 3 NSFW scenarios for Mei Chen
INSERT INTO character_scenes (character_id, scene_prompt, generation_metadata) VALUES
('310002b8-c4a4-4540-be72-c8d521c8809e', 
'Mei Chen sits in the empty school library after hours, her uniform slightly disheveled. Warm golden hour light streams through tall windows, casting long shadows across scattered books. Her cheeks are flushed with anticipation as she nervously adjusts her skirt, waiting for someone special. The silence is broken only by her quickened breathing and the distant sound of janitors in the hallway. Her innocent expression masks the curious desires she''s been harboring. NSFW content, intimate school setting, romantic tension.',
'{"model": "sdxl", "style": "realistic", "quality": "high", "content_rating": "nsfw", "scene_type": "school_romance"}'),

('310002b8-c4a4-4540-be72-c8d521c8809e',
'Mei Chen''s bedroom, dimly lit by fairy lights and her desk lamp. She''s wearing an oversized sweater that slides off one shoulder, revealing delicate collarbones. Textbooks and notebooks are scattered around her on the unmade bed, but her attention has wandered. Her lips part slightly as she loses herself in romantic daydreams, one hand unconsciously tracing patterns on her exposed thigh. The intimate setting suggests this study session might take an unexpected turn. NSFW content, bedroom setting, sensual atmosphere.',
'{"model": "sdxl", "style": "realistic", "quality": "high", "content_rating": "nsfw", "scene_type": "bedroom_study"}'),

('310002b8-c4a4-4540-be72-c8d521c8809e',
'Mei Chen in a flowing yukata at a traditional Japanese festival, fireworks illuminating the night sky. Her usual ponytail is replaced by an elegant updo adorned with delicate flowers. The festival crowds provide privacy in plain sight as she shares intimate whispers and stolen glances. Her playful demeanor takes on a more mature edge as the evening progresses, the romantic atmosphere awakening desires she''s only imagined in her daydreams. NSFW content, festival setting, romantic awakening.',
'{"model": "sdxl", "style": "realistic", "quality": "high", "content_rating": "nsfw", "scene_type": "festival_romance"}');