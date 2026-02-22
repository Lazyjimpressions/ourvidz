

# Drag-and-Drop from Grid Tiles to Reference Slots

## What Changes

### 1. Make Grid Tiles Draggable (AssetTile + SharedGrid)

**AssetTile.tsx** -- Add optional drag support:
- New props: `draggable`, `onDragStart`, `onDragEnd`
- On drag start, create a small canvas-based drag ghost (~40x53px, matching the ref slot size) from the tile's image
- Set `dataTransfer` with a custom MIME type (`application/x-ref-image`) containing a JSON payload: `{ url, assetId, type }`
- Apply a CSS class during drag: reduce opacity to 0.4 on the source tile

**SharedGrid.tsx** -- Wire drag props for workspace tiles:
- When `actions.onSendToRef` exists (workspace mode), make tiles draggable
- Pass a `dragData` prop containing the asset's thumb/signed URL
- On drag start, set the drag image to a shrunken canvas snapshot of the tile

### 2. Enhance Ref Slot Drop Targets (MobileQuickBar.tsx)

**RefSlot component** -- Accept both file drops and URL drops:
- In `handleDropEvent`, check for custom MIME `application/x-ref-image` first, then fall back to `files[0]`
- New prop: `onDropUrl: (url: string) => void` for handling URL-based drops (no upload needed)
- Enhanced drag-over visuals:
  - Scale up the slot slightly: `scale-110`
  - Brighter ring: `ring-2 ring-primary` with a subtle pulse animation
  - Background glow: `bg-primary/20`
- On drag leave, smoothly transition back

### 3. Wire Drop-URL Handler (MobileSimplePromptInput + MobileSimplifiedWorkspace)

**MobileSimplePromptInput.tsx** -- Add `onFixedSlotDropUrl` callback:
- When a URL is dropped (not a file), call a new handler that sets the ref slot URL directly without uploading
- This avoids re-uploading an already-signed workspace image

**MobileSimplifiedWorkspace.tsx** -- Implement `handleFixedSlotDropUrl`:
- Receives `(slotIndex: number, url: string)`
- Maps slot index to the correct state setter (`setReferenceImageUrl`, `setReferenceImage2Url`, or `setAdditionalRefUrls`)

### 4. Drag Ghost (Custom Drag Image)

The drag ghost is created using a temporary canvas element:
- On `dragStart`, get the tile's `img` element
- Draw it to a 40x53 canvas (3:4 ratio matching ref slots)
- Add a subtle border radius effect and shadow
- Use `e.dataTransfer.setDragImage(canvas, 20, 26)` to center the ghost under the cursor
- Clean up the canvas after a frame

## Visual Feedback Summary

| State | Visual |
|-------|--------|
| Idle tile | Normal appearance |
| Dragging tile | Opacity 0.4, no scale effect |
| Ref slot idle | Current dashed border |
| Ref slot drag-over | Scale 1.1, ring-2 ring-primary, bg-primary/20, subtle pulse |
| Drop complete | Brief green flash on the slot, then normal filled state |

## Technical Details

### Files Changed

1. **`src/components/shared/AssetTile.tsx`** -- Add `draggable`, `onDragStart`, `onDragEnd` props; apply opacity during drag
2. **`src/components/shared/SharedGrid.tsx`** -- Wire draggable behavior on workspace tiles; create canvas drag ghost in `onDragStart`
3. **`src/components/workspace/MobileQuickBar.tsx`** -- Enhanced drop target visuals; accept URL drops via custom MIME type; add `onDropUrl` prop to RefSlot; export updated props interface
4. **`src/components/workspace/MobileSimplePromptInput.tsx`** -- Add `onFixedSlotDropUrl` handler; pass it through to MobileQuickBar
5. **`src/pages/MobileSimplifiedWorkspace.tsx`** -- Implement `handleFixedSlotDropUrl` to set ref slot URL directly from dropped asset data

### Drag Data Format
```typescript
// Set on dragStart:
e.dataTransfer.setData('application/x-ref-image', JSON.stringify({
  url: asset.thumbUrl || asset.signedUrl,
  assetId: asset.id,
  type: asset.type
}));

// Read on drop:
const refData = e.dataTransfer.getData('application/x-ref-image');
if (refData) {
  const { url } = JSON.parse(refData);
  onDropUrl(url);  // Direct URL set, no upload
}
```

### Canvas Drag Ghost Creation
```typescript
const img = tileElement.querySelector('img');
const canvas = document.createElement('canvas');
canvas.width = 40;
canvas.height = 53; // 3:4 ratio
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, 40, 53);
e.dataTransfer.setDragImage(canvas, 20, 26);
```
