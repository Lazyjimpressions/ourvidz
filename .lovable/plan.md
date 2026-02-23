

# Audit: Implementation vs Plan — Gaps Found

## Summary

The core service layer (`PromptScoringService.ts`) and edge function updates are solid. The main gaps are in the **PromptDetailsSlider scoring UI** (incomplete per-dimension ratings, broken re-score, missing admin controls) and a missing debug log cleanup.

---

## Gap 1: Generation Details shows ONE rating, not THREE per-dimension ratings

**Plan said:** "Show detailed star rating inputs (per-dimension) for users who want to refine their quick rating" — action, appearance, quality each with their own star row.

**What was built:** A single "Your Rating" star row (lines 637-663) that calls `upsertQuickRating` which sets all 3 dimensions to the same value. There is no way for a user to adjust individual dimensions in the lightbox.

**Fix:** Replace the single star row with 3 labeled star rows:
- Action Match (how well the image matches the requested action/pose)
- Appearance Match (how well it matches described appearance)
- Quality (overall image quality)

Each row calls a new `updateIndividualRating(jobId, dimension, value)` method on `PromptScoringService` that updates only that column. Initialize each from the score record (`user_action_rating`, `user_appearance_rating`, `user_quality_rating`).

---

## Gap 2: Re-score / Score button does nothing

**Plan said:** "Score button (admin) to trigger score-generation" and "Re-score button to trigger score-generation."

**What was built:** `handleTriggerScoring` (lines 584-594) shows a toast and sets a 5-second timeout to re-fetch, but **never actually calls** `PromptScoringService.triggerVisionScoring()`. It just says "Scoring triggered..." without invoking the edge function.

**Fix:** The handler needs to:
1. Get the image URL — resolve from `workspace_assets.storage_path` via a signed URL (not the expired fal.ai URL)
2. Call `PromptScoringService.triggerVisionScoring(jobId, signedUrl, originalPrompt, { enhancedPrompt, apiModelId, userId })`
3. Handle the "score already exists" case in `score-generation` — currently it returns early with `skipped: true`. For re-scoring, either pass a `force: true` flag or have the edge function delete-then-reinsert.

This also means `score-generation/index.ts` needs a `force` parameter to allow re-scoring (delete existing, then re-analyze).

---

## Gap 3: No admin controls (admin rating, feedback tags, comment, preserve toggle)

**Plan said:** "Admin users see additional fields: admin rating inputs, comment textarea, feedback tag selector, preserve toggle."

**What was built:** Only the Score/Re-score button for admins. No admin rating inputs, no feedback tags, no comment field, no preserve toggle.

**Fix:** Add an admin-only section below the user rating:
- 3 number inputs or star rows for admin_action_rating, admin_appearance_rating, admin_quality_rating
- A horizontal chip selector for feedback tags (e.g., "wrong_pose", "good_likeness", "bad_hands", etc.)
- A single-line comment textarea
- A preserve toggle + reason field
- A Save button that calls a new `updateAdminScoring()` method on `PromptScoringService`

---

## Gap 4: No image URL resolution for scoring

**Plan said:** "fal.ai URLs expire; scoring should use persisted storage paths with signed URLs."

**What was built:** `handleTriggerScoring` checks `score?.original_prompt` but has no way to get the actual image URL for the asset. The comment says "We need a signed image URL - for now use a placeholder approach."

**Fix:** Add a method to `PromptScoringService` (or inline in the handler) that:
1. Queries `workspace_assets` by `job_id` to get `storage_path`
2. Generates a signed URL via `supabase.storage.from('workspace-temp').createSignedUrl(path, 3600)`
3. Passes that URL to `triggerVisionScoring`

---

## Gap 5: Debug console.log still present

**What was built:** `useFetchImageDetails.ts` line 159 still has:
```
console.log('useFetchImageDetails: jobId =', workspaceAsset.job_id);
```

**Fix:** Remove it.

---

## Gap 6: score-generation doesn't support re-scoring

**Plan said:** "Re-scoring should use an upsert or delete-then-insert pattern."

**What was built:** The edge function (lines 159-171) checks for existing score and returns `skipped: true` if one exists. There is no way to force a re-score.

**Fix:** Accept an optional `force: boolean` in the request body. When true, delete the existing score row before proceeding with vision analysis.

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/lightbox/PromptDetailsSlider.tsx` | Replace single rating with 3 per-dimension star rows; wire `triggerVisionScoring` properly with signed URL; add admin section (ratings, tags, comment, preserve) |
| `src/lib/services/PromptScoringService.ts` | Add `updateIndividualRating()`, `updateAdminScoring()`, `getSignedImageUrl()` methods |
| `supabase/functions/score-generation/index.ts` | Add `force` parameter to allow re-scoring by deleting existing row first |
| `src/hooks/useFetchImageDetails.ts` | Remove debug console.log on line 159 |

