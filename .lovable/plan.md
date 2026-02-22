

## Workspace Controls: Layout and Categorization Plan

### Current State

The workspace hook (`useLibraryFirstWorkspace`) already manages **shot type**, **camera angle**, **style**, **enhancement model**, **video duration**, **motion intensity**, and more -- but none of these are exposed in the UI. The Settings Sheet only shows Model, Resolution, Content Type, Aspect Ratio, and Reference Image controls.

---

### Proposed Control Hierarchy

#### Tier 1: Quick Bar (always visible, inline)
These are the most-changed-per-generation controls. Keep what's there now:

| Control | Image | Video |
|---------|-------|-------|
| Mode toggle (Image/Video) | Yes | Yes |
| Content Type (SFW/NSFW) | Desktop only | Desktop only |
| Aspect Ratio (1:1, 16:9, 9:16) | Desktop only | Desktop only |
| Batch Size (1, 3, 6) | Desktop only | Hidden (video is always 1) |
| Model chip (opens settings) | Yes | Yes |
| Reference indicator | Yes | Yes |

No changes to the Quick Bar.

---

#### Tier 2: Settings Sheet (user-facing, opened via gear icon)
Add the missing creative controls here. Organized into sections:

**Section: Model** (existing)
- Model selector dropdown

**Section: Output** (existing, reorganized)
- Resolution (Standard/HD)
- Content Type (SFW/NSFW)
- Aspect Ratio pills

**Section: Creative Direction** (NEW -- image mode only)
- **Shot Type**: `Wide | Medium | Close` -- segmented pills
- **Camera Angle**: dropdown with `Eye Level | Low Angle | Over Shoulder | Overhead | Bird's Eye`
- **Style**: compact text input (pre-filled with "cinematic lighting, film grain, dramatic composition")
- **Enhancement**: `Auto | Base | None` segmented pills (maps to qwen_instruct / qwen_base / none)

**Section: Video Controls** (NEW -- video mode only)
- **Duration**: segmented pills showing model-derived options (e.g., 1s, 2s, 3s, 4s, 5s) from `useVideoModelSettings`
- **Motion Intensity**: compact range slider (0-1)

**Section: Reference Image** (existing, no changes)

**Section: Advanced** (existing collapsible, stays for local models)

**Section: Workspace Actions** (existing, no changes)

---

#### Tier 3: Admin/Debug Only (hidden from users)
These stay in the dev-only Debug Panel or are invisible:

| Control | Reason |
|---------|--------|
| Bypass Enhancement toggle | Debug only |
| Hard Override toggle | Debug only |
| Lock Seed / Seed input | Power-user, rarely needed |
| Reference Type (style/character/composition) | Auto-determined by context |
| SDXL advanced (steps, CFG, compel) | Local model internals |
| Sound Enabled toggle | Not yet functional |

---

### Technical Changes

**`src/components/workspace/MobileSettingsSheet.tsx`**
- Add props: `shotType`, `onShotTypeChange`, `cameraAngle`, `onCameraAngleChange`, `style`, `onStyleChange`, `enhancementModel`, `onEnhancementModelChange`, `videoDuration`, `onVideoDurationChange`, `motionIntensity`, `onMotionIntensityChange`, `videoDurationOptions` (from hook)
- Add "Creative Direction" section after Aspect Ratio (image mode only) with Shot Type pills, Camera Angle dropdown, Style text input, Enhancement pills
- Add "Video Controls" section (video mode only) with Duration pills and Motion slider
- All new controls use the existing `text-[9px]` label + compact control pattern

**`src/components/workspace/MobileSimplePromptInput.tsx`**
- Accept and pass through the new props to `MobileSettingsSheet`
- Wire `useVideoModelSettings` duration options into the sheet

**`src/pages/MobileSimplifiedWorkspace.tsx`**
- Pass `shotType`, `setShotType`, `cameraAngle`, `setCameraAngle`, `style`, `setStyle`, `enhancementModel`, `setEnhancementModel`/`updateEnhancementModel`, `videoDuration`, `setVideoDuration`, `motionIntensity`, `setMotionIntensity` from the hook to `MobileSimplePromptInput`

**`src/components/workspace/MobileQuickBar.tsx`**
- Hide Batch Size pills when in video mode (video is always 1)

---

### Layout Sketch

Settings sheet with new sections (compact, same density as existing):

```text
+----------------------------------+
| [x] Settings                     |
+----------------------------------+
| MODEL           [Flux Kontext v2]|
+----------------------------------+
| RESOLUTION  [Standard] [HD]      |
| CONTENT     [SFW] [NSFW]         |
+----------------------------------+
| ASPECT RATIO  [1:1] [16:9] [9:16]|
+----------------------------------+
| --- Image mode only: ----------- |
| SHOT TYPE  [Wide] [Medium] [Close]|
| CAMERA     [Eye Level      v]    |
| STYLE      [cinematic lighting..]|
| ENHANCE    [Auto] [Base] [None]  |
+----------------------------------+
| --- Video mode only: ----------- |
| DURATION   [1] [2] [3] [4] [5]s  |
| MOTION     ----o--------  0.50   |
+----------------------------------+
| REFERENCE IMAGE                  |
| [Upload] or [preview + strength] |
+----------------------------------+
| Clear All    Delete All          |
+----------------------------------+
```

