

# Upgrade Image Compare Tab: I2I, I2V, Reference Images, and Solo-Panel Mode

## Overview

Extend the current Image Compare tab from T2I-only to support Image-to-Image (I2I) and Image-to-Video (I2V) models, add reference image loading from multiple sources, and allow disabling one panel to test a single model.

## Changes

### 1. Expand Model Dropdown (Grouped by Type)

Currently the dropdown only shows T2I generation models. The new dropdown will show all visual model categories using `SelectGroup` headers:

- **None** (disables the panel)
- **Text-to-Image** -- Flux-2, Seedream, SDXL, etc.
- **Image-to-Image** -- Flux-2 Flash i2i, Seedream Edit, etc.
- **Image-to-Video** -- WAN 2.1 I2V, LTX 13b i2v, etc.

### 2. "None" Option for Solo Testing

When a panel is set to "None":
- Panel shows a grayed-out disabled state
- Generation only fires for the active panel
- If both panels are "None", the Send button is disabled

### 3. Reference Image Slots

A new `ReferenceImageSlots` component appears in each panel header when the selected model requires reference images.

**Slot behavior by model type:**

| Model type          | Slots shown | Required? |
|---------------------|-------------|-----------|
| T2I (generation)    | 0 (hidden)  | N/A       |
| I2I (single-ref)    | 1           | Yes       |
| I2I (multi-ref)     | 1-4 (+add)  | At least 1|
| I2V                 | 1           | Yes       |
| None                | 0 (hidden)  | N/A       |

**Three loading sources per slot:**
- **File upload**: Local file picker, uploads to `reference_images` bucket
- **Library**: Opens existing `ImagePickerDialog` to browse user library
- **Workspace**: Opens `ImagePickerDialog` in workspace mode

Each panel has independent reference images, enabling comparison of the same prompt+image across different models.

### 4. Video Output Rendering

When the selected model is I2V, results render as `<video>` tags with controls instead of `<img>`. Detection: model's `modality === 'video'` or result URL ends in `.mp4`/`.webm`.

### 5. Validation

- If a panel's model requires reference images but none are provided, Send is disabled for that panel with a warning badge
- Both panels "None" disables Send entirely

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/playground/ReferenceImageSlots.tsx` | Reusable component: 1-4 image slots with upload/library/workspace sources |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/playground/ImageCompareView.tsx` | Grouped model dropdown, None option, reference image state, conditional ReferenceImageSlots, video output, updated `generateForPanel` to pass `image_url`/`image_urls` |
| `src/hooks/useApiModels.ts` | Add `useAllVisualModels()` hook fetching T2I + I2I + I2V models |

### No Backend Changes

The `fal-image` edge function already handles `image_url`, `image_urls`, and video models.

### Generation Request Body (Updated)

```text
{
  prompt: finalPrompt,
  apiModelId: panel.modelId,
  job_type: isVideo ? 'video' : 'image_high',
  input: {
    image_url: singleRefUrl,         // single-ref models
    image_urls: [url1, url2, ...],   // multi-ref models
  },
  metadata: { source: 'playground-image-compare' }
}
```

### Upload Flow (File Source)

1. User clicks "+" on empty slot, selects "Upload file"
2. Hidden file input opens (accept="image/*")
3. Upload to `reference_images/{userId}/ref_{timestamp}.jpg`
4. Get signed URL
5. Store in panel's `referenceImages` array

