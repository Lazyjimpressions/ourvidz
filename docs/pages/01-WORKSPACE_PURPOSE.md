# Workspace Page Purpose & Implementation Guide

**Last Updated:** 2025-08-18  
**Status:** In Progress — Reassessing post staging-first changes (do not assume implemented without verification)  
**Phase:** Validation and alignment with Library-first architecture

## **🎯 CURRENT IMPLEMENTATION STATUS**

### **Reality Check (to verify in code before claiming done)**
- Workspace rendering, upload, and realtime updates: Needs verification in the current branch.
- Staging-first vs library-first: Reassess final direction; staging-first changes caused regressions.
- Exact-copy (I2I) promptless uploads: Known issue; do not mark as complete.
- Shared components with Library (grid, lightbox): Desired; verify reuse feasibility.
- Storage conventions and URL signing: Confirm current bucket names, TTL, and cache headers.

### **🔧 Backend Infrastructure (status: needs validation)**
- Database tables in scope: `workspace_assets` (or `workspace_items`), `user_library`, `jobs` — verify current schema and RLS.
- Edge functions in scope: `queue-job`, `job-callback`, `workspace-actions` — verify payload fields and routing.
- Realtime subscription: Confirm target table and filters by `user_id`.
- Storage buckets: Expected `workspace-temp` (staging) and `user-library` (permanent) — confirm names, paths, and policies.
- Exact copy handling: Treat as pending — uploaded promptless images not yet exact.

### **🗄️ Storage & URL Conventions (proposed — confirm in Supabase before adoption)**
- **Staging (Workspace)**
  - Bucket: `workspace-temp`
  - Key: `userId/jobId/{index}.{ext}` (e.g., `8d1f.../b4a2.../0.png`)
  - Access: time-bounded signed URL (recommend 15–60 min TTL), client caches blob URL
- **Library (Saved)**
  - Bucket: `user-library`
  - Key: `userId/{assetId}.{ext}`
  - Access: time-bounded signed URL with Cache-Control: `public, max-age=31536000, immutable` when possible
  - Thumbnails: prefer pre-generated `*.jpg` thumbnails for grid speed; lazy-load full asset on open

```ts
// Example: create a signed URL for a workspace asset
const { data, error } = await supabase
  .storage
  .from('workspace-temp')
  .createSignedUrl(temp_storage_path, 3600);
```

### **🔁 Workspace Workflow (target UX — confirm implementation)**
1) User submits generation via control box (image/video). Batch size and quality per selection.
2) Worker uploads outputs to `workspace-temp` under `userId/jobId/index.ext`.
3) `job-callback` creates rows in workspace table for realtime display.
4) Workspace subscribes, signs URLs, renders items with thumbnails, and enables actions.
5) User can Save to Library (copy to `user-library`) or Discard (delete staging + row).

### **🧩 Rendering & UX**
- Cards are 1x1 and appended inline to a responsive grid (not a rigid 1x3 row).
- Newest items first; lazy-load/paginate as needed.
- Videos show duration overlay; images show resolution overlay.
- Each card: Save to Library, Discard, Copy link, Use as reference.

### **🎨 UI/UX Scope (desired; verify usage and completeness)**
- Grid layout and content cards with shared design system
- Lightbox for previewing images/videos (shared with Library)
- Prompt input with reference box (files, URLs, workspace items)
- Style/camera controls (disabled in Exact Copy mode)
- Visual state for Exact Copy (workspace vs uploaded reference)

---

## **🎯 IMAGE-TO-IMAGE (I2I) & EXACT COPY — CURRENT STATUS AND PLAN**

### **Overview**
- **Primary Use Case**: Modify existing images while preserving subject/pose/composition
- **Secondary Use Case**: Exact copying (manual selection only)
- **Default Behavior**: Always "modify" mode - user must explicitly choose "copy" mode
- **Focus**: Position/pose preservation for modifications, not exact copying

### **Core Use Cases**

#### **Primary Use Case: Subject Modification**
**Scenario**: User generates "woman in black dress" → wants to modify specific elements
1. **"Change black dress to red"** → Same woman, same pose, red dress
2. **"Woman kissing her friend"** → Same woman, same pose, kissing scenario

#### **Secondary Use Case: Exact Copying**
**Scenario**: User wants identical copy (manual selection required)
- Workspace items: Preserve original prompt/seed for consistency
- Uploaded images: High-fidelity composition preservation

### **Default Behavior & User Workflow**

#### **Workspace/Library Items**
1. **Select as Reference** → Auto-enable "modify" mode
2. **Reference Strength**: 0.7 (preserve subject, allow changes)
3. **Enhancement**: Enabled (normal generation flow)
4. **User Types Modification** → System preserves subject/pose, applies changes

#### **Uploaded Images**
1. **Upload Image** → Auto-enable "modify" mode (NOT copy mode)
2. **Reference Strength**: 0.7 (preserve composition, allow changes)
3. **Enhancement**: Enabled (normal generation flow)
4. **User Types Modification** → System preserves composition, applies changes

#### **Manual Copy Mode**
1. **User Must Explicitly Toggle** to "copy" mode
2. **Reference Strength**: 0.9 (maximum preservation)
3. **Enhancement**: Disabled (skip enhancement)
4. **SDXL Parameters**: denoise_strength: 0.05, guidance_scale: 1.0

### **Technical Implementation**

#### **Mode Switching Defaults**
```typescript
// Modify Mode (Default) - Uses SDXL worker defaults
const modifyDefaults = {
  referenceStrength: 0.5,        // Worker converts to denoise_strength = 0.5
  enhancementEnabled: true,
  styleControlsEnabled: true,
  guidanceScale: 7.5,            // Worker default for high quality
  steps: 25                      // Worker default for high quality
};

// Copy Mode (Manual Selection Only) - Uses SDXL worker exact copy mode
const copyDefaults = {
  referenceStrength: 0.95,       // Worker clamps denoise_strength to ≤0.05
  enhancementEnabled: false,
  styleControlsEnabled: false,
  guidanceScale: 1.0,            // Worker exact copy mode
  steps: 15                      // Worker exact copy mode
};
```

#### **Edge Function Behavior**
```typescript
// queue-job edge function
if (exactCopyMode) {
  // Set exact_copy_mode flag - worker handles optimization
  exact_copy_mode: true,
  skip_enhancement: true,
  // Worker will clamp denoise_strength to ≤0.05, set CFG=1.0
} else {
  // Normal modify mode - use worker defaults
  exact_copy_mode: false,
  skip_enhancement: false,
  // Worker uses denoise_strength = 0.5 (default), CFG=7.5
}
```

#### **SDXL Worker Parameters**
```python
# For exact copy mode
if job.get('exact_copy_mode'):
    denoise_strength = min(denoise_strength, 0.05)  # Clamp to ≤0.05
    guidance_scale = 1.0     # Minimal guidance
    negative_prompt = ""     # No negatives
    # Skip all enhancement and style controls
else:
    # Normal modify mode - use worker defaults
    denoise_strength = 0.5   # Worker default for i2i
    guidance_scale = 7.5     # Worker default for high quality
    # Apply normal enhancement and style controls
```

### **UI/UX Specifications**

#### **Default State**
- **Mode**: Always "modify" (never default to copy)
- **Visual**: Clear "MOD" indicator
- **Behavior**: User must manually toggle to "COPY"

#### **Upload Behavior**
- **Upload Image** → Auto-enable "modify" mode
- **Reference Strength**: 0.7
- **No Auto-switch** to copy mode

#### **Mode Toggle**
- **MOD → COPY**: Sets reference strength to 0.9, disables enhancement
- **COPY → MOD**: Sets reference strength to 0.7, enables enhancement
- **Visual Feedback**: Clear mode indicators with appropriate styling

#### **Reference Selection**
- **Workspace Items**: Drag-and-drop or "Use as Reference" → Auto-modify mode
- **Uploaded Images**: Upload → Auto-modify mode
- **Metadata Extraction**: Only for workspace items (preserve original prompt/seed)

### **Expected Behavior Matrix**

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Select workspace item as reference | Auto-enable modify mode, strength 0.7 | Ready for subject modification |
| Upload image | Auto-enable modify mode, strength 0.7 | Ready for composition modification |
| Type "change dress to red" | Preserve subject/pose, modify dress | Same woman, red dress |
| Type "woman kissing friend" | Preserve subject/pose, modify scenario | Same woman, kissing scenario |
| Manually toggle to copy mode | Set strength 0.9, disable enhancement | High-fidelity preservation |
| Leave prompt empty in copy mode | Use original prompt (workspace) or minimal prompt (uploaded) | Near-identical copy |

### **Implementation Priority**

#### **Phase 1: Core Modify Functionality**
1. ✅ **Default to modify mode** for all references
2. ✅ **Reference strength 0.7** for modifications
3. ✅ **Subject/pose preservation** for workspace items
4. ✅ **Composition preservation** for uploaded images

#### **Phase 2: Manual Copy Mode**
1. 🔄 **Manual copy toggle** (user must explicitly select)
2. 🔄 **Copy-optimized parameters** (denoise 0.05, CFG 1.0)
3. 🔄 **Enhancement bypass** for copy mode
4. 🔄 **Style control disabling** for copy mode

#### **Phase 3: Advanced Features**
1. 📋 **Metadata extraction** for workspace items
2. 📋 **Original prompt preservation** for workspace items
3. 📋 **Seed locking** for character consistency
4. 📋 **Prompt modification engine** for intelligent changes

---

## **🧪 TESTING PLAN**

### **Test Suite 1: Default Behavior Validation**

#### **Test 1.1: Upload Image Default Mode**
**Steps:**
1. Upload an image to reference box
2. Verify mode is "MOD" (modify)
3. Verify reference strength is 0.5
4. Verify enhancement is enabled

**Expected Results:**
- Mode: "MOD" (not "COPY")
- Reference Strength: 0.5 (worker default denoise = 0.5)
- Enhancement: Enabled
- Console Log: "Auto-enable modify mode"

#### **Test 1.2: Workspace Item Default Mode**
**Steps:**
1. Drag workspace item to reference box
2. Verify mode is "MOD" (modify)
3. Verify reference strength is 0.5
4. Verify enhancement is enabled

**Expected Results:**
- Mode: "MOD" (not "COPY")
- Reference Strength: 0.5 (worker default denoise = 0.5)
- Enhancement: Enabled
- Console Log: "Auto-enable modify mode"

### **Test Suite 2: Mode Switching Validation**

#### **Test 2.1: MOD → COPY Toggle**
**Steps:**
1. Set reference image (should be in MOD mode)
2. Click mode toggle button
3. Verify mode changes to "COPY"
4. Verify reference strength changes to 0.9

**Expected Results:**
- Mode: "COPY"
- Reference Strength: 0.9
- Enhancement: Disabled
- Console Log: "Switching to copy mode"

#### **Test 2.2: COPY → MOD Toggle**
**Steps:**
1. Set reference image and toggle to COPY mode
2. Click mode toggle button again
3. Verify mode changes back to "MOD"
4. Verify reference strength changes back to 0.7

**Expected Results:**
- Mode: "MOD"
- Reference Strength: 0.7
- Enhancement: Enabled
- Console Log: "Switching to modify mode"

### **Test Suite 3: Parameter Validation**

#### **Test 3.1: Modify Mode Parameters**
**Steps:**
1. Set reference image (MOD mode)
2. Generate with modification prompt
3. Check edge function logs

**Expected Results:**
- Reference Strength: 0.7
- Denoise Strength: 0.3
- Guidance Scale: 7.5
- Steps: 25
- Enhancement: Enabled
- Reference Mode: "modify"

#### **Test 3.2: Copy Mode Parameters**
**Steps:**
1. Set reference image and toggle to COPY mode
2. Generate with empty prompt
3. Check edge function logs

**Expected Results:**
- Reference Strength: 0.9
- Denoise Strength: 0.05
- Guidance Scale: 1.0
- Steps: 15
- Enhancement: Disabled
- Reference Mode: "copy"

### **Test Suite 4: Use Case Validation**

#### **Test 4.1: Subject Modification (Workspace Item)**
**Steps:**
1. Generate "woman in black dress"
2. Use as reference (should be MOD mode)
3. Type "change to red dress"
4. Generate

**Expected Results:**
- Same woman, same pose
- Red dress instead of black
- Preserved lighting and composition
- Console Log: "Applying modification to original prompt"

#### **Test 4.2: Subject Modification (Uploaded Image)**
**Steps:**
1. Upload image of woman in black dress
2. Verify MOD mode (not COPY)
3. Type "change to red dress"
4. Generate

**Expected Results:**
- Same woman, same pose
- Red dress instead of black
- Preserved composition
- Console Log: "Composition modification"

#### **Test 4.3: Exact Copy (Manual Selection)**
**Steps:**
1. Set reference image
2. Manually toggle to COPY mode
3. Leave prompt empty
4. Generate

**Expected Results:**
- Near-identical copy
- High fidelity preservation
- Console Log: "Exact copy mode - no modification"

### **Test Suite 5: Edge Function Validation**

#### **Test 5.1: enhance-prompt Bypass**
**Steps:**
1. Enable COPY mode
2. Generate
3. Check enhance-prompt logs

**Expected Results:**
- Early exit for exact copy
- Skip enhancement entirely
- Template: "skip_for_exact_copy"

#### **Test 5.2: queue-job Parameter Setting**
**Steps:**
1. Generate in both MOD and COPY modes
2. Check queue-job logs

**Expected Results:**
- Correct denoise/CFG/steps values
- Proper reference mode classification
- Correct enhancement bypass

### **Test Suite 6: Error Handling**

#### **Test 6.1: Invalid Mode Transitions**
**Steps:**
1. Try to enable COPY mode without reference
2. Try to generate without prompt in MOD mode

**Expected Results:**
- Appropriate error messages
- Graceful fallbacks
- No crashes

### **Debug Commands for Testing**

#### **Browser Console Commands**
```javascript
// Check current state
console.log('🎯 CURRENT STATE:', {
  exactCopyMode: window.workspaceState?.exactCopyMode,
  referenceStrength: window.workspaceState?.referenceStrength,
  referenceImageUrl: window.workspaceState?.referenceImageUrl,
  enhancementEnabled: window.workspaceState?.enhancementModel !== 'none'
});

// Test mode toggle
window.workspaceState?.setExactCopyMode(!window.workspaceState.exactCopyMode);

// Check generation parameters
console.log('🎯 GENERATION PARAMS:', {
  referenceStrength: window.workspaceState?.referenceStrength,
  denoiseStrength: 1 - window.workspaceState?.referenceStrength,
  guidanceScale: window.workspaceState?.exactCopyMode ? 1.0 : 7.5
});
```

#### **Edge Function Log Patterns**
```bash
# enhance-prompt logs
grep "skip_for_exact_copy" logs
grep "reference_mode: modify" logs
grep "reference_mode: copy" logs

# queue-job logs
grep "I2I MODE RESOLUTION" logs
grep "denoise_strength: 0.05" logs
grep "guidance_scale: 1.0" logs
```

### **Success Criteria**

#### **Phase 1 Success (Core Modify)**
- ✅ All references default to MOD mode
- ✅ Reference strength 0.7 for modifications
- ✅ Subject/pose preservation working
- ✅ Enhancement enabled in MOD mode

#### **Phase 2 Success (Manual Copy)**
- ✅ Manual toggle to COPY mode works
- ✅ Copy parameters (denoise 0.05, CFG 1.0) applied
- ✅ Enhancement bypassed in COPY mode
- ✅ High-fidelity copies produced

#### **Phase 3 Success (Advanced Features)**
- ✅ Metadata extraction working
- ✅ Original prompt preservation
- ✅ Seed locking for consistency
- ✅ Intelligent prompt modifications

---

## **🎯 WORKSPACE WORKFLOWS — TARGET UX**

### **Workflow 1: Workspace/Library Reference Images**

#### **Scenario A: Exact Copy with Modification**
**Use Case**: User wants to modify an existing generated image while preserving the original quality and character.

**Step-by-Step Process:**

1. **Select Reference Image**
   ```
   User Action: Right-click on workspace/library item → "Use as Reference"
   System Action: 
   - Extracts metadata from selected item
   - Sets reference image URL
   - Enables exact copy mode automatically
   - Sets reference strength to 0.9
   - Applies original generation parameters
   ```

2. **Review Original Prompt**
   ```
   System Display: Shows original enhanced prompt in control panel
   Example: "A professional high-resolution shot of a teenage female model standing with perfect posture, wearing a sleek black dress that accentuates her figure. She is posed confidently, one hand on her hip while the other is slightly raised at an angle"
   ```

3. **Enter Modification**
   ```
   User Input: "change outfit to red bikini"
   System Processing:
   - Detects modification intent (clothing change)
   - Applies intelligent prompt modification
   - Preserves original structure and quality
   ```

4. **Preview Final Prompt**
   ```
   System Display: Shows modified prompt
   Example: "A professional high-resolution shot of a teenage female model standing with perfect posture, wearing a red bikini that accentuates her figure. She is posed confidently, one hand on her hip while the other is slightly raised at an angle"
   ```

5. **Generate**
   ```
   System Action:
   - Uses original seed for character consistency
   - Disables style controls (no cinematic lighting, film grain, etc.)
   - Sets reference strength to 0.9 for maximum preservation
   - Bypasses prompt enhancement
   - Uses original generation parameters
   ```

**Expected Result**: Same subject, pose, lighting, and quality with only the requested change applied.

#### **Scenario B: Exact Copy with Empty Prompt**
**Use Case**: User wants to create an identical copy of the reference image.

**Step-by-Step Process:**

1. **Select Reference Image**
   ```
   User Action: Right-click on workspace/library item → "Use as Reference"
   System Action: Same as Scenario A
   ```

2. **Leave Prompt Empty**
   ```
   User Input: (empty prompt)
   System Processing:
   - Uses original enhanced prompt as-is
   - No modifications applied
   - Preserves all original characteristics
   ```

3. **Generate**
   ```
   System Action:
   - Uses original enhanced prompt exactly
   - Uses original seed
   - Disables all style controls
   - Sets reference strength to 0.9
   - Bypasses enhancement
   ```

**Expected Result**: Nearly identical image with same quality and characteristics (subject to denoise/resize policy).

---

### **Workflow 2: Uploaded Reference Images (Pending Fixes)**

#### **Scenario A: Promptless Exact Copy**
**Use Case**: User uploads an image and wants to create an exact copy without any modifications.

**Step-by-Step Process:**

1. **Upload Reference Image**
   ```
   User Action: Drag & drop or upload image to reference box
   System Action:
   - Validates image format and size
   - Stores image in temporary storage
   - Generates signed URL for worker access
   ```

2. **Enable Exact Copy Mode**
   ```
   User Action: Toggle "Exact Copy" mode in control panel
   System Action:
   - Sets reference strength to 0.9
   - Disables style controls
   - Prepares for promptless generation
   ```

3. **Leave Prompt Empty**
   ```
   User Input: (empty prompt)
   System Processing:
   - Uses minimal preservation prompt
   - Focuses on maintaining image characteristics
   - No style enhancements added
   ```

4. **Generate**
   ```
   System Action:
   - Uses reference image as primary guide
   - Sets reference strength to 0.9
   - Disables all style controls
   - Bypasses prompt enhancement
   - Uses composition reference type
   ```

**Expected Result**: High-fidelity copy of the uploaded reference image (requires dedicated promptless exact-copy path).

#### **Scenario B: Uploaded Image with Modification**
**Use Case**: User uploads an image and wants to modify specific elements while preserving the overall composition.

**Step-by-Step Process:**

1. **Upload Reference Image**
   ```
   User Action: Drag & drop or upload image to reference box
   System Action: Same as Scenario A
   ```

2. **Enable Exact Copy Mode**
   ```
   User Action: Toggle "Exact Copy" mode
   System Action: Same as Scenario A
   ```

3. **Enter Modification Prompt**
   ```
   User Input: "change background to beach scene"
   System Processing:
   - Creates subject-preserving enhancement
   - Maintains original composition
   - Applies background modification
   ```

4. **Generate**
   ```
   System Action:
   - Uses reference image for composition
   - Applies modification to background
   - Preserves subject and pose
   - Sets reference strength to 0.9
   ```

**Expected Result**: Same subject and pose with the requested background change.

---

## **🔧 TECHNICAL IMPLEMENTATION DETAILS (TO BE VERIFIED)**

### **Metadata Extraction Process**

#### **For Workspace/Library Images**
```typescript
// extractReferenceMetadata.ts
export const extractReferenceMetadata = (asset: UnifiedAsset): ReferenceMetadata | null => {
  const metadata = asset.metadata as any;
  
  // Extract enhanced prompt with fallbacks
  const originalEnhancedPrompt = 
    metadata?.enhanced_prompt || 
    asset.enhancedPrompt || 
    metadata?.prompt ||
    asset.prompt;
    
  return {
    originalEnhancedPrompt,
    originalSeed: metadata?.seed || (asset as any).seed,
    originalGenerationParams: metadata?.generationParams || metadata,
    originalStyle: metadata?.style || '',
    originalCameraAngle: metadata?.camera_angle || 'eye_level',
    originalShotType: metadata?.shot_type || 'wide',
    aspectRatio: metadata?.aspect_ratio || '16:9'
  };
};
```

#### **For Uploaded Images (promptless copy path)**
Aim to bypass enhancement, set ultra-low denoise (≤0.05) and CFG ~1.0; avoid style/negative prompts; use img2img pipeline.

### **Prompt Modification Engine**

#### **Intelligent Element Replacement**
```typescript
// promptModification.ts
export const modifyOriginalPrompt = (originalPrompt: string, modification: string): string => {
  const words = modification.toLowerCase().split(' ');
  
  // Detect modification type
  const isClothingChange = words.some(w => ['dress', 'shirt', 'pants', 'outfit', 'clothes', 'bikini', 'suit'].includes(w));
  const isColorChange = words.some(w => ['color', 'red', 'blue', 'green', 'black', 'white'].includes(w));
  const isBackgroundChange = words.some(w => ['background', 'scene', 'beach', 'forest', 'city'].includes(w));
  
  if (isClothingChange) {
    return replaceClothingInPrompt(originalPrompt, modification);
  } else if (isColorChange) {
    return replaceColorInPrompt(originalPrompt, modification);
  } else if (isBackgroundChange) {
    return replaceBackgroundInPrompt(originalPrompt, modification);
  } else {
    return applyGenericModification(originalPrompt, modification);
  }
};
```

### **Edge Function Integration**

#### **Queue-Job Edge Function (policy — to implement/confirm)**
- Explicit branch for: exact_copy_mode + uploaded reference + empty prompt → promptless copy settings (ultra-low denoise, CFG 1.0, skip enhancement, no negatives).

#### **Enhance-Prompt Edge Function (policy — to implement/confirm)**
- In promptless exact-copy branch, skip enhancement entirely.

---

## **🎯 USER INTERFACE WALKTHROUGH**

### **Control Panel Indicators**

#### **Exact Copy Mode Toggle**
```
[✓] Exact Copy Mode
    When enabled:
    - Shows copy icon
    - Disables style controls
    - Sets reference strength to 0.9
    - Shows original prompt (if available)
```

#### **Reference Image Display**
```
Reference Image: [Preview] [Remove]
Reference Strength: 0.9 (locked in exact copy mode)
Reference Type: Composition (for exact copy)
```

#### **Prompt Preview Panel**
```
Original Prompt:
A professional high-resolution shot of a teenage female model...

Final Prompt:
A professional high-resolution shot of a teenage female model wearing a red bikini...
```

### **Visual Feedback States**

#### **Workspace/Library Reference**
```
✅ Reference Set: "professional shot of teen model"
✅ Exact Copy Mode: Enabled
✅ Original Prompt: Available
✅ Seed: Locked (1754845768000000000)
```

#### **Uploaded Reference**
```
✅ Reference Set: "Uploaded Image"
✅ Exact Copy Mode: Enabled
⚠️ Original Prompt: Not available (uploaded image)
⚠️ Seed: Not available (uploaded image)
```

---

## **🔍 TROUBLESHOOTING GUIDE (KNOWN GAPS)**

### **Common Issues and Solutions**

#### **Issue 1: System Defaulting to Copy Mode**
**Symptoms**: System automatically enables copy mode instead of modify mode
**Expected Behavior**: 
- All references should default to "modify" mode
- User must manually toggle to "copy" mode
- Uploaded images should default to modify mode

**Solutions**:
```typescript
// Check default behavior
console.log('🎯 DEFAULT MODE CHECK:', {
  uploadedImageMode: 'should be modify',
  workspaceItemMode: 'should be modify',
  userToggleRequired: 'for copy mode'
});

// Verify mode switching
console.log('🎯 MODE SWITCHING:', {
  modifyDefaults: { referenceStrength: 0.7, enhancementEnabled: true },
  copyDefaults: { referenceStrength: 0.9, enhancementEnabled: false }
});
```

#### **Issue 2: Reference Strength Not Appropriate**
**Symptoms**: Reference strength too high for modifications, too low for copies
**Expected Behavior**:
- Modify mode: 0.7 (preserve subject, allow changes)
- Copy mode: 0.9 (maximum preservation)

**Solutions**:
```typescript
// Check reference strength settings
console.log('🎯 REFERENCE STRENGTH:', {
  modifyMode: 'should be 0.7',
  copyMode: 'should be 0.9',
  currentStrength: referenceStrength
});
```

#### **Issue 3: Enhancement Not Bypassed in Copy Mode**
**Symptoms**: Enhancement still applied when copy mode is enabled
**Expected Behavior**:
- Copy mode: skip enhancement entirely
- Modify mode: normal enhancement flow

**Solutions**:
```typescript
// Check enhancement bypass
console.log('🎯 ENHANCEMENT BYPASS:', {
  exactCopyMode: exactCopyMode,
  skipEnhancement: exactCopyMode ? true : false,
  enhancementEnabled: !exactCopyMode
});
```

#### **Issue 4: SDXL Parameters Not Optimized for Copy Mode**
**Symptoms**: Copy mode not using optimal parameters for exact copying
**Expected Behavior**:
- Copy mode: denoise_strength: 0.05, guidance_scale: 1.0
- Modify mode: denoise_strength: 0.3, guidance_scale: 7.5

**Solutions**:
```typescript
// Check SDXL parameters
console.log('🎯 SDXL PARAMETERS:', {
  exactCopyMode: exactCopyMode,
  denoiseStrength: exactCopyMode ? 0.05 : 0.3,
  guidanceScale: exactCopyMode ? 1.0 : 7.5
});
```

#### **Issue 3: Original Prompt Not Displayed**
**Symptoms**: No original prompt shown in control panel
**Causes**:
- Asset doesn't have enhanced_prompt field
- Metadata extraction failed
- UI not updated properly

**Solutions**:
```typescript
// Check asset structure
console.log('🎯 ASSET STRUCTURE:', {
  hasMetadata: !!asset.metadata,
  hasEnhancedPrompt: !!asset.enhancedPrompt,
  metadataKeys: Object.keys(asset.metadata || {})
});

// Verify extraction
const metadata = extractReferenceMetadata(asset);
console.log('🎯 EXTRACTION RESULT:', metadata);
```

#### **Issue 3: Modifications Not Applied Correctly**
**Symptoms**: Changes not reflected in final prompt
**Causes**:
- Prompt modification engine not working
- Modification not detected properly
- Fallback to generic modification

**Solutions**:
```typescript
// Test prompt modification
const modified = modifyOriginalPrompt(originalPrompt, "change to red dress");
console.log('🎯 PROMPT MODIFICATION:', {
  original: originalPrompt,
  modification: "change to red dress",
  result: modified
});
```

### **Debugging Commands**

#### **Browser Console Debugging**
```javascript
// Check current state
console.log('🎯 EXACT COPY STATE:', {
  exactCopyMode: window.workspaceState?.exactCopyMode,
  referenceMetadata: window.workspaceState?.referenceMetadata,
  referenceImageUrl: window.workspaceState?.referenceImageUrl
});

// Test metadata extraction
const asset = window.workspaceAssets?.[0];
if (asset) {
  const { extractReferenceMetadata } = require('@/utils/extractReferenceMetadata');
  const metadata = extractReferenceMetadata(asset);
  console.log('🎯 METADATA TEST:', metadata);
}
```

#### **Edge Function Logging**
```typescript
// Check edge function logs for these patterns:
// 🎯 REFERENCE IMAGE PROCESSING:
// 🎯 EXACT COPY DEBUG:
// 🎯 ENHANCE-PROMPT DEBUG:
// 🎯 EXACT COPY MODE:
```

---

## **📊 EXPECTED BEHAVIOR MATRIX (TARGET)**

### **Primary Use Cases: Subject Modification**

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Select workspace item as reference | Auto-enable modify mode, strength 0.7 | Ready for subject modification |
| Upload image | Auto-enable modify mode, strength 0.7 | Ready for composition modification |
| Type "change black dress to red" | Preserve subject/pose, modify dress | Same woman, red dress |
| Type "woman kissing her friend" | Preserve subject/pose, modify scenario | Same woman, kissing scenario |
| Type "change background to beach" | Preserve subject/pose, modify background | Same woman, beach background |

### **Secondary Use Cases: Exact Copying (Manual Selection)**

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Manually toggle to copy mode | Set strength 0.9, disable enhancement | High-fidelity preservation |
| Leave prompt empty in copy mode (workspace) | Use original prompt, preserve seed | Near-identical copy |
| Leave prompt empty in copy mode (uploaded) | Use minimal preservation prompt | High-fidelity copy |
| Toggle back to modify mode | Set strength 0.7, enable enhancement | Ready for modifications |

### **Mode Switching Behavior**

| Current Mode | User Action | New Mode | Reference Strength | Enhancement | SDXL Parameters |
|--------------|-------------|----------|-------------------|-------------|-----------------|
| Modify | Toggle to copy | Copy | 0.9 | Disabled | denoise: 0.05, CFG: 1.0 |
| Copy | Toggle to modify | Modify | 0.7 | Enabled | denoise: 0.3, CFG: 7.5 |
| None | Upload image | Modify | 0.7 | Enabled | denoise: 0.3, CFG: 7.5 |
| None | Select workspace item | Modify | 0.7 | Enabled | denoise: 0.3, CFG: 7.5 |

---

## **🚀 ADVANCED USAGE SCENARIOS**

### **Character Consistency Workflow**
1. **Generate base character** with detailed prompt
2. **Use as reference** for exact copy mode
3. **Create variations** with different poses/outfits
4. **Maintain character consistency** across all generations

### **Style Transfer Workflow**
1. **Upload reference image** with desired style
2. **Enable exact copy mode** for composition preservation
3. **Modify specific elements** while keeping style
4. **Create style-consistent variations**

### **Batch Modification Workflow**
1. **Select multiple reference images** from workspace
2. **Apply same modification** to all (e.g., "change background to beach")
3. **Generate batch** with consistent modifications
4. **Maintain individual characteristics** while applying changes

---

**Current Status**: In Progress — verification and fixes pending
**Next Phase**: Implement promptless exact-copy branch; unify shared components with Library
**Priority**: High — unblock workspace UX and consistent I2I behavior

---

## Page Purpose & Component Inventory (per template)

### Purpose Statement
Provide a responsive workspace for generating, staging, previewing, iterating, and selectively saving assets to the Library.

### User Intent
- Primary: Generate and iterate rapidly; select best results to save.
- Secondary: Use references (workspace/library or uploaded) for I2I; test small edits.

### Core Functionality (to verify)
1. Generation submission and realtime staging
2. Grid display with preview (shared lightbox)
3. Save to Library / Discard
4. Reference box for I2I (workspace or uploaded)
5. Promptless exact-copy for uploads (pending)

### Known Issues
- Promptless uploaded exact copy not accurate yet
- Storage and URL cache policy needs confirmation
- Component duplication between Workspace and Library

### Components (inventory — verify presence/usage)
- Workspace page: `src/pages/SimplifiedWorkspace.tsx`, `src/pages/MobileSimplifiedWorkspace.tsx`
- Workspace UI: `src/components/workspace/MobileSimplePromptInput.tsx`, `src/components/workspace/ContentCard.tsx`, `src/components/workspace/SimpleLightbox.tsx`
- Shared candidates: grid, lightbox, content card (align with Library equivalents)

### Next Steps
- Implement and verify promptless exact-copy branch (edge + worker guard)
- Consolidate grid + lightbox into shared components used by both pages
- Confirm storage/bucket conventions and signed URL TTL + Cache-Control
- Archive legacy/unused workspace components in `docs/components/99-ARCHIVE_COMPONENTS.MD`
