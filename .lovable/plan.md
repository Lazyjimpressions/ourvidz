

# Convert `task` to Multi-Select `tasks` Array

## Overview

Change the `task` text column to `tasks text[]` to support models that serve multiple purposes (e.g. a chat model that does both reasoning and roleplay). Also introduce granular video tasks (`t2v`, `i2v`, `extend`) instead of the generic `generation`.

## Final Taxonomy

| Type (modality) | Available Tasks | Notes |
|---|---|---|
| `image` | `generation`, `style_transfer`, `upscale` | Unchanged from prior plan |
| `video` | `t2v`, `i2v`, `extend` | Replaces generic `generation` |
| `chat` | `roleplay`, `reasoning`, `enhancement`, `embedding` | Multi-select: a model can have multiple |

## Database Changes

### Step 1: Add new column, migrate data, drop old column

```text
1. Add column: tasks text[] NOT NULL DEFAULT '{}'
2. Migrate existing data:
   - image generation models -> tasks = '{generation}'
   - image style_transfer models -> tasks = '{style_transfer}'
   - roleplay + task='chat' models (Grok, Kimi x2) -> modality='chat', tasks='{reasoning}'
   - roleplay + task='roleplay' models (MiMo, MythoMax) -> modality='chat', tasks='{roleplay}'
   - LTX t2v -> tasks = '{t2v}'
   - LTX i2v -> tasks = '{i2v}'
   - LTX extend -> tasks = '{extend}'
   - LTX multi -> tasks = '{t2v,i2v,extend}'
   - WAN i2v -> tasks = '{i2v}'
3. Drop old column: task
```

### Step 2: Specific model mapping (from current data)

| Model | Current modality/task | New modality/tasks |
|---|---|---|
| Seedream v4, v4.5 T2I, SDXL variants | image/generation | image / `{generation}` |
| Seedream v4 Edit, v4.5 Edit | image/style_transfer | image / `{style_transfer}` |
| Grok 4.1 Fast | roleplay/chat | chat / `{reasoning}` |
| Kimi-K2.5-Thinking Chat | roleplay/chat | chat / `{reasoning}` |
| Kimi-K2-Thinking | roleplay/chat | chat / `{reasoning}` |
| MiMo-V2-Flash | roleplay/roleplay | chat / `{roleplay}` |
| MythoMax 13B | roleplay/roleplay | chat / `{roleplay}` |
| LTX 13b - t2v | video/generation | video / `{t2v}` |
| LTX 13b - i2v | video/generation | video / `{i2v}` |
| LTX 13b - extend | video/generation | video / `{extend}` |
| LTX 13b - multi | video/generation | video / `{t2v,i2v,extend}` |
| WAN 2.1 I2V | video/generation | video / `{i2v}` |

## Code Changes

### 1. `src/components/admin/ApiModelsTab.tsx`

- Change `MODALITIES` to `['image', 'video', 'chat']`
- Change `TASKS` to `['generation', 'style_transfer', 'upscale', 't2v', 'i2v', 'extend', 'roleplay', 'reasoning', 'enhancement', 'embedding']`
- Rename "Modality" column header to **"Type"**
- Replace the Task `<Select>` single-select with a **multi-select checkbox group** (compact inline checkboxes or pill toggles) so admins can assign multiple tasks per model
- Update `formData.task` (string) to `formData.tasks` (string array) throughout the add/edit form
- Update the table display to show tasks as comma-separated pills or badges
- Update save/insert mutations to write `tasks` array instead of `task` string

### 2. `src/hooks/useApiModels.ts`

- Update TypeScript interface: `task` becomes `tasks: string[]`
- Update type union for modality: `'image' | 'video' | 'chat'`
- Change `useImageModels` filter from `.eq('task', 'generation')` to `.contains('tasks', ['generation'])`
- Same pattern for `useVideoModels` if task filtering is added

### 3. `src/hooks/useI2IModels.ts`

- Change `.eq('task', 'style_transfer')` to `.contains('tasks', ['style_transfer'])`

### 4. `src/hooks/useRoleplayModels.ts`

- Change `.eq('modality', 'roleplay')` to `.eq('modality', 'chat')`
- Optionally add `.contains('tasks', ['roleplay'])` to only get RP-capable chat models, or keep it broad to show all chat models (reasoning models can RP too)

### 5. `src/hooks/usePlaygroundModels.ts`

- Update `PlaygroundModel` interface: `task` becomes `tasks: string[]`
- Update grouped filter: `m.modality === 'roleplay' || m.modality === 'chat'` becomes `m.modality === 'chat'`
- Update i2i filter: `m.task === 'style_transfer'` becomes `m.tasks?.includes('style_transfer')`
- Update image filter: `m.task === 'generation'` becomes `m.tasks?.includes('generation')`

### 6. `supabase/functions/roleplay-chat/index.ts`

- Change `.eq('task', requiredTask)` to `.contains('tasks', [requiredTask])`
- Change `.eq('task', 'style_transfer')` to `.contains('tasks', ['style_transfer'])`

## Technical Notes

- Supabase PostgREST supports `.contains()` for array columns, which maps to the `@>` Postgres operator
- The `tasks` column uses `text[]` (Postgres array type) which is well-supported by Supabase client
- Multi-select in the admin form can use inline checkboxes filtered by the selected modality (e.g., selecting `chat` type shows only `roleplay`, `reasoning`, `enhancement`, `embedding` as task options)
- Existing hooks that filter by single task use `.contains('tasks', ['value'])` which matches any model that includes that task in its array

## Files to Change

| File | Change |
|---|---|
| Database | Add `tasks text[]`, migrate data, drop `task` |
| `src/components/admin/ApiModelsTab.tsx` | Simplify types to 3, multi-select task UI, rename column |
| `src/hooks/useApiModels.ts` | Update interface and type unions |
| `src/hooks/useI2IModels.ts` | `.contains('tasks', ['style_transfer'])` |
| `src/hooks/useRoleplayModels.ts` | Filter by `modality='chat'` |
| `src/hooks/usePlaygroundModels.ts` | Update interface and grouping filters |
| `supabase/functions/roleplay-chat/index.ts` | `.contains()` for task filtering |

