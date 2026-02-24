

# Fix: Library-to-Workspace Copy Fails Due to NULL `generation_seed`

## Root Cause

The `workspace_assets.generation_seed` column is `NOT NULL`, but `user_library.generation_seed` is nullable -- and **83 out of 153** library assets have `generation_seed = NULL`. When the `workspace-actions` edge function tries to insert a workspace record with a null seed, the database rejects it silently (500 error).

The edge function at line 1137 does:
```
generation_seed: libraryAsset.generation_seed,  // NULL for 54% of library assets
```

## Fix

### 1. `supabase/functions/workspace-actions/index.ts` -- Default null seeds to 0

In the `copy_to_workspace` handler (around line 1137), coalesce null `generation_seed` to `0`:

```typescript
generation_seed: libraryAsset.generation_seed ?? 0,
```

This is safe because `generation_seed` is only used for deduplication and reproducibility -- a `0` value simply means "no seed recorded."

### 2. Same file -- Fix deduplication query (lines 943-950)

The existing dedup check matches on `generation_seed`, which means assets with `NULL` seeds would never be caught as duplicates (NULL != NULL in SQL). Update to handle this:

```typescript
// Current (broken for null seeds):
.eq('generation_seed', libraryAsset.generation_seed)

// Fixed:
.eq('generation_seed', libraryAsset.generation_seed ?? 0)
```

### 3. Optional: Also default `file_size_bytes` defensively

Many library assets have `file_size_bytes = 0` (valid but inaccurate). The workspace insert already passes this through, and `0` satisfies the NOT NULL constraint, so no fix is needed here. But if we want accurate sizes, the edge function could check the blob size after download:

```typescript
file_size_bytes: libraryAsset.file_size_bytes || fileData.size,
```

This is low priority and optional.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/workspace-actions/index.ts` | Default `generation_seed` to `0` when null (line ~1137); fix dedup query to use coalesced value (line ~949) |

## Scope

- Single file change, two lines
- No frontend changes needed
- No DB migration needed
- Fixes the failure for 54% of library assets
