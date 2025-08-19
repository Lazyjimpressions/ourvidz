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
- Do not assume exact copy is implemented. Uploaded promptless I2I is not producing identical copies and requires fixes.
- Two intended workflows:
  1) Reference from workspace/library item (with metadata)
  2) Uploaded image (no metadata, promptless copy or minimal edits)

### **Core Features**

#### **Planned Behavior (to implement/verify)**
- Reference items: extract original prompt/seed when available; apply targeted modifications; disable style overrides.
- Uploaded images: exact-copy branch that bypasses enhancement and uses ultra-low denoise with CFG ~1.0.
- UI clearly indicates reference type (workspace vs uploaded) and mode (copy vs modify).

#### **2. Metadata Extraction & Storage**
- **Reference Metadata Extraction**: Automatically extracts original enhanced prompts, seeds, and generation parameters
- **Multiple Source Fallbacks**: Tries enhanced_prompt → enhancedPrompt → prompt for maximum compatibility
- **Generation Parameter Preservation**: Stores and reuses original style, camera angle, shot type, and aspect ratio
- **Seed Locking**: Preserves original seeds for character consistency across generations

#### **3. Complete Enhancement Bypass**
- **Style Control Disabling**: Automatically disables style controls when in exact copy mode
- **Enhancement Skipping**: Bypasses prompt enhancement to preserve original quality
- **Original Parameter Restoration**: Uses original generation parameters instead of current UI settings
- **Reference Strength Optimization**: Sets reference strength to 0.9 for maximum preservation

#### **4. Advanced User Experience**
- **Original Prompt Display**: Shows the original enhanced prompt when exact copy mode is active
- **Modification Preview**: Real-time preview of how the final prompt will look after modification
- **Visual Feedback**: Clear indication of exact copy mode with copy icon and styling
- **Helpful Suggestions**: Provides modification examples when no prompt is entered

### **Technical Notes (contract to verify)**

#### **Core Components**
```typescript
// Utilities in scope (verify presence/usage; keep simple where possible)
src/utils/extractReferenceMetadata.ts     // Extract prompt/seed/params from assets (if present)
src/utils/promptModification.ts           // Lightweight prompt adjustment helpers
src/types/workspace.ts                    // ReferenceMetadata interface (minimal)
```

#### **Enhanced Hook Integration**
```typescript
// Pseudocode branch (to verify):
if (exactCopyMode && referenceMetadata && referenceImageUrl) {
  // Use original prompt/seed from metadata; apply targeted modification if provided
}
```

#### **UI Integration**
```typescript
// SimplePromptInput.tsx - Exact copy UI
{exactCopyMode && referenceMetadata && (
  <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
    <div className="font-medium text-foreground">Original Prompt:</div>
    <div className="text-muted-foreground text-[10px] max-h-8 overflow-y-auto">
      {referenceMetadata.originalEnhancedPrompt}
    </div>
    {prompt.trim() && (
      <>
        <div className="font-medium text-foreground">Final Prompt:</div>
        <div className="text-primary text-[10px] max-h-8 overflow-y-auto">
          {modifyOriginalPrompt(referenceMetadata.originalEnhancedPrompt, prompt.trim())}
        </div>
      </>
    )}
  </div>
)}
```

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

#### **Issue 1: Exact Copy Mode Not Working**
**Symptoms**: Style controls still active, enhancement still applied
**Causes**: 
- Reference metadata not extracted properly
- Exact copy mode not enabled
- Edge function not receiving exact copy flag

**Solutions**:
```typescript
// Check metadata extraction
console.log('🎯 METADATA EXTRACTION:', {
  extracted: !!metadata,
  originalPrompt: metadata?.originalEnhancedPrompt,
  exactCopyMode: exactCopyMode
});

// Verify edge function parameters
console.log('🎯 EDGE FUNCTION:', {
  exact_copy_mode: metadata?.exact_copy_mode,
  reference_strength: metadata?.reference_strength,
  skip_enhancement: metadata?.skip_enhancement
});
```

#### **Issue 2: Uploaded Images Not Working in Exact Copy Mode**
**Symptoms**: Uploaded images don't produce exact copies, system falls back to normal generation
**Causes**: 
- Uploaded images have no metadata (no `originalEnhancedPrompt`)
- System requires `referenceMetadata` to enable exact copy mode
- Fallback logic not handling uploaded references properly

**Proposed Direction**:
- Add explicit promptless exact-copy branch in edge; guard in worker; bypass enhancement; set ultra-low denoise and CFG 1.0.

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

### **Workspace/Library Reference Images**

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Select reference + Enable exact copy | Extract metadata, set reference strength 0.9 | Ready for modification |
| Enter "change to red dress" | Modify original prompt, preserve structure | Same subject with red dress |
| Leave prompt empty | Use original prompt as-is | Identical copy |
| Disable exact copy | Normal generation flow | Standard I2I with style controls |

### **Uploaded Reference Images**

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Upload image + Enable exact copy | Trigger promptless exact-copy branch (skip enhancement, denoise ≤0.05, CFG 1.0) | Ready for promptless copy |
| Enter modification prompt | Create subject-preserving prompt | Modified version |
| Leave prompt empty | Use minimal preservation prompt | High-fidelity copy |
| Disable exact copy | Normal generation flow | Standard I2I with style controls |

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
