# Scene Generation Workflow Fix Plan

**Date:** 2026-01-09  
**Issue:** Scene generation fails with "No job ID returned from scene generation request"  
**Status:** Plan Created

## Problem Analysis

### Root Cause
The scene generation workflow is failing because the job ID extraction logic in `roleplay-chat` edge function doesn't properly handle the response format from `fal-image` and `queue-job` edge functions.

### Current Flow
1. **Frontend** (`MobileRoleplayChat.tsx`) calls `roleplay-chat` with `scene_generation: true`
2. **roleplay-chat** calls either `fal-image` or `queue-job` edge function
3. **roleplay-chat** expects response format: `{ data: { jobId: string } }` or `{ data: { job_id: string } }`
4. **roleplay-chat** returns: `{ scene_job_id: string }`
5. **Frontend** extracts: `data?.job_id || data?.scene_job_id`

### Issue Points
1. **Response Structure Mismatch**: `supabase.functions.invoke()` wraps responses differently than expected
2. **Error Handling**: Errors from `fal-image`/`queue-job` may not be properly propagated
3. **Job ID Extraction**: Multiple possible response formats not all handled
4. **Logging**: Insufficient logging to debug response structure

## Fix Plan

### Phase 1: Improve Response Handling in roleplay-chat

**File:** `supabase/functions/roleplay-chat/index.ts`  
**Location:** Lines 2806-2835

**Changes:**
1. Add comprehensive logging of response structure
2. Handle all possible response formats from `fal-image` and `queue-job`
3. Improve error handling and propagation
4. Add fallback job ID extraction logic

**Code Changes:**
```typescript
// After line 2806, add detailed logging
console.log('🎬 Scene generation response received, validating...');
console.log('📦 Full response structure:', JSON.stringify({
  hasError: !!imageResponse?.error,
  errorMessage: imageResponse?.error?.message || imageResponse?.error,
  hasData: !!imageResponse?.data,
  dataKeys: imageResponse?.data ? Object.keys(imageResponse?.data) : [],
  dataType: typeof imageResponse?.data,
  fullResponse: imageResponse
}, null, 2));

// Enhanced job ID extraction (replace lines 2809-2835)
let jobId = null;

// Check for errors first
if (imageResponse?.error) {
  console.error('🎬❌ Image generation failed:', imageResponse.error);
  const errorMessage = imageResponse.error.message || imageResponse.error;
  return { 
    success: false, 
    error: `Image generation failed: ${errorMessage}` 
  };
}

// Try multiple response formats
if (imageResponse?.data?.jobId) {
  jobId = imageResponse.data.jobId;
  console.log('✅ Found jobId in data.jobId:', jobId);
} else if (imageResponse?.data?.job_id) {
  jobId = imageResponse.data.job_id;
  console.log('✅ Found jobId in data.job_id:', jobId);
} else if (imageResponse?.data?.id) {
  jobId = imageResponse.data.id;
  console.log('✅ Found jobId in data.id:', jobId);
} else if (imageResponse?.jobId) {
  // Direct response (not wrapped in data)
  jobId = imageResponse.jobId;
  console.log('✅ Found jobId in root:', jobId);
} else if (imageResponse?.job_id) {
  // Direct response (not wrapped in data)
  jobId = imageResponse.job_id;
  console.log('✅ Found jobId in root job_id:', jobId);
} else {
  console.error('⚠️ No job ID found in image response. Full response:', JSON.stringify(imageResponse, null, 2));
  return { 
    success: false, 
    error: 'Image generation completed but no job ID was returned',
    debug: {
      responseStructure: Object.keys(imageResponse || {}),
      hasData: !!imageResponse?.data,
      dataKeys: imageResponse?.data ? Object.keys(imageResponse?.data) : []
    }
  };
}
```

### Phase 2: Verify fal-image Response Format

**File:** `supabase/functions/fal-image/index.ts`  
**Status:** ✅ Already returns correct format

**Verification:**
- Returns `{ jobId: jobData.id }` on success (line 905, 1243)
- Returns `{ error: ... }` on failure (line 863, 1264, 1274)
- Format is correct for `supabase.functions.invoke()` wrapper

**Action:** No changes needed - format is correct

### Phase 3: Verify queue-job Response Format

**File:** `supabase/functions/queue-job/index.ts`  
**Action:** Check response format

**Expected:** Should return `{ jobId: string }` or `{ job_id: string }`

**If different:** Update to match expected format or update extraction logic in `roleplay-chat`

### Phase 4: Improve Frontend Error Handling

**File:** `src/pages/MobileRoleplayChat.tsx`  
**Location:** Lines 1038-1069

**Changes:**
1. Add better error logging
2. Handle partial success cases
3. Show more detailed error messages

**Code Changes:**
```typescript
// After line 1038, add detailed logging
console.log('🎬 Scene generation response:', {
  hasData: !!data,
  dataKeys: data ? Object.keys(data) : [],
  hasError: !!error,
  errorMessage: error?.message,
  fullResponse: { data, error }
});

if (error) {
  console.error('❌ Scene generation error:', error);
  throw error;
}

// Enhanced job ID extraction with logging
const newJobId = data?.job_id || data?.scene_job_id || data?.data?.jobId || data?.data?.job_id;

console.log('🔍 Job ID extraction:', {
  'data?.job_id': data?.job_id,
  'data?.scene_job_id': data?.scene_job_id,
  'data?.data?.jobId': data?.data?.jobId,
  'data?.data?.job_id': data?.data?.job_id,
  extracted: newJobId
});

if (!newJobId) {
  console.error('❌ No job ID found. Full response:', JSON.stringify({ data, error }, null, 2));
  throw new Error('No job ID returned from scene generation request');
}
```

### Phase 5: Add Response Validation

**File:** `supabase/functions/roleplay-chat/index.ts`  
**Location:** After calling `generateScene`

**Changes:**
1. Validate `generateScene` return value
2. Ensure `job_id` is always set when `success: true`
3. Add fallback error messages

**Code Changes:**
```typescript
// After line 517 (generateScene call)
const sceneResult = await generateScene(...);

// Validate response
if (!sceneResult) {
  console.error('❌ generateScene returned null/undefined');
  sceneGenerated = false;
  sceneJobId = null;
} else if (sceneResult.success && !sceneResult.job_id) {
  console.error('❌ generateScene returned success=true but no job_id:', sceneResult);
  sceneGenerated = false;
  sceneJobId = null;
} else {
  sceneGenerated = sceneResult.success;
  consistencyScore = sceneResult.consistency_score || 0;
  sceneJobId = sceneResult.job_id || null;
  
  if (sceneResult.error) {
    console.error('❌ generateScene returned error:', sceneResult.error);
  }
}
```

### Phase 6: Test Image Generation Edge Functions

**Action:** Verify both `fal-image` and `queue-job` return expected formats

**Test Cases:**
1. Call `fal-image` directly and verify response structure
2. Call `queue-job` directly and verify response structure
3. Test with valid scene generation request
4. Test error cases

## Implementation Steps

### Step 1: Add Logging (Immediate)
- Add comprehensive logging to `roleplay-chat` response handling
- Add logging to frontend job ID extraction
- Deploy and test to see actual response structure

### Step 2: Fix Response Extraction (After Logging)
- Update job ID extraction logic based on actual response format
- Handle all possible response structures
- Add fallback extraction paths

### Step 3: Improve Error Handling
- Ensure errors are properly propagated
- Add user-friendly error messages
- Add retry logic for transient failures

### Step 4: Validate End-to-End
- Test scene generation with valid conversation
- Test with I2I continuity enabled
- Test with scene regeneration
- Verify job IDs are properly tracked

## Testing Checklist

- [ ] Add logging to `roleplay-chat` response handling
- [ ] Add logging to frontend job ID extraction
- [ ] Deploy edge function changes
- [ ] Test scene generation and capture actual response structure
- [ ] Fix job ID extraction based on actual format
- [ ] Test scene generation end-to-end
- [ ] Test I2I scene continuation
- [ ] Test scene regeneration
- [ ] Verify job completion tracking works
- [ ] Verify scene images appear inline in chat

## Success Criteria

1. ✅ Scene generation returns valid job ID
2. ✅ Job ID is properly tracked in frontend
3. ✅ Scene images appear inline in chat when job completes
4. ✅ Error messages are clear and actionable
5. ✅ I2I scene continuation works correctly
6. ✅ Scene regeneration works correctly

## Rollback Plan

If changes cause issues:
1. Revert edge function to previous version
2. Keep frontend logging for debugging
3. Investigate response format differences
4. Re-implement with correct format handling

## Notes

- The `fal-image` function already returns correct format (`{ jobId: ... }`)
- The issue is likely in how `roleplay-chat` extracts the job ID from the response
- Need to verify actual response structure with logging first
- May need to handle different response formats from different edge functions
