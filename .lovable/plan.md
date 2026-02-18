

# Consolidate to Single Generation Path with Optional Enhancement

## Problem

Two "Generate" buttons exist with different behaviors:
- Sidebar "Generate Portrait" silently assembles a prompt from character fields
- Prompt bar "Generate" uses freeform text the user typed

This is confusing and neither path produces model-optimized prompts.

## Approach

Remove the sidebar generate button. Make sidebar field changes auto-populate the prompt bar in column 2. Add a sparkle (enhance) button to the prompt bar for optional model-aware enhancement.

## Changes

### 1. Remove sidebar "Generate Portrait" button

In `StudioSidebar.tsx`, remove the "Generate Portrait" button (line 319-322) and the `handleGeneratePortrait` function (lines 80-82). The sidebar becomes purely a data-entry panel.

Keep the Model Selector in the sidebar since it's logically grouped with appearance settings.

### 2. Auto-populate the prompt bar from sidebar fields

In `CharacterStudioV3.tsx`, add an effect that watches character fields (name, gender, traits, appearance_tags) and assembles them into a natural-language prompt string, updating `promptText`. This runs on field changes so the prompt bar always reflects the current character state.

The assembly logic mirrors the existing `buildPrompt()` from the sidebar but produces a more readable sentence:

```
Portrait of Maya, female. Long dark hair, green eyes, athletic build. Standing pose.
```

Include a guard so that if the user has manually edited the prompt text (typed something custom), the auto-population does not overwrite their work. Track this with a `promptManuallyEdited` ref that resets when character fields change.

### 3. Add sparkle (enhance) button to CharacterStudioPromptBar

Add a sparkle icon button next to the textarea in `CharacterStudioPromptBar.tsx`. When clicked, it:
- Calls `enhance-prompt` edge function with the current prompt text and `targetModelId`
- Replaces the prompt text with the enhanced version
- Shows a loading spinner during the call

This follows the exact same pattern as the workspace sparkle button. The user can review the enhanced prompt before clicking Generate.

Props to add to `CharacterStudioPromptBar`:
- `onEnhancePrompt?: (prompt: string, modelId: string) => Promise<string | null>` -- callback that returns enhanced text or null on failure

The parent (`CharacterStudioV3.tsx`) provides the implementation that calls `enhance-prompt`.

### 4. Wire up the enhance-prompt call in CharacterStudioV3

Add a handler:

```typescript
const handleEnhancePrompt = async (prompt: string, modelId: string): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke('enhance-prompt', {
    body: { prompt, targetModelId: modelId, jobType: 'image', contentRating: character.content_rating }
  });
  if (error || !data?.enhancedPrompt) return null;
  return data.enhancedPrompt;
};
```

Pass this to both desktop and mobile `CharacterStudioPromptBar` instances via the workspace props.

### 5. Keep the prompt bar generate as the single action

No changes to the generate flow itself -- `onGenerate` in the prompt bar continues to call `generatePortrait` as it does today. The only difference is the prompt text is now pre-populated from sidebar fields and optionally enhanced.

## What Does NOT Change

- The `character-portrait` edge function prompt building stays as-is for now (it still assembles its own prompt server-side from character data). This is a separate concern.
- Model selector stays in the sidebar.
- Reference image controls stay in both sidebar and prompt bar (they serve different ergonomic purposes).
- No new database tables or templates.
- No new edge functions.

## File Summary

| File | Change |
|------|--------|
| `StudioSidebar.tsx` | Remove "Generate Portrait" button and `handleGeneratePortrait`. Remove `onGenerate` prop. |
| `CharacterStudioV3.tsx` | Add auto-populate effect for `promptText`. Add `handleEnhancePrompt` handler. Pass it through workspace props. |
| `StudioWorkspace.tsx` | Accept and forward `onEnhancePrompt` prop to `CharacterStudioPromptBar`. |
| `CharacterStudioPromptBar.tsx` | Add sparkle button with loading state. Accept `onEnhancePrompt` prop. |

## UX Result

- One generate button (prompt bar in column 2)
- Prompt auto-fills from sidebar fields -- user always sees what will be sent
- Optional sparkle button for model-aware enhancement when desired
- Fast iteration by default (no forced LLM overhead)
- Consistent with workspace sparkle pattern

