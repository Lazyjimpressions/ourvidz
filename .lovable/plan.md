

# Unify Tile, Overlay, and Lightbox Patterns Across All Contexts

## Current State

Four contexts display image tiles but use inconsistent implementations:

| Feature | Library | Workspace | Portraits | Positions |
|---------|---------|-----------|-----------|-----------|
| Uses AssetTile | Yes (via SharedGrid) | Yes (via SharedGrid) | Yes (SignedPortraitTile) | NO (hand-rolled div+img) |
| UnifiedLightbox | Yes | Yes | Yes | NO |
| Send to Workspace | Yes (onAddToWorkspace) | N/A | MISSING | Broken (query params) |
| Hover overlay style | Bottom-right icons | Bottom-right icons | DropdownMenu (top-right) | Full overlay with circles |

## Gaps to Fix

### 1. PositionsGrid: Replace hand-rolled tile with AssetTile

The `CanonThumbnail` component (PositionsGrid.tsx ~line 209) currently renders a raw `<div>` with manual aspect-ratio and `<img>`. This misses:
- The iOS Safari layout fix (absolute inset-0 pattern)
- Hover-to-play for video positions
- Drag-and-drop support
- Consistent border/shadow/hover styling

**Change**: Refactor `CanonThumbnail` to use `AssetTile` as its container, passing the signed URL and overlay children the same way `SignedPortraitTile` does.

### 2. PositionsGrid: Add UnifiedLightbox

Positions currently have no lightbox -- clicking a tile just toggles hover actions. This is inconsistent with Library, Workspace, and Portraits which all open a full-screen lightbox on click.

**Change**: Add `UnifiedLightbox` to `PositionsGrid` with:
- `items` mapped from `canonImages` (id, signed URL, type)
- `headerSlot` showing Primary badge and type badge
- `bottomSlot` with action buttons (Delete, Set Primary, Send to Workspace, Edit Tags)
- Click on tile opens lightbox; hover still shows quick actions

### 3. PortraitGallery: Add "Send to Workspace" menu item

The portrait dropdown menu has: Set Primary, Use as Reference, Copy Prompt, Download, Save as Position, Delete. "Send to Workspace" is missing.

**Change**: Add a new `DropdownMenuItem` with `ExternalLink` icon between "Save as Position" and the delete separator. Wire it through a new `onSendToWorkspace` prop.

### 4. Fix Positions "Send to Workspace" navigation

Currently uses `navigate('/workspace?mode=image&ref=...')` but the Workspace reads `location.state.referenceUrl`.

**Change**: Update to `navigate('/workspace?mode=image', { state: { referenceUrl: signedUrl } })`.

### 5. Wire "Send to Workspace" from StudioWorkspace container

`StudioWorkspace.tsx` needs to:
- Accept an `onSendToWorkspace` prop (or use `useNavigate` internally)
- Pass it to both `PortraitGallery` and `PositionsGrid`
- The handler signs the URL and navigates with `location.state`

## File Changes

| File | Change |
|------|--------|
| `src/components/character-studio-v3/PositionsGrid.tsx` | Replace raw div+img in CanonThumbnail with AssetTile; add UnifiedLightbox; fix Send to Workspace navigation to use location.state |
| `src/components/character-studio/PortraitGallery.tsx` | Add "Send to Workspace" DropdownMenuItem; add `onSendToWorkspace` prop |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Wire `onSendToWorkspace` to both PortraitGallery and PositionsGrid using navigate + location.state |

## What Stays the Same

- Library and Workspace tiles (already use SharedGrid + AssetTile + UnifiedLightbox)
- The hover overlay **style** difference between Portraits (dropdown menu) and Positions (icon buttons) is acceptable -- Portraits have many actions that need a menu, while Positions have fewer actions that work as direct buttons. Both will now sit on top of AssetTile.
- UnifiedLightbox props pattern (actionsSlot, bottomSlot, headerSlot) -- already proven in Library/Workspace/Portraits

## UX Result

All four contexts will:
- Use `AssetTile` for consistent 3:4 tiles with the iOS Safari fix
- Open `UnifiedLightbox` on click for full-screen preview
- Offer "Send to Workspace" on hover (and in lightbox actions)
- Navigate to workspace using `location.state.referenceUrl` (consumed by existing useEffect)

