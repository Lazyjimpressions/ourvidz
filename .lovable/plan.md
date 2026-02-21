

# Fix: Placeholder Count, Mobile Conformity, and Playground Scope

## Scope Clarification

The **Playground page** (`/playground`) is a pure chat/AI interface -- it does not use the workspace generation pipeline, `useLibraryFirstWorkspace`, or any media tile rendering. There are no video/image generation features there to update. Items 1 and 3 are the actionable fixes.

---

## Issue: 3 Placeholder Tiles Always Appear

**Root cause**: In `useLibraryFirstWorkspace.ts` line 402, `numImages` defaults to `3`. The optimistic placeholder logic on line 1477 uses this value directly:

```text
const count = mode === 'image' ? numImages : 1;
```

So even when a user has never touched the image count selector, or when they explicitly set it to 1, 3 placeholders appear because the default is 3. For videos, this is already correct (hardcoded to 1).

The real problem is the **default value** and the fact that the backend clamps batch sizes to `[1, 3, 6]` -- so if a user picks 2, they see 2 placeholders but get 3 images back (or vice versa).

**Fix**: 
- Change the default `numImages` from `3` to `1` (line 402) -- most generations are single-image
- Align the placeholder count with the **clamped** value the backend will actually produce, so users see the correct number of spinners

```text
// Line 1477: Match backend clamping logic
const clampedCount = numImages <= 1 ? 1 : (numImages <= 3 ? 3 : 6);
const count = mode === 'image' ? clampedCount : 1;
```

This way if a user picks "3", they see 3 placeholders and get 3 images. If they pick "1", they see 1 placeholder and get 1 image.

---

## Mobile Conformity

`MobileSimplifiedWorkspace.tsx` uses `useLibraryFirstWorkspace` but does not expose `numImages` or `setNumImages` to the user. This means mobile always uses the default value.

**Fix**: Since mobile doesn't have a num-images selector, the default change from 3 to 1 automatically fixes mobile -- users will see 1 placeholder per generation as expected.

No additional mobile-specific changes are needed because:
- The optimistic placeholder logic is in the shared hook (`useLibraryFirstWorkspace`)
- The animated spinner fix from the previous change is in `SharedGrid.tsx` which is used by both desktop and mobile
- The polling fallback is also in the shared hook

---

## Files Changed

1. **`src/hooks/useLibraryFirstWorkspace.ts`**:
   - Line 402: Change `useState(3)` to `useState(1)` for `numImages` default
   - Line 1477: Add clamping logic to match backend behavior so placeholder count equals actual output count

---

## Technical Details

### Backend Clamping Reference (queue-job, line 441-442)
```text
const batchCount = isImageJob ? (jobRequest.num_images || 1) : 1;
const clampedBatchCount = batchCount <= 1 ? 1 : (batchCount <= 3 ? 3 : 6);
```

### Placeholder Clamping (new, useLibraryFirstWorkspace line 1477)
```text
const clampedCount = numImages <= 1 ? 1 : (numImages <= 3 ? 3 : 6);
const count = mode === 'image' ? clampedCount : 1;
```

This ensures the number of spinning tiles matches the number of images the backend will actually produce.
