# Reference Image Upload Workflow - Definitive Implementation

**Date:** January 11, 2026  
**Status:** 🔧 Implementation Plan  
**Related Components:** `SimplePromptInput.tsx`, `MobileSimplePromptInput.tsx`, `useLibraryFirstWorkspace.ts`, `storage.ts`

---

## Problem Statement

**Current Issue:**
- Reference image uploads work on desktop but fail on iPhone
- File objects may not persist properly on iOS between selection and generation
- Path handling may be inconsistent between upload and signing
- Workflow differs between desktop (drag-drop) and mobile (file picker)

**Goal:**
Create a unified, robust workflow that:
1. ✅ Works consistently on desktop and iPhone
2. ✅ Handles modify mode and copy mode identically
3. ✅ Works with Seedream v4 Edit and v4.5 Edit models
4. ✅ Uploads immediately on file selection (not waiting for generation)
5. ✅ Stores signed URL in state for immediate use

---

## Current Workflow Analysis

### Desktop Workflow (Current)
```
User selects/drops file
  ↓
ReferenceImageUpload.handleFileUpload()
  ↓
onFileChange(file) → setReferenceImage(file)
  ↓
File stored in state (File object)
  ↓
User clicks Generate
  ↓
generate() → uploadAndSignReference(referenceImage)
  ↓
Upload to Supabase Storage
  ↓
Sign URL
  ↓
Use signed URL for generation
```

**Problem:** File object may become invalid on iPhone between selection and generation.

### Mobile Workflow (Current)
```
User selects file
  ↓
MobileSimplePromptInput.handleFileInputChange()
  ↓
iOS file processing (HEIC conversion, validation)
  ↓
onReferenceImageSet(persistedFile)
  ↓
setReferenceImage(persistedFile)
  ↓
File stored in state (File object)
  ↓
User clicks Generate
  ↓
generate() → uploadAndSignReference(referenceImage)
  ↓
Upload to Supabase Storage
  ↓
Sign URL
  ↓
Use signed URL for generation
```

**Problem:** Same as desktop - File object may not persist on iPhone.

---

## Proposed Unified Workflow

### New Workflow: Immediate Upload on Selection

**Desktop & Mobile (Unified):**
```
User selects/drops file
  ↓
Validate file (type, size, format)
  ↓
Upload to Supabase Storage IMMEDIATELY
  ↓
Sign URL IMMEDIATELY
  ↓
Store signed URL in state (referenceImageUrl)
  ↓
Clear File object from state (no longer needed)
  ↓
User clicks Generate
  ↓
Use stored referenceImageUrl directly (no upload needed)
  ↓
Generate with Seedream v4/v4.5 Edit
```

**Benefits:**
- ✅ No reliance on File object persistence
- ✅ Immediate feedback if upload fails
- ✅ Works identically on desktop and iPhone
- ✅ Same workflow for modify and copy modes
- ✅ Signed URL ready for immediate use

---

## Implementation Plan

### Step 1: Create Immediate Upload Helper

**Location:** `src/lib/storage.ts`

```typescript
/**
 * Upload and sign reference image immediately
 * Returns signed URL ready for use in generation
 */
export const uploadAndSignReferenceImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  // 1. Upload file
  const uploadResult = await uploadReferenceImage(file, onProgress);
  
  if (uploadResult.error || !uploadResult.data?.path) {
    throw uploadResult.error || new Error('Failed to upload reference image');
  }
  
  // 2. Sign URL immediately
  const signedUrl = await getReferenceImageUrl(uploadResult.data.path);
  
  if (!signedUrl) {
    throw new Error('Failed to sign reference image URL');
  }
  
  return signedUrl;
};
```

### Step 2: Update Desktop ReferenceImageUpload Component

**Location:** `src/components/workspace/SimplePromptInput.tsx`

**Changes:**
- Add upload state (uploading, error)
- Upload immediately on file selection/drop
- Store signed URL instead of File object
- Show upload progress/error

```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const uploadedFile = event.target.files?.[0];
  if (!uploadedFile) return;
  
  // Clear previous state
  onFileChange(null);
  
  // Upload immediately
  setIsUploading(true);
  try {
    const signedUrl = await uploadAndSignReferenceImage(uploadedFile);
    // Store signed URL, not File object
    if (onImageUrlChange) {
      onImageUrlChange(signedUrl);
    }
    // Clear file (we have URL now)
    onFileChange(null);
  } catch (error) {
    console.error('Failed to upload reference image:', error);
    toast.error('Failed to upload reference image');
  } finally {
    setIsUploading(false);
  }
};
```

### Step 3: Update Mobile File Input Handler

**Location:** `src/components/workspace/MobileSimplePromptInput.tsx`

**Changes:**
- After iOS file processing, upload immediately
- Store signed URL instead of File object
- Remove File object from state

```typescript
const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // ... existing iOS file processing ...
  
  // After file processing and validation:
  try {
    // Upload immediately instead of storing File object
    const signedUrl = await uploadAndSignReferenceImage(persistedFile);
    
    // Store signed URL via callback
    if (type === 'single') {
      onReferenceImageRemove?.('single'); // Clear any existing
      // Need new callback: onReferenceImageUrlSet(signedUrl, type)
    }
    // ... similar for 'start' and 'end'
  } catch (error) {
    toast.error('Failed to upload reference image');
  }
};
```

### Step 4: Update Hook State Management

**Location:** `src/hooks/useLibraryFirstWorkspace.ts`

**Changes:**
- Remove `uploadAndSignReference` from `generate()` function
- Use `referenceImageUrl` directly (already signed)
- Remove File object handling from generation flow

```typescript
// In generate() function:
// OLD:
if (referenceImage) {
  effRefUrl = await uploadAndSignReference(referenceImage);
}

// NEW:
if (referenceImageUrl) {
  effRefUrl = referenceImageUrl; // Already signed, use directly
} else if (referenceImage) {
  // Fallback: upload if somehow File object still exists
  // This should rarely happen with new workflow
  effRefUrl = await uploadAndSignReference(referenceImage);
}
```

### Step 5: Fix Path Handling

**Location:** `src/lib/storage.ts`

**Issue:** Supabase `upload()` returns `data.path` which is the full path including user ID. This path should be used directly for signing.

**Fix:**
```typescript
export const getReferenceImageUrl = async (filePath: string): Promise<string | null> => {
  // filePath from upload is already: "userId/filename.jpg"
  // No need to add user ID again
  
  // Remove any bucket prefix if present
  let cleanPath = filePath;
  if (cleanPath.startsWith('reference_images/')) {
    cleanPath = cleanPath.replace('reference_images/', '');
  }
  
  const { data, error } = await getSignedUrl('reference_images', cleanPath);
  return error ? null : data?.signedUrl || null;
};
```

---

## Path Handling Details

### Supabase Storage Path Format

**Upload:**
```typescript
// uploadFile() creates: `${user.id}/${filePath}`
// Example: "abc123/1234567890-ref.jpg"
// Supabase upload() returns: data.path = "abc123/1234567890-ref.jpg"
```

**Signing:**
```typescript
// getSignedUrl() expects path WITHOUT bucket prefix
// Example: "abc123/1234567890-ref.jpg"
// Supabase createSignedUrl(path) signs: "abc123/1234567890-ref.jpg"
```

**Critical:** The path returned from `upload()` is the exact path needed for `createSignedUrl()`. No modification needed.

---

## iPhone-Specific Fixes

### Issue 1: File Object Persistence

**Solution:** Upload immediately, don't store File object.

### Issue 2: MIME Type Detection

**Solution:** Already handled in mobile component with magic byte detection.

### Issue 3: HEIC Conversion

**Solution:** Already handled in mobile component.

### Issue 4: Path Format

**Solution:** Use exact path from upload response, no modification.

---

## Modify vs Copy Mode

**Both modes use identical upload workflow:**
- Upload happens immediately on file selection
- Signed URL stored in `referenceImageUrl`
- Generation uses `referenceImageUrl` directly
- No difference in upload process

**Difference is in generation parameters:**
- Modify mode: `strength: 0.5-0.8`, enhancement enabled
- Copy mode: `strength: 0.05-0.1`, enhancement disabled, seed locked

---

## Seedream v4/v4.5 Edit Integration

**Reference Image Format:**
- Seedream Edit models require `image_urls` (array format)
- Edge function (`fal-image/index.ts`) handles conversion:
  ```typescript
  if (requiresImageUrlsArray) {
    modelInput.image_urls = [signedUrl]; // Array format
  }
  ```

**Workflow:**
1. User selects file → Upload → Signed URL stored
2. User clicks Generate → `referenceImageUrl` passed to edge function
3. Edge function converts to `image_urls` array format
4. Seedream API receives correct format

---

## Error Handling

### Upload Errors
- Show toast notification immediately
- Don't store File object if upload fails
- Clear any previous reference image state

### Signing Errors
- Retry signing once
- If still fails, show error and don't proceed
- Log detailed error for debugging

### Generation Errors
- If `referenceImageUrl` is missing, show error
- Don't attempt to upload File object as fallback (shouldn't exist)

---

## Testing Checklist

### Desktop
- [ ] Drag-drop reference image → Uploads immediately
- [ ] Click to select file → Uploads immediately
- [ ] Upload progress shown
- [ ] Error handling works
- [ ] Signed URL stored correctly
- [ ] Generation uses signed URL

### Mobile (iPhone)
- [ ] File picker selection → Uploads immediately
- [ ] HEIC conversion → Uploads converted file
- [ ] Upload progress shown
- [ ] Error handling works
- [ ] Signed URL stored correctly
- [ ] Generation uses signed URL

### Modify Mode
- [ ] Reference image uploads correctly
- [ ] Generation uses correct strength (0.5-0.8)
- [ ] Enhancement enabled
- [ ] Seedream v4.5 Edit receives correct `image_urls` format

### Copy Mode
- [ ] Reference image uploads correctly
- [ ] Generation uses correct strength (0.05-0.1)
- [ ] Enhancement disabled
- [ ] Seed locked
- [ ] Seedream v4.5 Edit receives correct `image_urls` format

---

## Code Changes Summary

### Files to Modify

1. **`src/lib/storage.ts`**
   - Add `uploadAndSignReferenceImage()` helper
   - Fix `getReferenceImageUrl()` path handling

2. **`src/components/workspace/SimplePromptInput.tsx`**
   - Update `ReferenceImageUpload` to upload immediately
   - Store signed URL instead of File object

3. **`src/components/workspace/MobileSimplePromptInput.tsx`**
   - Update `handleFileInputChange()` to upload immediately
   - Store signed URL instead of File object

4. **`src/hooks/useLibraryFirstWorkspace.ts`**
   - Remove `uploadAndSignReference()` from `generate()`
   - Use `referenceImageUrl` directly
   - Add fallback for edge cases

5. **`src/pages/SimplifiedWorkspace.tsx`** & **`MobileSimplifiedWorkspace.tsx`**
   - Update callbacks to handle signed URLs
   - Remove File object handling

---

## Migration Notes

**Breaking Changes:**
- File objects no longer stored in state (only signed URLs)
- Upload happens immediately on selection (not on generation)

**Backward Compatibility:**
- Keep `uploadAndSignReference()` as fallback for edge cases
- Handle both File objects and URLs during transition

---

## Related Documentation

- `SEEDREAM_I2I.md` - Seedream I2I functionality details
- `CONTROLS_MODAL_ANALYSIS.md` - Controls modal analysis
- `UX_REFERENCE.md` - Reference image UX specifications
