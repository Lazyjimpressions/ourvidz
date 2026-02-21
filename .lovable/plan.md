

# Workspace Tile UX Enhancements

Three improvements to the asset tile cards in the workspace grid.

---

## 1. "Use as Reference" Button on Tiles

**Current state**: The `onSendToRef` action is wired up in both desktop and mobile workspace pages, but the SharedGridCard never renders a button for it -- it's a dead code path.

**Change**: Add a small reference-image button (using the `ImagePlus` or `ArrowRight` icon) to the hover overlay alongside the existing Save and Discard buttons. For workspace tiles, this renders next to the Save button. On mobile, the buttons are always visible on tap (leveraging the existing `group-hover` pattern which activates on touch).

**File**: `src/components/shared/SharedGrid.tsx` (SharedGridCard JSX, ~line 380)
- Add a button for `actions.onSendToRef` in the workspace action buttons section, positioned as the first button (left of Save)
- Use a distinctive but discrete icon (e.g., `ImagePlus` from lucide) with a tooltip title "Use as reference"

---

## 2. Video Indicator Badge

**Current state**: Video tiles show a thumbnail (or fallback icon), but once the thumbnail loads there's no persistent visual indicator that this is a video rather than an image.

**Change**: Add a small semi-transparent badge in the top-left corner of video tiles showing a play/film icon. Always visible (not just on hover).

**File**: `src/components/shared/SharedGrid.tsx` (SharedGridCard JSX, inside AssetTile children)
- When `asset.type === 'video'`, render a small badge overlay:
  ```
  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1">
    <Video className="w-3 h-3 text-white" />
  </div>
  ```

---

## 3. Video Autoplay on Hover

**Current state**: Video tiles display a static thumbnail. The actual video only plays after clicking into the lightbox.

**Change**: On desktop hover, replace the thumbnail with an inline `<video>` element that autoplays (muted, looped). On mouse leave, revert to the thumbnail. On mobile, this is skipped (no hover).

**Implementation**:

**File**: `src/components/shared/AssetTile.tsx`
- Add optional props: `videoSrc?: string | null`, `isVideo?: boolean`
- Add `onMouseEnter`/`onMouseLeave` state internally when `isVideo && videoSrc` to toggle between showing the `<img>` thumbnail and a `<video muted autoPlay loop playsInline>` element
- The video element uses the same `absolute inset-0 w-full h-full object-cover` positioning as the image
- Only applies on non-mobile (check `window.matchMedia` or just rely on hover behavior being desktop-only)

**File**: `src/components/shared/SharedGrid.tsx`
- SharedGridCard needs to sign the original video URL when hovered (lazy, not on mount)
- Pass `videoSrc` and `isVideo={asset.type === 'video'}` to AssetTile
- On hover start: sign the video URL if not already signed, pass it as `videoSrc`
- On hover end: the AssetTile stops playing

---

## Technical Details

### Files to modify:
1. **`src/components/shared/AssetTile.tsx`** -- Add `videoSrc`/`isVideo` props, hover-to-play logic
2. **`src/components/shared/SharedGrid.tsx`** -- Add ref button, video badge, sign video URL on hover and pass to AssetTile

### Performance considerations:
- Video URL is only signed on first hover (cached after that), not eagerly for all visible tiles
- The `<video>` element is only mounted while hovered, then removed to free memory
- Uses the existing `OriginalImageLoader` concurrency limiter for signing
- Mobile is unaffected -- no hover means no video preload

### No changes needed to:
- `AssetTile` core layout (img stays `absolute inset-0` for iOS Safari compatibility)
- Desktop/mobile workspace pages (actions are already wired)
- Any other components

