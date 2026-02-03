

## Fix: First Scene Character Reference Not Being Used (T2I vs I2I Model Selection)

### Problem Analysis

**The Issue:**
When generating the first scene with a character reference image, the system:
1. Correctly passes the character reference as `image_url`
2. Correctly passes `strength: 0.35`
3. **Incorrectly uses T2I model** (`fal-ai/bytedance/seedream/v4/text-to-image`)

T2I (text-to-image) models **completely ignore** the `image_url` parameter - they only generate from text. The character reference is passed but never used.

**Edge Function Logs Confirm:**
```
generation_mode: "t2i"                    // Should be "i2i"
model_key: "fal-ai/.../v4/text-to-image"  // Should be "v4.5/edit"
image_url: "present"                      // Being ignored!
```

---

### Root Cause

**File: `supabase/functions/roleplay-chat/index.ts` (Lines 3783-3791)**

```typescript
} else if (sceneContinuityEnabled && !effectiveReferenceImageUrl) {
  // First scene with continuity enabled
  i2iReferenceImage = character.reference_image_url || undefined;
  i2iStrength = refStrength ?? 0.7;
  // BUG: effectiveI2IModelOverride is NOT set!
  // Model stays as T2I (Seedream v4) which ignores image_url
}
```

The code sets the reference image but **forgets to switch the model** from T2I to I2I.

---

### Documentation Requirement

Per `ROLEPLAY_SCENE_GENERATION.md` Model Selection Matrix:

| Scene Style | First Scene (with ref) | Model |
|-------------|------------------------|-------|
| character_only | v4.5/edit | **I2I** |
| pov | v4.5/edit | **I2I** |
| both_characters | v4.5/edit | **I2I (multi-ref)** |

First scene with character reference **must use I2I model** (v4.5/edit), not T2I.

---

### Solution

**Update the first-scene branch to set the I2I model override:**

**File: `supabase/functions/roleplay-chat/index.ts`**

**Current Code (Lines 3783-3797):**
```typescript
} else if (sceneContinuityEnabled && !effectiveReferenceImageUrl) {
  // First scene in conversation with continuity enabled - use character reference
  i2iReferenceImage = character.reference_image_url || undefined;
  i2iStrength = refStrength ?? 0.7;
  console.log('📝 Scene continuity enabled but no previous scene - using T2I with character reference:', {
    has_character_reference: !!i2iReferenceImage,
    reference_url_preview: i2iReferenceImage?.substring(0, 80),
    strength: i2iStrength
  });
} else {
  // T2I mode: Use character reference image if available
  i2iReferenceImage = character.reference_image_url || undefined;
  i2iStrength = refStrength ?? 0.7;
  console.log('🎨 T2I Mode: Using character reference for consistency');
}
```

**Fixed Code:**
```typescript
} else if (sceneContinuityEnabled && !effectiveReferenceImageUrl) {
  // First scene in conversation with continuity enabled - use character reference
  i2iReferenceImage = character.reference_image_url || undefined;
  i2iStrength = refStrength ?? 0.7;
  
  // FIX: If character has reference image, switch to I2I model (v4.5/edit)
  // T2I models ignore image_url parameter completely
  if (i2iReferenceImage) {
    effectiveI2IModelOverride = await getI2IModelKey();
    console.log('📝 First scene with character reference - using I2I model:', {
      model: effectiveI2IModelOverride,
      has_character_reference: true,
      reference_url_preview: i2iReferenceImage?.substring(0, 80),
      strength: i2iStrength
    });
  } else {
    console.log('📝 First scene without character reference - using T2I:', {
      has_character_reference: false
    });
  }
} else {
  // T2I fallback mode - only when no reference available
  i2iReferenceImage = character.reference_image_url || undefined;
  i2iStrength = refStrength ?? 0.7;
  
  // FIX: Also switch to I2I if character has reference
  if (i2iReferenceImage) {
    effectiveI2IModelOverride = await getI2IModelKey();
    console.log('🎨 Using I2I model with character reference for consistency');
  } else {
    console.log('🎨 T2I Mode: No character reference available');
  }
}
```

---

### Additional Fix: Scene Style Not Passed to Chat

The original issue about scene style (`both_characters`) not being used is a separate bug. **Both fixes are needed:**

1. **Model Selection Fix** (this plan) - Ensure I2I model is used when character reference exists
2. **Scene Style Propagation Fix** - Pass `sceneStyle` from dashboard to chat page (from previous plan)

---

### Technical Summary

| Change | File | Lines | Description |
|--------|------|-------|-------------|
| Add I2I model override for first scene | roleplay-chat/index.ts | 3783-3797 | Call `getI2IModelKey()` when `i2iReferenceImage` exists |
| Update log messages | roleplay-chat/index.ts | 3787-3796 | Change "T2I with character reference" to "I2I model" |
| Pass sceneStyle in navigation | MobileRoleplayDashboard.tsx | ~153 | Add `sceneStyle` to navigate state |
| Read sceneStyle from navigation | MobileRoleplayChat.tsx | ~216-250 | Prioritize navigation state for sceneStyle |

---

### Expected Result After Fix

**Edge Function Logs Should Show:**
```
generation_mode: "i2i"                         // Fixed
model_key: "fal-ai/.../v4.5/edit"              // Fixed - I2I model
image_url: "present"                           // Now used!
sceneStyle: "both_characters"                  // Fixed (from navigation)
```

The character reference will now be **actually used** by the I2I model to maintain character consistency in the generated scene.

