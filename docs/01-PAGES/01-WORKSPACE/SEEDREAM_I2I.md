# Seedream I2I Reference Image Functionality

**Document Version:** 1.0  
**Last Updated:** January 11, 2026  
**Status:** Active  
**Related Components:** `SimplePromptInput.tsx`, `MobileSimplePromptInput.tsx`, `fal-image/index.ts`, `useLibraryFirstWorkspace.ts`

---

## Overview

This document provides a comprehensive guide to how reference image functionality works with Seedream v4 Edit and v4.5 Edit models for Image-to-Image (I2I) generation, including exact copy mode, NSFW content handling, and desktop/mobile consistency.

---

## Seedream Model Architecture

### Available Seedream Models

| Model | Type | Use Case | Reference Image Required? | Parameter Format |
|-------|------|----------|---------------------------|------------------|
| `fal-ai/bytedance/seedream/v4/text-to-image` | T2I | New scene generation | ❌ No | Standard prompt |
| `fal-ai/bytedance/seedream/v4/edit` | I2I | Modify existing image | ✅ Yes | `image_urls` (array) |
| `fal-ai/bytedance/seedream/v4.5/edit` | I2I | Higher quality editing | ✅ Yes | `image_urls` (array) |

### Key Differences

- **v4 Edit**: Standard I2I editing with good prompt adherence
- **v4.5 Edit**: Enhanced I2I editing with:
  - Better prompt adherence
  - Better anatomy & realism
  - Better localized edits
  - Better handling of complex instructions
  - **Recommended default for I2I** (set as `is_default = true` in `api_models`)

---

## I2I Parameter Format

### Critical Implementation Detail

Seedream Edit models require `image_urls` as an **array**, not `image_url` as a string:

```typescript
// ✅ CORRECT for Seedream Edit models
{
  prompt: "modify the image to...",
  image_urls: ["https://example.com/reference.jpg"],  // Array format
  strength: 0.5
}

// ❌ INCORRECT - will fail for Seedream Edit
{
  prompt: "modify the image to...",
  image_url: "https://example.com/reference.jpg",  // String format - wrong!
  strength: 0.5
}
```

### Detection Logic

The system automatically detects which format to use based on `api_models.capabilities`:

```typescript
// From fal-image/index.ts
const requiresImageUrlsArray = capabilities?.requires_image_urls_array === true ||
                               (supportsI2I && modelKey.includes('edit'));

if (requiresImageUrlsArray) {
  modelInput.image_urls = [finalImageUrl];  // Array format
  delete modelInput.image_url;  // Remove string format if present
} else {
  modelInput.image_url = finalImageUrl;  // String format (e.g., WAN 2.1 I2V)
  delete modelInput.image_urls;  // Remove array format if present
}
```

---

## Reference Image Workflow

### 1. Reference Image Upload

**Desktop (`SimplePromptInput.tsx`):**
- Drag-drop support for workspace items
- File upload via click
- URL signing for Supabase storage paths
- Automatic metadata extraction for exact copy mode

**Mobile (`MobileSimplePromptInput.tsx`):**
- File picker (iOS/Android compatible)
- Same URL signing logic
- Same metadata extraction

**Consistency:** ✅ Both desktop and mobile use identical logic via `ReferenceImageUpload` component

### 2. Reference Image State Management

**State Variables:**
- `referenceImage: File | null` - Uploaded file object
- `referenceImageUrl: string | null` - Signed URL or external URL
- `referenceMetadata: object | null` - Extracted metadata (seed, original prompt, etc.)

**State Updates:**
```typescript
// Clearing reference image (both file and URL)
const clearReference = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  onFileChange(null);
  if (onImageUrlChange) {
    onImageUrlChange(null);
  }
  setSignedImageUrl(null);
};
```

**Consistency:** ✅ Desktop and mobile both clear file + URL + signed URL state

### 3. Reference Image URL Signing

**Process:**
1. Check if URL is already signed (starts with `http://` or `https://`)
2. If storage path (e.g., `user-library/path/to/image.jpg`):
   - Extract bucket name (`user-library`, `workspace-temp`, `reference_images`)
   - Extract file path
   - Call `supabase.storage.from(bucket).createSignedUrl(path, 3600)`
   - Use signed URL for API call

**Implementation:**
```typescript
// From ReferenceImageUpload component
useEffect(() => {
  if (!imageUrl) {
    setSignedImageUrl(null);
    return;
  }
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    setSignedImageUrl(imageUrl);
    return;
  }
  
  // Sign storage path
  const knownBuckets = ['user-library', 'workspace-temp', 'reference_images'];
  const parts = imageUrl.split('/');
  let bucket = knownBuckets.includes(parts[0]) ? parts[0] : 'user-library';
  let path = knownBuckets.includes(parts[0]) ? parts.slice(1).join('/') : imageUrl;
  
  supabase.storage.from(bucket).createSignedUrl(path, 3600)
    .then(({ data, error }) => {
      if (!error && data?.signedUrl) {
        setSignedImageUrl(data.signedUrl);
      }
    });
}, [imageUrl]);
```

---

## Exact Copy Mode

### Purpose

Exact copy mode allows users to regenerate an image with minimal changes, preserving:
- Character appearance
- Pose and composition
- Lighting and atmosphere
- Seed (for reproducibility)

### Activation

**User-Triggered:**
1. User clicks "Exact Copy" toggle in UI
2. System sets `exactCopyMode = true`
3. System sets `referenceStrength = 0.95` (high preservation)
4. System disables enhancement (if enabled)

**Auto-Activated:**
- When applying exact copy parameters from a workspace item
- When metadata extraction detects exact copy intent

### Parameters

**Exact Copy Mode:**
```typescript
{
  exactCopyMode: true,
  referenceStrength: 0.95,  // High preservation
  denoiseStrength: 0.05,     // Low modification (1 - 0.95)
  enhancementEnabled: false,  // Skip enhancement
  useOriginalParams: true,   // Use original style/angle/shot
  lockSeed: true             // Lock seed for reproducibility
}
```

**Modify Mode (Default):**
```typescript
{
  exactCopyMode: false,
  referenceStrength: 0.5-0.8,  // User-controlled or default 0.8
  denoiseStrength: 0.2-0.5,     // Higher modification
  enhancementEnabled: true,     // Enable enhancement
  useOriginalParams: false,     // Use current UI controls
  lockSeed: false              // Allow seed variation
}
```

### Prompt Handling

**With Metadata (Extracted from Reference):**
```typescript
if (exactCopyMode && referenceMetadata) {
  // Use original enhanced prompt as base
  finalPrompt = referenceMetadata.originalEnhancedPrompt;
  
  // Apply user modification if provided
  if (prompt.trim()) {
    finalPrompt = modifyOriginalPrompt(finalPrompt, prompt.trim());
  }
  
  // Use original seed
  finalSeed = referenceMetadata.originalSeed;
  
  // Use original style params if toggled
  if (useOriginalParams) {
    finalStyle = referenceMetadata.originalStyle;
    finalCameraAngle = referenceMetadata.originalCameraAngle;
    finalShotType = referenceMetadata.originalShotType;
  }
}
```

**Without Metadata (Uploaded Image):**
```typescript
if (exactCopyMode && !referenceMetadata) {
  if (prompt.trim()) {
    finalPrompt = `maintain the exact same subject, person, face, and body from the reference image, only ${prompt.trim()}, keep all other details identical, same pose, same lighting, same composition, high quality, detailed, professional`;
  } else {
    finalPrompt = 'exact copy of the reference image, same subject, same pose, same lighting, same composition, high quality, detailed, professional';
  }
}
```

### Strength Parameter

**Seedream Edit Models:**
- `strength` parameter controls how much the reference image is modified
- Range: `0.1` to `1.0`
- Default: `0.5` (moderate modification)
- Exact Copy: `0.05-0.1` (minimal modification, high preservation)

**Implementation:**
```typescript
// From fal-image/index.ts
if (body.input?.strength !== undefined) {
  modelInput.strength = Math.min(Math.max(body.input.strength, 0.1), 1.0);
} else {
  modelInput.strength = 0.5;  // Default for I2I
}
```

---

## NSFW Content Enhancement

### Current Implementation

**Enhancement Templates:**
- Separate templates for NSFW vs SFW content
- Stored in `prompt_templates` table with `content_mode = 'nsfw'` or `'sfw'`
- Model-specific templates (Seedream v4, v4.5 Edit, etc.)

**Template Selection:**
```typescript
// From enhance-prompt/index.ts
const template = await supabase
  .from('prompt_templates')
  .select('*')
  .eq('target_model', modelKey)  // e.g., 'fal-ai/bytedance/seedream/v4.5/edit'
  .eq('content_mode', contentMode)  // 'nsfw' or 'sfw'
  .eq('use_case', 'enhancement')
  .eq('is_active', true)
  .single();
```

### Current NSFW Enhancement

**Template System Prompt (NSFW):**
```
You are an expert prompt engineer specializing in creating detailed, high-quality image-to-image prompts for Seedream v4.5 Edit.

Your task is to enhance the user's prompt while incorporating their style preferences (shot type, camera angle, style) into a comprehensive, detailed prompt optimized for Seedream v4.5 Edit image-to-image generation.

Seedream v4.5 Edit supports up to 10,000 characters and is designed for modifying existing images. Focus on:
- Specific modifications to the reference image
- Visual changes and transformations
- Style and aesthetic adjustments
- Lighting and composition changes
- Character appearance modifications
- Environmental alterations

Incorporate the user's style preferences naturally into the prompt. Return only the enhanced prompt, no explanations.
```

**Fallback Enhancement (if template fails):**
```typescript
// From enhance-prompt/index.ts
if (contentMode === 'nsfw') {
  enhanced = `NSFW, ${enhanced}, detailed anatomy, explicit content`;
}
```

### Recommendations for Better NSFW Content

#### 1. Enhanced NSFW System Prompts

**Current Issue:** Generic "NSFW, detailed anatomy, explicit content" suffix is too simplistic.

**Recommendation:** Update Seedream I2I NSFW templates with explicit guidance:

```sql
-- Enhanced NSFW template for Seedream v4.5 Edit
UPDATE prompt_templates
SET system_prompt = 'You are an expert prompt engineer specializing in creating detailed, high-quality image-to-image prompts for Seedream v4.5 Edit, specifically for adult/NSFW content generation.

Your task is to enhance the user''s prompt while incorporating their style preferences (shot type, camera angle, style) into a comprehensive, detailed prompt optimized for Seedream v4.5 Edit image-to-image generation.

Seedream v4.5 Edit supports up to 10,000 characters and is designed for modifying existing images. For NSFW content, focus on:
- Explicit anatomical details and proportions
- Sensual and erotic visual elements
- Intimate poses and expressions
- Detailed clothing or lack thereof
- Atmospheric lighting that enhances mood
- Composition that emphasizes desired elements
- Specific modifications to the reference image while maintaining character consistency
- Visual changes and transformations that enhance adult appeal
- Style and aesthetic adjustments for mature content
- Lighting and composition changes that create intimate atmosphere
- Character appearance modifications that enhance attractiveness
- Environmental alterations that support adult scenarios

CRITICAL FOR NSFW I2I:
- When modifying a reference image, explicitly describe what should change (pose, clothing, expression, setting)
- Maintain character consistency (same person, same body type, same facial features)
- Use explicit but tasteful language for adult content
- Emphasize visual details that enhance the adult nature of the content
- Include specific anatomical references when appropriate
- Describe intimate or suggestive elements clearly
- Use lighting and composition to enhance the adult appeal

Incorporate the user''s style preferences naturally into the prompt. Return only the enhanced prompt, no explanations.'
WHERE target_model = 'fal-ai/bytedance/seedream/v4.5/edit'
  AND content_mode = 'nsfw'
  AND use_case = 'enhancement';
```

#### 2. Prompt Prefixes for NSFW I2I

**Recommendation:** Add explicit NSFW prefixes to I2I prompts:

```typescript
// In enhance-prompt/index.ts or fal-image/index.ts
if (contentMode === 'nsfw' && hasReferenceImage) {
  // Add NSFW-specific prefixes for I2I
  const nsfwPrefixes = [
    'explicit adult content,',
    'detailed anatomy,',
    'sensual and erotic,',
    'intimate atmosphere,',
    'mature content,'
  ];
  
  enhancedPrompt = `${nsfwPrefixes.join(' ')} ${enhancedPrompt}`;
}
```

#### 3. Strength Parameter for NSFW

**Recommendation:** Use higher strength values for NSFW I2I to ensure modifications are applied:

```typescript
// In useLibraryFirstWorkspace.ts
if (contentType === 'nsfw' && hasReferenceImage && !exactCopyMode) {
  // Use higher strength for NSFW to ensure modifications are visible
  const nsfwStrength = Math.max(referenceStrength || 0.5, 0.6);
  computedReferenceStrength = nsfwStrength;
}
```

#### 4. Negative Prompt for NSFW

**Recommendation:** Add NSFW-specific negative prompts to avoid censorship:

```typescript
// In fal-image/index.ts or queue-job/index.ts
if (contentMode === 'nsfw') {
  const nsfwNegativePrompt = 'censored, blurred, pixelated, low quality, distorted, deformed, bad anatomy, bad proportions';
  
  if (body.input?.negative_prompt) {
    modelInput.negative_prompt = `${nsfwNegativePrompt}, ${body.input.negative_prompt}`;
  } else {
    modelInput.negative_prompt = nsfwNegativePrompt;
  }
}
```

#### 5. Safety Checker Disable

**Current Implementation:** ✅ Already implemented

```typescript
// From fal-image/index.ts
if (contentMode === 'nsfw') {
  modelInput.enable_safety_checker = false;
} else {
  modelInput.enable_safety_checker = true;
}
```

---

## Desktop vs Mobile Consistency

### UI Components

**Desktop:** `SimplePromptInput.tsx`
- `ReferenceImageUpload` component with drag-drop
- Inline reference image preview
- Clear button (X) in top-right corner
- Exact copy toggle in advanced settings

**Mobile:** `MobileSimplePromptInput.tsx`
- File picker button
- Reference image preview with remove button
- Same exact copy toggle
- Collapsible advanced settings

### State Management

**Shared Hook:** `useLibraryFirstWorkspace.ts`
- Both desktop and mobile use the same hook
- Same state variables (`referenceImage`, `referenceImageUrl`, `referenceMetadata`)
- Same setters (`setReferenceImage`, `setReferenceImageUrl`, etc.)

**Consistency:** ✅ Both use identical state management

### Reference Image Clearing

**Desktop:**
```typescript
const clearReference = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  onFileChange(null);
  if (onImageUrlChange) {
    onImageUrlChange(null);
  }
  setSignedImageUrl(null);
};
```

**Mobile:**
```typescript
const handleReferenceImageRemove = (type: 'single' | 'start' | 'end') => {
  switch (type) {
    case 'single':
      setReferenceImage(null);
      setReferenceImageUrl(null);  // ✅ Now clears URL too
      setReferenceMetadata(null);
      setExactCopyMode(false);
      break;
    // ... start/end cases
  }
};
```

**Consistency:** ✅ Both clear file + URL + metadata

### Parameter Passing

**Both Desktop and Mobile:**
- Same `generationRequest` structure
- Same `referenceStrength` calculation
- Same `exactCopyMode` logic
- Same prompt enhancement flow

**Consistency:** ✅ Identical parameter passing to edge functions

---

## Edge Function Processing

### fal-image/index.ts Flow

1. **Model Detection:**
   ```typescript
   const apiModel = await supabase
     .from('api_models')
     .select('*')
     .eq('id', body.model_id)
     .single();
   
   const capabilities = apiModel.capabilities || {};
   const supportsI2I = capabilities?.supports_i2i === true;
   ```

2. **Reference Image Detection:**
   ```typescript
   const hasReferenceImage = !!(
     body.input?.image_url || 
     body.input?.image || 
     body.metadata?.referenceImage || 
     body.metadata?.reference_image_url ||
     body.metadata?.start_reference_url
   );
   ```

3. **Parameter Format Selection:**
   ```typescript
   const requiresImageUrlsArray = 
     capabilities?.requires_image_urls_array === true ||
     (supportsI2I && modelKey.includes('edit'));
   
   if (requiresImageUrlsArray) {
     modelInput.image_urls = [finalImageUrl];  // Seedream Edit
   } else {
     modelInput.image_url = finalImageUrl;     // WAN 2.1 I2V
   }
   ```

4. **Strength Parameter:**
   ```typescript
   if (body.input?.strength !== undefined) {
     modelInput.strength = Math.min(Math.max(body.input.strength, 0.1), 1.0);
   } else {
     modelInput.strength = 0.5;  // Default
   }
   ```

5. **Safety Checker:**
   ```typescript
   if (contentMode === 'nsfw') {
     modelInput.enable_safety_checker = false;
   } else {
     modelInput.enable_safety_checker = true;
   }
   ```

---

## Testing Checklist

### I2I Functionality
- [ ] Reference image upload (desktop drag-drop)
- [ ] Reference image upload (mobile file picker)
- [ ] Reference image URL signing (storage paths)
- [ ] Reference image clearing (X button)
- [ ] I2I generation with Seedream v4 Edit
- [ ] I2I generation with Seedream v4.5 Edit
- [ ] Strength parameter adjustment
- [ ] Prompt modification with reference image

### Exact Copy Mode
- [ ] Exact copy toggle activation
- [ ] Metadata extraction from reference
- [ ] Original prompt preservation
- [ ] Original seed preservation
- [ ] Original style params preservation
- [ ] Promptless exact copy (uploaded image)
- [ ] Modified exact copy (with user prompt)

### NSFW Content
- [ ] NSFW template selection
- [ ] NSFW prompt enhancement
- [ ] Safety checker disabled for NSFW
- [ ] NSFW-specific negative prompts
- [ ] NSFW strength parameter adjustment

### Desktop vs Mobile
- [ ] Same reference image state
- [ ] Same parameter passing
- [ ] Same exact copy behavior
- [ ] Same NSFW handling
- [ ] Same clearing functionality

---

## Known Issues & Future Improvements

### Current Limitations

1. **NSFW Enhancement:** Generic "NSFW, detailed anatomy" suffix is too simplistic
2. **Strength Defaults:** No NSFW-specific strength adjustments
3. **Negative Prompts:** No automatic NSFW negative prompt additions
4. **Template Updates:** NSFW templates could be more explicit

### Recommended Improvements

1. **Enhanced NSFW Templates:** Update system prompts with explicit adult content guidance
2. **NSFW Prompt Prefixes:** Add explicit prefixes for I2I NSFW content
3. **Strength Adjustments:** Higher default strength for NSFW I2I
4. **Negative Prompts:** Automatic NSFW-specific negative prompts
5. **Template Testing:** A/B test different NSFW template approaches

---

## Related Documentation

- `docs/01-PAGES/01-WORKSPACE/PURPOSE.md` - Workspace overview
- `docs/01-PAGES/01-WORKSPACE/UX_CONTROLS.md` - UI controls specification
- `docs/01-PAGES/01-WORKSPACE/DEVELOPMENT_STATUS.md` - Implementation status
- `docs/09-REFERENCE/Seedream_model_guide.md` - Seedream model reference

---

## Code References

- `src/components/workspace/SimplePromptInput.tsx` - Desktop reference image UI
- `src/components/workspace/MobileSimplePromptInput.tsx` - Mobile reference image UI
- `src/hooks/useLibraryFirstWorkspace.ts` - Reference image state management
- `supabase/functions/fal-image/index.ts` - Seedream I2I API handling
- `supabase/functions/enhance-prompt/index.ts` - Prompt enhancement logic
- `supabase/migrations/create_workspace_enhancement_templates.sql` - Enhancement templates
