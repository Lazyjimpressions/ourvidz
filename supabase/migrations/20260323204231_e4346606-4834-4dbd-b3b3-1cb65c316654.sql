-- 1. Add user_library to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_library;

-- 2. Backfill pose_key into generation_metadata from label for position rows
UPDATE user_library
SET generation_metadata = jsonb_set(
  COALESCE(generation_metadata, '{}'::jsonb),
  '{pose_key}',
  to_jsonb(
    CASE label
      WHEN 'Front' THEN 'front_neutral'
      WHEN 'Rear' THEN 'rear'
      WHEN 'Bust' THEN 'bust'
      WHEN 'Side Left' THEN 'side_left'
      WHEN 'Side Right' THEN 'side_right'
      WHEN 'Three Quarter' THEN 'three_quarter'
    END
  )
)
WHERE output_type = 'position'
  AND label IN ('Front', 'Rear', 'Bust', 'Side Left', 'Side Right', 'Three Quarter')
  AND (generation_metadata IS NULL OR generation_metadata = '{}'::jsonb OR NOT (generation_metadata ? 'pose_key'));

-- 3. Extract bare paths from signed URLs stored in storage_path
UPDATE user_library
SET storage_path = regexp_replace(
  storage_path,
  '^https://[^/]+/storage/v1/object/sign/user-library/([^?]+)\?.*$',
  '\1'
)
WHERE storage_path LIKE 'https://%/storage/v1/object/sign/user-library/%';