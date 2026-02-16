

# Fix: Video Extend Duration Settings

## Problem

The generated video from LTX Extend is the same length as the source because the duration math doesn't account for extension. Two issues:

1. **The `num_frames` cap is too low**: The model's `input_schema` has `num_frames.max = 161` at 30fps, which is only ~5.3 seconds total output. If your source video is already 5 seconds, the output can never be meaningfully longer.

2. **Duration represents total output, not extension length**: The UI duration slider sets total `num_frames` (source + extension combined). Users expect to set how much *additional* time to add, but the model treats it as the total output length.

## Root Cause

The `num_frames` constraint in the database (`max: 161`) appears too restrictive. LTX Video 13B Extend on fal.ai likely supports higher frame counts. The current value may have been copied from the non-extend model.

## Proposed Fix

### 1. Verify and update `num_frames.max` in the database

Run a query to update the extend model's `num_frames.max` to a more reasonable value. Based on fal.ai docs for LTX 13B Extend, the model should support longer outputs (e.g., 257 or higher frames). This is a database-only change:

```sql
-- Check current value and update num_frames max for the extend model
UPDATE api_models
SET capabilities = jsonb_set(
  capabilities,
  '{input_schema,num_frames,max}',
  '257'  -- ~8.5s at 30fps, verify against fal.ai docs
)
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/extend';
```

The exact max should be verified against fal.ai's documentation for this endpoint.

### 2. Adjust duration logic for extend models in the frontend

**File: `src/hooks/useLibraryFirstWorkspace.ts`** (~line 1272)

For extend models, the UI duration should represent the **desired total output length**, and the UI should make this clear. Alternatively, add the source video duration to the user's requested extension duration. Since we don't know the source video's exact length from the frontend, the simplest fix is:

- Ensure the duration slider shows values that make sense for extension (e.g., minimum = source length + 1 second)
- Or: set a sensible minimum `num_frames` floor for extend models (e.g., at least 200 frames / ~6.7s)

### 3. Set a reasonable default duration for extend

**File: `src/hooks/useVideoModelSettings.ts`**

When `referenceMode === 'video'`, override the default duration to something longer (e.g., 8-10 seconds) so users get a meaningfully extended result by default instead of a near-duplicate.

### 4. Update `input_defaults.num_frames` in the database

The current default is `121` (4 seconds). For an extend model, this should be higher:

```sql
UPDATE api_models
SET input_defaults = jsonb_set(
  input_defaults,
  '{num_frames}',
  '241'  -- ~8s at 30fps
)
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/extend';
```

## Summary of Changes

| Location | Change |
|---|---|
| Database: `api_models` | Increase `num_frames.max` and `input_defaults.num_frames` for the extend model |
| `src/hooks/useVideoModelSettings.ts` | Override default duration for extend models to be longer |
| `src/hooks/useLibraryFirstWorkspace.ts` | No code change needed if DB values are corrected |

## Key Insight

This is primarily a **database configuration issue**. The `num_frames.max = 161` constraint makes it impossible to generate output longer than ~5.3 seconds. Once the DB values are corrected, the existing duration-to-frames conversion logic will work correctly.

