

## Fix: Positions Lightbox Blank Image + Build Error

### Problem 1: Blank Lightbox
Canon images stored in `character_canon` table have `output_url` as bare storage paths (e.g. `userId/charId/canon/file.png`) in the `reference_images` bucket. The `handleRequireOriginal` function (line 401-408) fails because:
- It checks for `character-canon/` substring but maps only to `user-library` or `workspace-temp`
- Bare paths (no bucket prefix) return the raw path unchanged — not a valid URL

This is the same `UnifiedLightbox` component used everywhere else — the bug is only in PositionsGrid's `handleRequireOriginal` callback, not the lightbox itself.

### Problem 2: Build Error
`src/types/storyboard.ts` has `job_id?: string` declared twice in `UpdateClipInput` (lines 451 and 463).

---

### Changes

**1. `src/components/character-studio-v3/PositionsGrid.tsx` — Fix `handleRequireOriginal` (lines 401-408)**

Replace the bucket detection logic:
- If URL contains `user-library/` → bucket `user-library`
- If URL contains `workspace-temp/` → bucket `workspace-temp`
- Otherwise (bare path or `reference_images` path) → bucket `reference_images`

This follows the existing convention — every other consumer of `UnifiedLightbox` uses `urlSigningService.getSignedUrl()` with the correct bucket. No new workflow needed.

**2. `src/types/storyboard.ts` — Remove duplicate `job_id` (line 463)**

Delete the second `job_id?: string;` declaration.

### Note on Convention
Character poses come from the `character_canon` table, stored in the `reference_images` bucket. They do NOT come from the user library (`user-library` bucket). The lightbox just needs to sign against the correct bucket. No new signing flow or separate workflow is needed — just correct bucket routing in one callback.

