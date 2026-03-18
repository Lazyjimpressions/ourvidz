

## Problem

When the user loads a reference image + motion video (character swap mode), the prompt textarea stays empty with a generic placeholder. The canonical hints ("Same appearance as the input image, matching choreography of reference video") never appear because:

1. The `useEffect` in `MobileSimplifiedWorkspace.tsx` (line 466) guards with `if (!prompt || !prompt.trim()) return` — so it never seeds an empty prompt
2. The submit-time augmentation in `MobileSimplePromptInput.tsx` only appends hints if the user already typed scene content
3. The textarea placeholder is generic ("Describe what you want to create...") and doesn't change for character swap mode

## Proposed UX

When both a start keyframe image AND a motion reference video are loaded:

1. **Auto-seed the prompt** with the canonical hints so the user sees them immediately in the textarea — not as placeholder text, but as actual editable prompt content
2. **Change the placeholder** to guide the user: `"Describe the scene (e.g. 'woman dancing in a studio')..."` when in character swap mode
3. The user types their scene description *before* the pre-filled hints, or anywhere in the text — the hints stay unless manually deleted
4. At submit time, the existing augmentation logic still runs as a safety net

## Changes

### 1. `src/pages/MobileSimplifiedWorkspace.tsx`
- Remove the `if (!prompt || !prompt.trim()) return` guard from the character-swap `useEffect`
- When prompt is empty and char-swap conditions are met, seed the prompt with both canonical phrases
- When prompt already has content, augment idempotently (existing behavior)

### 2. `src/components/workspace/MobileSimplePromptInput.tsx`
- Update the placeholder logic: when `motionRefVideoUrl` is set AND a start/beginning reference image exists, show a contextual placeholder like `"Describe the scene — e.g. 'woman dancing in a studio'"`
- This placeholder only shows if the user clears the auto-seeded hints

### 3. No changes to submit validation
- The existing `hasSceneIntent` check at submit time stays — it correctly blocks hint-only submissions and forces the user to add a scene description

## Expected Flow
1. User loads reference image → nothing changes yet
2. User loads motion video → prompt auto-fills with: `"Same appearance as the input image, matching choreography of reference video"`
3. User types scene description before or after hints → e.g. `"woman dancing in a neon studio. Same appearance as the input image, matching choreography of reference video"`
4. User hits Generate → validation passes (has scene intent), payload sent with full prompt

