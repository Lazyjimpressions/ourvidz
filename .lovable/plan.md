

# Editable Base Position Prompts

## What This Adds

Each of the 6 base position slots (Front, Left Side, Right Side, Rear, 3/4, Bust) will have a small edit button that opens a popover where you can view and modify the prompt fragment used for generation. Changes save back to the database immediately, so the next time you generate that position it uses your updated prompt.

For example, you could change the "Left Side" prompt from:
> full body, standing, left side profile view, arms at sides, plain background

to:
> full body, standing, left side profile view, looking away from camera, arms at sides, plain background

## How It Works

The prompt fragments live in the `prompt_templates` table's `metadata.pose_presets` JSON. The edit flow:

1. Click the edit (pencil) icon on any position slot
2. A popover shows the current `prompt_fragment` in a textarea
3. Edit the text and click Save
4. The hook updates the full `metadata` JSONB in `prompt_templates` and refreshes the local state

## Technical Details

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCharacterStudio.ts` | Add `updateCanonPresetPrompt(poseKey, newFragment)` function that reads current metadata, patches the specific preset's `prompt_fragment`, and writes it back via `supabase.from('prompt_templates').update()` |
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add edit button + popover with textarea on each `PositionSlot`; accept new `onUpdatePresetPrompt` callback prop |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Pass `onUpdatePresetPrompt` through |
| `src/pages/CharacterStudioV3.tsx` | Wire `updateCanonPresetPrompt` to the prop |

### useCharacterStudio.ts -- new function

```typescript
const updateCanonPresetPrompt = useCallback(async (poseKey: string, newFragment: string) => {
  // 1. Fetch current template row (need the id + full metadata)
  // 2. Patch metadata.pose_presets[poseKey].prompt_fragment = newFragment
  // 3. UPDATE prompt_templates SET metadata = patched WHERE id = templateId
  // 4. Update local canonPosePresets state
}, []);
```

To do this we also need to store the template row ID when we first fetch presets, so we know which row to update.

### PositionSlot -- edit popover

On each slot (both empty and filled states), add a small pencil icon button. On click, it opens a `Popover` with:
- A `<textarea>` pre-filled with `preset.prompt_fragment`
- A Save button
- A Reset button (restores original default -- stored as `default_prompt_fragment` in the preset or just a visual indicator)

The popover sits on the slot without interfering with the generate/regenerate click targets.

### RLS Consideration

The `prompt_templates` table needs an UPDATE policy for authenticated users on their own templates, or at minimum the table must allow updates. Since these are system-level templates (not user-owned), we may need to either:
- Add a `user_id` column and per-user overrides, OR
- Allow authenticated users to update the shared template (simpler but shared)

The simplest approach for now: allow authenticated users to update `prompt_templates` rows where `use_case = 'canon_position'`. This means edits are shared across all users of that template. If per-user customization is needed later, we can add a user override table.

