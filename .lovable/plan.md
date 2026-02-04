
# Plan: Align Character Studio Image Generation with Roleplay

## Problem Summary
Character Studio portraits appear "zoomed in" compared to Roleplay character cards because of an aspect ratio mismatch between generation and display.

**Current State:**
- Both Roleplay and Character Studio display images in 3:4 portrait containers (`aspect-[3/4]`)
- Both generate images at 1:1 square (1024x1024)
- The `object-cover` CSS crops square images to fit portrait containers, cutting off top/bottom

**Why Roleplay "works":**
Roleplay characters often have pre-made or externally sourced images that may already be portrait-oriented. Character Studio always generates fresh images at 1:1, so the cropping is consistently noticeable.

---

## Solution: Standardize Image Generation Aspect Ratio

Modify both image generation paths to produce 3:4 portrait images (768x1024) that match the display containers exactly.

### Changes Required

#### 1. Update `CharacterImageService.ts` (Frontend Service)
Add `image_size` parameter to all generation requests to enforce 3:4 aspect ratio:

**Location:** `src/services/CharacterImageService.ts`

For the fal provider path (lines 124-146), add:
```typescript
input: {
  image_size: { width: 768, height: 1024 }, // 3:4 portrait
  image_url: params.referenceImageUrl,
  seed: params.seedLocked,
  strength: params.referenceImageUrl ? 0.65 : undefined
}
```

For the replicate provider path (lines 97-123), change:
```typescript
input: {
  width: 768,  // Changed from 1024
  height: 1024, // Changed from 1024
  // ...rest unchanged
}
```

For the default fal-image path (lines 37-51), add:
```typescript
input: {
  image_size: { width: 768, height: 1024 } // 3:4 portrait
},
metadata: {
  // ...existing metadata
}
```

#### 2. Update `character-portrait` Edge Function
Add explicit image size override after building modelInput:

**Location:** `supabase/functions/character-portrait/index.ts` (around line 239)

After:
```typescript
const modelInput: Record<string, any> = {
  prompt,
  ...(apiModel.input_defaults || {})
};
```

Add:
```typescript
// Force 3:4 portrait aspect ratio to match frontend display containers
modelInput.image_size = { width: 768, height: 1024 };
```

#### 3. Update `roleplay-chat` Edge Function (Scene Images)
Align scene image generation to also use 3:4:

**Location:** `supabase/functions/roleplay-chat/index.ts` (around line 3883)

Change:
```typescript
image_size: { width: 1024, height: 1024 },
```

To:
```typescript
image_size: { width: 768, height: 1024 }, // 3:4 portrait
```

---

## Technical Details

### Why 768x1024?
- Maintains the 3:4 aspect ratio used by `aspect-[3/4]` CSS
- Within fal.ai Seedream's supported dimensions
- Matches the display container exactly, eliminating cropping
- Total pixels: 786,432 (vs 1,048,576 for 1024x1024) - slightly faster generation

### Files Modified
| File | Change |
|------|--------|
| `src/services/CharacterImageService.ts` | Add `image_size: { width: 768, height: 1024 }` to all generation paths |
| `supabase/functions/character-portrait/index.ts` | Override `modelInput.image_size` after applying defaults |
| `supabase/functions/roleplay-chat/index.ts` | Change scene image size from 1024x1024 to 768x1024 |

### Backward Compatibility
- Existing 1:1 images will continue to display (with current cropping behavior)
- Only newly generated images will use the 3:4 aspect ratio
- No database migrations required
