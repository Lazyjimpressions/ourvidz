-- Allow workspace assets as reference source for storyboard clips
ALTER TABLE public.storyboard_clips
DROP CONSTRAINT IF EXISTS storyboard_clips_reference_image_source_check;

ALTER TABLE public.storyboard_clips
ADD CONSTRAINT storyboard_clips_reference_image_source_check
CHECK (
  reference_image_source IS NULL OR
  reference_image_source = ANY (
    ARRAY[
      'extracted_frame'::text,
      'uploaded'::text,
      'generated'::text,
      'character_portrait'::text,
      'library'::text,
      'workspace'::text
    ]
  )
);