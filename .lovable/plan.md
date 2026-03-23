

## Fix: Character Studio Image Display Issues

### Root Causes Identified

**Issue 1: Edge function stores signed URLs as `storage_path` for portraits**
The currently deployed edge function stores `finalImageUrl` (a signed URL with 1-year expiry) into `user_library.storage_path` for portrait rows. This works temporarily but is architecturally wrong — signed URLs expire, and the `storage_path` column should contain bare paths. Position rows correctly store bare paths.

The edge function code in the repo (line 707) now stores `storagePath` (bare path), but the currently deployed version still stores signed URLs. This means the function needs redeployment.

**Issue 2: Base angle slots don't match legacy positions (no `pose_key` in metadata)**
DB shows positions with `generation_metadata: {}` (empty) for Alexa's "Front", "Bust", "Rear" and Amanda New's "Rear". The `getCanonForPoseKey()` function only checks `metadata.pose_key`, which is missing from these migrated rows.

**Issue 3: `user_library` not in realtime publication**
The table is not in `supabase_realtime`, so the realtime subscription in `usePortraitVersions` never fires. Portraits only appear after a manual `fetchPortraits()` call.

### Fixes

**1. Add label fallback to `getCanonForPoseKey()` in `PositionsGrid.tsx`**
When `metadata.pose_key` is missing, fall back to matching the `label` field against a known label→poseKey map (e.g., "Front" → `front_neutral`, "Bust" → `bust`, "Rear" → `rear`).

**2. Backfill `pose_key` into `generation_metadata` via SQL migration**
Update existing position rows where `generation_metadata` is empty but `label` maps to a known pose key. This makes future lookups fast without fallback.

**3. Add `user_library` to realtime publication via SQL migration**
`ALTER PUBLICATION supabase_realtime ADD TABLE user_library;` — enables the existing realtime subscriptions in `usePortraitVersions` and any future ones.

**4. Fix edge function `storage_path` to store bare path (already in code)**
The repo code already stores bare paths. The fix is just ensuring the function redeploys. But we also need to fix the ~20 existing rows that have signed URLs as `storage_path` — extract the bare path from the signed URL and update them.

**5. Data cleanup migration: extract bare paths from signed URLs in `storage_path`**
For rows where `storage_path` starts with `https://`, extract the path after `/user-library/` and before `?token=`.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add label→poseKey fallback in `getCanonForPoseKey()` |
| SQL migration | Add `user_library` to realtime publication; backfill `pose_key` from labels; extract bare paths from signed URLs in `storage_path` |
| `supabase/functions/character-portrait/index.ts` | Already correct in repo — just needs redeployment (happens automatically) |

### Execution Order

1. SQL migration (realtime publication + data fixes)
2. Code fix for `getCanonForPoseKey` fallback
3. Verify edge function deploys with bare-path storage

