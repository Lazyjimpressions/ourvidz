
Root cause is now clear and reproducible:

1) Running `character-portrait` deployment is stale (not the repo version): logs show repeated  
`Failed to insert portrait batch 0: record "new" has no field "output_type"`.

2) The trigger migration left a legacy trigger active on `character_portraits`:
- Intended drop used `update_portrait_count`
- Actual trigger name is `trigger_update_character_portrait_count`
So legacy inserts into `character_portraits` now crash after the trigger function was rewritten for `user_library`.

3) New generated rows are being written as orphan library rows (`character_id = null`, `output_type = null`) with only `roleplay_metadata.character_id`, so Character Studio queries exclude them.

Implementation plan (holistic fix):

1. Database hardening + data repair migration
- Drop legacy trigger on `character_portraits`:
  `DROP TRIGGER IF EXISTS trigger_update_character_portrait_count ON public.character_portraits;`
- Backfill orphan portrait rows in `user_library` where:
  `roleplay_metadata->>'type' = 'character_portrait'` and `character_id/output_type` are null:
  - set `character_id` from `roleplay_metadata->>'character_id'`
  - set `output_type = 'portrait'`
- Deduplicate by `(user_id, storage_path, character_id, output_type='portrait')`, keeping the best populated row.
- Keep `user_library` as single source of truth.

2. Force deploy the correct edge function code
- Redeploy `character-portrait` immediately (do not wait for incidental deploys).
- Confirm logs no longer emit `record "new" has no field "output_type"`.

3. Make edge function failure explicit (prevent silent partial success)
- In `supabase/functions/character-portrait/index.ts`, if portrait DB insert fails, return error instead of success payload.
- Keep canon-position insert behavior explicit and logged.

4. Align all portrait autosave writers to unified schema
Update `fal-image`, `fal-webhook`, `replicate-webhook`, and `job-callback` character-portrait inserts to always include:
- `character_id`
- `output_type = 'portrait'`
- `generation_metadata.job_id`
This prevents future regressions when async/webhook paths are used.

5. Client resilience for legacy rows during transition
In `src/hooks/usePortraitVersions.ts`:
- Add fallback fetch path for legacy rows identified via `roleplay_metadata` (`type=character_portrait`, matching character_id) when strict rows are missing.
- Merge + de-dup in memory by storage path/id.
- Keep strict path as primary once data is repaired.

6. Verification checklist (must pass)
- For Alexa and Amanda New:
  - Newly generated image appears in Character Studio Portraits immediately.
  - Image can be used/seen in References flow as expected.
- SQL validation:
  - Recent character_portrait jobs have `portrait_rows > 0` in `user_library`
  - No new orphan rows (`character_id null/output_type null`) for those jobs.
- Edge logs:
  - No `Failed to insert portrait batch`
  - No `record "new" has no field "output_type"`.

Files targeted:
- `supabase/migrations/<new_fix>.sql`
- `supabase/functions/character-portrait/index.ts`
- `supabase/functions/fal-image/index.ts`
- `supabase/functions/fal-webhook/index.ts`
- `supabase/functions/replicate-webhook/index.ts`
- `supabase/functions/job-callback/index.ts`
- `src/hooks/usePortraitVersions.ts`
- (optional guard) `src/hooks/useCharacterStudio.ts` for strict success handling
