

## Fix: Video Upload Fails with "mime type not supported"

### Root Cause

The `user-library` storage bucket does not have `video/quicktime` in its `allowed_mime_types`. iPhones record `.MOV` files with MIME type `video/quicktime`. The only MIME type migration (Feb 2026) updated the `reference_images` bucket -- `user-library` was never configured.

Console error confirms: `mime type video/quicktime is not supported` when uploading a `.MOV` from an iPhone.

### Fix

**1. SQL Migration — Update `user-library` bucket MIME types and size limit**

Add `video/quicktime` (and ensure all video types) to the `user-library` bucket:

```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'video/mp4', 'video/webm', 'video/quicktime'
],
file_size_limit = 209715200  -- 200MB
WHERE id = 'user-library';
```

**2. Client-side: normalize `.MOV` extension in `uploadReferenceImage`**

In `src/lib/storage.ts`, the `uploadReferenceImage` function builds filenames using the original extension. `.MOV` files should be kept as-is (the bucket will now accept them), but we should normalize the extension to lowercase for consistency:

```typescript
const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
```

This is already the case — no code change needed here.

**3. Improve error messaging in upload handlers**

In `MobileSimplePromptInput.tsx`, the toast just says "Failed to upload motion video". Update the catch blocks to surface the actual error message so users see what went wrong (e.g., "File type not supported" instead of generic failure).

### Files to Modify

| File | Change |
|------|--------|
| SQL migration | Add video MIME types + size limit to `user-library` bucket |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Surface actual error message in video upload toast notifications |

