
# Fix: Webhook Status Bug + Generating Spinner Animation

## Issue 1: Webhook Rejects Successful Results (Critical)

**Root cause**: `fal-webhook` line 67-68 checks `if (falStatus !== "COMPLETED")` but fal.ai sends `"OK"` for success and `"ERROR"` for failure. The logs prove this:

```
fal-webhook: status: "OK", has_video: true
fal-webhook: "fal.ai generation failed: fal.ai returned status: OK"
```

The video was generated successfully but the webhook marked the job as failed because it expected "COMPLETED" instead of "OK".

**Fix**: Change the status check to match fal.ai's actual API:

```
// BEFORE (wrong):
if (falStatus !== "COMPLETED") { // treat as failure }

// AFTER (correct):
if (falStatus === "ERROR") { // treat as failure }
// Everything else (OK, COMPLETED, etc.) = success
```

This is a one-line logic fix in `supabase/functions/fal-webhook/index.ts` line 68.

---

## Issue 2: Static Spinner on Generating Tile

**Current state**: Optimistic tiles show a plain `animate-spin` border spinner with no context. The user sees a tile stuck with a small spinner and no indication of what's happening.

**Fix**: Replace the fallback spinner in `SharedGrid.tsx` with an animated generating state that includes:
- A pulsing gradient background
- A spinner with "Generating..." text
- Different label for video vs image

The change is in `SharedGrid.tsx` lines 365-370 where the `fallbackIcon` is set on the `AssetTile`.

---

## Files Changed

1. **`supabase/functions/fal-webhook/index.ts`** -- Fix status check from `!== "COMPLETED"` to `=== "ERROR"`
2. **`src/components/shared/SharedGrid.tsx`** -- Replace static spinner with animated generating state overlay

## Technical Details

### Webhook fix (line 68)
Change `falStatus !== "COMPLETED"` to `falStatus === "ERROR"`. Also remove the default fallback on line 67 (`|| "COMPLETED"`) since we want to check the actual status value -- if it's missing, treat as success (fal.ai docs say the payload is always present on success callbacks).

### Spinner enhancement (SharedGrid.tsx lines 365-370)
Replace the current `animate-spin` border div with a richer fallback that shows:
- A pulsing shimmer background (using existing `animate-pulse` from Tailwind)
- Centered spinner icon with "Generating..." or "Rendering video..." text
- Uses the existing `Loader2` icon from lucide for a cleaner spin animation

No new dependencies or components needed.
