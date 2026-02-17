

# Apply Type + Task Taxonomy Changes

## What Was Missed

The taxonomy simplification plan was never applied -- neither the database data migration nor the code changes. Everything still uses the old 7-modality, 10-task structure.

## Step 1: Database Data Migration (UPDATE only, no schema change)

Update the 5 roleplay rows so `modality` becomes `chat` and `task='chat'` becomes `task='reasoning'`:

```sql
-- Models with modality='roleplay', task='chat' --> modality='chat', task='reasoning'
UPDATE api_models SET modality = 'chat', task = 'reasoning'
WHERE modality = 'roleplay' AND task = 'chat';

-- Models with modality='roleplay', task='roleplay' --> modality='chat', task='roleplay'  
UPDATE api_models SET modality = 'chat'
WHERE modality = 'roleplay' AND task = 'roleplay';
```

After this, the distinct values become: `image/generation`, `image/style_transfer`, `video/generation`, `chat/roleplay`, `chat/reasoning`.

## Step 2: Admin UI -- `src/components/admin/ApiModelsTab.tsx`

- Line 51: Change MODALITIES from 7 items to `['image', 'video', 'chat']`
- Line 52: Change TASKS from 10 items to `['generation', 'style_transfer', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding']`
- Line 316: Rename table header from `"Task"` to keep as `"Task"` (already correct)
- Line 305: The collapsible group header already shows uppercase modality, which will now show `IMAGE`, `VIDEO`, `CHAT` -- correct

## Step 3: Hooks

**`src/hooks/useApiModels.ts`** (line 10-11):
- Simplify modality type to `'image' | 'video' | 'chat'`
- Simplify task type to `'generation' | 'style_transfer' | 'upscale' | 'roleplay' | 'reasoning' | 'enhancement' | 'embedding'`

**`src/hooks/useRoleplayModels.ts`** (line 92):
- Change `.eq('modality', 'roleplay')` to `.eq('modality', 'chat')`

**`src/hooks/usePlaygroundModels.ts`** (lines 8, 92):
- Line 8: Update type to `'image' | 'video' | 'chat'`
- Line 92: Change `m.modality === 'roleplay' || m.modality === 'chat'` to `m.modality === 'chat'`

## Files Changed

| File | Change |
|------|--------|
| Database (data only) | UPDATE 5 rows: roleplay to chat modality |
| `src/components/admin/ApiModelsTab.tsx` | Simplify MODALITIES to 3, TASKS to 7 |
| `src/hooks/useApiModels.ts` | Update TypeScript type unions |
| `src/hooks/useRoleplayModels.ts` | Change filter from 'roleplay' to 'chat' |
| `src/hooks/usePlaygroundModels.ts` | Simplify type union and chat filter |

