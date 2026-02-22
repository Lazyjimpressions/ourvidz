

## Migrate `task` Column to `tasks` Array -- Multi-Capability Model Architecture

### The Problem

The current `task` column is a **single value** (e.g., `'i2i'`, `'roleplay'`), but models often serve multiple purposes. Seedream v4 Edit can do both single-ref I2I and multi-ref I2I. Chat models can serve roleplay, reasoning, and enhancement. The single `task` column forces each model into one bucket, creating artificial limitations and requiring workarounds like the hardcoded v4.5 fallback.

Meanwhile, `default_for_tasks` already acts as a multi-select array, but it's disconnected from `task` -- there's no validation that a model marked as "default for i2i" actually has `i2i` as a capability.

### The Solution

Replace the single `task text` column with a `tasks text[]` array column. Each model declares all the tasks it can perform (its capabilities/eligibility). The existing `default_for_tasks` array stays but is now validated as a subset of `tasks`. The admin UI consolidates this into one checkbox grid.

### What Changes

#### 1. Database Migration

- Rename column `task` to `tasks` and convert from `text` to `text[]`
- Migrate existing data: each model's single `task` value becomes a one-element array
- Update the constraint `api_models_task_check` to validate that all elements in the array are from the allowed set
- Add a constraint ensuring `default_for_tasks` is a subset of `tasks`
- Update the Supabase types to reflect `tasks: string[]`

```text
Example migration for existing data:
  Seedream v4 Edit:  task='i2i'  -->  tasks=['i2i']
  MythoMax 13B:      task='roleplay'  -->  tasks=['roleplay']
  Grok 4.1 Fast:     task='reasoning'  -->  tasks=['reasoning', 'enhancement']
  LTX 13b i2v:       task='i2v'  -->  tasks=['i2v']
```

After migration, admin can add additional tasks to models:
- Seedream v4 Edit: `tasks=['i2i', 'i2i_multi']` (supports both single and multi-ref)
- Seedream v4.5 Edit: `tasks=['i2i', 'i2i_multi']`
- MythoMax: `tasks=['roleplay']` (only roleplay)
- Grok 4.1 Fast: `tasks=['reasoning', 'enhancement']` (serves both)

The new `i2i_multi` task value gets added to the constraint's allowed list.

#### 2. Admin UI -- Unified Checkbox Grid

Replace the current separate "Task" dropdown + "Default for tasks" checkbox popover with a **single consolidated popover** (or inline grid). Each task shows as a row with two states:

- **Unchecked**: Model is not eligible for this task
- **Single check**: Model is eligible (appears in this task's model list)
- **Star/highlighted check**: Model is the default for this task

This replaces two separate controls with one unified interaction. The "Task" dropdown in the add/edit form is also replaced with checkboxes.

The table column currently showing the single `task` value will instead show badge chips for all assigned tasks, with default tasks highlighted differently (e.g., outlined vs filled badge).

#### 3. Query Updates -- All Consumers

Every query currently using `.eq('task', 'i2i')` changes to `.contains('tasks', ['i2i'])`:

**Frontend hooks (4 files):**
- `src/hooks/useI2IModels.ts`: `.eq('task', 'i2i')` --> `.contains('tasks', ['i2i'])`
- `src/hooks/useImageModels.ts`: filter logic updated for `tasks` array
- `src/hooks/useRoleplayModels.ts`: no task filter currently (queries all chat), unchanged
- `src/hooks/useApiModels.ts`: generic hook, `.eq('task', task)` --> `.contains('tasks', [task])`
- `src/hooks/useSmartModelDefaults.ts`: `m.task === task` --> `m.tasks?.includes(task)`
- `src/hooks/usePlaygroundModels.ts`: `m.task === 't2i'` --> `m.tasks?.includes('t2i')`, etc.

**Edge function (1 file):**
- `supabase/functions/roleplay-chat/index.ts`: All `.eq('task', ...)` queries become `.contains('tasks', [...])`
- Remove the hardcoded `'fal-ai/bytedance/seedream/v4.5/edit'` fallback at line 3598
- Update `getI2IModelKey()` to accept a task parameter (e.g., `'i2i'` vs `'i2i_multi'`) and resolve accordingly

#### 4. Settings Hook -- Add `selectedI2IModel`

- Add `selectedI2IModel: string` (default `'auto'`) to the `RoleplaySettings` interface in `useRoleplaySettings.ts`
- Include in load/save/reset logic
- Refactor `MobileRoleplayChat.tsx` to consume from the hook instead of standalone `useState` + raw `localStorage`

#### 5. Model Selection UI -- Task-Filtered Dropdowns

The existing I2I model selector in `SceneSetupSheet` and `RoleplaySettingsModal` already works, but with the `tasks` array, the hook can now filter more precisely:

- When building a multi-ref scene (both_characters style), query models with `tasks` containing `'i2i_multi'`
- When doing single-ref iteration, query models with `tasks` containing `'i2i'`
- Models eligible for both will appear in both lists

### Files Changed

| File | Change |
|------|--------|
| **Database migration** | Rename `task` to `tasks`, convert to `text[]`, update constraints, add `i2i_multi` to allowed values |
| `src/integrations/supabase/types.ts` | Auto-regenerated: `task: string` --> `tasks: string[]` |
| `src/components/admin/ApiModelsTab.tsx` | Replace Task dropdown + Default popover with unified checkbox grid; update table display |
| `src/hooks/useApiModels.ts` | `.eq('task', task)` --> `.contains('tasks', [task])`, update grouping logic |
| `src/hooks/useI2IModels.ts` | `.eq('task', 'i2i')` --> `.contains('tasks', ['i2i'])` |
| `src/hooks/useImageModels.ts` | Update task references |
| `src/hooks/useSmartModelDefaults.ts` | `m.task === task` --> `m.tasks?.includes(task)` |
| `src/hooks/usePlaygroundModels.ts` | Update all `m.task ===` filters to `m.tasks?.includes()` |
| `src/hooks/useRoleplaySettings.ts` | Add `selectedI2IModel` field |
| `src/pages/MobileRoleplayChat.tsx` | Use settings hook for I2I model state |
| `supabase/functions/roleplay-chat/index.ts` | Update all `.eq('task', ...)` queries; remove hardcoded fallback; update `getI2IModelKey()` |

### What Stays the Same

- `modality` column (image/video/chat) -- unchanged, still the top-level categorization
- `default_for_tasks` array -- unchanged in purpose, now validated as subset of `tasks`
- `priority` column -- unchanged, still used for ordering within a task
- All model capabilities, input_schema, pricing -- unchanged
- The overall admin table layout and density -- unchanged, just the task column gets smarter

### Technical Notes

- The `tasks` array uses PostgreSQL's `text[]` type with a CHECK constraint using the `&&` (overlap) or element-level validation
- Supabase's `.contains()` operator maps to PostgreSQL's `@>` which is GIN-indexable for performance
- A GIN index on `tasks` replaces the current B-tree index on `task` for efficient array queries
- The `default_for_tasks <@ tasks` subset constraint ensures data integrity

