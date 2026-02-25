

# Video Extend: Fix Pipeline and Add UI Controls with Tooltips

## Problem
1. Videos of any length CAN be extended -- the model accepts any video and appends up to 161 frames (~5.3s at 30fps) of new footage. The current behavior of "taking the first part" is likely just the model's natural behavior with uncompressed long videos. The `constant_rate_factor` (CRF) param exists specifically to compress input video to match training data, improving results with longer sources.
2. `reverse_video` is set by the client but the edge function silently drops it.
3. No UI controls exist for extend-specific settings (Reverse, CRF).
4. The "Duration" label in extend mode is misleading -- it should say "Extend by".

## Changes

### 1. Edge Function: Forward extend params
**File:** `supabase/functions/fal-image/index.ts`

After the video URL handling block (~line 459), add pass-through for:
- `reverse_video` (boolean)
- `constant_rate_factor` (integer, 20-60)

These are already in the model's `input_schema` allow-list, but the edge function's manual param-copying logic skips them. Add explicit forwarding similar to how `resolution` and `aspect_ratio` are handled.

### 2. UI: Add Extend Controls section to MobileSettingsSheet
**File:** `src/components/workspace/MobileSettingsSheet.tsx`

When the selected model has `extend` in its tasks (detected via a new `isExtendModel` prop):

- Change "Duration" label to **"Extend by"** with a tooltip: *"Amount of new footage to add to your video (up to ~5s)"*
- Add a **"Reverse Video"** toggle with tooltip: *"Reverse the input video before extending -- useful for generating footage that leads into your clip"*
- Add a **"Compression (CRF)"** slider (20-60, default 35) with tooltip: *"Compresses input video to match model training data. Lower = higher quality but slower. Recommended: 35"*
- Hide **Motion Intensity** slider (not in extend schema)

### 3. Replace phantom `extendStrength` with `extendCrf`
**Files:** `useLibraryFirstWorkspace.ts`, `MobileSettingsSheet.tsx`, `MobileSimplePromptInput.tsx`, `MobileSimplifiedWorkspace.tsx`

- Rename `extendStrength` state/props to `extendCrf` (number, default 35)
- When `isExtendModel`, include `constant_rate_factor: extendCrf` in the generation payload alongside `reverse_video`

### 4. Update types
**File:** `src/types/workspace.ts`

Update `VideoExtendSettings`:
```
interface VideoExtendSettings {
  crf: number;            // 20-60, compression quality for input
  reverseVideo: boolean;
}
```

### 5. Detect extend model and thread `isExtendModel` prop
**File:** `src/hooks/useLibraryFirstWorkspace.ts` (or parent page)

Derive `isExtendModel` from the selected model's tasks array and pass it down to `MobileSettingsSheet` and `MobileSimplePromptInput` so they can conditionally render extend controls.

### 6. Add tooltips to all extend controls
Use the existing `Tooltip` component from `src/components/ui/tooltip.tsx` wrapped around labels for:
- "Extend by" duration label
- "Reverse Video" toggle label
- "Compression (CRF)" slider label

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Forward `reverse_video` and `constant_rate_factor` from `body.input` to `modelInput` |
| `src/types/workspace.ts` | Update `VideoExtendSettings` (strength -> crf) |
| `src/hooks/useLibraryFirstWorkspace.ts` | Replace `extendStrength` with `extendCrf`; send CRF in payload; derive `isExtendModel` |
| `src/components/workspace/MobileSettingsSheet.tsx` | Add extend controls (Reverse toggle, CRF slider); conditional "Extend by" label; hide Motion Intensity; add tooltips |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Update prop names (strength -> crf); thread `isExtendModel` |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Update prop threading |

