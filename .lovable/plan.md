
# Character Studio: Reference Strength Control

## Problem
When a Style Lock image is active, the I2I strength is hardcoded to 0.7. This makes it impossible to make significant visual changes (aging, different hairstyle, body type) because the reference image dominates too heavily. Users have no way to control how much creative freedom the prompt gets vs. how closely the output matches the reference.

## Solution
Add a **Reference Strength slider** to the Character Studio that lets users control the balance between their reference image and their prompt.

---

## How It Works

- **Slider range:** 0.1 to 1.0 (displayed as percentage: 10%–100%)
- **Default:** 0.65 (slightly lower than current 0.7 for better prompt responsiveness)
- **Only visible when Style Lock is active** (no reference = T2I, slider irrelevant)

### Strength Guide (shown as helper text):
- Low (0.3–0.5): "Major changes — aging, restyling, different look"
- Medium (0.5–0.7): "Outfit and expression changes"  
- High (0.7–0.9): "Minor tweaks — lighting, pose, background"

---

## Technical Changes

### 1. Frontend: Character Studio Sidebar
**File:** `src/pages/CharacterStudioV3.tsx` (or the sidebar component)

- Add `referenceStrength` state (default 0.65)
- Render a Slider component below the Style Lock image preview, only when a reference image is active
- Show current value as percentage label
- Include a small hint label that changes based on the range

### 2. Frontend: Pass Strength to Generation
**File:** `src/hooks/useCharacterStudio.ts`

- Accept `referenceStrength` in the `generatePortrait` options
- Pass it through to the `character-portrait` edge function body

### 3. Edge Function: Use Strength Value
**File:** `supabase/functions/character-portrait/index.ts`

- Accept `referenceStrength` from the request body
- When building fal.ai model input for I2I, set `prompt_strength` (or the model's equivalent key) to `1 - referenceStrength`
  - Note: fal.ai Seedream uses `prompt_strength` where higher = more prompt influence, which is the inverse of "reference strength"
  - So a user-facing "Reference Strength" of 0.8 maps to a fal.ai `prompt_strength` of 0.2
- Fallback to current behavior (0.7 equivalent) if not provided

### 4. Prompt Bar Badge Update
**File:** `src/components/character-studio/CharacterStudioPromptBar.tsx`

- Update the "Style Locked" badge to show the current strength percentage, e.g., "Style Locked 65%"
- Gives quick visual feedback without opening the sidebar

---

## Files to Modify
1. `src/pages/CharacterStudioV3.tsx` — add state + slider UI in sidebar
2. `src/hooks/useCharacterStudio.ts` — pass strength to edge function
3. `supabase/functions/character-portrait/index.ts` — apply strength to fal.ai input
4. `src/components/character-studio/CharacterStudioPromptBar.tsx` — badge update

## No New Dependencies
Uses the existing `@radix-ui/react-slider` (already installed via shadcn Slider component).
