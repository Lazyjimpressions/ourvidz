

# Add Model Family + Task Type Filtering to Prompt Drawer

## Problem

Prompts are not categorized by model family or task type. Seedream works best with structured, keyword-dense prompts while Flux prefers natural language with extended tokens. Similarly, t2i prompts are structured differently than i2i prompts (which focus on edit instructions). The drawer currently shows everything in a flat list with only content-based tags (anatomy, lighting, etc.).

## Solution

Two-tier filtering in the PromptDrawer: **task type** (derived from active model) as automatic context, and **model family** as a taggable/filterable dimension.

### 1. Add `model_family` column to `playground_prompts`

Add a nullable `model_family` text column to the `playground_prompts` table. This stores which model family a prompt was written for (e.g., `flux`, `seedream`, `wan`, or `null` for generic prompts).

### 2. Auto-filter PromptDrawer by active task type

- Pass the detected `taskType` (from the active panel's model) into `usePlaygroundPrompts(taskType)` so the hook's existing `task_type` filter activates
- This means when you have a t2i model selected, you only see t2i prompts; switch to i2i and you see i2i prompts
- Add an "All" option to override the filter when browsing

### 3. Add model family filter pills to PromptDrawer

Add a second row of filter pills above the existing tag pills:
- Row 1: Task type pills (auto-highlighted based on active model, clickable to switch): `All | t2i | i2i | i2v | t2v`
- Row 2: Model family pills: `All | Flux | Seedream | WAN | LTX` (derived from unique `model_family` values in fetched prompts)
- Row 3: Existing content tag pills (anatomy, lighting, etc.)

### 4. Update SavePromptDialog to capture model family

- Auto-detect `model_family` from the active panel's model metadata and display it as a read-only badge
- Allow override via a small dropdown if user wants to save as generic (null)
- Add model-family-specific suggested tags: for Seedream add `structured`, `keyword-dense`; for Flux add `natural-language`, `hex-color`

### 5. Update usePlaygroundPrompts hook

- Accept optional `modelFamily` parameter alongside existing `taskType`
- Add `.eq('model_family', modelFamily)` filter when provided
- Return all when both filters are null (the "All" state)

## Files to Modify

| File | Change |
|------|--------|
| `playground_prompts` table | Add `model_family` text column (nullable) via SQL migration |
| `src/hooks/usePlaygroundPrompts.ts` | Accept `modelFamily` param, add filter |
| `src/components/playground/PromptDrawer.tsx` | Add task type + model family filter pill rows |
| `src/components/playground/SavePromptDialog.tsx` | Auto-detect and display model family, add family-specific tags |
| `src/components/playground/ImageCompareView.tsx` | Pass `taskType` and `modelFamily` from active model to hook and components |

## UX Flow

1. User selects **Flux Pro** (t2i) in Panel A -- drawer auto-filters to `t2i` + `flux` prompts
2. User opens drawer, sees: `[t2i] [i2i] [i2v] [t2v] [All]` then `[Flux] [Seedream] [All]` then content tags
3. User clicks a Flux-optimized prompt chip -- natural language prompt loads into textarea
4. User switches Panel A to **Seedream v4** -- drawer auto-updates to show `t2i` + `seedream` prompts
5. User saves a new prompt -- dialog shows "Model family: Seedream" badge, offers `structured` and `keyword-dense` as suggested tags

