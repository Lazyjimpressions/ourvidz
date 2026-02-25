

# Show Pose Description in Generation Details

## Context

The `pose_description` is already being generated and stored in `prompt_scores.vision_analysis` (confirmed working with clean spatial-only output). The Generation Details slider already displays the full `description` (line 820-823 in PromptDetailsSlider.tsx). We just need to add the pose description below it.

## Also Fix: "default" Label for Vision Model

Currently `score-generation` logs `vision_model_used: "default"` because it doesn't know the resolved model name. We can improve this by having `describe-image` return the resolved model name in its response, so `score-generation` can store it accurately.

## Changes

### 1. Add pose_description display to PromptDetailsSlider

**File**: `src/components/lightbox/PromptDetailsSlider.tsx` (after line 823)

Add a second block below the existing description display:

```tsx
{score?.vision_analysis?.pose_description && (
  <div className="text-xs bg-muted/50 p-2 rounded border">
    <p className="text-[10px] font-medium text-muted-foreground mb-1">Pose/Spatial Layout</p>
    <p className="break-words leading-relaxed">{score.vision_analysis.pose_description}</p>
  </div>
)}
```

This shows the spatial-only description with a "Pose/Spatial Layout" label, only when the field exists (graceful for older scores).

### 2. Label the full description for clarity

Update the existing description block (line 820-823) to add a "Vision Description" label, so the two are visually distinct:

```tsx
{score?.vision_analysis?.description && (
  <div className="text-xs bg-muted/50 p-2 rounded border">
    <p className="text-[10px] font-medium text-muted-foreground mb-1">Vision Description</p>
    <p className="break-words leading-relaxed">{score.vision_analysis.description}</p>
  </div>
)}
```

### 3. Store resolved vision model name (optional improvement)

**File**: `supabase/functions/describe-image/index.ts`

Include the resolved `model_key` and `display_name` in the response data so `score-generation` can log it accurately instead of `"default"`.

**File**: `supabase/functions/score-generation/index.ts`

Read the returned model name and store it in `vision_analysis.vision_model_used` instead of the current `config.visionModelId || "default"`.

## Files Summary

| File | Change |
|------|--------|
| `src/components/lightbox/PromptDetailsSlider.tsx` | Add pose_description display block; add label to existing description block |
| `supabase/functions/describe-image/index.ts` | Include resolved model name in response (minor) |
| `supabase/functions/score-generation/index.ts` | Read and store actual model name from describe-image response |

