# Scene Generation Fix Summary

**Date:** 2026-01-09  
**Issue:** Subsequent scene generation failing with 422 error from fal-image  
**Root Cause:** `image_url` parameter being set to `undefined` in fal-image request

## Problem Analysis

From browser console logs and Supabase edge function logs:

1. **Browser Console:** Shows `scene_generated: false` and `scene_job_id: null`
2. **Supabase Logs:** `fal-image` edge function returns 422 (Unprocessable Entity)
3. **Root Cause:** In `supabase/functions/roleplay-chat/index.ts` line 2703, `image_url: i2iReferenceImage` is set even when `i2iReferenceImage` is `undefined`

## The Issue

When `previousSceneImageUrl` is `null` or `undefined` (which can happen if there's no previous scene or the URL wasn't properly signed), the code still sets `image_url: undefined` in the request body. The `fal-image` edge function detects this as an I2I request (because `body.input?.image_url` exists), but then fails validation because the URL is empty.

## The Fix

**File:** `supabase/functions/roleplay-chat/index.ts`  
**Line:** ~2703

**Current Code:**
```typescript
input: {
  image_size: { width: 1024, height: 1024 },
  num_inference_steps: 30,
  guidance_scale: 7.5,
  seed: seedLocked ?? undefined,
  // I2I parameters - use previous scene for iteration, or character reference for T2I
  image_url: i2iReferenceImage,
  strength: i2iReferenceImage ? i2iStrength : undefined
},
```

**Fixed Code:**
```typescript
input: {
  image_size: { width: 1024, height: 1024 },
  num_inference_steps: 30,
  guidance_scale: 7.5,
  seed: seedLocked ?? undefined,
  // ✅ FIX: Only add I2I parameters if reference image is actually provided
  ...(i2iReferenceImage && i2iReferenceImage.trim() !== '' ? {
    image_url: i2iReferenceImage,
    strength: i2iStrength
  } : {})
},
```

## Why This Fixes It

1. **Conditional Parameter Addition:** Using spread operator with conditional, only adds `image_url` and `strength` when `i2iReferenceImage` is actually defined and not empty
2. **Prevents False I2I Detection:** Without `image_url` in the input, `fal-image` won't detect it as an I2I request and will use T2I mode instead
3. **Graceful Fallback:** When no reference image is available, the system falls back to T2I mode, which is the correct behavior

## Additional Context

The frontend fix (signing URLs) was already implemented in `src/pages/MobileRoleplayChat.tsx`, but the edge function still needs this fix to handle cases where:
- `previousSceneImageUrl` is `null` or `undefined`
- URL signing fails
- The URL is empty or invalid

## Testing

After deploying this fix:
1. Test initial scene generation (T2I) - should work
2. Test subsequent scene generation (I2I) - should now work when previous scene exists
3. Test scene generation when no previous scene exists - should fall back to T2I gracefully
