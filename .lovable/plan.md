

## Fix: Tag Popover Disappears on Mobile

### Root Cause

The tag editing popover is inside a hover overlay (lines 237-240 of `PositionsGrid.tsx`):

```tsx
<div
  className="... opacity-0 group-hover:opacity-100"
  onMouseLeave={() => { setShowActions(false); setEditingTags(false); }}
>
```

On mobile:
1. User taps the card — hover overlay appears briefly
2. User taps the tag button — `setEditingTags(true)` fires, popover opens
3. The tap ends, the hover state is lost — `group-hover:opacity-100` no longer applies
4. The overlay (and the popover inside it) becomes `opacity-0` / invisible, or `onMouseLeave` fires and calls `setEditingTags(false)`

The popover is **a child of the hover overlay**, so when the overlay hides, the popover hides with it.

### Fix

Two changes in `PositionsGrid.tsx`, `CanonThumbnail` component:

1. **Keep overlay visible when tag popover is open**: Add `editingTags` to the overlay's visibility logic so it stays visible while the popover is open:
   ```tsx
   className={cn(
     "absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 transition-opacity",
     editingTags ? "opacity-100" : "opacity-0 group-hover:opacity-100"
   )}
   ```

2. **Don't close tags on mouse leave when popover is open**: Guard the `onMouseLeave` handler:
   ```tsx
   onMouseLeave={() => {
     if (!editingTags) {
       setShowActions(false);
     }
   }}
   ```

3. **Same fix for any other open popover** (assign-to-position popover): Track its open state too, or apply the same pattern.

### Files
- `src/components/character-studio-v3/PositionsGrid.tsx` — Update overlay className and onMouseLeave in `CanonThumbnail`

