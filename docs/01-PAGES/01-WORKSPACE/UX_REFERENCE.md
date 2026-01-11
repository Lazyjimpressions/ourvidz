# Workspace Reference Image/I2I UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/workspace`
**Component:** `SimplePromptInput.tsx`, `MobileSimplePromptInput.tsx`

---

## Purpose

Reference image selection and I2I (Image-to-Image) workflow specification, including modify mode (default) and copy mode (manual selection) behaviors.

---

## Layout Structure

```
┌───────────────────────────────────────────────┐
│  Reference Box                                │
├───────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐     │
│  │  [Reference Image Preview]          │     │
│  │                                     │     │
│  │  [Remove] [MOD/COPY Toggle]        │     │
│  └─────────────────────────────────────┘     │
│  OR                                           │
│  ┌─────────────────────────────────────┐     │
│  │  [Upload Area]                      │     │
│  │  Drag & drop or click to upload     │     │
│  └─────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

---

## Reference Image Selection

### Workspace/Library Item Reference

**Selection Methods:**
1. **Drag & Drop**: Drag item from grid to reference box
2. **"Use as Reference" Button**: Click button on card overlay
3. **Right-Click Menu**: Right-click on card → "Use as Reference"

**Behavior:**
- Metadata extracted from workspace/library item
- Original prompt, seed, and generation parameters preserved
- Reference image URL set from workspace/library item
- Auto-enable modify mode (default)
- Reference strength set to 0.5

**Visual Feedback:**
- Reference image preview shown in reference box
- Original prompt displayed (if available)
- Seed displayed (if available)
- Metadata indicators shown

### Uploaded Image Reference

**Selection Methods:**
1. **Drag & Drop**: Drag image file to reference box
2. **Click to Upload**: Click upload area → file picker
3. **Paste**: Paste image from clipboard

**Behavior:**
- Image validated (format, size)
- Image stored in temporary storage
- Signed URL generated for worker access
- Auto-enable modify mode (default)
- Reference strength set to 0.5

**Visual Feedback:**
- Uploaded image preview shown in reference box
- Upload progress indicator (if needed)
- File name displayed (optional)

---

## I2I Mode Toggle

### Modify Mode (Default)

**Default State:**
- Always enabled when reference image is set
- User must explicitly toggle to copy mode

**Parameters:**
- Reference Strength: 0.5 (preserve subject, allow changes)
- Enhancement: Enabled (normal generation flow)
- Style Controls: Enabled (aspect ratio, shot type, camera angle, style)
- SDXL Parameters: denoise_strength: 0.5, guidance_scale: 7.5, steps: 25

**Visual:**
- "MOD" badge/indicator
- Green/blue color scheme
- Tooltip: "Modify mode: Preserves subject while allowing changes"

**Use Cases:**
- "Change black dress to red" → Same woman, same pose, red dress
- "Woman kissing her friend" → Same woman, same pose, kissing scenario
- "Change background to beach" → Same subject, beach background

### Copy Mode (Manual Selection)

**Activation:**
- User must explicitly toggle from modify mode
- Not available without reference image

**Parameters:**
- Reference Strength: 0.95 (maximum preservation)
- Enhancement: Disabled (skip enhancement)
- Style Controls: Disabled (aspect ratio, shot type, camera angle, style)
- SDXL Parameters: denoise_strength: 0.05, guidance_scale: 1.0, steps: 15

**Visual:**
- "COPY" badge/indicator
- Red/orange color scheme
- Tooltip: "Copy mode: High-fidelity preservation"

**Use Cases:**
- Exact copy of workspace item (preserve original prompt/seed)
- Exact copy of uploaded image (high-fidelity preservation)
- Character consistency across generations

---

## Mode Switching Behavior

### MOD → COPY Toggle

**User Action:**
- Click mode toggle button
- Or use keyboard shortcut (optional)

**System Response:**
- Reference strength changes from 0.5 to 0.95
- Enhancement disabled
- Style controls disabled
- Visual indicator changes to "COPY"
- Console log: "🎯 EXACT COPY MODE - ACTIVE:"

**Visual Feedback:**
- Smooth transition animation
- Color scheme changes
- Disabled controls grayed out
- Tooltip updates

### COPY → MOD Toggle

**User Action:**
- Click mode toggle button again
- Or use keyboard shortcut (optional)

**System Response:**
- Reference strength changes from 0.95 to 0.5
- Enhancement enabled
- Style controls enabled
- Visual indicator changes to "MOD"
- Console log: "🎯 MODIFY MODE: Processing reference image for modification"

**Visual Feedback:**
- Smooth transition animation
- Color scheme changes
- Enabled controls highlighted
- Tooltip updates

---

## Reference Strength Controls

### Strength Display

**Location:** Reference box (below preview)

**Component:** Slider or number input

**Range:** 0.0-1.0

**Default:**
- Modify Mode: 0.5
- Copy Mode: 0.95

**Behavior:**
- Locked in copy mode (always 0.95)
- Adjustable in modify mode (0.0-1.0)
- Real-time preview (optional)

**Visual:**
- Slider with value display
- Min/max labels (0.0 = no reference, 1.0 = maximum reference)
- Tooltip explaining impact

### Strength Impact

**Low Strength (0.0-0.3):**
- Minimal reference influence
- More creative freedom
- Less subject preservation

**Medium Strength (0.4-0.6):**
- Balanced reference influence
- Good subject preservation with flexibility
- Default for modify mode (0.5)

**High Strength (0.7-0.9):**
- Strong reference influence
- High subject preservation
- Less creative freedom

**Maximum Strength (0.95):**
- Maximum reference influence
- Highest subject preservation
- Used in copy mode

---

## Visual Feedback States

### Reference Set (Workspace/Library Item)

**Display:**
```
✅ Reference Set: "professional shot of teen model"
✅ Modify Mode: Enabled (default)
✅ Original Prompt: Available
✅ Seed: Available (for copy mode)
```

**Indicators:**
- Green checkmark icon
- Reference source type badge
- Metadata availability indicators
- Mode indicator (MOD/COPY)

### Reference Set (Uploaded Image)

**Display:**
```
✅ Reference Set: "Uploaded Image"
✅ Modify Mode: Enabled (default)
⚠️ Original Prompt: Not available (uploaded image)
⚠️ Seed: Not available (uploaded image)
```

**Indicators:**
- Green checkmark icon
- Reference source type badge
- Warning icons for missing metadata
- Mode indicator (MOD/COPY)

### No Reference Set

**Display:**
```
📤 No Reference Image
   Drag & drop or click to upload
```

**Indicators:**
- Upload icon
- Placeholder text
- Upload area highlighted

---

## Expected Behavior Matrix

### Primary Use Cases: Subject Modification

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Select workspace item as reference | Auto-enable modify mode, strength 0.5 | Ready for subject modification |
| Upload image | Auto-enable modify mode, strength 0.5 | Ready for composition modification |
| Type "change black dress to red" | Preserve subject/pose, modify dress | Same woman, red dress |
| Type "woman kissing her friend" | Preserve subject/pose, modify scenario | Same woman, kissing scenario |
| Type "change background to beach" | Preserve subject/pose, modify background | Same woman, beach background |

### Secondary Use Cases: Exact Copying (Manual Selection)

| User Action | System Response | Expected Result |
|-------------|----------------|-----------------|
| Manually toggle to copy mode | Set strength 0.95, disable enhancement | High-fidelity preservation |
| Leave prompt empty in copy mode (workspace) | Use original prompt, preserve seed | Near-identical copy |
| Leave prompt empty in copy mode (uploaded) | Use minimal preservation prompt | High-fidelity copy |
| Toggle back to modify mode | Set strength 0.5, enable enhancement | Ready for modifications |

### Mode Switching Behavior

| Current Mode | User Action | New Mode | Reference Strength | Enhancement | SDXL Parameters |
|--------------|-------------|----------|-------------------|-------------|-----------------|
| Modify | Toggle to copy | Copy | 0.95 | Disabled | denoise: 0.05, CFG: 1.0 |
| Copy | Toggle to modify | Modify | 0.5 | Enabled | denoise: 0.5, CFG: 7.5 |
| None | Upload image | Modify | 0.5 | Enabled | denoise: 0.5, CFG: 7.5 |
| None | Select workspace item | Modify | 0.5 | Enabled | denoise: 0.5, CFG: 7.5 |

---

## Model Filtering (I2I)

### Filtering Behavior

**When Reference Image Set:**
- Model dropdown automatically filters to show only I2I-capable models
- Models filtered by `supports_i2i = true` capability
- Local SDXL always included (always supports I2I)
- API models must have `supports_i2i = true` to appear

**When Reference Image Removed:**
- Model dropdown shows all models (no filtering)
- All active models displayed
- I2I-specific indicators hidden

### I2I-Capable Models

**Local Models:**
- SDXL (Local) - Always supports I2I when healthy

**API Models (when `supports_i2i = true`):**
- Seedream v4.5 Edit (fal.ai) - Recommended for high-quality edits
- Seedream v4 Edit (fal.ai)
- Replicate models with I2I support

**Display:**
- I2I badge/indicator on model name
- Tooltip: "Supports Image-to-Image"
- Recommended badge for best I2I models

---

## Mobile-Specific Behaviors

### Touch Interactions

**Reference Box:**
- Tap to upload (file picker)
- Long-press for context menu (remove, clear)
- Swipe to remove (optional)

**Mode Toggle:**
- Large touch target (44px minimum)
- Clear visual feedback
- Haptic feedback (optional)

**Strength Slider:**
- Large touch target
- Value display above slider
- Increment/decrement buttons (optional)

### Upload Flow

**Mobile Upload:**
1. Tap upload area
2. File picker opens
3. Select image from gallery or camera
4. Image preview shown immediately
5. Upload progress indicator (if needed)

**Camera Integration:**
- Direct camera access (optional)
- Image capture and preview
- Crop/edit before upload (optional)

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_GENERATION.md](./UX_GENERATION.md) - Generation workflow spec
- [UX_CONTROLS.md](./UX_CONTROLS.md) - Control panel spec
- [SEEDREAM_I2I.md](./SEEDREAM_I2I.md) - **NEW:** Comprehensive Seedream I2I reference image guide (v4 Edit, v4.5 Edit, exact copy mode, NSFW enhancement)
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Implementation status
