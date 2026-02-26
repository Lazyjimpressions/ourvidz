

# Fix Score-Generation Edge Function Duplicate Key Error

## Root Cause

The `score-generation` edge function fails with a `23505` duplicate key error when trying to INSERT into `prompt_scores`. This happens because:

1. The function checks if a `prompt_scores` row exists (line 182-186)
2. If no row exists and `force=false`, it runs vision analysis and then tries to INSERT
3. But between the existence check and the INSERT, a QuickRating (from the user clicking stars on a tile) can create the row via `upsertQuickRating`
4. The INSERT then fails with "duplicate key value violates unique constraint"

There's also a secondary issue: the `force` flag in `PromptDetailsSlider.tsx` is set to `!!score?.vision_analysis`. When a user has given a QuickRating (creating a score row) but no vision analysis has run yet, `force` is `false`. The edge function then sees the existing row and returns "Score already exists" -- never running vision analysis at all.

## Fix (2 changes)

### 1. Edge function: Replace INSERT with UPSERT (score-generation/index.ts)

In the "New score: INSERT" branch (around line 276), change from `.insert(...)` to `.upsert(..., { onConflict: 'job_id' })`. This way if a QuickRating created the row in the meantime, the vision columns are merged in rather than causing a conflict. User ratings set by QuickRating are preserved since the upsert payload only contains vision-related columns.

### 2. Frontend: Fix force flag logic (PromptDetailsSlider.tsx)

Line 716 currently passes `force: !!score?.vision_analysis` -- meaning "only force if vision analysis already exists." But the real intent of the rescore button is "always run vision analysis, even if a score row exists." Change to:

```typescript
// Always force when user explicitly clicks rescore
const result = await PromptScoringService.triggerVisionScoring(
  jobId,
  signedUrl,
  true  // user explicitly requested scoring
);
```

This ensures clicking "Rescore" always runs vision analysis regardless of whether a `prompt_scores` row already exists (with or without prior vision data).

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/score-generation/index.ts` | Change `.insert(...)` to `.upsert(..., { onConflict: 'job_id' })` on line ~276 |
| `src/components/lightbox/PromptDetailsSlider.tsx` | Change `force` parameter on line 716 to `true` |

## Impact

- Fixes the duplicate key crash when QuickRating and vision scoring race
- Fixes the "Score already exists" skip when user has rated but wants vision analysis
- No schema changes needed
- Preserves existing user ratings when vision scoring runs

