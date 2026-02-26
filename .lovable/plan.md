
# Fix Playground to Use Existing Job Infrastructure

## The Core Insight

You're right -- the playground is reinventing the wheel. The `fal-image` edge function **already creates** a `jobs` row AND a `workspace_assets` row on every call. It returns the real `jobId` in the response. But `ImageCompareView` uses `data.jobId || crypto.randomUUID()` and treats the result as ephemeral, breaking every downstream system (ratings, details, scoring) that keys off real job/asset records.

The fix is NOT to build playground-specific alternatives. It's to stop ignoring the infrastructure that's already working.

## What's Actually Broken (and Why)

1. **QuickRating fails silently**: `PromptScoringService.upsertQuickRating` looks up the `jobs` table to get prompt/model info. When `gen.id` is a `crypto.randomUUID()` with no corresponding row, it returns "Job not found" and the rating is lost.

2. **Generation details modal is empty**: `PromptDetailsSlider` queries `workspace_assets` by ID. Since the playground ignores the real `jobId`, the lightbox passes a fake UUID that matches nothing.

3. **Model dropdown incomplete**: Only shows `t2i`, `i2i`, `i2v` groups. Missing `t2v`, `extend`, `multi`.

## The Fix: 3 Surgical Changes

### 1. Use the real `jobId` from edge function responses

In `ImageCompareView.tsx`, the `generateForPanel` function already receives `data.jobId` from `fal-image`/`replicate-image`. The edge function creates the job row, workspace asset, everything. Just stop falling back to `crypto.randomUUID()`:

```typescript
// BEFORE (line 296):
id: data.jobId || crypto.randomUUID(),

// AFTER:
id: data.jobId,
```

If `data.jobId` is somehow missing, the generation failed and shouldn't be added to the panel. Add a guard for that.

### 2. Pass real job ID to UnifiedLightbox

The lightbox already supports `PromptDetailsSlider` via `showPromptDetails` (default `true`). It queries `workspace_assets` using the `assetId` from `LightboxItem.id`. Since the edge function creates the `workspace_assets` row with the same `job_id`, the details will populate automatically once we pass the real `jobId`.

No changes needed to the lightbox itself -- it already works. The only issue was passing fake UUIDs.

### 3. Add missing model groups to dropdown

Add `t2v`, `extend`, and `multi` groups from `useAllVisualModels()` (already returned, just unused).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/playground/ImageCompareView.tsx` | (1) Guard against missing `jobId` instead of falling back to random UUID. (2) Add `t2v`, `extend`, `multi` to model dropdown. (3) Auto-detect `task_type` for SavePromptDialog from selected model. |

That's it. One file. The ratings, details modal, and scoring all work automatically once the real `jobId` flows through. No new methods, no new components, no playground-specific scoring path.

## What About Replicate Polling?

The Replicate path already returns `data.jobId` from the initial call (the edge function creates the job row before returning). The polling loop just checks status -- the `jobId` is already available. Same fix applies.

## What About the Prompt Drawer task_type?

Currently hardcoded to `'t2i'`. Will update to derive from the active panel's model tasks so saved prompts get the correct tag and the drawer filters appropriately.
