
# Character Hub UX/UI Audit

## Wireframe Elements Identified

The Character Hub is a 3-panel desktop layout with a mobile drawer fallback:

```text
+------------------+---------------------+-----------------+
| Left Sidebar     | Center Grid         | Right Panel     |
| (320px)          | (flex-1)            | (280px)         |
| Selected char    | Filter bar          | Create char     |
| detail view      | + Character cards   | + History grid  |
| (4 tabs)         |                     |                 |
+------------------+---------------------+-----------------+
```

- **Header**: 48px bar with icon, title/subtitle, "Create Character" CTA
- **Left Sidebar**: `CharacterHubSidebar` -- avatar, name, badges, 4-tab detail view (Identity, Visuals, Style, Media), footer actions
- **Center Grid**: `CharacterFilters` (search + genre chips + popover filters) above a responsive card grid using `CharacterCard` + `AssetTile`
- **Right Panel**: `CharacterCreatePanel` -- two creation modes ("Start from Images" / "Start from Description") + character history thumbnails
- **Mobile Drawer**: Fixed overlay with backdrop when a character is selected on smaller screens

---

## Design System Conformance Assessment

### What's Good (Conforms to Minimalist Aesthetic)

- **Card tiles use AssetTile** with 3:4 aspect ratio and signed URLs -- consistent with Library/Workspace
- **Typography mostly follows the design system**: text-sm for headings, text-[10px] for captions, text-[9px] for badges
- **Compact header**: 48px (h-12), correct icon sizing, properly dense
- **Dark theme**: Correct use of bg-background, bg-card/30, border-border/50
- **Sidebar tabs**: h-7 TabsList, text-[10px] triggers -- matches design system specs
- **Empty state**: Clean, minimal, single CTA

### Issues Found

#### 1. Filter Bar is Oversized and Wasteful (HIGH)

The `CharacterFilters` component has significant spacing issues:
- **Search input is h-10** (40px) -- should be h-8 (32px) per design system
- **Filter button is h-10** -- should be h-7 or h-8
- **Genre chips row adds a second full row** with "Genres:" label permanently visible
- **Double padding**: The filter bar has its own `pb-4 pt-2 border-b`, AND the parent wraps it in another `px-4 py-3 border-b` -- creating a thick double-bordered filter band that wastes ~80px of vertical space
- Total filter area height: ~100px. Should be ~48px (single row with search + chip overflow)

**Recommendation**: Collapse to a single compact row. Search (h-8) + filter popover trigger inline. Move genre chips inside the popover or make them a horizontally scrollable row without the "Genres:" label.

#### 2. Right Panel ("Create & History") is Low-Value Real Estate (MEDIUM)

The right panel permanently occupies 280px showing:
- Two creation buttons (which are also in the header CTA)
- A 3x3 grid of recent character thumbnails (duplicates the center grid)

This panel provides minimal unique value:
- The "Create Character" CTA already exists in the header
- The "Character History" thumbnails are just a subset of the main grid
- 280px of always-visible panel for 2 buttons + 9 thumbnails is poor information density

**Recommendation**: Remove the right panel entirely. The header CTA handles creation. If "recent characters" is desired, add a "Sort: Recent" option to the grid filters instead. This frees 280px for the grid, improving card count per row.

#### 3. Left Sidebar Has Dead Tabs (MEDIUM)

- **Style tab**: Only shows one line: "Default (Realistic)". Entire tab for one text field.
- **Media tab**: Shows only "Configure in the Character Studio." -- completely empty placeholder.
- Two of four tabs are essentially empty, making the sidebar feel incomplete.

**Recommendation**: Collapse Style and Media into the Identity tab as small sections, or remove them from the sidebar view entirely (they're editing concerns, not browsing concerns). A character detail sidebar for a Hub should focus on read-only overview, not replicate Studio tabs.

#### 4. Sidebar Footer Links to Wrong Route (LOW)

Both "Edit in Studio" and "Generate" buttons navigate to `/character-studio-v2/{id}`, but the app routes use `/character-studio/{id}` (which loads `CharacterStudioV3`). The V2 route doesn't exist in App.tsx.

**Recommendation**: Fix both buttons to navigate to `/character-studio/${character.id}`.

#### 5. Hub Overlay Actions Missing "Send to Workspace" (MEDIUM)

The `CharacterCardOverlay` in `hub` context shows: Edit, Generate Image, Duplicate, Delete. There is no "Send to Workspace" option, which we just added to Portraits and Positions. For consistency, character cards in the Hub should also offer "Send to Workspace" (using the primary anchor image).

**Recommendation**: Add an `onSendToWorkspace` prop to `CharacterCardOverlay` for hub context. Wire it from `CharacterHubV2` using the same `navigate('/workspace?mode=image', { state: { referenceUrl } })` pattern.

#### 6. Duplicate `getSignedUrl` Helper (LOW)

Both `CharacterHubSidebar.tsx` and `CharacterCreatePanel.tsx` define their own identical `getSignedUrl` helper function. This should use the shared `useSignedUrl` hook that `CharacterCard` already uses.

**Recommendation**: Replace inline `getSignedUrl` with `useSignedUrl` hook in both components.

#### 7. Filter Bar Has Redundant Sticky Positioning (LOW)

`CharacterFilters` applies its own `sticky top-0 z-30 bg-background/95 backdrop-blur-md` class, but the parent already positions it inside a `border-b` div with `bg-background/50`. The result is double backgrounds and the sticky behavior doesn't actually work since the parent constrains it.

**Recommendation**: Remove the sticky/backdrop-blur from `CharacterFilters` -- let the parent handle positioning.

---

## Functionality Assessment

### Keep
- 3-panel layout concept (but simplify to 2 panels -- see below)
- CharacterCard with AssetTile and hover overlay
- Search + genre filtering
- Content rating and media-ready filters
- Character select -> sidebar detail view
- Duplicate and delete actions
- Mobile drawer for selected character

### Remove
- Right panel (CharacterCreatePanel) -- redundant with header CTA and main grid
- Style and Media tabs in sidebar -- empty placeholders
- Genre chips as a permanent second row -- move into filter popover
- Duplicate `getSignedUrl` helpers

### Add
- "Send to Workspace" action on hub card overlay
- "Sort by" option (Recent, Name, Most Used) in filter bar
- Character count indicator (e.g., "12 characters" in the header or filter bar)

---

## Proposed Changes Summary

| File | Change | Priority |
|------|--------|----------|
| `CharacterFilters.tsx` | Compact to single row: h-8 search, move genres into popover, remove redundant sticky/padding | HIGH |
| `CharacterHubV2.tsx` | Remove right panel (`CharacterCreatePanel`), reclaim 280px for grid; fix grid responsive breakpoints | MEDIUM |
| `CharacterHubSidebar.tsx` | Remove empty Style/Media tabs; fix route to `/character-studio/`; replace inline getSignedUrl with useSignedUrl | MEDIUM |
| `CharacterCardOverlay.tsx` | Add "Send to Workspace" button for hub context | MEDIUM |
| `CharacterCreatePanel.tsx` | Mark for removal (functionality absorbed by header CTA + grid sort) | MEDIUM |
| `CharacterHubV2.tsx` | Add character count display; add sort option | LOW |
