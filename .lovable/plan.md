

# Simplify API Models: Type + Task Taxonomy

## The Problem

`modality` and `task` overlap confusingly. `roleplay` appears as both a modality and a task. `chat` also appears as both. The admin UI lists 7 modalities and 10 tasks, most unused.

## Recommendation: 3 Types, 7 Tasks

**Type** (currently `modality` column) answers: "What kind of output does this model produce?"

Only 3 values: `image`, `video`, `chat`

**Task** answers: "What specific job does this model do within its type?"

| Type | Task | Description | Current models |
|---|---|---|---|
| `image` | `generation` | Text-to-Image | Seedream T2I, SDXL |
| `image` | `style_transfer` | Image-to-Image editing | Seedream Edit |
| `image` | `upscale` | Resolution upscaling | (future) |
| `video` | `generation` | T2V, I2V, extend | LTX, WAN |
| `chat` | `roleplay` | RP-optimized LLMs | MythoMax, MiMo |
| `chat` | `reasoning` | General reasoning LLMs | Grok, Kimi, Lumimaid |
| `chat` | `enhancement` | Prompt rewriting | (future) |
| `chat` | `embedding` | Text embeddings | (future) |

## Data Migration

Update existing rows in `api_models`:

```text
modality='roleplay', task='chat'       -->  modality='chat', task='reasoning'
modality='roleplay', task='roleplay'   -->  modality='chat', task='roleplay'
```

Only 5 rows affected (Grok, Kimi x2, Lumimaid, MiMo, MythoMax).

## Code Changes

### 1. Admin UI: `src/components/admin/ApiModelsTab.tsx`

- Change `MODALITIES` from 7 items to: `['image', 'video', 'chat']`
- Change `TASKS` from 10 items to: `['generation', 'style_transfer', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding']`
- Rename the "Modality" column header to **"Type"** in the table
- Keep "Task" label as-is

### 2. Hooks that filter by `modality='roleplay'`

| File | Current filter | New filter |
|---|---|---|
| `src/hooks/useRoleplayModels.ts` | `.eq('modality', 'roleplay')` | `.eq('modality', 'chat')` |
| `src/hooks/usePlaygroundModels.ts` | `m.modality === 'roleplay' \|\| m.modality === 'chat'` | `m.modality === 'chat'` |
| `src/hooks/useApiModels.ts` | Type union includes `'roleplay'` | Replace `'roleplay'` with just `'chat'` in the type, remove `'prompt'`, `'audio'`, `'embedding'` from modality type |

### 3. Type definitions: `src/hooks/useApiModels.ts`

Update the TypeScript type to match:

```text
modality: 'image' | 'video' | 'chat'
task: 'generation' | 'style_transfer' | 'upscale' | 'roleplay' | 'reasoning' | 'enhancement' | 'embedding'
```

### 4. No changes needed

- `useImageModels.ts` -- already filters `modality='image'`, unaffected
- `useI2IModels.ts` -- filters by `task='style_transfer'` within image models, unaffected
- Edge functions -- they resolve models by `api_model_id` (UUID), not by modality string

## Files to Change

| File | Change |
|---|---|
| Database (SQL) | UPDATE 5 rows: `modality` from `'roleplay'` to `'chat'`, `task` from `'chat'` to `'reasoning'` |
| `src/components/admin/ApiModelsTab.tsx` | Simplify MODALITIES to 3 items, TASKS to 7, rename column to "Type" |
| `src/hooks/useApiModels.ts` | Update TypeScript type union |
| `src/hooks/useRoleplayModels.ts` | Change filter from `'roleplay'` to `'chat'` |
| `src/hooks/usePlaygroundModels.ts` | Simplify chat grouping filter |

## Result

- Clean 3-type taxonomy: image, video, chat
- Tasks are specific and non-overlapping within each type
- No more "roleplay" as both a type and a task
- Admin UI dropdowns are short and clear
- Extensible for future models (TTS could become a 4th type when needed)

