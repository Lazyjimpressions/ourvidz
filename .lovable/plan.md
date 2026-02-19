

# Fix: iOS Safari Image Zoom on Studio Cards

## Root Cause (Confirmed)

The `AssetTile` component is identical everywhere. The difference is **how URLs are delivered**:

- **Workspace/Library**: `useSignedAssets()` batch-signs URLs before rendering. Cards get a signed `thumbUrl` on first mount -- single render pass.
- **Studio portraits**: Each `SignedPortraitTile` calls `useSignedUrl()`, which initializes with `signedUrl = ''`, then asynchronously resolves the signed URL -- **two render passes**.

On iOS Safari, when the `img` tag re-renders inside an `aspect-ratio` container using `w-full h-full`, the browser miscalculates `h-full` (100% of parent height) during the re-render. It uses the image's intrinsic pixel height (1024px) instead of the container's computed height (~240px). Combined with `object-cover`, this produces the extreme zoom.

Workspace/Library avoids this because there is no re-render -- the signed URL is already available on the first paint.

## Fix

One line change in `AssetTile.tsx` -- add `absolute inset-0` to the `img` tag:

**File:** `src/components/shared/AssetTile.tsx`, line 79

**Before:**
```tsx
className="w-full h-full object-cover"
```

**After:**
```tsx
className="absolute inset-0 w-full h-full object-cover"
```

The parent `div` already has `relative` in its className. With `absolute inset-0`, the image dimensions are derived from the container's actual rendered bounds (top=0, right=0, bottom=0, left=0), completely bypassing the `h-full` resolution bug. This is the standard pattern used by Next.js Image, Tailwind UI, and most responsive image frameworks.

This fixes all consumers (Studio, Workspace, Library, Character Hub) in one change, and is safe because `{children}` overlays already use absolute positioning.

## Files Changed

| File | Change |
|------|--------|
| `src/components/shared/AssetTile.tsx` | Add `absolute inset-0` to img className (line 79) |

