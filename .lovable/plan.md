

# Fix MultiCondition: Two Simple Detection Bugs

## What's Already Working

- DB has the right model: `multi` task on `fal-ai/ltx-video-13b-distilled/multiconditioning`
- Client payload construction (`images[]` with `image_url` + `start_frame_num`) is correct
- Edge function URL signing for `images[]` array is correct
- `images` and `videos` are already in `alwaysAllowed`

## Bug 1: Client never detects multi model

**File:** `src/hooks/useLibraryFirstWorkspace.ts`

**Problem (line 1365):**
```
const isMultiModel = (selectedModel as any).tasks?.includes('multi') || ...
```
`selectedModel` has type `{ id, type, display_name }` -- no `tasks` field. Always `undefined`.

**Fix:** Fetch `tasks` from the DB query that already runs at line 1237:

- Line 1237: Change `select('capabilities')` to `select('capabilities, tasks')`
- Line 1240: Extract tasks: `const modelTasks: string[] = (modelData as any)?.tasks || [];`
- Line 1365: Replace with `const isMultiModel = modelTasks.includes('multi');`

Remove the `cachedCaps?.input_schema?.images` fallback -- it's unnecessary complexity. The `tasks` column is the authoritative source.

## Bug 2: Edge function doesn't recognize `images[]` as a reference

**File:** `supabase/functions/fal-image/index.ts`

**Problem (lines 306-313):**
```
const hasReference = hasImageUrl || hasImageUrls || hasVideoInput;
```
No check for `body.input.images`. Even if the client sends it, mode is `txt2vid`.

**Fix:**
- Line 308: Add `const hasImagesArray = Array.isArray(body.input?.images) && body.input.images.length > 0;`
- Line 309: Add to check: `const hasReference = hasImageUrl || hasImageUrls || hasVideoInput || hasImagesArray;`
- Line 312: Update mode detection: `isVideo ? (hasVideoInput ? 'v2v_extend' : hasImagesArray ? 'multi_conditioning' : 'i2v') : 'i2i'`
- Line 316: Add `hasImagesArray` to the log object

That's it. Two detection fixes. No new files, no new abstractions.

## Technical Details

### Change 1: `src/hooks/useLibraryFirstWorkspace.ts`

**Line 1237** -- expand DB select:
```typescript
// Before:
.select('capabilities')
// After:
.select('capabilities, tasks')
```

**Line 1240** -- extract tasks:
```typescript
cachedCaps = (modelData?.capabilities as any) || {};
const modelTasks: string[] = (modelData as any)?.tasks || [];  // ADD
```

**Line 1365-1366** -- simplify detection:
```typescript
// Before:
const isMultiModel = (selectedModel as any).tasks?.includes('multi') || 
                     cachedCaps?.input_schema?.images !== undefined;
// After:
const isMultiModel = modelTasks.includes('multi');
```

### Change 2: `supabase/functions/fal-image/index.ts`

**Lines 306-317** -- add images[] detection:
```typescript
const hasImageUrl = !!(body.input?.image_url);
const hasImageUrls = Array.isArray(body.input?.image_urls) && body.input.image_urls.length > 0;
const hasVideoInput = !!(body.input?.video);
const hasImagesArray = Array.isArray(body.input?.images) && body.input.images.length > 0;
const hasReference = hasImageUrl || hasImageUrls || hasVideoInput || hasImagesArray;

const generationMode = hasReference
  ? (isVideo
      ? (hasVideoInput ? 'v2v_extend' : hasImagesArray ? 'multi_conditioning' : 'i2v')
      : 'i2i')
  : (isVideo ? 'txt2vid' : 'txt2img');

console.log('Generation mode:', generationMode, {
  hasImageUrl, hasImageUrls, hasVideoInput, hasImagesArray, isVideo
});
```

## Files Summary

| File | Lines Changed | What |
|------|--------------|------|
| `useLibraryFirstWorkspace.ts` | 3 lines | Fetch `tasks` from DB, use for multi detection |
| `fal-image/index.ts` | 4 lines | Add `hasImagesArray` to reference detection and mode logic |

## Why This Is Enough

- The multi model is already correctly configured in `api_models` with `tasks: ['multi']`
- When user selects multi model + provides start/end images, the existing code at lines 1373-1384 correctly builds the `images[]` array
- The edge function at lines 457-473 already signs URLs in `images[]` and sets `modelInput.images`
- Only the two detection gates were broken
