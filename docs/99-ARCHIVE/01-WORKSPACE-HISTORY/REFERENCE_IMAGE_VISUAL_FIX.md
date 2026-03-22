# Reference Image Visual Clearing Fix - Mobile

**Date:** January 11, 2026  
**Status:** ✅ Fixed  
**Issue:** Old reference image not clearing visually on mobile when new image is uploaded

---

## Problem

**Symptoms:**
- ✅ Backend correctly recognizes new images
- ✅ Upload works on iPhone
- ❌ Visual display shows old image conflicting with new image
- ❌ Old image doesn't clear from reference box on mobile

**Root Cause:**
When a new image is uploaded via `handleReferenceImageUrlSet`, React batches state updates. The preview component (`MobileReferenceImagePreview`) may still show the old `imageUrl` while the new one is being set, causing visual conflicts.

---

## Solution

### 1. Clear State Before Setting New URL

**File:** `src/pages/MobileSimplifiedWorkspace.tsx`

**Change:**
- Clear both `file` and `imageUrl` state FIRST
- Use `requestAnimationFrame` to ensure DOM updates before setting new URL
- This gives the preview component time to clear the old image

```typescript
// Clear old state first (both file and URL cleared together)
setReferenceImage(null);
setReferenceImageUrl(null);
// Use requestAnimationFrame to ensure DOM updates before setting new URL
requestAnimationFrame(() => {
  setReferenceImageUrl(url);
});
```

### 2. Force Preview Component Re-render

**File:** `src/components/workspace/MobileSimplePromptInput.tsx`

**Change:**
- Added `key` prop to `MobileReferenceImagePreview` component
- Key changes when URL changes, forcing React to remount the component
- This ensures old image is completely cleared before new one displays

```typescript
<MobileReferenceImagePreview
  key={referenceImageUrl || referenceImage?.name || 'ref-image'} // Force re-render
  file={referenceImage}
  imageUrl={referenceImageUrl}
  // ...
/>
```

### 3. Enhanced Preview Component Logging

**File:** `src/components/workspace/MobileReferenceImagePreview.tsx`

**Changes:**
- Added detailed logging to track state changes
- Better cleanup of blob URLs when file/imageUrl changes
- Clearer console messages for debugging

---

## Backend Workflow Verification

**Status:** ✅ Correct

**Flow:**
1. User selects image → `handleFileInputChange()` in `MobileSimplePromptInput`
2. iOS file processing (HEIC conversion, validation)
3. **Immediate upload** → `uploadAndSignReferenceImage()` called
4. Upload to Supabase Storage → `reference_images` bucket
5. Sign URL → `getReferenceImageUrl()` returns signed URL
6. Store signed URL → `handleReferenceImageUrlSet()` callback
7. Clear old state → `setReferenceImage(null)`, `setReferenceImageUrl(null)`
8. Set new URL → `setReferenceImageUrl(signedUrl)`
9. Preview updates → `MobileReferenceImagePreview` receives new `imageUrl`
10. Generation uses URL → `referenceImageUrl` passed to edge function
11. Edge function converts → `fal-image` converts to `image_urls` array for Seedream

**Edge Function Processing:**
- `fal-image/index.ts` receives `referenceImageUrl` in request body
- For Seedream Edit models (`requiresImageUrlsArray === true`):
  - Converts `image_url` to `image_urls` array format
  - Removes `image_url` parameter
  - Sends to fal.ai API with correct format

---

## Testing Checklist

### Mobile (iPhone)
- [x] Upload first image → Displays correctly
- [x] Upload second image → Old image clears, new image displays
- [x] Upload third image → Previous image clears, new image displays
- [x] Clear button → Image clears completely
- [x] Generate with image → Uses correct signed URL

### Backend
- [x] Signed URLs are valid and accessible
- [x] Edge function receives correct URL format
- [x] Seedream models receive `image_urls` array format
- [x] Generation succeeds with reference images

---

## Files Modified

1. **`src/pages/MobileSimplifiedWorkspace.tsx`**
   - Updated `handleReferenceImageUrlSet` to clear state before setting new URL
   - Changed from `setTimeout` to `requestAnimationFrame` for better timing

2. **`src/components/workspace/MobileSimplePromptInput.tsx`**
   - Added `key` prop to `MobileReferenceImagePreview` to force re-render
   - Updated display text to show "Uploaded image" when using URL

3. **`src/components/workspace/MobileReferenceImagePreview.tsx`**
   - Enhanced logging for state changes
   - Improved blob URL cleanup

---

## Related Documentation

- `REFERENCE_IMAGE_UPLOAD_WORKFLOW.md` - Complete upload workflow
- `SEEDREAM_I2I.md` - Seedream I2I functionality details
