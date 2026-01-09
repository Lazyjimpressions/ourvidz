# Mobile Reference Image Upload Review

**Date:** 2026-01-08  
**Status:** 🔍 Analysis Complete - Recommendations Provided

## Executive Summary

Reviewed reference image i2i (image-to-image) functionality in workspace, specifically for mobile devices. The system uses **Seedream v4.5/edit** model for i2i operations. Found several potential issues with mobile upload flow that could cause failures.

---

## 1. Current Implementation Review

### Reference Image Upload Flow

**Mobile Upload Path:**
```
MobileSimplePromptInput.tsx (file selection)
  ↓
handleFileInputChange() - iOS file processing
  ↓
onReferenceImageSet() callback
  ↓
MobileSimplifiedWorkspace.tsx - handleReferenceImageSet()
  ↓
useLibraryFirstWorkspace hook - setReferenceImage()
  ↓
generate() - uploadAndSignReference()
  ↓
uploadReferenceFile() → uploadFile() → Supabase Storage
```

### Key Components

1. **MobileSimplePromptInput.tsx** (Lines 93-244)
   - Handles file selection with iOS-specific processing
   - Converts HEIC/HEIF to JPEG
   - Validates file types using magic bytes
   - Creates persisted File objects for iOS compatibility

2. **useLibraryFirstWorkspace.ts** (Lines 572-621)
   - `uploadAndSignReference()` helper function
   - Uploads to `reference_images` bucket
   - Signs URL after upload
   - Extensive debug logging for mobile

3. **storage.ts** (Lines 373-387)
   - `uploadReferenceImage()` - uploads to `reference_images` bucket
   - `getReferenceImageUrl()` - signs uploaded file path
   - Uses user-scoped paths: `${user.id}/${fileName}`

---

## 2. Supabase Configuration

### reference_images Bucket Configuration

```sql
name: 'reference_images'
public: false (private bucket)
file_size_limit: 10485760 (10MB)
allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
```

**Status:** ✅ Bucket exists and is properly configured

---

## 3. Log Analysis Findings

### Storage Logs (Last 24 Hours)

**Pattern Observed:**
- Many `POST 400` errors for `/object/sign/` requests from iOS devices
- **BUT**: These are for OTHER buckets (`image_fast`, `sdxl_image_high`, etc.)
- `workspace-temp` bucket requests return `200 OK`
- **No direct upload failures logged** for `reference_images` bucket

**Key Insight:**
- The 400 errors are for **signing existing files**, not upload failures
- Upload failures would appear as different error types
- Need to check browser console logs for actual upload errors

---

## 4. Identified Issues

### Issue 1: File Type Validation Mismatch

**Problem:**
- Bucket allows: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Mobile code converts HEIC → JPEG (✅ good)
- BUT: If file has wrong MIME type after conversion, upload may fail

**Location:** `src/lib/storage.ts:373-382`

**Current Code:**
```typescript
const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
const fileName = `${Date.now()}-ref.${fileExtension}`;
```

**Risk:** If converted file has wrong extension or MIME type, Supabase may reject it.

---

### Issue 2: iOS File Persistence Timing

**Problem:**
- iOS Safari may lose File object reference between selection and upload
- File is persisted in `handleFileInputChange()` but upload happens later in `generate()`
- If File object becomes invalid, upload will fail silently

**Location:** `src/components/workspace/MobileSimplePromptInput.tsx:207-210`

**Current Code:**
```typescript
const persistedFile = new File([persistedBlob], normalizedName, {
  type: finalMime,
  lastModified: Date.now()
});
```

**Risk:** File object may not persist across React state updates or navigation.

---

### Issue 3: Error Handling Gaps

**Problem:**
- Upload errors are caught but may not provide enough detail
- Error messages may not distinguish between:
  - Authentication failures
  - File size violations
  - MIME type mismatches
  - Network failures

**Location:** `src/hooks/useLibraryFirstWorkspace.ts:590-599`

**Current Code:**
```typescript
const res = await uploadReferenceFile(file);
if (res.error || !res.data?.path) {
  console.error('❌ MOBILE DEBUG: Reference image upload failed:', {
    error: res.error,
    hasData: !!res.data,
    hasPath: !!res.data?.path,
    path: res.data?.path
  });
  throw (res as any).error || new Error('Failed to upload reference image');
}
```

**Risk:** Generic error messages don't help diagnose specific issues.

---

### Issue 4: Path Construction for Signing

**Problem:**
- Upload returns path: `${user.id}/${fileName}`
- Signing uses same path
- But if path format differs, signing will fail

**Location:** `src/lib/storage.ts:384-387`

**Current Code:**
```typescript
export const getReferenceImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('reference_images', filePath);
  return error ? null : data?.signedUrl || null;
};
```

**Risk:** Path mismatch between upload and signing could cause silent failures.

---

## 5. Recommendations

### Recommendation 1: Enhanced Error Logging

**Action:** Add detailed error logging to capture Supabase error details

**Implementation:**
```typescript
// In uploadAndSignReference()
const res = await uploadReferenceFile(file);
if (res.error || !res.data?.path) {
  console.error('❌ MOBILE DEBUG: Reference image upload failed:', {
    error: res.error,
    errorMessage: res.error?.message,
    errorCode: res.error?.code,
    errorStatus: res.error?.statusCode,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    hasData: !!res.data,
    hasPath: !!res.data?.path,
    path: res.data?.path
  });
  
  // Provide user-friendly error message
  const userMessage = res.error?.message?.includes('size')
    ? 'Image is too large (max 10MB)'
    : res.error?.message?.includes('type')
    ? 'Image format not supported'
    : 'Failed to upload reference image. Please try again.';
    
  throw new Error(userMessage);
}
```

---

### Recommendation 2: Validate File Before Upload

**Action:** Add pre-upload validation to catch issues early

**Implementation:**
```typescript
// In uploadAndSignReference(), before upload
const validateFileForUpload = (file: File): void => {
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`Image is too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
  }
  
  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Image format not supported. Please use JPEG, PNG, WebP, or GIF.`);
  }
  
  // Check file is not empty
  if (file.size === 0) {
    throw new Error('Selected image file is empty.');
  }
};

// Use before upload
validateFileForUpload(file);
const res = await uploadReferenceFile(file);
```

---

### Recommendation 3: Store File as Blob URL for Persistence

**Action:** Create blob URL for iOS file persistence

**Implementation:**
```typescript
// In MobileSimplePromptInput.tsx, after file processing
const blobUrl = URL.createObjectURL(persistedFile);
// Store blobUrl in state or pass to callback
onReferenceImageSet?.(persistedFile, type, blobUrl);

// In useLibraryFirstWorkspace, before upload
// If file is invalid, recreate from blob URL if available
if (!(file instanceof File) || file.size === 0) {
  if (blobUrl) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    file = new File([blob], fileName, { type: blob.type });
  }
}
```

---

### Recommendation 4: Add Upload Retry Logic

**Action:** Implement retry mechanism for transient failures

**Implementation:**
```typescript
const uploadWithRetry = async (
  file: File,
  maxRetries: number = 3
): Promise<UploadResult> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadReferenceFile(file);
      if (!result.error && result.data?.path) {
        return result;
      }
      lastError = result.error || new Error('Upload failed');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed');
    }
    
    if (attempt < maxRetries) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return { data: null, error: lastError };
};
```

---

### Recommendation 5: Verify Path Consistency

**Action:** Ensure upload and signing use same path format

**Implementation:**
```typescript
// In uploadAndSignReference(), after upload
const uploadedPath = res.data.path;
console.log('✅ MOBILE DEBUG: Reference image uploaded to:', uploadedPath);

// Verify path format
if (!uploadedPath.startsWith(`${user.id}/`)) {
  console.warn('⚠️ MOBILE DEBUG: Unexpected path format:', uploadedPath);
}

// Use exact path from upload response
const signed = await getReferenceImageUrl(uploadedPath);
```

---

## 6. Testing Checklist

### Manual Testing Steps

1. **iOS Safari Testing:**
   - [ ] Upload JPEG image from photo library
   - [ ] Upload HEIC image (should convert to JPEG)
   - [ ] Upload PNG image
   - [ ] Upload large image (>5MB, <10MB)
   - [ ] Upload image >10MB (should fail gracefully)
   - [ ] Check browser console for errors
   - [ ] Verify file appears in `reference_images` bucket

2. **Android Chrome Testing:**
   - [ ] Upload JPEG image
   - [ ] Upload PNG image
   - [ ] Upload WebP image
   - [ ] Check browser console for errors

3. **Error Scenarios:**
   - [ ] Test with no internet connection
   - [ ] Test with expired auth token
   - [ ] Test with corrupted file
   - [ ] Test with unsupported format

---

## 7. Debugging Guide

### How to Debug Mobile Upload Failures

1. **Check Browser Console:**
   - Look for `📤 MOBILE DEBUG:` logs
   - Look for `❌ MOBILE DEBUG:` errors
   - Check network tab for failed requests

2. **Check Supabase Logs:**
   - Storage service logs for upload errors
   - API service logs for authentication issues

3. **Verify File State:**
   ```typescript
   console.log('File state before upload:', {
     isFile: file instanceof File,
     name: file.name,
     size: file.size,
     type: file.type,
     lastModified: file.lastModified
   });
   ```

4. **Check Upload Response:**
   ```typescript
   console.log('Upload response:', {
     hasError: !!res.error,
     errorDetails: res.error,
     hasData: !!res.data,
     path: res.data?.path,
     fullPath: res.data?.fullPath
   });
   ```

---

## 8. Next Steps

### Immediate Actions

1. ✅ **Add enhanced error logging** (Recommendation 1)
2. ✅ **Add file validation** (Recommendation 2)
3. ✅ **Test on actual iOS device** with console logging enabled
4. ✅ **Monitor Supabase logs** for `reference_images` bucket activity

### Future Improvements

1. **Add upload progress indicator** for large files
2. **Implement file compression** for images >5MB
3. **Add offline queue** for failed uploads
4. **Create admin dashboard** to view upload statistics

---

## 9. Related Documentation

- [Seedream v4.5/edit Model Guide](../../09-REFERENCE/Seedream_model_guide.md)
- [Scene Regeneration Architecture Analysis](./SCENE_REGENERATION_ARCHITECTURE_ANALYSIS.md)
- [Mobile Workspace Implementation](../../01-PAGES/07_ROLEPLAY_PURPOSE.md)

---

## 10. Conclusion

The reference image upload functionality is **well-implemented** with good iOS compatibility handling. However, **error handling and logging could be improved** to better diagnose mobile-specific failures.

**Primary Concerns:**
1. File persistence across React state updates on iOS
2. Error message clarity for users
3. Path consistency between upload and signing

**Recommended Priority:**
1. **High:** Enhanced error logging and validation
2. **Medium:** File persistence improvements
3. **Low:** Retry logic and progress indicators

