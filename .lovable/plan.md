

# Storyboard Audit: Changes vs Plan, UX/UI Validation

## 1. Plan Compliance Matrix

| Planned Item | Status | Notes |
|---|---|---|
| **P0: Mobile-responsive editor layout** | Done | Sidebar hidden behind Sheet drawer on mobile, `md:` breakpoints for grid/flex, library toggle button added |
| **P0: Reference image picker in ClipDetailPanel** | Done | `onPickReference` prop wired, "Pick" button rendered below video preview |
| **P0: Character selector for project** | Done | `CharacterPickerDialog` created, wired to header button + More menu on mobile |
| **P1: Clip approval button** | Done | "Approve" button appears when `clip.status === 'completed'`, updates to `approved` |
| **P1: Scene delete from SceneStrip** | Done | Context menu with MoreVertical icon, hover-revealed, wired to `onSceneDelete` |
| **P1: Collapse toolbar (project list)** | Partial | Search uses `flex-wrap` and `min-w-[140px]`, view toggle hidden below `sm:`, but status + sort dropdowns still render side-by-side at 402px (56px + 56px each = tight) |
| **P2: Move story plan to sheet on mobile** | Not done | Still uses `Collapsible` on all screen sizes. Comment says "use Sheet on mobile" but code doesn't branch |
| **P2: Fix chevron direction** | Done | `isExpanded ? ChevronDown : ChevronUp` — correct |
| **P2: Onboarding hints** | Not done | Empty canvas still says "Drop an image to start" with no guidance |
| **P1: Scene edit/reorder** | Not done | No edit UI, no drag-to-reorder on SceneStrip |
| **Workspace lockup fix** | Done | `input_schema?.images` added to I2I check (line 349) |
| **Video thumbnails in library** | Done | `<video>` element with `preload="metadata"` + Play icon overlay |
| **Video filter in ImagePickerDialog** | Done | `mediaType` prop added, filters adjusted |

## 2. What Success Looks Like

A user on a 402px mobile device should be able to:
1. Browse storyboard projects without horizontal overflow
2. Open a project and see the editor layout fit the viewport
3. Select a character for the project
4. Add a scene, add a clip, write a prompt, pick a reference image
5. Generate a clip, approve it, extract a frame for chaining
6. Preview the assembled video

## 3. Mock User Workflow Analysis (402px viewport)

### Step 1: Project List Page
- **Works**: Grid shows 2 columns (`grid-cols-2`), search/filters wrap via `flex-wrap`
- **Issue**: At 402px, search (140px) + status dropdown (112px) + sort dropdown (112px) = 364px. Fits, but barely — no breathing room. The dropdowns are `w-28` (112px) each. Works but feels cramped.

### Step 2: Open Project → Editor
- **Works**: Back button, title (truncated), AI button, library toggle, preview, more menu all present
- **Issue**: Header packs 6-7 buttons in a single row at 402px. The `gap-1.5` keeps them from overlapping, but touch targets are 32px (`h-8`) — below the 44px mobile standard from the project's own style guide.
- **Issue**: Character button is `hidden md:flex`, so mobile users must use the More dropdown. This is correct responsive behavior.

### Step 3: Story Plan Section
- **Issue**: The Collapsible renders inline between header and SceneStrip. At 402px, when opened, the `max-h-48` story plan view pushes the SceneStrip and ClipCanvas below the fold. The plan said to use a Sheet on mobile — this wasn't implemented.

### Step 4: Scene Strip
- **Works**: Horizontal scroll, responsive card widths (`w-24 md:w-28`), scene delete via context menu
- **Issue**: Context menu trigger is `opacity-0 group-hover:opacity-100` — hover doesn't exist on touch devices. The delete action is invisible and inaccessible on mobile. Need `group-focus-within:opacity-100` or always-visible on touch.
- **Missing**: No scene editing (title/description/mood) or reordering

### Step 5: Clip Canvas
- **Works**: Horizontal scroll for clips, add button, drop zone
- **Issue**: Uses hardcoded `gray-900`, `gray-800`, `gray-700` colors instead of theme tokens (`bg-muted`, `border-border`). Inconsistent with the rest of the dark theme and will break if theme changes.

### Step 6: ClipDetailPanel
- **Works**: Responsive grid (`flex-col md:grid md:grid-cols-12`), stacks vertically on mobile
- **Works**: "Pick" button for reference, "Approve" button for completed clips
- **Issue**: When expanded on mobile, the panel content + video preview + prompt + suggestions + actions easily exceeds the remaining viewport height. No scroll container — content gets cut off.

### Step 7: ClipLibrary (via drawer)
- **Works**: Opens as Sheet from right, 300px wide
- **Issue**: `w-[300px]` on a 402px screen leaves no visible background. Adequate but edge-to-edge. Consider full-width on mobile.
- **Issue**: Uses hardcoded gray colors (`gray-900`, `gray-800`) like ClipCanvas — inconsistent with theme tokens.

### Step 8: Character Picker
- **Works**: Dialog opens, fetches characters, search, select
- **Issue**: Touch target for character items is the full row button — good. But the close button text "Done"/"Cancel" is the only way to dismiss — no X button visible.

## 4. Issues Found

### Critical (blocks workflow)
1. **Scene context menu invisible on mobile** — hover-only reveal means touch users can't delete scenes
2. **ClipDetailPanel overflow on mobile** — no scroll, content cut off below fold

### Important (degrades experience)
3. **Story plan not in Sheet on mobile** — pushes working area off screen (plan item not implemented)
4. **Hardcoded gray colors in ClipCanvas + ClipLibrary** — breaks theme consistency
5. **Header touch targets 32px** — below 44px mobile standard
6. **Library drawer width** — 300px on 402px screen, should be full-width on mobile

### Minor
7. **Scene editing (title/mood) missing** — planned but not implemented
8. **Scene reordering missing** — planned but not implemented
9. **No onboarding guidance** — planned but not implemented
10. **Chevron semantics**: `ChevronUp` when collapsed suggests "expand up" — unconventional. Most apps use `ChevronRight` (collapsed) → `ChevronDown` (expanded). Current implementation uses Down/Up which is inverted from the stated fix goal.

## 5. Recommended Next Steps (Priority Order)

| # | Fix | Effort |
|---|-----|--------|
| 1 | Make scene context menu visible on touch (always show or `focus-within`) | Small |
| 2 | Add scroll container to ClipDetailPanel expanded content | Small |
| 3 | Move story plan to Sheet on mobile (branch on `useIsMobile`) | Small |
| 4 | Replace hardcoded grays in ClipCanvas + ClipLibrary with theme tokens | Medium |
| 5 | Make library drawer full-width on mobile (`w-full sm:w-[300px]`) | Trivial |
| 6 | Increase header button touch targets to 44px on mobile | Small |

