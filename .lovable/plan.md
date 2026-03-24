

## Fix: `workspace-temp` Bucket Rejects Video MIME Types

### Root Cause
The "Copy Video to Workspace" handler uploads to the `workspace-temp` bucket. Our earlier migration only added video MIME types to `user-library`. The `workspace-temp` bucket still has its original config and rejects `video/quicktime` (iPhone .MOV files).

### Fix

**SQL Migration** — Add video MIME types to `workspace-temp` bucket:

```sql
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  allowed_mime_types,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
),
file_size_limit = GREATEST(file_size_limit, 209715200)  -- 200MB
WHERE id = 'workspace-temp';
```

### Files
| File | Change |
|------|--------|
| SQL migration | Add video MIME types + size limit to `workspace-temp` bucket |

One migration, no code changes needed.

