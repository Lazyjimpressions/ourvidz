
# Fix: Scenes Returning Same Image Every Time

## Root Cause

Three issues compound to produce identical images on every generation:

### Issue 1: Broken I2I Chain (PRIMARY CAUSE)
The `previous_scene_image_url` is `null` on the 4 most recent scenes. When the server-side fallback query (line 2657) runs, the previous scene's `image_url` hasn't been written yet (async generation). This causes `effectiveReferenceImageUrl` to fall through to the **character reference image** (line 2801). Result: Figure 1 = character portrait, Figure 2 = character portrait -- the model receives the **same image twice** and produces nearly identical output every time.

### Issue 2: Garbage Scene Extraction
The regex-based `analyzeSceneContent()` produces broken settings like "Inside.", "Spa.", "At the.", "in the" -- too vague to differentiate scenes. The ACTION block contains first-person internal monologue ("I feel my heart pounding") that the image model cannot render.

### Issue 3: Same CHARACTER Block Every Time
Every scene sends identical appearance tags including scene-specific ones ("tropical beach aesthetic", "colorful swimwear") that contradict the actual setting.

---

## Fix Plan

### Fix 1: Ensure I2I Chain Never Breaks (Critical)

**File: `supabase/functions/roleplay-chat/index.ts`**

The server-side fallback query at line 2657 only looks for scenes with non-null `image_url`. But due to async generation, the most recent scene may not have its image yet. 

**Changes:**
- Expand the fallback query to also check for scenes that are still generating (have a `job_id` but no `image_url` yet) -- skip those and find the **last completed** scene instead
- Add a secondary fallback: if no completed scene exists, use the scene template's `preview_image_url` as Figure 1 instead of the character portrait
- When `effectiveReferenceImageUrl` falls through to the character reference (line 2799-2806), **do NOT use it as Figure 1**. Instead, leave Figure 1 empty and only send the character reference as Figure 2. This prevents the "same image twice" problem

The key logic change:
```
// BEFORE (broken): When no previous scene found, character ref becomes Figure 1 AND Figure 2
effectiveReferenceImageUrl = sceneCharacter?.reference_image_url

// AFTER: When no previous scene found, skip Figure 1 entirely
effectiveReferenceImageUrl = undefined; // No Figure 1
// Figure 2 (character ref) still gets added at line 3541
```

This means when the I2I chain breaks, the system falls back to a single-reference generation (character only as Figure 2) rather than sending duplicate images.

### Fix 2: De-duplicate image_urls Array

**File: `supabase/functions/roleplay-chat/index.ts`**

Add a de-duplication check after building the `imageUrlsArray` (after line 3554). If Figure 1 and Figure 2 resolve to the same storage path, remove the duplicate. This is a safety net for the edge case where both point to the same character reference.

```typescript
// After building imageUrlsArray
// De-duplicate: if Figure 1 and Figure 2 are the same image, keep only one
const deduplicatedUrls = [...new Set(
  imageUrlsArray.map(url => {
    // Extract storage path (strip query params/tokens for comparison)
    const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/(.+?)(?:\?|$)/);
    return match ? match[1] : url;
  })
)];
if (deduplicatedUrls.length < imageUrlsArray.length) {
  console.warn('⚠️ Duplicate image URLs detected in array, de-duplicating');
  // Keep only unique URLs (use the last occurrence which has the freshest token)
  // ... trim imageUrlsArray
}
```

### Fix 3: Improve Scene Extraction (Already Planned - P0)

This was already approved in the previous plan. The LLM-based structured extraction replaces the broken regex `analyzeSceneContent()` that produces "Inside.", "At the.", etc. This fix is separate but complementary.

### Fix 4: Clothing Tags Separation (Already Implemented)

The clothing/physical tag split was just deployed. This prevents "tropical beach aesthetic" and "colorful swimwear" from appearing in every scene prompt. Users can now move those to "Default Outfit" so they don't contaminate scenes set in offices, spas, etc.

---

## Technical Details

### Files Modified
| File | Change | Risk |
|------|--------|------|
| `supabase/functions/roleplay-chat/index.ts` | Fix fallback logic (line 2799-2806) to not use character ref as Figure 1 | Low |
| `supabase/functions/roleplay-chat/index.ts` | Add image_urls de-duplication after line 3554 | Low |

### Expected Outcome
- When I2I chain breaks, system sends 1 image (character ref as Figure 2 only) instead of 2 identical images
- Different prompts with the same single reference will produce visually distinct images
- Scene extraction improvements (separate task) will further differentiate outputs
