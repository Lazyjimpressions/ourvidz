

# Fix: Remove Hardcoded Identity Prompt from I2V Pipeline

## The Problem

In `src/hooks/useLibraryFirstWorkspace.ts` (lines 881-893), when a reference image is attached in "modify" mode, the client wraps the user's prompt with:

```
preserve the same person/identity and facial features from the reference image,
[user prompt], maintaining similar quality and detail level
```

This runs for **all** reference-image generations -- both image I2I and video I2V -- because the code doesn't check `mode`. For I2V (WAN 2.1), this causes a major problem: the model over-weights identity preservation and locks the camera tight on the face, fighting against any user-requested camera motion (zoom out, pan, dolly).

### Why This Is Wrong for I2V

WAN 2.1 I2V already receives the reference image via `image_url`. The model **inherently** uses that image as the visual anchor -- you don't need to tell it to "preserve the same person" because that's what the image input does. The prompt should describe **motion, camera, and scene changes** -- not identity preservation, which the image already handles.

Per the project's own WAN 2.1 reference docs, the recommended I2V prompt structure is:

> **motion + camera + subject continuity + environment + style**

"Subject continuity" in the prompt should be brief and natural (e.g., "the woman walks forward") -- not a blanket "preserve the same person/identity and facial features" directive that competes with the motion instructions.

For I2I images, this boilerplate is also questionable (Seedream edit models use their own `[PRESERVE]/[CHANGE]` syntax), but the immediate pain point is video.

## The Fix

### Change 1: Skip identity boilerplate for video mode

In `useLibraryFirstWorkspace.ts`, gate the "preserve the same person" prompt wrapping so it only applies to image mode. For video mode, pass the user's raw prompt through -- the `image_url` field already handles visual anchoring.

```text
Lines 877-893 currently:
  if (!exactCopyMode && effRefUrl) {
    // Always wraps with "preserve the same person..." boilerplate
  }

Proposed:
  if (!exactCopyMode && effRefUrl && mode !== 'video') {
    // Image I2I: keep existing identity-preservation wrapping
    // (separate cleanup opportunity later)
  }
  // Video I2V: user prompt passes through unmodified
  // The reference image via image_url handles visual anchoring
```

### Change 2: Set sensible I2V prompt default when no user prompt is given

When the user attaches a reference image in video mode but types no prompt, instead of the identity boilerplate, provide a minimal motion prompt:

```text
if (mode === 'video' && !prompt.trim() && effRefUrl) {
  finalPrompt = 'gentle motion, cinematic, high quality';
}
```

This gives WAN 2.1 something to work with without over-constraining the output.

## What This Does NOT Change

- Image I2I modify mode keeps its existing prompt wrapping (separate cleanup later)
- No edge function changes needed -- the prompt arrives clean
- No database changes
- No changes to the `input_schema` or model capabilities

## Files Changed

1. **`src/hooks/useLibraryFirstWorkspace.ts`** -- Gate the identity-preservation prompt wrapping to `mode === 'image'` only, add minimal default for video-without-prompt

## Technical Detail

The specific code block (lines 877-905) will be restructured to:

1. Check `mode !== 'video'` before applying the "preserve the same person" wrapping
2. For `mode === 'video'` with a user prompt: pass `prompt.trim()` directly as `finalPrompt`
3. For `mode === 'video'` without a user prompt: set a minimal motion default
4. All existing image-mode behavior stays identical

