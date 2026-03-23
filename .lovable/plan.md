

## Analysis: Merging `character_canon` + `character_portraits` into `user_library`

### On LoRA Training

You're right — LoRA export is just a query: `SELECT storage_path FROM user_library WHERE character_id = ? AND output_type IN ('portrait', 'position') AND is_primary = true`. Tags give you fine-grained filtering (e.g., only front-facing, only specific outfits). A separate table adds zero value for this use case as long as `character_id` and `output_type` exist on the unified table.

### Remaining Negatives of Merging (Honest Assessment)

1. **Trigger rewrite**: The `update_character_portrait_count` trigger fires on `character_portraits` INSERT/DELETE. After merge, it must fire on `user_library` with a condition `WHERE NEW.output_type = 'portrait' AND NEW.character_id IS NOT NULL`. This is a minor migration but must not be missed.

2. **Query volume**: `user_library` becomes the most-queried table in the system (library page, character studio, storyboard picker, playground, roleplay). Proper indexes on `(user_id, character_id, output_type)` mitigate this. Not a real problem at your scale.

3. **Code surface area**: 4 client files + 1 edge function reference `character_canon`; 1 client file references `character_portraits`. That's ~100 lines of query code to repoint. Manageable in one pass.

4. **RLS simplification**: Per your call, keep it private (`user_id = auth.uid()`). Public character browsing is a future concern. This actually makes the merge easier — no complex JOIN-based policies needed.

**Verdict: No other negatives.** The LoRA concern is fully addressed by tagging. The trigger is a one-line condition change. The merge is clean.

### Migration Plan

**Schema changes to `user_library`** (add columns):

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `character_id` | uuid nullable FK → characters(id) ON DELETE CASCADE | null | Associates asset with a character |
| `output_type` | text nullable | null | 'portrait', 'position', 'clothing', 'style', 'scene' |
| `is_primary` | boolean | false | Hero image for character |
| `is_pinned` | boolean | false | Pinned in studio grid |
| `sort_order` | integer | 0 | Gallery ordering |
| `generation_metadata` | jsonb | '{}' | Generation params (seed, model, prompt enhancement details) — from `character_portraits` |
| `label` | text nullable | null | User label for canon slot |

**Indexes**:
```sql
CREATE INDEX idx_user_library_character ON user_library(user_id, character_id) WHERE character_id IS NOT NULL;
CREATE INDEX idx_user_library_output_type ON user_library(user_id, character_id, output_type) WHERE character_id IS NOT NULL;
```

**Trigger update**: Rewrite `update_character_portrait_count` to fire on `user_library` where `output_type = 'portrait'` and `character_id IS NOT NULL`.

**Backfill** (data migration in same SQL):
1. Insert all `character_portraits` rows into `user_library` with mapped columns
2. Insert all `character_canon` rows into `user_library` with mapped columns
3. Deduplicate by `storage_path` (same file shouldn't create two library rows)

**Client code updates** (6 files):

| File | Change |
|------|--------|
| `src/hooks/useCharacterStudio.ts` | All `character_canon` queries → `user_library WHERE character_id = X` |
| `src/hooks/usePortraitVersions.ts` | All `character_portraits` queries → `user_library WHERE character_id = X AND output_type = 'portrait'` |
| `src/components/storyboard/ImagePickerDialog.tsx` | `character_canon` query → `user_library WHERE character_id IS NOT NULL` |
| `src/components/shared/SaveToCanonModal.tsx` | Insert into `user_library` with `character_id` + `output_type` instead of `character_canon` |
| `src/pages/StoryboardEditor.tsx` | `character_canon` query → `user_library` |
| `src/utils/characterImageUtils.ts` | Already queries `user_library` — just add `character_id` filter |

**Edge function update** (1 file):

| File | Change |
|------|--------|
| `supabase/functions/character-portrait/index.ts` | Remove separate `character_portraits` and `character_canon` inserts. Single `user_library` insert with `character_id`, `output_type`, `is_primary`, `sort_order`, `generation_metadata` |

**Deprecation**: Keep `character_canon` and `character_portraits` tables in place (don't drop). Stop writing to them. Future cleanup task removes them after confirming no reads.

### Execution Order

1. Migration SQL: add columns, indexes, trigger, backfill data
2. Edge function: single insert path
3. Client hooks: `useCharacterStudio`, `usePortraitVersions`
4. Client components: `SaveToCanonModal`, `ImagePickerDialog`, `StoryboardEditor`
5. Verify build + test character studio and library flows

