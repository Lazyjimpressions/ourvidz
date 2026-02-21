
# Desktop Workspace UX/UI Overhaul (Corrected)

## Root Cause

The `/workspace` route in `App.tsx` renders `MobileSimplifiedWorkspace`, which uses:
- `MobileQuickBar.tsx` -- the top row (mode toggle, model name, settings gear)
- `MobileSimplePromptInput.tsx` -- prompt textarea + generate button
- `MobileSettingsSheet.tsx` -- the drawer/modal with settings

The previous changes went to `SimplePromptInput.tsx` and `SimplifiedWorkspace.tsx`, which are **dead code** (not imported in `App.tsx`). This is why no changes were visible.

---

## Plan

### 1. Delete Dead Code

Remove unused files that were incorrectly modified:
- `src/pages/SimplifiedWorkspace.tsx`
- `src/components/workspace/SimplePromptInput.tsx`

These are not referenced anywhere in the app routing.

### 2. Redesign MobileQuickBar for Desktop

**File**: `src/components/workspace/MobileQuickBar.tsx`

Currently shows: Mode toggle | (spacer) | model name | gear icon

Change to show more controls inline on desktop (`md+` breakpoint), keeping mobile as-is:
- Mode toggle (keep)
- Content Type toggle (SFW/NSFW) -- visible on `md+`
- Aspect Ratio selector (1:1 | 16:9 | 9:16) -- visible on `md+`
- Batch size (1 | 3 | 6) -- visible on `md+`
- (spacer)
- Model name chip
- Settings gear

On mobile (`< md`), these extra controls remain hidden (accessed via settings sheet).

### 3. Redesign MobileSettingsSheet -- Compact Dense Layout

**File**: `src/components/workspace/MobileSettingsSheet.tsx`

Current issues (visible in screenshot):
- Full-width `Select` for model taking entire row
- Large "Fast/High" segmented control spanning most of the width
- Huge aspect ratio buttons (40px tall, each taking 1/3 width with blue ring)
- Reference image section has large upload button
- Workspace Actions in a collapsible section

Changes:
- Reduce all labels from `text-xs` to `text-[9px]` uppercase
- Replace the large aspect ratio buttons with compact pills (`px-1.5 py-0.5 text-[9px]`)
- Make Quality row and NSFW toggle more compact (smaller segmented control)
- Replace Radix `Slider` for reference strength with a compact HTML `input[type=range]` (h-1 track, h-3 w-3 thumb)
- Add secondary controls from the plan: Resolution (Standard/HD, replaces Quality), Enhancement Model, Shot Type, Camera Angle, Style -- as compact chip rows
- Move workspace actions (Clear All, Delete All) to bottom as small text links (not collapsible section)
- Reduce overall padding from `px-4 py-3 space-y-4` to `px-3 py-2 space-y-2`
- Reduce model `Select` height
- Reduce reference image upload button to a smaller size

### 4. Wire Batch Size

**File**: `src/components/workspace/MobileSimplePromptInput.tsx`
**File**: `src/pages/MobileSimplifiedWorkspace.tsx`

Add `batchSize` state to `MobileSimplifiedWorkspace` (default: 1), pass it through to `MobileQuickBar` and into the `onGenerate` options. The `useLibraryFirstWorkspace` hook's `generate` function already accepts batch parameters.

### 5. Sidebar Collapse (Already Done)

The `OurVidzDashboardLayout.tsx` changes from the previous round are correct and working (collapse toggle with localStorage persistence).

---

## Technical Details

### Files to modify:
1. **`src/components/workspace/MobileQuickBar.tsx`** -- Add inline desktop controls (content type, aspect ratio, batch size)
2. **`src/components/workspace/MobileSettingsSheet.tsx`** -- Full compact redesign: smaller labels, compact sliders, dense 2-column grids, workspace actions as text links
3. **`src/components/workspace/MobileSimplePromptInput.tsx`** -- Pass through new batch size prop
4. **`src/pages/MobileSimplifiedWorkspace.tsx`** -- Add batch size state, pass new props

### Files to delete:
1. **`src/pages/SimplifiedWorkspace.tsx`** -- Dead code
2. **`src/components/workspace/SimplePromptInput.tsx`** -- Dead code

### Compact element sizing (same as approved plan):
- All labels: `text-[9px]` uppercase
- Control values: `text-[10px]`
- Range inputs: custom `h-1` track, `h-3 w-3` thumb
- Padding: `p-2`, gaps: `gap-1.5`
- Chip buttons: `px-1.5 py-0.5 text-[9px]`
- Aspect ratio buttons: compact pills instead of 40px tall buttons
