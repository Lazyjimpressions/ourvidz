
# Fix: Identity Bleeding from Pose Reference (Image 3) in Multi-Reference Generation

## Problem

When generating 2-character scenes using the Quick Scene Builder (3-5 reference images), facial features from Image 3 (the pose/composition reference) leak into the output. The model conflates identity from the pose image with the two character identity references, producing faces that are a blend of all three inputs -- or sometimes generating 3+ characters.

The current `buildQuickScenePrompt` in `src/types/slotRoles.ts` says:

```
- Image 3: Pose/composition reference for BOTH characters only. Do not copy identity from Image 3.
```

This is too weak. Multi-reference diffusion models (Seedream v4/v4.5, Flux-2) treat all input images as potential identity sources unless explicitly instructed otherwise with strong, redundant language.

## Root Cause

The prompt scaffold lacks:
1. An explicit **AVOID** section (proven effective in Flux-2 and Seedream prompting guides)
2. Redundant anti-bleeding anchors for Image 3
3. "Mannequin/silhouette" framing that tells the model to treat Image 3 as a layout template, not a person
4. A cap on character count -- "exactly TWO characters in the output"

## Solution

Update `buildQuickScenePrompt()` in `src/types/slotRoles.ts` with the following improvements:

### 1. Strengthen Image 3 reference description

Replace the current single-line Image 3 reference with explicit mannequin/silhouette language:

```
Before:
- Image 3: Pose/composition reference for BOTH characters only. Do not copy identity from Image 3.

After:
- Image 3: Pose/composition layout ONLY (treat as mannequin silhouettes).
  Use body positions, spacing, and camera angle from Image 3.
  COMPLETELY IGNORE all faces, skin tone, hair, and identity features from Image 3.
```

### 2. Add explicit AVOID section

Insert a new "AVOID (critical)" block after the priority constraints:

```
AVOID (critical):
- Do NOT produce more than exactly 2 characters in the output.
- Do NOT use any facial features, hair, or skin from Image 3.
- Do NOT blend or merge faces from different reference images.
- Do NOT add extra people, reflections, or background figures.
- If Image 3 contains faces, treat them as blank mannequin placeholders.
```

### 3. Strengthen identity anchoring

Upgrade the existing priority constraints with redundant, model-tested phrasing:

```
HIGHEST PRIORITY CONSTRAINTS:
- EXACTLY 2 characters in the final image. No more, no fewer.
- Character A face: EXACT match from Image 1 (eyes, nose, mouth, bone structure, skin tone, hair).
- Character B face: EXACT match from Image 2 (eyes, nose, mouth, bone structure, skin tone, hair).
- Image 3 faces are DUMMY PLACEHOLDERS for positioning only -- reject all identity from Image 3.
- Do NOT merge identities. Do NOT blend faces. Keep both characters visually distinct.
```

### 4. Add character count to quality section

Add an output validation line:

```
QUALITY / CLEANUP:
- Output must contain EXACTLY 2 distinct people matching Images 1 and 2.
  (existing anatomy/hands/skin rules remain)
```

## File Changes

| File | Change |
|------|--------|
| `src/types/slotRoles.ts` | Rewrite `buildQuickScenePrompt()` with stronger anti-bleeding language in 4 areas: Image 3 description, new AVOID section, stronger identity anchors, character count enforcement |

## Why This Works

- **Redundancy**: Multi-ref models respond better to repeated constraints in different phrasings (tested pattern from Flux-2 and Seedream guides)
- **Mannequin framing**: Explicitly telling the model "treat as silhouettes" prevents it from extracting identity features from the pose image
- **Character count cap**: "Exactly 2" prevents the model from rendering the pose reference as a third person
- **AVOID section**: Both Seedream and Flux-2 prompting guides confirm that explicit AVOID/negative language in the prompt significantly reduces unwanted artifacts

## Scope

- Single file, single function
- No edge function changes needed (the prompt is built client-side and sent as the `prompt` field)
- No database changes
- Works identically for Seedream v4 Edit (default), Seedream v4.5 Edit, and Flux-2 Flash Edit
