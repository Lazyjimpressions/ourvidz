

# Add Pose Description to Scoring Flow

## The Idea

Right now, the scoring flow calls `describe-image` once in `scoring` mode and gets back a full description plus scores. The `description` field contains everything -- faces, clothing, scene, pose -- which is perfect for scoring but **counterproductive** when that image is later used as a position reference (face/scene details bleed into the combined prompt).

Instead of adding a separate process for pose descriptions, we extend the **existing scoring call** to produce two descriptions in one pass:

1. **`description`** -- Full description (existing, unchanged, used for scoring)
2. **`pose_description`** -- Spatial/composition-only description (new, strips identity/scene, used for position references)

This means every scored image automatically has a pose-ready description. No extra API calls. No separate workflow. One flow, two outputs.

## What Changes

### 1. Update the Scoring Prompt Template

**Where**: The scoring system prompt (either in `prompt_templates` table for `use_case = 'scoring'`, or the fallback template in `describe-image/index.ts` lines 140-161)

Add `pose_description` to the required JSON output:

```json
{
  "action_match": 3,
  "appearance_match": 4,
  "overall_quality": 4,
  "description": "Full description with all elements...",
  "pose_description": "Spatial-only: two figures standing side by side, left figure slightly taller, both facing camera at 3/4 angle, arms at sides, medium shot from waist up",
  "elements_present": [...],
  "elements_missing": [...],
  "issues": [...],
  "strengths": [...]
}
```

Add instruction text to the scoring template:

```
"pose_description": "Describe ONLY the spatial layout, body positions, composition, camera angle, and figure count. 
Do NOT include any identity features (face, hair, skin tone, ethnicity), clothing details, or scene/background elements. 
Treat all people as anonymous mannequins. Focus on: how many figures, their relative positions, body poses, spacing, framing, and camera perspective."
```

### 2. Update the Fallback Template in describe-image

**File**: `supabase/functions/describe-image/index.ts` (lines 140-161)

Add `pose_description` field to the fallback JSON schema in `getScoringTemplate()`, with the same instruction as above. This ensures even without a database template, the field is requested.

### 3. Update VisionScoringResult Type in score-generation

**File**: `supabase/functions/score-generation/index.ts` (lines 32-41)

Add `pose_description?: string` to the `VisionScoringResult` interface. The field flows through automatically since `visionAnalysis` spreads the full result into the JSONB column (line 224: `...visionResult`).

No additional storage logic needed -- `pose_description` will be stored inside `vision_analysis` JSONB alongside `description`, `elements_present`, etc.

### 4. Update Frontend Type

**File**: `src/hooks/usePromptScores.ts` (lines 44-55)

Add `pose_description?: string` to the `VisionAnalysis` interface so the frontend can read it from scored records.

### 5. Wire pose_description into buildQuickScenePrompt

**File**: `src/types/slotRoles.ts`

Add optional `poseDescription` parameter to `buildQuickScenePrompt`. When provided, inject it into the Image 3 block:

```
- Image 3: Pose/composition layout ONLY (treat as mannequin silhouettes).
  [Spatial layout: {poseDescription}]
  Use body positions, spacing, and camera angle from Image 3.
  COMPLETELY IGNORE all faces, skin tone, hair, and identity features from Image 3.
```

### 6. Look Up pose_description When Building Quick Scene

**File**: `src/hooks/useLibraryFirstWorkspace.ts` (or wherever Quick Scene prompt is assembled)

When Slot 3 (pose) is filled from an image that has a `prompt_scores` record, query `prompt_scores.vision_analysis->>'pose_description'` for that image's job and pass it to `buildQuickScenePrompt`.

## Data Flow

```text
Image Generated
    |
    v
fal-webhook fires --> score-generation --> describe-image (scoring mode)
    |                                           |
    |                             Returns: { description, pose_description, scores... }
    |                                           |
    v                                           v
prompt_scores.vision_analysis = { description: "full...", pose_description: "spatial only...", ... }
    |
    |--- (later) user drags image into Slot 3 (Pose)
    |
    v
Look up prompt_scores.vision_analysis.pose_description for this image
    |
    v
buildQuickScenePrompt(..., poseDescription: "two figures side by side...")
    |
    v
Injected into Image 3 reference block --> reduces identity bleeding
```

## What Does NOT Change

- No new database columns (pose_description lives inside existing `vision_analysis` JSONB)
- No new edge functions
- No new API calls (the vision model produces both descriptions in a single call)
- No changes to the scoring UI
- No changes to user ratings or feedback flow
- Graceful fallback: if `pose_description` is missing (older records), the existing anti-bleeding language still applies

## Files Summary

| File | Change |
|------|--------|
| `supabase/functions/describe-image/index.ts` | Add `pose_description` field + instructions to fallback scoring template |
| `supabase/functions/score-generation/index.ts` | Add `pose_description?: string` to `VisionScoringResult` interface |
| `src/hooks/usePromptScores.ts` | Add `pose_description?: string` to `VisionAnalysis` interface |
| `src/types/slotRoles.ts` | Add `poseDescription` param to `buildQuickScenePrompt`, inject into Image 3 block |
| `src/hooks/useLibraryFirstWorkspace.ts` | Look up `pose_description` from `prompt_scores` when Slot 3 is filled, pass to prompt builder |
| Database: `prompt_templates` | Update active scoring template to include `pose_description` field (if using DB-driven template) |

