

# Describe Image: Vision Pipeline with Kimi K2.5

## Database Change (Data Update Only -- No Migration)

Update the **existing** Kimi K2.5 row (`82e0b6e3-0a64-4396-9d5b-24d609c24b77`) to add `'vision'` to its `default_for_tasks` array:

```sql
UPDATE api_models 
SET default_for_tasks = array_append(default_for_tasks, 'vision')
WHERE id = '82e0b6e3-0a64-4396-9d5b-24d609c24b77';
```

No new row. No schema change. Just a multi-task assignment on the existing model, exactly like how other models serve multiple roles.

---

## Edge Function: `describe-image`

**File**: `supabase/functions/describe-image/index.ts` (new)

### Model Resolution (standard priority chain)
1. Explicit `modelId` (UUID) from request body
2. Explicit `modelKey` from request body
3. DB default: `.contains('default_for_tasks', ['vision'])` on active chat models
4. Hardcoded fallback: `moonshotai/kimi-k2.5`

This is the same pattern used by `character-suggestions`, `enhance-prompt`, `roleplay-chat`, etc.

### Input
```text
{ imageUrl, contentRating?, outputMode?, modelId?, modelKey?, originalPrompt? }
```
- `outputMode`: `'caption'` | `'detailed'` | `'structured'` (default: `'structured'`)

### Processing
- Resolve model + provider from DB
- Look up provider's `base_url`, `secret_name`, and `auth_scheme`
- Build OpenRouter-compatible chat completion with image content block:
  ```text
  messages: [
    { role: "system", content: "<structured extraction prompt>" },
    { role: "user", content: [
      { type: "image_url", image_url: { url: imageUrl } },
      { type: "text", text: "Describe this character" }
    ]}
  ]
  ```
- Parse response into structured JSON

### Output Modes
- **caption**: Single sentence description
- **detailed**: Narrative paragraph
- **structured**: JSON mapping 1:1 to character table fields:
  ```text
  { gender, description, appearance_tags, physical_traits, traits, suggested_names }
  ```
- When `originalPrompt` is provided, also returns a quality score

### Config
Add to `supabase/config.toml`:
```toml
[functions.describe-image]
verify_jwt = false
```

---

## Frontend Integration

### `StudioSidebar.tsx`
- Add a "Describe Image" button below the Style Lock preview (visible when reference image is set)
- On click: invoke `describe-image` with `outputMode: 'structured'`
- Map response fields to `updateCharacter()`:
  - `description` -> `traits`
  - `appearance_tags` -> `appearance_tags`
  - `gender` -> `gender`
  - `physical_traits` -> `physical_traits`
- Show loading state during analysis, toast on completion

### `CharacterStudioV3.tsx`
- When `entryMode === 'from-image'` and a reference image is set, auto-trigger the describe flow (no manual button click needed)

---

## Files Summary

| File | Action |
|------|--------|
| `api_models` table | UPDATE existing Kimi K2.5 row: add `'vision'` to `default_for_tasks` |
| `supabase/functions/describe-image/index.ts` | Create new edge function |
| `supabase/config.toml` | Add `[functions.describe-image]` entry |
| `src/components/character-studio-v3/StudioSidebar.tsx` | Add "Describe Image" button + handler |
| `src/pages/CharacterStudioV3.tsx` | Auto-trigger for `from-image` entry mode |

## No New Dependencies or Secrets
- Uses existing OpenRouter provider + `OpenRouter_Roleplay_API_KEY` secret
- No new npm packages

