

# Desktop Workspace UX/UI Overhaul

## Problem Summary

The `/workspace` route currently renders `MobileSimplifiedWorkspace`, which wraps content in `OurVidzDashboardLayout`. This layout includes a 264px left sidebar that wastes space on the workspace page. Additionally, the desktop control bar (`SimplePromptInput`) has Row 2 buttons that ARE visible but are too numerous (8 buttons in image mode), the settings modal is oversized with large sliders and wasteful spacing, and the `quality` toggle (fast/high) is not meaningfully wired to image model behavior.

---

## 1. Collapse the Left Sidebar on Workspace

**Current state**: `OurVidzDashboardLayout` already hides the sidebar on small screens via `hidden md:flex` when `isCompactRoute` is true (workspace is a compact route). But on desktop (`md+`), the 264px sidebar is always visible and cannot be collapsed.

**Change**: Make the sidebar collapsible on desktop for workspace routes. Add a collapse toggle button in the sidebar header. When collapsed, show only icons (no labels), reducing width to ~48px. Store collapse state in localStorage.

**File**: `src/components/OurVidzDashboardLayout.tsx`
- Add `isCollapsed` state (persisted in localStorage)
- When collapsed on workspace: sidebar becomes 48px wide, only icons shown
- Add a toggle button (ChevronLeft/ChevronRight) at the bottom of sidebar
- Keep existing mobile behavior (fully hidden on small screens)

---

## 2. Slim Down Row 2 Controls -- Move Secondary Controls to Settings

**Current state**: Row 2 in image mode has 8 buttons: Quality, Model, Content Type, Aspect Ratio, Enhancement Model, Shot Type, Camera Angle, Style. All visible but cluttered.

**Change**: Keep only 4 essential controls in Row 2. Move 4 secondary controls to the settings modal:

**Keep in Row 2** (image mode):
- Model selector
- Content Type (SFW/NSFW)
- Aspect Ratio
- Batch size (inline segmented: 1|3|6)

**Move to Settings Modal**:
- Quality toggle (with rewiring -- see section 4)
- Enhancement Model
- Shot Type
- Camera Angle
- Style

**Keep in Row 2** (video mode):
- Video Model selector
- Duration
- Content Type
- Aspect Ratio
- Sound toggle

**File**: `src/components/workspace/SimplePromptInput.tsx` (lines ~1100-1320, ~1494-1923)

---

## 3. Redesign the Settings Modal -- Compact, Dense Layout

The current modal has oversized sliders, large section headers, and too much padding.

**Changes**:
- Replace Radix `Slider` with compact inline number inputs + tiny range inputs (HTML `<input type="range">` with custom tiny styling, h-1 track)
- Use 2-column grid for all numeric controls (Steps + CFG side by side, Strength + Seed side by side)
- Reduce all labels to `text-[9px]`, reduce padding from `p-3` to `p-2`
- Reduce modal `max-h` from `max-h-80` to `max-h-[70vh]`
- Move the secondary Row 2 controls (Style, Shot Type, Camera Angle, Enhancement) into the top of the modal as a compact row of chip buttons
- Move workspace actions (Clear All, Delete All) into the bottom of the modal as small text links
- Remove the large `chip-segmented` button styling for variation presets -- use smaller inline pills

**File**: `src/components/workspace/SimplePromptInput.tsx`
**File**: `src/components/WorkspaceHeader.tsx` (remove Clear/Delete buttons, simplify header)

---

## 4. Quality Toggle: Wire or Remove

**Analysis**: The `quality` toggle (fast/high) is passed through to edge functions and affects:
- `queue-job`: Maps to job_type suffix (`_fast` vs `_high`)
- `fal-image`: Sets resolution (`480p` for fast, `720p` for high) and job type
- `replicate-image`: Used for metadata tagging

For image generation specifically, `quality` controls resolution in the fal pipeline. This is a useful toggle. However, it's confusing as a standalone button since different models handle it differently.

**Recommendation**: Keep `quality` but move it to the settings modal and rename it "Resolution" with clearer labels:
- "Standard" (maps to `fast` -- 480p)  
- "HD" (maps to `high` -- 720p)

This makes its function clear without exposing internal naming.

---

## 5. Settings Not Worth Exposing (Admin-Only Defaults)

These should NOT appear in the UI -- admin sets defaults in the portal, edge functions use them:
- `output_format` -- always model default (png/jpeg)
- `sync_mode` -- always false
- `enable_safety_checker` -- always model default
- `enable_prompt_expansion` -- controlled by enhancement toggle
- `scheduler` -- model-specific, rarely changed by users
- `acceleration` -- fal-specific optimization, leave as default

These SHOULD remain in settings modal (they meaningfully affect output):
- Steps, CFG/Guidance Scale, Reference Strength -- already there
- Seed + Lock -- already there
- Batch Size -- moving to Row 2
- Negative Prompt -- keep in modal
- Compel -- keep in modal (power user)

---

## 6. Legacy Code Cleanup

Remove from `SimplePromptInput.tsx`:
- `clothingEditMode`, `onClothingEditModeChange`, `originalClothingColor`, `targetGarments` -- the clothing edit feature is a dead code path (the regex-based suggestion UI is fragile and unused)
- `lockHair` / `onLockHairChange` -- closely tied to clothing edit, remove together
- `onBypassEnhancement` / `onHardOverride` debug checkboxes -- move to a debug panel, not settings modal
- The massive `ReferenceImageUpload` component (315 lines) should be extracted to its own file

Remove from `SimplifiedWorkspace.tsx`:
- Props for `clothingEditMode`, `lockHair`, `originalClothingColor`, `targetGarments`
- Corresponding state from `useLibraryFirstWorkspace`

Remove from `WorkspaceHeader.tsx`:
- `onClearWorkspace`, `onDismissAllJobs`, `onDeleteAllWorkspace` props and buttons (moving to settings modal)
- `showForceCleanup` prop and force clear button

---

## Technical Details

### Files to modify:
1. **`src/components/OurVidzDashboardLayout.tsx`** -- Add collapsible sidebar with localStorage persistence
2. **`src/components/workspace/SimplePromptInput.tsx`** -- Major refactor: slim Row 2, compact settings modal, remove legacy props, extract ReferenceImageUpload
3. **`src/components/workspace/ReferenceImageUpload.tsx`** (NEW) -- Extract from SimplePromptInput
4. **`src/components/WorkspaceHeader.tsx`** -- Simplify to just back arrow + user info
5. **`src/pages/SimplifiedWorkspace.tsx`** -- Remove legacy props passed to SimplePromptInput
6. **`src/hooks/useLibraryFirstWorkspace.ts`** -- Remove clothing edit state

### Files unchanged:
- `MobileSimplifiedWorkspace.tsx` -- Mobile stays as-is
- `MobileSimplePromptInput.tsx` -- Mobile stays as-is
- Edge functions -- No changes needed (quality mapping already works)

### Compact element sizing guidelines:
- All labels: `text-[9px]`
- All control values: `text-[10px]`
- Range inputs: custom `h-1` track, `h-3 w-3` thumb (not Radix Slider)
- Modal padding: `p-2`, gaps: `gap-1.5`
- Chip buttons: `px-1.5 py-0.5 text-[9px]`
- Number inputs: `h-5 w-12 text-[10px]`

