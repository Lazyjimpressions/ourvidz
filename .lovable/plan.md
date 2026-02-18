

# Fix: Vision Task Support + Empty Response Handling

## Two Issues Found

### Issue 1: "vision" not available as a task in the UI or database

The `task` column on `api_models` has a **database CHECK constraint** that only allows these 7 values:
`generation, style_transfer, upscale, roleplay, reasoning, enhancement, embedding`

The frontend mirrors this in two places:
- `src/components/admin/ApiModelsTab.tsx` line 65: `TASKS` array
- `src/hooks/useApiModels.ts` line 11: TypeScript type

Since `default_for_tasks` is an unconstrained text array, adding `'vision'` there worked fine. But the task dropdown and the column itself can never be set to `'vision'`.

**Fix:**
1. **Database migration**: ALTER the CHECK constraint to add `'vision'` to the allowed values
2. **`ApiModelsTab.tsx`**: Add `'vision'` to the `TASKS` array
3. **`useApiModels.ts`**: Add `'vision'` to the TypeScript union type

### Issue 2: Empty model response causes silent failure

The latest call returned `contentLength: 0` from Kimi K2.5. The function correctly fell back to `{ description: "", traits: "", ... }` but the frontend treated this as "success" and showed a toast saying traits were extracted — even though nothing was actually extracted.

Previous calls to the same model with the same image worked fine (1218 chars, 1123 chars), so this is a transient/flaky response.

**Fix (in `CharacterStudioV3.tsx`):**
- After receiving the response, check if the returned `data.description` (or `data.traits`) is empty
- If empty, show an error toast: "Vision model returned empty response. Try again."
- Don't overwrite existing character fields with empty values

**Fix (in `describe-image/index.ts`):**
- When `rawContent` is empty, return `success: false` with a clear error message instead of returning a fallback object that looks like success

---

## Files to Modify

| File | Change |
|------|--------|
| Database (`api_models_task_check`) | ALTER CHECK constraint to include `'vision'` |
| `src/components/admin/ApiModelsTab.tsx` | Add `'vision'` to `TASKS` array |
| `src/hooks/useApiModels.ts` | Add `'vision'` to task type union |
| `supabase/functions/describe-image/index.ts` | Return `success: false` when model returns empty content |
| `src/pages/CharacterStudioV3.tsx` | Handle empty/failed responses gracefully with retry toast |

