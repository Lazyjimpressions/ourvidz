

# Fix: Allow Video Upload for LTX Extend in Reference Images Bucket

## Problem

The `reference_images` storage bucket only allows image MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`). When you try to upload a video file for LTX Extend, Supabase rejects it with "mime type video/mp4 is not supported".

## Solution

Add `video/mp4` and `video/webm` to the `reference_images` bucket's allowed MIME types. This is a single SQL migration -- no code changes needed.

## Technical Details

### SQL Migration

```text
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm'
],
file_size_limit = 52428800  -- 50MB (videos are larger than images)
WHERE id = 'reference_images';
```

The current file size limit is 10MB which is too small for video files. The memory note mentions video uploads up to 50MB are expected, so we increase the limit accordingly.

### Why this is sufficient

- The upload code in `storage.ts` (`uploadReferenceImage`) already handles any file type -- it just passes the file to `supabase.storage.from('reference_images').upload()`
- The workspace code already detects video files and auto-switches to extend models
- The edge function already handles video URLs in the payload
- The only blocker is the bucket's MIME type whitelist

## Files to Change

| File | Change |
|------|--------|
| SQL migration | Add video/mp4 and video/webm to reference_images bucket allowed_mime_types, increase file_size_limit to 50MB |

