

# Fix: Vision Task + Truncated Response Handling

## Issue 1: "vision" still not in dropdowns

The database CHECK constraint `api_models_task_check` still only allows 7 values. The previous migration was never applied.

**Changes needed:**

1. **Database migration**: Drop old constraint, add new one including `'vision'`
2. **`src/components/admin/ApiModelsTab.tsx`** (line 54-65):
   - Add `vision: 'VIS'` to `TASK_ABBREVIATIONS`
   - Add `'vision'` to the `TASKS` array
3. **`src/hooks/useApiModels.ts`** (line 11):
   - Add `'vision'` to the task type union

## Issue 2: Truncated JSON returned as description

The logs reveal what happened:

```
contentLength: 299
preview: " ```json\n{\n  \"gender\": \"female\",\n  \"description\": \"She radiates a dreamy, tropical allure with her upward gaze suggesting quiet confidence and wanderl..."
```

The model returned only 299 characters -- it hit `max_tokens` and cut off mid-sentence. The JSON parser correctly failed (`Unterminated string at position 290`), but the **fallback behavior** put the entire raw string (including the ` ```json` prefix) into `description`. The frontend then saved this broken JSON blob as the character description.

**Root cause**: `max_tokens: 800` is too low for the structured JSON response, especially with Kimi K2.5 which may use tokens on `<think>` reasoning before outputting.

**Fixes:**

### Edge function (`describe-image/index.ts`):
- Increase `max_tokens` default from `800` to `2048` for structured mode (the thinking tokens + JSON output need room)
- When `rawContent` is empty or when JSON parsing fails, return `success: false` with an error message instead of a fallback object that looks like success
- The fallback at line 192 currently returns `{ description: content.trim() }` which puts broken JSON into the description field -- this must stop

### Frontend (`CharacterStudioV3.tsx`):
- After receiving the response, also check if `data.success === false` and show an error toast
- Add a guard: if `data.data.description` contains ` ```json` or starts with `{`, treat it as a failed parse and show error instead of saving

---

## Files to Modify

| File | Change |
|------|--------|
| Database | New migration: update CHECK constraint to include `'vision'` |
| `src/components/admin/ApiModelsTab.tsx` | Add `'vision'` to `TASKS` and `TASK_ABBREVIATIONS` |
| `src/hooks/useApiModels.ts` | Add `'vision'` to task type union |
| `supabase/functions/describe-image/index.ts` | Increase max_tokens to 2048; return `success: false` on empty/failed parse instead of fallback |
| `src/pages/CharacterStudioV3.tsx` | Validate response data before saving; show error toast on bad data |

