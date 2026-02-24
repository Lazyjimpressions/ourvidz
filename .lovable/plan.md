

# Two-Character Quick Scene Builder

## Overview

Replace the current 10-slot role-assignment system with a fixed 5-slot "Quick Scene" mode for two-character compositions. Each slot has a predetermined meaning, eliminating role popovers, packing logic, and template-per-scenario complexity. Solo character work stays in Character Studio.

## Slot Layout (Fixed Order)

```text
[1: Char A] [2: Char B] [3: Pose] [4: Scene?] [5: Outfit?]
 required    required    required   optional    optional
```

- Slots 1-3 must be filled to enable Generate
- Slots 4-5 are optional; the system prompt adapts based on which are populated
- `image_urls` is always built in this exact order (skipping empty optional slots)

## Architecture

### What Changes

| Area | Current | New |
|------|---------|-----|
| Slot roles | 10 generic slots with role popover per slot | 5 fixed labeled slots, no role UI |
| Prompt building | `buildFigurePrefix` from dynamic roles | Deterministic system prompt template injected at generation time |
| Enhancement (sparkle) | LLM tries to add Figure notation (blind) | LLM only enhances creative intent; system prompt wraps it with fixed Image 1-5 instructions |
| `slotRoles.ts` | Role types, colors, `buildFigurePrefix` | Mostly retired for image mode; kept for backward compat |
| `MobileQuickBar` | `FIXED_IMAGE_SLOTS` (10 slots with role badges) | `QUICK_SCENE_SLOTS` (5 fixed labeled slots, no role popover) |

### What Stays the Same

- Video mode slots (temporal keyframes) -- untouched
- `enhance-prompt` edge function core (template lookup, OpenRouter call)
- `fal-image` edge function (dumb passthrough)
- Character Studio solo workflow

## Detailed Changes

### 1. `src/types/slotRoles.ts` -- Add Quick Scene constants

Add a new `QUICK_SCENE_SLOTS` array defining the 5 fixed slots with labels. Keep existing `SlotRole` and `buildFigurePrefix` for backward compatibility but they won't be used in Quick Scene mode.

```typescript
export const QUICK_SCENE_SLOTS = [
  { index: 0, label: '1: Char A', required: true },
  { index: 1, label: '2: Char B', required: true },
  { index: 2, label: '3: Pose',   required: true },
  { index: 3, label: '4: Scene',  required: false },
  { index: 4, label: '5: Outfit', required: false },
] as const;
```

Add a `buildQuickScenePrompt` function that constructs the deterministic system prompt based on which optional slots are filled:

```typescript
export function buildQuickScenePrompt(
  userPrompt: string,
  hasScene: boolean,
  hasOutfit: boolean,
): string {
  // Returns the full structured prompt with REFERENCE ORDER,
  // PRESERVE, CHANGE, and USER REQUEST sections
  // Conditionally includes Image 4/5 instructions
}
```

The prompt template follows the structure from the proposal:
- REFERENCE ORDER block (Image 1-5, conditional on 4/5 being filled)
- HIGHEST PRIORITY CONSTRAINTS (identity preservation, no blending)
- SCENE / OUTFIT RULES (conditional)
- QUALITY / CLEANUP guardrails
- USER REQUEST (the user's prompt or enhanced prompt)

### 2. `src/components/workspace/MobileQuickBar.tsx` -- Replace image-mode slots

Replace `FIXED_IMAGE_SLOTS` (10 role-assignable slots) with `QUICK_SCENE_SLOTS` (5 fixed labeled slots). Remove the role popover from `RefSlot` when in Quick Scene mode. Each slot shows its fixed label ("1: Char A", "2: Char B", etc.) with no role-change UI.

The `RefSlot` component keeps its drag/drop and thumbnail functionality but the `role` and `onRoleChange` props become unused in image mode.

### 3. `src/pages/MobileSimplifiedWorkspace.tsx` -- Simplify state

- Remove `slotRoles` state and `onSlotRoleChange` handler (no longer needed for image mode)
- Keep `referenceImage2Url` and `additionalRefUrls` but cap at 5 total slots
- Update `handleGenerate` to skip `buildFigurePrefix` and instead call `buildQuickScenePrompt`
- Validation: disable Generate button unless slots 1-3 are all filled

### 4. `src/hooks/useLibraryFirstWorkspace.ts` -- Use deterministic prompt

In the multi-ref code path (lines 1338-1355):
- When Quick Scene mode is active, replace the `buildFigurePrefix` injection with `buildQuickScenePrompt`
- The deterministic prompt becomes the **full prompt** sent to Seedream (not prepended -- it wraps the user's text)
- `image_urls` is built in fixed order: `[slot0, slot1, slot2, ...slot3 if filled, ...slot4 if filled]`

### 5. `src/components/workspace/MobileSimplePromptInput.tsx` -- Update enhance flow

The sparkle button behavior changes:
- Still calls `enhance-prompt` edge function with the user's creative text
- Does NOT send `slot_roles` or `has_reference_images` metadata
- The enhanced text is placed back in the prompt bar as-is
- At generation time, `buildQuickScenePrompt` wraps the (possibly enhanced) user text with the fixed Image 1-5 instructions

This means the enhancement LLM only needs to expand creative intent ("neon rooftop" becomes "neon-lit rooftop bar at night with city skyline, warm ambient glow, cinematic depth of field"). It never touches Figure/Image notation.

### 6. Helper text below prompt bar (optional UX)

When slots 4 or 5 are filled, show subtle helper text:
- If slot 4 filled: "Image 4 = scene/environment"
- If slot 5 filled: "Image 5 = outfit. Mention who wears it: A, B, or both"

### 7. Optional "Outfit applies to" toggle

If slot 5 is filled, show a small chip group: `A | B | Both`. This value is interpolated into the system prompt's OUTFIT RULES section. If not set, defaults to "both" with a subtle hint.

## System Prompt Template (shipped as code, not DB)

```text
You are performing a multi-reference edit. Follow the reference map exactly.

REFERENCE ORDER (do not reinterpret):
- Image 1: Character A identity reference. Preserve face, hair, body proportions, and likeness exactly.
- Image 2: Character B identity reference. Preserve face, hair, body proportions, and likeness exactly.
- Image 3: Pose/composition reference for BOTH characters only. Do not copy identity from Image 3.
{IF slot 4 filled}
- Image 4: Scene/environment reference. Use for location/background only.
{IF slot 5 filled}
- Image 5: Outfit reference. Use for clothing only as described in the user request.

HIGHEST PRIORITY CONSTRAINTS:
- Keep Character A exactly as Image 1 and Character B exactly as Image 2.
- Do NOT merge identities. Do NOT blend faces. Keep both characters distinct.
- Pose is taken from Image 3 only. Identities are taken from Images 1 and 2 only.

SCENE / OUTFIT RULES:
{IF slot 4} - Place characters into the environment from Image 4. Match lighting and shadows naturally.
{IF slot 5} - Apply outfit from Image 5 to {outfitTarget}. Do not alter identities.

QUALITY / CLEANUP:
- Correct anatomy and remove artifacts: natural proportions, clean edges, coherent lighting/shadows.
- Hands: five fingers per hand, no extra digits, no fused fingers, natural knuckles/nails.
- Skin: reduce blotches while keeping natural texture.

USER REQUEST:
{userPrompt || "(No additional instructions. Produce a faithful edit using the references.)"}
```

## Validation Rules

- Slots 1, 2, 3 must all be filled to enable Generate
- If all three are empty, show disabled state with "Add Character A, Character B, and Pose images"
- No other validation needed (slots 4-5 are truly optional)

## Files Summary

| File | Change |
|------|--------|
| `src/types/slotRoles.ts` | Add `QUICK_SCENE_SLOTS` constant and `buildQuickScenePrompt()` function |
| `src/components/workspace/MobileQuickBar.tsx` | Replace 10-slot `FIXED_IMAGE_SLOTS` with 5-slot Quick Scene layout; remove role popover for image mode; add optional outfit-target chip |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Remove `slotRoles` state; cap refs at 5; add validation for required slots 1-3; add outfit-target state |
| `src/hooks/useLibraryFirstWorkspace.ts` | Replace `buildFigurePrefix` injection with `buildQuickScenePrompt` wrapper for multi-ref image generation |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Remove `slot_roles` from enhance body; keep sparkle as creative-only enhancement |

## What This Does NOT Change

- Video mode (temporal keyframes, multi-condition models)
- Character Studio (solo character generation)
- `enhance-prompt` edge function (no changes needed -- it just enhances creative text)
- `fal-image` edge function (still receives `image_urls[]` in order)
- DB `prompt_templates` table (not used for Quick Scene -- prompt is built in code)

## Future Evolution Path

- Slot 6: Style reference
- Slot 7: Detail/hands reference
- Separate "Outfit A" and "Outfit B" slots if needed
- Each addition just extends the `QUICK_SCENE_SLOTS` array and adds a conditional block to `buildQuickScenePrompt`

