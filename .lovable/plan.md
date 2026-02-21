

# API Model Taxonomy Overhaul + Smart Defaults

## Problem

The current `task` column uses confusing names like `generation` (used for T2I, T2V, I2V, and V2V -- all lumped together) and `style_transfer` (which really means "image edit / I2I"). Video models are especially bad: all 4 video models (t2v, i2v, extend, multi) share `task = 'generation'`, forcing hacky `model_key.includes('i2v')` sniffing to tell them apart.

## New Taxonomy

Replace the 8 current tasks with clear, purpose-driven values:

| Old Task | New Task | Meaning |
|---|---|---|
| `generation` (image) | `t2i` | Text-to-Image |
| `style_transfer` (image) | `i2i` | Image-to-Image / Edit |
| `generation` (video, t2v) | `t2v` | Text-to-Video |
| `generation` (video, i2v) | `i2v` | Image-to-Video |
| `generation` (video, extend) | `extend` | Video-to-Video / Extend |
| `generation` (video, multi) | `multi` | Multi-conditioning Video |
| `upscale` | `upscale` | Keep as-is |
| `roleplay` | `roleplay` | Keep as-is |
| `reasoning` | `reasoning` | Keep as-is |
| `enhancement` | `enhancement` | Keep as-is (prompt enhancement) |
| `embedding` | `embedding` | Keep as-is |
| `vision` | `vision` | Keep as-is |

This eliminates ALL `model_key.includes()` sniffing -- task tells you exactly what a model does.

## Database Changes

### 1. Update CHECK constraint

```sql
ALTER TABLE api_models DROP CONSTRAINT api_models_task_check;
ALTER TABLE api_models ADD CONSTRAINT api_models_task_check 
  CHECK (task = ANY (ARRAY[
    't2i', 'i2i', 't2v', 'i2v', 'extend', 'multi',
    'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding', 'vision'
  ]));
```

### 2. Update existing model rows

```sql
-- Image generation -> t2i
UPDATE api_models SET task = 't2i' WHERE modality = 'image' AND task = 'generation';

-- Image style_transfer -> i2i  
UPDATE api_models SET task = 'i2i' WHERE modality = 'image' AND task = 'style_transfer';

-- Video models: use model_key to assign correct task (one-time migration)
UPDATE api_models SET task = 't2v' WHERE modality = 'video' AND model_key LIKE '%distilled' AND task = 'generation';
UPDATE api_models SET task = 'i2v' WHERE modality = 'video' AND model_key LIKE '%image-to-video' AND task = 'generation';
UPDATE api_models SET task = 'extend' WHERE modality = 'video' AND model_key LIKE '%extend' AND task = 'generation';
UPDATE api_models SET task = 'multi' WHERE modality = 'video' AND model_key LIKE '%multiconditioning' AND task = 'generation';
```

### 3. Update default_for_tasks arrays

```sql
-- Image defaults: generation -> t2i
UPDATE api_models SET default_for_tasks = array_replace(default_for_tasks, 'generation', 't2i')
WHERE 'generation' = ANY(default_for_tasks) AND modality = 'image';

-- Image defaults: style_transfer -> i2i
UPDATE api_models SET default_for_tasks = array_replace(default_for_tasks, 'style_transfer', 'i2i')
WHERE 'style_transfer' = ANY(default_for_tasks) AND modality = 'image';

-- Video defaults: generation -> appropriate task
UPDATE api_models SET default_for_tasks = ARRAY['i2v'] WHERE id = '291624c7-acf8-41d5-b2d7-008aeb1c244d'; -- LTX 13b - i2v
UPDATE api_models SET default_for_tasks = ARRAY['t2v'] WHERE id = '0ef21712-53a8-4476-a165-1f4b519e72b0'; -- LTX 13b - t2v
UPDATE api_models SET default_for_tasks = ARRAY['extend'] WHERE id = '666c70c8-e35f-4bed-a2cf-5081d088b3e3'; -- LTX 13b - extend

-- Chat defaults stay as-is (roleplay, enhancement, vision, reasoning)
```

### Expected final state

| Model | task | default_for_tasks |
|---|---|---|
| Seedream v4 | t2i | ['t2i'] |
| Seedream v4 Edit | i2i | ['i2i'] |
| Seedream v4.5 T2I | t2i | [] |
| Seedream v4.5 Edit | i2i | [] |
| LTX 13b - t2v | t2v | ['t2v'] |
| LTX 13b - i2v | i2v | ['i2v'] |
| LTX 13b - extend | extend | ['extend'] |
| LTX 13b - multi | multi | [] |
| MythoMax 13B | roleplay | ['roleplay'] |
| Grok 4.1 Fast | reasoning | ['enhancement'] |
| Claude 4.5 Haiku | vision | ['vision'] |

---

## Code Changes

### Frontend files to update:

1. **`src/components/admin/ApiModelsTab.tsx`**
   - Update `TASKS` array: replace `['generation', 'style_transfer', ...]` with `['t2i', 'i2i', 't2v', 'i2v', 'extend', 'multi', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding', 'vision']`
   - Update `TASK_ABBREVIATIONS` map accordingly

2. **`src/hooks/useApiModels.ts`**
   - `useImageModels()`: change `'generation'` to `'t2i'`
   - `useVideoModels()`: change `'generation'` to remove task filter (or query multiple: `t2v`, `i2v`, `extend`, `multi`)
   - `useAllVisualModels()`: replace `.in('task', ['generation', 'style_transfer'])` with `.in('task', ['t2i', 'i2i', 't2v', 'i2v', 'extend', 'multi'])`
   - Remove `model_key.includes('i2v')` sniffing -- use `m.task === 'i2v'` directly
   - Update TypeScript `task` union type

3. **`src/hooks/usePlaygroundModels.ts`**
   - `grouped.image`: `m.task === 't2i'`
   - `grouped.i2i`: `m.task === 'i2i'`
   - `grouped.enhancement`: keep as-is

4. **`src/hooks/useI2IModels.ts`**
   - Change `.eq('task', 'style_transfer')` to `.eq('task', 'i2i')`

5. **`src/hooks/useLibraryFirstWorkspace.ts`**
   - Change `.contains('default_for_tasks', ['generation'])` to `['t2i']`

6. **`src/components/playground/ImageCompareView.tsx`**
   - Change `model.task === 'style_transfer'` to `model.task === 'i2i'`
   - Remove `model_key.includes('i2v')` sniffing

7. **`src/components/roleplay/CharacterEditModal.tsx`**
   - Change `default_for_tasks`, `['generation']` to `['t2i']`

8. **`src/lib/services/ModelRoutingService.ts`**
   - Change `default_for_tasks`, `['generation']` to `['t2i']`

### Edge functions to update:

9. **`supabase/functions/fal-image/index.ts`**
   - Change `.contains('default_for_tasks', ['generation'])` to `['t2i']` (for image) or `['t2v']` (for video)

10. **`supabase/functions/replicate-image/index.ts`**
    - Change `.contains('default_for_tasks', ['generation'])` to `['t2i']`

11. **`supabase/functions/roleplay-chat/index.ts`**
    - Change `.eq('task', 'style_transfer')` to `.eq('task', 'i2i')`
    - Change `.contains('default_for_tasks', ['style_transfer'])` to `['i2i']`
    - Change `.contains('default_for_tasks', [requiredTask])` -- the `requiredTask` variable must also be updated where it's set

12. **`supabase/functions/enhance-prompt/index.ts`** -- No change needed (uses `'enhancement'`)

13. **`supabase/functions/describe-image/index.ts`** -- No change needed (uses `'vision'`)

14. **`supabase/functions/character-suggestions/index.ts`** -- No change needed (uses `'roleplay'`)

---

## Smart Model Defaults Hook

### New file: `src/hooks/useSmartModelDefaults.ts`

Queries all active models once, groups them, and provides:

```text
getDefault('t2i')  -> Seedream v4
getDefault('i2i')  -> Seedream v4 Edit
getDefault('t2v')  -> LTX 13b - t2v
getDefault('i2v')  -> LTX 13b - i2v
getDefault('extend') -> LTX 13b - extend
```

Uses `default_for_tasks` array containment, falling back to highest-priority model for that task.

### Wire into `MobileSimplifiedWorkspace.tsx`

- On mode toggle to Image (no ref): auto-select `t2i` default
- On ref image added in image mode: auto-select `i2i` default
- On ref removed in image mode: revert to `t2i` default
- On mode toggle to Video (no ref): auto-select `t2v` default
- On ref image added in video mode: auto-select `i2v` default
- On ref video added in video mode: auto-select `extend` default
- On ref removed in video mode: revert to `t2v` default
- Track `userOverrodeModel` flag to avoid overwriting manual picks
- Show toast on auto-switch

---

## Summary of all changes

| Layer | Files | Change |
|---|---|---|
| Database | SQL migration | New CHECK constraint, update task + default_for_tasks for all 20 models |
| Admin UI | ApiModelsTab.tsx | Updated TASKS list and abbreviations |
| Frontend hooks | 6 files | Replace old task names, remove model_key sniffing |
| Edge functions | 3 files | Replace old default_for_tasks values |
| New hook | useSmartModelDefaults.ts | Auto-model selection based on mode + ref state |
| Workspace | MobileSimplifiedWorkspace.tsx | Wire smart defaults into mode/ref handlers |

