

# Fix Scoring Metadata: Capture All Prompt Facts from Jobs

## Problem

The `prompt_scores` table has columns for `enhanced_prompt`, `system_prompt_used`, and `api_model_id`, but they're mostly NULL because callers don't pass the data and `score-generation` doesn't look it up. Meanwhile, the `jobs` table already has everything we need.

## Approach

Instead of relying on callers to pass metadata, have `score-generation` read the full job record and pull what it needs directly. This also simplifies callers (they just pass `jobId` and `imageUrl`).

### Prompt Type Classification

- **Enhanced**: `jobs.enhanced_prompt` differs from `jobs.original_prompt` AND `jobs.template_name` is not null
- **Manual**: everything else (including workspace flows that don't use enhance-prompt)

This works regardless of which workflow created the prompt.

## Changes

### 1. `supabase/functions/score-generation/index.ts`

- After receiving `jobId`, SELECT the job record: `original_prompt`, `enhanced_prompt`, `template_name`, `api_model_id`, `user_id`, `metadata`
- Extract from job metadata: `enhancement_metadata.template_name`, `enhancement_metadata.enhancement_model`, `enhancement_metadata.content_mode`
- Derive `prompt_type`: `"enhanced"` or `"manual"` based on the classification above
- Populate `prompt_scores` INSERT with all fields:
  - `original_prompt` from job
  - `enhanced_prompt` from job
  - `system_prompt_used`: the template name (what drove the enhancement)
  - `api_model_id` from job
  - Add enhancement metadata to the `vision_analysis` JSONB: `prompt_type`, `template_name`, `enhancement_model`
- Remove `originalPrompt`, `enhancedPrompt`, `systemPromptUsed`, `apiModelId`, `userId` from the request body interface -- only `jobId`, `imageUrl`, and `force` are needed
- **Fix re-score bug**: Replace DELETE + INSERT with UPDATE when force re-scoring, preserving user rating columns

### 2. `src/hooks/usePromptScores.ts` (triggerScoring)

- Simplify the `score-generation` invocation to only pass `jobId`, `imageUrl`, and `force: true`
- Remove the manual passing of `originalPrompt`, `enhancedPrompt`, `apiModelId`, `userId` since the edge function now reads these from the job

### 3. `src/lib/services/PromptScoringService.ts` (triggerVisionScoring)

- Simplify the method signature to match: `jobId`, `imageUrl`, `force`
- Remove `enhancedPrompt`, `apiModelId`, `userId` options

## What Gets Logged in prompt_scores After This

| Field | Source | Example |
|-------|--------|---------|
| `original_prompt` | `jobs.original_prompt` | "a man in a suit" |
| `enhanced_prompt` | `jobs.enhanced_prompt` | "photorealistic portrait, middle-aged man..." |
| `system_prompt_used` | `jobs.template_name` | "SDXL Prompt Enhance - Qwen Base (SFW)" |
| `api_model_id` | `jobs.api_model_id` | UUID of the image model |
| `vision_analysis.prompt_type` | derived | "enhanced" or "manual" |
| `vision_analysis.enhancement_model` | `jobs.metadata.enhancement_metadata.enhancement_model` | "qwen_instruct" |
| `vision_analysis.template_name` | `jobs.metadata.enhancement_metadata.template_name` | "SDXL Prompt Enhance..." |

## Re-score Bug Fix (included)

When `force=true`, instead of DELETE + INSERT:
1. SELECT the existing row (to get its ID)
2. Run vision analysis
3. UPDATE only the vision columns on the existing row
4. Preserve: `user_action_rating`, `user_appearance_rating`, `user_quality_rating`, `feedback_tags`, `admin_comment`, `preserve_image`

## Technical Details

### score-generation/index.ts -- New job lookup

```typescript
// Fetch job record for metadata
const { data: job, error: jobError } = await supabase
  .from("jobs")
  .select("original_prompt, enhanced_prompt, template_name, api_model_id, user_id, metadata")
  .eq("id", jobId)
  .single();

if (jobError || !job) {
  return errorResponse("Job not found");
}

const enhancementMeta = (job.metadata as any)?.enhancement_metadata;
const isEnhanced = job.enhanced_prompt && job.enhanced_prompt !== job.original_prompt && !!job.template_name;
const promptType = isEnhanced ? "enhanced" : "manual";
```

### score-generation/index.ts -- Force re-score with UPDATE

```typescript
if (existingScore && force) {
  // UPDATE instead of DELETE + INSERT
  await supabase.from("prompt_scores").update({
    vision_analysis: { ...visionResult, prompt_type: promptType, ... },
    action_match: visionResult.action_match,
    appearance_match: visionResult.appearance_match,
    overall_quality: visionResult.overall_quality,
    composite_score: compositeScore,
    updated_at: new Date().toISOString(),
  }).eq("id", existingScore.id);
  // User ratings, feedback, preserve status all preserved
}
```

### usePromptScores.ts -- Simplified call

```typescript
const { error: invokeError } = await supabase.functions.invoke('score-generation', {
  body: {
    jobId: job.id,
    imageUrl: signedData.signedUrl,
    force: true,
  },
});
```

