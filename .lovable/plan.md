

# Simplified: Auto-Tag Duo Positions + Character/Position Filtering

## What's Already Done (Previous Edits)
- `ImagePickerDialog` has category tabs (All, Characters, Positions, Scenes, Outfits) filtering by `role:*` tags
- `MobileSimplePromptInput` opens the picker with slot-appropriate `filterTag`
- Characters tab filters by `role:character` tag in the library -- no extra DB call needed
- Positions tab filters by `role:position` tag -- works for single and duo once tagged

## What Still Needs to Happen

### 1. Pass `num_characters` in generation metadata

**File**: `src/hooks/useLibraryFirstWorkspace.ts`

In the Quick Scene branch (around line 1347-1354 where `isQuickScene` is detected), count the filled character slots and add `num_characters` to `baseMetadata`:

```
// Inside baseMetadata object (around line 1002):
num_characters: undefined, // set below for Quick Scene

// Then in the Quick Scene block (around line 1347-1354):
// After detecting isQuickScene, update metadata:
requestPayload.metadata.num_characters = [effRefUrl, ...additionalImageUrls].filter(Boolean).length >= 2 ? 2 : 1;
```

Actually simpler: count how many of the first 2 ref slots (Char A, Char B) are filled. Slot 0 = `effRefUrl`, Slot 1 = first item in `additionalImageUrls`. If both filled, `num_characters = 2`.

### 2. Store `num_characters` in `workspace_assets.generation_settings`

**File**: `supabase/functions/fal-webhook/index.ts`

In the workspace_assets insert (line 179-201), pass through `num_characters` from job metadata into `generation_settings`:

```typescript
generation_settings: {
  ...existing fields...,
  num_characters: job.metadata?.num_characters,
}
```

### 3. Auto-tag duo when saving to library

**File**: `supabase/functions/workspace-actions/index.ts`

In the `save_to_library` action (around line 211-229), before inserting into `user_library`, check the asset's `generation_settings.num_characters`:

```typescript
// Build tags from request + auto-detect duo
const baseTags = actionRequest.tags || [];
if (asset.generation_settings?.num_characters >= 2) {
  if (!baseTags.includes('role:position')) baseTags.push('role:position');
  if (!baseTags.includes('duo')) baseTags.push('duo');
}
```

Do the same in the `clear_asset` action (around line 280+) which also saves to library.

### 4. Show duo positions on character's PositionsGrid

**File**: `src/components/character-studio-v3/PositionsGrid.tsx`

Add a "Duo Poses" section below the existing 6 fixed canonical slots. This queries `user_library` for assets tagged with both `role:position` and `duo`:

- Add a prop `characterName?: string` to `PositionsGridProps`
- Use a simple `useQuery` to fetch: `supabase.from('user_library').select('*').contains('tags', ['role:position', 'duo'])`
- Display as a simple grid section with title "Duo Poses"
- Each tile links to the lightbox like existing position tiles

## File Summary

| File | Change |
|------|--------|
| `src/hooks/useLibraryFirstWorkspace.ts` | Add `num_characters` to generation metadata when Quick Scene has 2 char slots filled |
| `supabase/functions/fal-webhook/index.ts` | Pass `num_characters` from job metadata into `workspace_assets.generation_settings` |
| `supabase/functions/workspace-actions/index.ts` | Auto-tag `['role:position', 'duo']` on save-to-library when `generation_settings.num_characters >= 2` |
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add "Duo Poses" section querying library for `role:position` + `duo` tagged assets |

## What This Does NOT Change
- No new tables or columns
- No new edge functions
- Characters tab already works via existing `role:character` tag filtering
- Positions tab already works via existing `role:position` tag filtering
- No special DB call for character primary refs -- they're already tagged `role:character` in the library

