

# Multi-Task Default Assignment for API Models

## Problem

The current `is_default` boolean can only mark a model as "the default" for its single `task` value. This creates two limitations:

- A model cannot be default for multiple tasks (e.g., MythoMax as default for both `roleplay` and `enhancement`)
- There's no way to distinguish default roles within the same task (e.g., "fast image gen" vs "high quality image gen" defaults will be needed later)

## Solution: `default_for_tasks` Column

Add a `text[]` (Postgres array) column called `default_for_tasks` to the `api_models` table. This replaces `is_default` as the source of truth for default resolution.

| Aspect | Current | New |
|--------|---------|-----|
| Schema | `is_default boolean` + `task text` | `default_for_tasks text[]` (e.g., `{'roleplay','enhancement'}`) |
| Query pattern | `.eq('task','enhancement').eq('is_default',true)` | `.contains('default_for_tasks', ['enhancement'])` |
| UI | Single star toggle | Popover with task checkboxes |

`is_default` is kept as a computed convenience (true when array is non-empty) for backward compat during transition, then deprecated.

## Database Changes

```sql
-- Add the new column
ALTER TABLE api_models 
  ADD COLUMN default_for_tasks text[] NOT NULL DEFAULT '{}';

-- Migrate existing defaults
UPDATE api_models 
  SET default_for_tasks = ARRAY[task] 
  WHERE is_default = true;
```

## Admin UI Changes

**File: `src/components/admin/ApiModelsTab.tsx`**

Replace the star toggle in the "Def" column with a clickable badge area:

- **Empty state**: Shows a dim "---" or empty badge
- **With tasks**: Shows compact badges like `RP` `ENH` (abbreviated)
- **On click**: Opens a small Popover with checkboxes for each task from the `TASKS` constant (`generation`, `style_transfer`, `upscale`, `roleplay`, `reasoning`, `enhancement`, `embedding`)
- Checking/unchecking a task updates `default_for_tasks` and syncs `is_default` (true if array non-empty)
- Column header renamed from "Def" to "Defaults"

The `ModelForm` (add/edit form) also gets a checkbox group for default tasks instead of the current single switch.

## Edge Function Changes

All queries that currently use `.eq('task', X).eq('is_default', true)` switch to `.contains('default_for_tasks', [X])`:

| File | Current Query | New Query |
|------|--------------|-----------|
| `enhance-prompt/index.ts` | `.eq('task','enhancement').eq('is_default',true)` | `.contains('default_for_tasks', ['enhancement'])` |
| `roleplay-chat/index.ts` | `.eq('is_default',true)` (for chat) | `.contains('default_for_tasks', ['roleplay'])` |
| `roleplay-chat/index.ts` | `.eq('task','style_transfer').eq('is_default',true)` | `.contains('default_for_tasks', ['style_transfer'])` |
| `fal-image/index.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['generation'])` |
| `replicate-image/index.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['generation'])` |
| `playground-chat/index.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['roleplay'])` |
| `character-suggestions/index.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['roleplay'])` |
| `src/hooks/useLibraryFirstWorkspace.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['generation'])` |
| `src/lib/services/ModelRoutingService.ts` | `.eq('is_default',true)` | `.contains('default_for_tasks', ['generation'])` |

## Frontend Hook Changes

`ModelRoutingService.ts` and any hooks querying defaults update their `.eq('is_default', true)` to `.contains('default_for_tasks', ['<task>'])`.

## Task Abbreviation Map (for compact UI)

```text
generation     -> GEN
style_transfer -> STY
upscale        -> UPS
roleplay       -> RP
reasoning      -> RSN
enhancement    -> ENH
embedding      -> EMB
```

## Summary of Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `default_for_tasks text[]`, backfill from `is_default` |
| `src/components/admin/ApiModelsTab.tsx` | Replace star toggle with task-checkbox popover + badge display |
| `supabase/functions/enhance-prompt/index.ts` | Update default resolution query |
| `supabase/functions/roleplay-chat/index.ts` | Update default resolution queries (2 locations) |
| `supabase/functions/fal-image/index.ts` | Update default resolution query |
| `supabase/functions/replicate-image/index.ts` | Update default resolution query |
| `supabase/functions/playground-chat/index.ts` | Update default resolution query |
| `supabase/functions/character-suggestions/index.ts` | Update default resolution query |
| `src/hooks/useLibraryFirstWorkspace.ts` | Update default resolution query |
| `src/lib/services/ModelRoutingService.ts` | Update default resolution query |

