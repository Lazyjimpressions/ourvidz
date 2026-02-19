

# Fix: Remove `result_url` from `fal-image` Job Update

## Problem

The `fal-image` edge function tries to update the `jobs` table with a `result_url` column that doesn't exist in the database schema. This causes a `PGRST204` error on every scene generation:

```
Could not find the 'result_url' column of 'jobs' in the schema cache
```

The error is non-fatal (images still generate and save correctly), but it prevents the job record from being marked `completed`, which can cause stale job status in the UI.

## Root Cause

Line 1362 in `supabase/functions/fal-image/index.ts` includes `result_url: storagePath` in the job update payload. The `jobs` table has no such column -- the storage path should go in the `metadata` JSONB field instead (where it's already being stored as `original_fal_url`).

## Fix

**File: `supabase/functions/fal-image/index.ts`** (line ~1362)

Remove `result_url` from the `.update()` call. The storage path is already preserved in `metadata.original_fal_url` and in the `workspace_assets` / `character_scenes` records.

Before:
```typescript
.update({
  status: 'completed',
  completed_at: new Date().toISOString(),
  result_url: storagePath,  // <-- column doesn't exist
  metadata: { ... }
})
```

After:
```typescript
.update({
  status: 'completed',
  completed_at: new Date().toISOString(),
  metadata: {
    ...jobData.metadata,
    result_type: resultType,
    fal_response: falResult,
    input_used: modelInput,
    original_fal_url: resultUrl,
    storage_path: storagePath,   // move here instead
    thumbnail_path: thumbnailPath
  }
})
```

Also check `character-portrait/index.ts` (line ~556) for the same issue and fix it there too.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Remove `result_url` from job update, store path in metadata instead |
| `supabase/functions/character-portrait/index.ts` | Same fix if it updates jobs with `result_url` |

## Impact

- Jobs will correctly transition to `completed` status
- No data loss -- storage paths are already tracked in metadata and related tables
- Redeploy both edge functions after fix
