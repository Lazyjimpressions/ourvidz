

# Fix Prompt Bar: Remove Auto-populate, Add Smart Sparkle

## Problem

1. Auto-populating the prompt bar on every keystroke is distracting and produces flat comma lists
2. Reference image exists in two independent places (sidebar + prompt bar) causing confusion
3. The prompt bar has too many concepts competing for attention

## Changes

### 1. Remove auto-populate effect from CharacterStudioV3.tsx

Delete the `useEffect` that watches character fields and assembles prompt text (lines 116-127). Delete the `promptAutoPopulatedRef`, `lastAutoPromptRef`, and the `handlePromptTextChange` wrapper. The prompt bar starts empty with a descriptive placeholder.

### 2. Make Sparkle button context-aware (two-stage)

In `CharacterStudioPromptBar.tsx`, update the sparkle button behavior:

- **If prompt is empty**: Assemble character traits into a natural-language prompt and populate the textarea (no LLM call). The assembly logic moves here from the deleted effect. This is the "populate" step.
- **If prompt has text**: Call `enhance-prompt` as it does today (LLM enhancement). This is the "enhance" step.

This gives users a clear two-click flow: Sparkle once to populate, Sparkle again to enhance. Or they can type their own prompt and Sparkle to enhance just that.

The sparkle icon tooltip changes based on state:
- Empty prompt: "Auto-fill from character traits"
- Has text: "Enhance prompt for selected model"

### 3. Sync reference image between sidebar and prompt bar

The prompt bar already receives `referenceImageUrl` from `character.reference_image_url` and writes back via `onReferenceImageChange`. This is correct. But remove the independent upload/library options from the prompt bar's image dropdown -- instead, only show:
- A thumbnail of the current reference (if set)
- "Remove Reference" to clear it
- "Change in sidebar" text link

This makes the sidebar the single source for setting references, and the prompt bar just reflects/clears it.

### 4. Improve reference image labeling in sidebar

In `StudioSidebar.tsx`, rename "Reference Image" label to "Style Lock" with a sublabel: "Portraits will match this face/style". Change "Image Match Mode" badge to "Style Locked".

---

## Technical Details

### File: `src/pages/CharacterStudioV3.tsx`

- Remove the auto-populate `useEffect` (lines 116-127)
- Remove `promptAutoPopulatedRef` and `lastAutoPromptRef` refs
- Remove `handlePromptTextChange` callback -- pass `setPromptText` directly
- Keep `handleEnhancePrompt` as-is

### File: `src/components/character-studio/CharacterStudioPromptBar.tsx`

- Add a new prop: `characterData?: { name: string; gender: string; traits: string; appearance_tags: string[] }` for assembly
- Update `handleEnhance`:
  - If `prompt` is empty and `characterData` exists: assemble natural-language prompt from character fields, set it in the textarea, return (no LLM call)
  - If `prompt` has text: call `onEnhancePrompt` as today
- Update sparkle button title/tooltip based on whether prompt is empty or not
- Simplify reference image dropdown: remove Upload/Library options, keep only thumbnail display and "Remove Reference"

### File: `src/components/character-studio-v3/StudioWorkspace.tsx`

- Pass `characterData` prop through to `CharacterStudioPromptBar` (assembled from existing `character` prop)

### File: `src/components/character-studio-v3/StudioSidebar.tsx`

- Change "Reference Image" label to "Style Lock"
- Change "Image Match Mode" badge text to "Style Locked"
- Add sublabel text "Portraits will match this face/style"

## UX Result

- Prompt bar starts empty with helpful placeholder
- Single sparkle button: populate on first click, enhance on second
- Reference image has one source of truth (sidebar), prompt bar just reflects it
- Clear labeling explains what the reference image actually does
