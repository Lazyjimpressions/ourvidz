# Migration: Multi-Task Model Support

**Date:** February 21-22, 2026
**Migration ID:** `fd9d085b-6791-4b74-8050-b52582c8e1ed`
**Priority:** CRITICAL - Breaking schema change

## Summary

Migrated `api_models.task` (single string) to `api_models.tasks` (text array) to support models with multiple capabilities. This is a **breaking change** requiring query updates across the codebase.

## Breaking Changes

- `api_models.task` column **REMOVED**
- All queries must use `.contains('tasks', [task])` instead of `.eq('task', task)`
- Admin UI now uses checkbox grid instead of single dropdown

## Migration SQL

```sql
-- Step 1: Add new tasks column as text array
ALTER TABLE public.api_models ADD COLUMN tasks text[] NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing data — copy single task value into array
UPDATE public.api_models SET tasks = ARRAY[task];

-- Step 3: Drop the old constraint on the single task column
ALTER TABLE public.api_models DROP CONSTRAINT IF EXISTS api_models_task_check;

-- Step 4: Drop the old task column
ALTER TABLE public.api_models DROP COLUMN task;

-- Step 5: Add CHECK constraint that validates all elements in the tasks array
CREATE OR REPLACE FUNCTION public.check_valid_tasks(arr text[])
RETURNS boolean AS $$
DECLARE
  elem text;
  valid_tasks text[] := ARRAY['t2i', 'i2i', 'i2i_multi', 't2v', 'i2v', 'extend',
                               'multi', 'upscale', 'roleplay', 'reasoning',
                               'enhancement', 'embedding', 'vision'];
BEGIN
  IF arr IS NULL OR array_length(arr, 1) IS NULL OR array_length(arr, 1) = 0 THEN
    RETURN false;
  END IF;
  FOREACH elem IN ARRAY arr LOOP
    IF NOT (elem = ANY(valid_tasks)) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

ALTER TABLE public.api_models ADD CONSTRAINT api_models_tasks_check
  CHECK (check_valid_tasks(tasks));

-- Step 6: Add constraint ensuring default_for_tasks is a subset of tasks
ALTER TABLE public.api_models ADD CONSTRAINT api_models_defaults_subset_tasks
  CHECK (default_for_tasks <@ tasks);

-- Step 7: Create GIN index for efficient array containment queries
CREATE INDEX idx_api_models_tasks_gin ON public.api_models USING GIN (tasks);

-- Step 8: Drop old B-tree index on task if it exists
DROP INDEX IF EXISTS idx_api_models_modality_task;
```

## Valid Task Values

| Task | Description |
|------|-------------|
| `t2i` | Text-to-image generation |
| `i2i` | Image-to-image (single reference) |
| `i2i_multi` | Image-to-image with multiple references |
| `t2v` | Text-to-video generation |
| `i2v` | Image-to-video generation |
| `extend` | Video extension/continuation |
| `multi` | Multi-modal capabilities |
| `upscale` | Image upscaling |
| `roleplay` | Chat/roleplay models |
| `reasoning` | Reasoning/thinking models |
| `enhancement` | Prompt enhancement models |
| `embedding` | Embedding models |
| `vision` | Vision/image understanding |

## Database Function

**Function:** `check_valid_tasks(arr text[])`

- Validates all elements in array against allowed values
- Returns `false` for NULL, empty arrays, or invalid elements
- Used by `api_models_tasks_check` constraint

## Schema Impact

| Column | Old Type | New Type | Notes |
|--------|----------|----------|-------|
| `task` | `text` | REMOVED | Single task value |
| `tasks` | N/A | `text[]` | Array of tasks |

## Constraints

| Constraint | Purpose |
|------------|---------|
| `api_models_tasks_check` | Validates all task values |
| `api_models_defaults_subset_tasks` | Ensures `default_for_tasks <@ tasks` |

## Index

| Index | Type | Purpose |
|-------|------|---------|
| `idx_api_models_tasks_gin` | GIN | Efficient array containment queries |

## Query Migration Examples

### Before (BROKEN)

```typescript
// Single task equality - NO LONGER WORKS
const { data } = await supabase
  .from('api_models')
  .select('*')
  .eq('task', 'i2i')
```

### After (CORRECT)

```typescript
// Array containment check
const { data } = await supabase
  .from('api_models')
  .select('*')
  .contains('tasks', ['i2i'])
```

### Multiple Task Filter

```typescript
// Find models that support BOTH i2i and i2i_multi
const { data } = await supabase
  .from('api_models')
  .select('*')
  .contains('tasks', ['i2i', 'i2i_multi'])
```

## Affected Files

### Hooks

| File | Change |
|------|--------|
| `src/hooks/useApiModels.ts` | Line 50: `.contains('tasks', [task])` |
| `src/hooks/useI2IModels.ts` | Line 61: `.contains('tasks', [filterTask])` |
| `src/hooks/useLibraryFirstWorkspace.ts` | Line 227: `.contains('default_for_tasks', ['t2i'])` |

### Admin UI

| File | Change |
|------|--------|
| `src/components/admin/ApiModelsTab.tsx` | Checkbox grid instead of dropdown |

### Edge Functions

| File | Change |
|------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Updated model queries |
| `supabase/functions/fal-image/index.ts` | Updated task filtering |

## New Features Enabled

### i2i_multi Task

Models can now declare support for multi-reference I2I scenarios:

```sql
-- Seedream v4 Edit supports both single and multi-ref
UPDATE api_models
SET tasks = ARRAY['i2i', 'i2i_multi'],
    default_for_tasks = ARRAY['i2i', 'i2i_multi']
WHERE model_key = 'fal-ai/bytedance/seedream/v4/edit';
```

### Dynamic Model Selection

`getI2IModelKey()` function replaces hardcoded fallback, dynamically selecting appropriate model based on task requirements.

## Admin UI Changes

The ApiModelsTab now displays a checkbox grid for task selection:

- Each valid task shown as checkbox
- Multiple tasks can be selected
- Visual indication of which tasks are defaults (`default_for_tasks`)

## Backward Compatibility

**None** - This is a breaking change. All queries using `.eq('task', ...)` will fail.

## Testing Checklist

- [ ] Model queries return correct results with `.contains('tasks', [...])`
- [ ] Admin UI checkbox grid saves correctly
- [ ] New models can be created with multiple tasks
- [ ] `default_for_tasks` subset constraint enforced
- [ ] Invalid task values rejected by constraint
