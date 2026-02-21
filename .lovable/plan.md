

# Fix: Image Generation Broken (Sync URL + Prompt Wrapping)

## Root Cause Analysis

The fal provider's `base_url` in the database is `https://queue.fal.run`. This is correct for **async/webhook models** (video) but wrong for **sync models** (images). The `queue.fal.run` endpoint always returns `{ request_id, status: "IN_QUEUE" }` and expects a webhook to deliver results. The sync API lives at `https://fal.run`.

Every image model has `endpoint_path = null`, so the edge function takes the sync path but calls the queue URL. The safety-net detects this (`Unexpected queue status on sync call`) and returns `{ status: 'queued' }` -- but no webhook is configured for these models, so results are never delivered.

This is NOT caused by our taxonomy overhaul. The `api_providers.base_url` was not touched by our migration. This was likely broken before or was masked by a different code path.

## Fix 1: Edge function sync URL (fal-image)

**File**: `supabase/functions/fal-image/index.ts` (line ~804)

When a model is sync (`!isAsync`), replace `queue.fal.run` with `fal.run` in the endpoint URL:

```
// Line 804, currently:
const falEndpoint = `${providerBaseUrl}/${modelKey}`;

// Change to:
let falEndpoint = `${providerBaseUrl}/${modelKey}`;
if (!isAsync) {
  falEndpoint = falEndpoint.replace('queue.fal.run', 'fal.run');
}
```

This is purely dynamic -- it derives sync vs async from the model's `endpoint_path` column. No hardcoded model keys. Video models (which all have `endpoint_path = 'fal-webhook'`) continue using `queue.fal.run` as before.

## Fix 2: Remove hardcoded prompt wrapping (frontend)

**File**: `src/hooks/useLibraryFirstWorkspace.ts` (lines 918-948)

Currently, every I2I prompt gets wrapped with:
> "preserve the same person/identity and facial features from the reference image, [user prompt], maintaining similar quality and detail level"

This is wrong -- the prompt should be sent as-is to the model. If enhancement is needed, it should come from the enhance-prompt edge function (which is a separate, user-controlled toggle), not hardcoded frontend wrapping.

**Change**: In image I2I mode, pass the user's prompt directly. If the prompt is empty, use a minimal default like `"enhance this image"`.

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Replace `queue.fal.run` with `fal.run` for sync calls |
| `src/hooks/useLibraryFirstWorkspace.ts` | Remove hardcoded prompt wrapping in I2I mode (lines 925-936) |

## Edge function to redeploy

- `fal-image`

## Verification

After deploying, test:
1. T2I (no ref image) -- should return image inline
2. I2I (with ref image) -- should return modified image with user's actual prompt
3. Video (any) -- should still queue via webhook as before

