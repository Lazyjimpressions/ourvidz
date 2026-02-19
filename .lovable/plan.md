

# Batch Generation: Multi-Image Per Request

## Opportunity

Five of our active fal.ai models support generating 2-4 images in a single API call at marginal extra cost. This is a natural fit for both workflow phases:

- **Brainstorming (T2I):** Generate 4 variants to browse instead of rolling one at a time. Dramatically speeds up character exploration.
- **Directing (I2I with ref locked):** Generate 2-4 outfit/scene/pose variations simultaneously. User picks the best, discards the rest.

A single Flux-2 Flash call generating 4 images costs roughly the same as one Seedream call generating 1. This is "cheap iteration."

## Models with Multi-Image Support

| Model | `num_images` Max | Approx Cost (4 imgs) | Notes |
|-------|-----------------|---------------------|-------|
| Flux-2 | 4 | ~$0.10 | High quality T2I |
| Flux-2 Flash | 4 | ~$0.04 | Ultra-fast drafts |
| Flux-2 Flash i2i | 4 | ~$0.04 | Fast I2I edits |
| Flux Pro Kontext | 4 | ~$0.20 | Premium I2I |
| Seedream v4.5 Edit | 10 | ~$0.10 | I2I with editing |

## What Changes

### 1. Edge function: Support `num_images` parameter

**File: `supabase/functions/character-portrait/index.ts`**

- Accept optional `numImages` (1-4, default 1) from the request body
- Read the model's `input_schema.num_images.max` to cap the value (some models support 4, Seedream supports 10, others support 0)
- Pass `num_images` to the fal.ai payload when the model supports it
- Handle the response: fal.ai returns an `images` array instead of a single `images[0]` -- iterate and create one `workspace_asset` per image, all linked to the same `job_id`
- Store `batch_index` (0, 1, 2, 3) in each asset's metadata so the UI can display them in order

### 2. UI: Batch count selector in the prompt bar

**File: `src/components/character-studio/CharacterStudioPromptBar.tsx`**

- Add a small counter or chip next to the Generate button: `[x1]` `[x2]` `[x4]`
- Only show when the selected model supports `num_images > 1` (check `capabilities.input_schema.num_images.max`)
- Default to `x1` to preserve current behavior; user can bump up when brainstorming
- Pass `numImages` through the `onGenerate` callback

### 3. Hook: Thread `numImages` to edge function

**File: `src/hooks/useCharacterStudio.ts`**

- Accept `numImages` in the generation options
- Forward it in the edge function request body

### 4. Gallery: Handle multi-image job results

**File: `src/components/character-studio/PortraitGallery.tsx`** (or equivalent gallery component)

- Currently expects one image per job
- Update to display all images from a batch job (query `workspace_assets` where `job_id = X`, ordered by `batch_index`)
- No major layout change needed -- they just appear as separate portraits in the existing grid

### 5. Model capability awareness

**File: `src/hooks/useImageModels.ts`**

- Expose `max_images` from the model's `input_schema` or `capabilities` so the UI knows whether to show the batch selector
- Add to `ImageModelOption` type: `maxImages?: number`

## User Experience

```text
Phase 1 -- Brainstorming:
  User selects Flux-2 Flash, sets batch to x4
  Types: "anime girl with silver hair and red eyes"
  Clicks Generate
  4 variants appear in gallery within ~5 seconds
  User picks the best one, locks it

Phase 2 -- Directing:
  User keeps batch at x2 (or x4)
  Types: "wearing a red cocktail dress at sunset"
  2-4 variations of the same character in that outfit appear
  User picks the winner
```

## Cost Impact

- Flux-2 Flash x4 = ~$0.04 total (same as one Seedream generation)
- This makes "generate 4, pick 1" viable as the default brainstorming workflow
- We can default to x1 and let users opt into batches, or default to x2 for Flash models

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/character-portrait/index.ts` | Accept `numImages`, cap against model max, pass to fal.ai, create multiple workspace_assets per job |
| `src/components/character-studio/CharacterStudioPromptBar.tsx` | Add batch count selector (x1/x2/x4), show only when model supports it |
| `src/hooks/useCharacterStudio.ts` | Thread `numImages` to edge function |
| `src/hooks/useImageModels.ts` | Expose `maxImages` from model capabilities |
| Portrait gallery component | Handle multiple assets per job_id |

## What NOT to Change

- No new database tables needed -- `workspace_assets` already supports multiple assets per `job_id`
- No changes to the model selector -- batch count is orthogonal to model choice
- Credits/billing logic stays the same (one job = one credit charge, regardless of batch size; cost is handled by the API billing)
