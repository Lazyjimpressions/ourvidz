# Controls Modal Analysis & Reference Image Upload Fix

**Date:** January 11, 2026  
**Status:** 🔍 Analysis & Questions for Clarification  
**Related Components:** `SimplePromptInput.tsx`, `fal-image/index.ts`, `storage.ts`

---

## 1. Controls Modal Review

### Current Controls Modal Contents

The advanced settings modal (settings gear icon) shows the following controls:

**When Reference Image is Present:**
1. **Reference Type** (Character/Style/Composition) - Radio buttons
2. **Variation Presets** (Copy/Modify/Creative) - Segmented chips
3. **Hair Lock** - Toggle switch
4. **Steps** - Slider (10-50, default 25)
5. **Reference Strength** - Slider (0.1-0.9, shows variation %)
6. **CFG (Guidance Scale)** - Slider (1-20, default 7.5)
7. **Batch Size** - Chips (1, 3, 6)
8. **Seed** - Number input with lock toggle
9. **Additional Negative Prompt** - Textarea with presets
10. **Compel Enhancement** - Checkbox with weights input

**Designed For:** Local SDXL models (worker-based generation)

---

## 2. API Model Support Analysis

### Database Query Results

Querying `api_models` for fal.ai Seedream models:

```sql
SELECT 
  model_key,
  display_name,
  capabilities->>'supports_negative_prompt' as supports_negative_prompt,
  capabilities->>'supports_seed' as supports_seed,
  capabilities->>'input_key_mappings' as input_key_mappings
FROM api_models 
WHERE provider_id IN (SELECT id FROM api_providers WHERE name = 'fal')
  AND is_active = true
  AND modality = 'image'
```

**Results:**
- `fal-ai/bytedance/seedream/v4/text-to-image` - No capabilities set
- `fal-ai/bytedance/seedream/v4/edit` - No capabilities set
- `fal-ai/bytedance/seedream/v4.5/edit` - No capabilities set

**Finding:** ❌ Capabilities are not set in database for Seedream models

### fal.ai API Parameter Support (from code analysis)

**From `fal-image/index.ts` implementation:**

| Parameter | Seedream v4/v4.5 Edit | WAN 2.1 I2V | Notes |
|-----------|----------------------|-------------|-------|
| `strength` | ✅ Yes (0.1-1.0) | ❌ No | Used for I2I modification amount |
| `num_inference_steps` | ✅ Yes (1-50) | ✅ Yes (1-50) | Steps/inference iterations |
| `guidance_scale` | ✅ Yes (1-20) | ❌ No | Uses `guide_scale` (1-10) instead |
| `negative_prompt` | ❓ **UNKNOWN** | ✅ Yes | User suspects not supported for Seedream |
| `seed` | ✅ Yes | ✅ Yes | For reproducibility |
| `image_urls` | ✅ Yes (array) | ❌ No | Uses `image_url` (string) |

**Current Implementation:**
- `fal-image/index.ts` line 551: `if (body.input.negative_prompt) { modelInput.negative_prompt = body.input.negative_prompt; }`
- No validation or capability check - always passes if provided

---

## 3. Questions for Clarification

### Question 1: Controls Modal for API Models

**Current State:** Controls modal shows all controls regardless of selected model (local SDXL vs API Seedream).

**Questions:**
1. Should the controls modal be **model-aware** and only show relevant controls?
2. For Seedream I2I models, should we show:
   - ✅ **Reference Strength** (definitely useful - controls `strength` parameter)
   - ✅ **Steps** (`num_inference_steps` - supported)
   - ✅ **CFG** (`guidance_scale` - supported)
   - ❓ **Negative Prompt** (user suspects not supported - needs verification)
   - ✅ **Seed** (supported)
   - ❌ **Batch Size** (not applicable for API models)
   - ❌ **Compel Enhancement** (SDXL-specific feature)

3. Is showing **all controls** (even if some don't apply) too much noise, or is it acceptable to show them and silently ignore unsupported parameters?

### Question 2: Negative Prompt Support

**User Statement:** "I don't think fal.ai allows for negative prompting for seedream models"

**Current Code:** `fal-image/index.ts` passes `negative_prompt` to all models without checking support.

**Questions:**
1. Should we verify negative prompt support for Seedream models?
2. If not supported, should we:
   - Hide the negative prompt control when Seedream is selected?
   - Show it but disable it with a tooltip?
   - Show it but silently ignore it (current behavior)?

### Question 3: Reference Strength Control

**Current State:** Reference Strength slider is shown in controls modal when reference image is present.

**Questions:**
1. For Seedream I2I, is the **Reference Strength** control useful enough to justify showing the controls modal?
2. Or should Reference Strength be moved to a more prominent location (e.g., inline with reference image preview)?

---

## 4. Reference Image Upload Failure Analysis

### Current Upload Flow

**Desktop:**
```
ReferenceImageUpload component
  ↓
handleFileUpload() - sets file in state
  ↓
onFileChange(file) - updates hook state
  ↓
generate() - uploadAndSignReference() called
  ↓
uploadReferenceFile() → uploadFile('reference_images', fileName, file)
  ↓
Supabase Storage: uploads to `${user.id}/${fileName}`
  ↓
Returns: res.data.path = `${user.id}/${fileName}`
  ↓
getReferenceImageUrl(res.data.path) → getSignedUrl('reference_images', path)
  ↓
Supabase Storage: createSignedUrl(path, 3600)
```

**Mobile:**
```
MobileSimplePromptInput
  ↓
handleFileInputChange() - iOS file processing
  ↓
onReferenceImageSet(file) callback
  ↓
MobileSimplifiedWorkspace.handleReferenceImageSet()
  ↓
setReferenceImage(file) - updates hook state
  ↓
generate() - uploadAndSignReference() called
  ↓
Same flow as desktop
```

### Potential Issues

**Issue 1: Path Format Mismatch**

`uploadFile` creates user-scoped path:
```typescript
const userScopedPath = `${user.id}/${filePath}`;
// Example: "abc123/1234567890-ref.jpg"
```

`getSignedUrl` receives this path and should work, but:
- Line 178-181: Removes bucket prefix if present (correct)
- Line 186: Calls `createSignedUrl(cleanPath, expiresIn)`

**Potential Problem:** If `res.data.path` from Supabase includes the bucket name or has a different format, the path might not match.

**Issue 2: Immediate Failure**

User says uploads are "failing immediately" - this suggests:
- Error occurs during upload (not signing)
- Or error occurs during signing but immediately after upload
- Could be authentication issue
- Could be bucket permissions issue
- Could be file validation issue

**Questions:**
1. What exact error message appears when reference image upload fails?
2. Does it fail during:
   - File selection (immediate)?
   - Upload to Supabase Storage?
   - URL signing?
   - Generation request?
3. Is this happening on desktop, mobile, or both?

---

## 5. Recommended Fixes

### Fix 1: Model-Aware Controls Modal

**Option A: Hide Unsupported Controls**
```typescript
// Check model capabilities
const supportsNegativePrompt = selectedModel?.capabilities?.supports_negative_prompt === true;
const supportsSeed = selectedModel?.capabilities?.supports_seed === true;
const supportsBatch = selectedModel?.type === 'sdxl'; // Only local SDXL

// Conditionally render controls
{supportsNegativePrompt && (
  <NegativePromptControl />
)}
```

**Option B: Show All, Disable Unsupported**
```typescript
<NegativePromptControl 
  disabled={!supportsNegativePrompt}
  tooltip={!supportsNegativePrompt ? "Not supported for this model" : undefined}
/>
```

**Recommendation:** **Option A** - Less noise, cleaner UI. But need user confirmation.

### Fix 2: Verify Negative Prompt Support

**Action Items:**
1. Test Seedream v4.5 Edit with `negative_prompt` parameter
2. Check fal.ai documentation for Seedream negative prompt support
3. Update `api_models.capabilities` based on findings
4. Update UI to respect capabilities

### Fix 3: Reference Image Upload Path Fix

**Potential Fix:**
```typescript
// In uploadAndSignReference()
const res = await uploadReferenceFile(file);
if (res.error || !res.data?.path) {
  throw new Error('Failed to upload reference image');
}

// Ensure path includes user ID if not already present
let pathToSign = res.data.path;
if (!pathToSign.includes('/') && user?.id) {
  // If path doesn't include user ID, add it
  pathToSign = `${user.id}/${pathToSign}`;
}

const signed = await getReferenceImageUrl(pathToSign);
```

**But First:** Need to verify what `res.data.path` actually contains.

---

## 6. Next Steps

### Immediate Actions Needed

1. **User Clarification:**
   - Which controls should be shown for Seedream models?
   - What exact error occurs when reference image upload fails?
   - Where in the flow does it fail?

2. **Testing:**
   - Test negative prompt with Seedream models
   - Test reference image upload and verify path format
   - Check browser console for exact error messages

3. **Database Update:**
   - Set `capabilities` for Seedream models based on actual API support
   - Add `supports_negative_prompt`, `supports_seed`, etc.

4. **Code Updates:**
   - Make controls modal model-aware
   - Fix reference image upload path handling
   - Add proper error handling and user feedback

---

## 7. Code References

- `src/components/workspace/SimplePromptInput.tsx` (lines 1214-1606) - Controls modal
- `supabase/functions/fal-image/index.ts` (lines 535-558) - Parameter handling
- `src/lib/storage.ts` (lines 112-212) - Upload and signing functions
- `src/hooks/useLibraryFirstWorkspace.ts` (lines 583-632) - Reference image upload helper
