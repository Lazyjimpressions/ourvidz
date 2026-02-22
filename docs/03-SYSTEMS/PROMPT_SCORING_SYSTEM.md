# Prompt Scoring System

**Last Updated:** February 22, 2026
**Status:** Implementation Phase 1
**Purpose:** Model-specific prompt optimization through automated vision analysis and user feedback

## Overview

The Prompt Scoring System evaluates AI-generated images/videos against their original prompts to discover which prompting techniques work best for each model. Different models (Seedream, Flux, WAN) may require different prompt structures to achieve the same user intent - this system surfaces those patterns automatically.

## Goals

1. **Automated Vision Analysis**: Every generation analyzed by vision model
2. **Multi-Dimensional Scoring**: Action Match, Appearance Match, Overall Quality (1-5 scale)
3. **Model-Specific Insights**: Per-model dashboards and prompt pattern mining
4. **Admin-First Rollout**: Start with admin-only access, iterate, then expand
5. **Recursive Improvement**: Use scores to discover effective prompt patterns per model

## Architecture

```text
Generation Complete
       │
       ▼
[fal-webhook / job-callback]
       │
       ▼ (fire-and-forget)
[score-generation edge function]
       │
       ├──► [describe-image outputMode:'scoring']
       │           │
       │           ▼
       │    Vision Analysis JSON
       │    - action_match: 1-5
       │    - appearance_match: 1-5
       │    - overall_quality: 1-5
       │    - elements_present: []
       │    - elements_missing: []
       │    - issues: []
       │
       ▼
[prompt_scores table INSERT]
       │
       ├──────────────────────┐
       ▼                      ▼
[Admin Views Asset]    [Nightly Aggregation]
       │                      │
       ▼                      ▼
[Manual Rating UI]     [Model Performance Stats]
       │                      │
       ▼                      ▼
[Score Updated]        [Pattern Mining]
```

## Configuration

All configuration is maintained in the admin portal - **no hardcoded models or prompts**.

| Config | Storage | Admin UI |
|--------|---------|----------|
| Vision model | `system_config.promptScoring.visionModelId` or `api_models.default_for_tasks` containing 'vision' | Model dropdown |
| Scoring system prompt | `prompt_templates` with `use_case = 'scoring'` | Prompt Management |
| Scoring weights | `system_config.promptScoring.scoringWeights` | Weight sliders |
| Feature toggles | `system_config.promptScoring.*` | Switches |

### System Config Schema

```json
{
  "promptScoring": {
    "enabled": true,
    "autoAnalysisEnabled": true,
    "showQuickRating": true,
    "visionModelId": null,
    "scoringWeights": {
      "actionMatch": 0.40,
      "appearanceMatch": 0.35,
      "overallQuality": 0.25
    }
  }
}
```

## Scoring Dimensions

| Dimension | Scale | Description | Weight |
|-----------|-------|-------------|--------|
| Action Match | 1-5 | Are characters doing the intended action/pose? | 40% |
| Appearance Match | 1-5 | Do characters look as described? | 35% |
| Overall Quality | 1-5 | Technical and aesthetic quality | 25% |

**Scoring Guide:**
- 5: Excellent match, minor or no issues
- 4: Good match, small discrepancies
- 3: Partial match, noticeable issues
- 2: Poor match, significant issues
- 1: Failed to match intent

## User Interface

### Quick Rating on Asset Tiles

When `showQuickRating` is enabled, asset tiles show a 5-star rating on hover:
- Stars appear as subtle overlay on hover
- Click to rate (1-5 stars)
- **Same score applied to all 3 dimensions**
- Rating persists with the image
- In modal, user can refine individual dimension scores

### Admin Score Panel (in AssetPreviewModal)

- Vision scores displayed as small badges
- Admin rating: 3 simple number inputs
- Tag selector: horizontal chip row
- Comment: single-line expanding textarea
- Save button (only visible when changes made)

### Feedback Tags

```typescript
const FEEDBACK_TAGS = {
  positive: ['perfect_action', 'great_appearance', 'high_quality', 'matches_intent', 'good_composition'],
  negative: ['wrong_pose', 'wrong_action', 'missing_element', 'wrong_appearance', 'wrong_body_part', 'artifact', 'wrong_style', 'low_quality', 'wrong_setting']
};
```

## Data Persistence

**Scores survive image deletion.** The `prompt_scores` table uses `ON DELETE SET NULL` for workspace references. Scoring data remains valuable for:

1. **Pattern mining**: Prompt text + scores = training data
2. **Model comparison**: Which models handle which prompt patterns
3. **Historical trends**: Performance over time

### Image Preservation

High-value images can be flagged for preservation:
- `preserve_image`: Admin marks images worth keeping
- `preserve_reason`: Why this image is valuable
- `preserved_url`: Permanent URL if copied before expiry

## Database Schema

### prompt_scores Table

Run this SQL in the Supabase SQL Editor:

```sql
-- Create prompt_scores table for storing generation quality evaluations
CREATE TABLE prompt_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  api_model_id UUID REFERENCES api_models(id),
  workspace_asset_id UUID REFERENCES workspace_assets(id) ON DELETE SET NULL,

  -- Prompts (denormalized for analysis efficiency)
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  system_prompt_used TEXT,

  -- Vision Model Analysis (automated)
  vision_analysis JSONB DEFAULT '{}',

  -- Multi-Dimensional Scores (1-5 scale)
  action_match NUMERIC(2,1),
  appearance_match NUMERIC(2,1),
  overall_quality NUMERIC(2,1),
  composite_score NUMERIC(2,1),

  -- User Rating (from tile or modal)
  user_action_rating INTEGER CHECK (user_action_rating BETWEEN 1 AND 5),
  user_appearance_rating INTEGER CHECK (user_appearance_rating BETWEEN 1 AND 5),
  user_quality_rating INTEGER CHECK (user_quality_rating BETWEEN 1 AND 5),
  user_rated_at TIMESTAMPTZ,

  -- Admin Rating (optional manual override)
  admin_action_rating INTEGER CHECK (admin_action_rating BETWEEN 1 AND 5),
  admin_appearance_rating INTEGER CHECK (admin_appearance_rating BETWEEN 1 AND 5),
  admin_quality_rating INTEGER CHECK (admin_quality_rating BETWEEN 1 AND 5),
  admin_rated_at TIMESTAMPTZ,
  admin_rated_by UUID REFERENCES profiles(id),

  -- Feedback Tags + Comments
  feedback_tags TEXT[] DEFAULT '{}',
  admin_comment TEXT,

  -- Image Preservation
  preserve_image BOOLEAN DEFAULT false,
  preserve_reason TEXT,
  preserved_url TEXT,
  image_deleted BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scoring_version VARCHAR(10) DEFAULT 'v1',

  CONSTRAINT unique_job_score UNIQUE(job_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_prompt_scores_model ON prompt_scores(api_model_id, composite_score DESC);
CREATE INDEX idx_prompt_scores_created ON prompt_scores(created_at DESC);
CREATE INDEX idx_prompt_scores_user ON prompt_scores(user_id, created_at DESC);
CREATE INDEX idx_prompt_scores_tags ON prompt_scores USING GIN(feedback_tags);
CREATE INDEX idx_prompt_scores_vision ON prompt_scores USING GIN(vision_analysis);

-- Enable RLS
ALTER TABLE prompt_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own scores
CREATE POLICY "Users can view own scores" ON prompt_scores
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can rate their own generations
CREATE POLICY "Users can update own scores" ON prompt_scores
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access" ON prompt_scores
FOR ALL TO service_role
USING (true);

-- Updated_at trigger
CREATE TRIGGER update_prompt_scores_updated_at
  BEFORE UPDATE ON prompt_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Add Scoring Template to prompt_templates

```sql
-- Insert scoring system prompt template
INSERT INTO prompt_templates (
  template_name,
  use_case,
  content_mode,
  job_type,
  system_prompt,
  is_active,
  version
) VALUES (
  'Image Scoring - Vision Analysis',
  'scoring',
  'nsfw',
  'image',
  'You are an expert image quality analyst for AI-generated content.

Analyze this AI-generated image against the original prompt and return ONLY valid JSON:
{
  "action_match": <1-5: Are characters doing the requested action/pose?>,
  "appearance_match": <1-5: Do characters look as described?>,
  "overall_quality": <1-5: Technical and aesthetic quality>,
  "description": "Brief description of what is in the image",
  "elements_present": ["element1", "element2"],
  "elements_missing": ["element1", "element2"],
  "issues": ["issue1", "issue2"],
  "strengths": ["strength1", "strength2"]
}

Scoring guide (1-5 scale):
- 5: Excellent match, minor or no issues
- 4: Good match, small discrepancies
- 3: Partial match, noticeable issues
- 2: Poor match, significant issues
- 1: Failed to match intent

Original prompt: {{original_prompt}}',
  true,
  1
);
```

### Update system_config

```sql
-- Add promptScoring config to system_config
UPDATE system_config
SET config = jsonb_set(
  config,
  '{promptScoring}',
  '{
    "enabled": false,
    "autoAnalysisEnabled": false,
    "showQuickRating": false,
    "visionModelId": null,
    "scoringWeights": {
      "actionMatch": 0.40,
      "appearanceMatch": 0.35,
      "overallQuality": 0.25
    }
  }'::jsonb
)
WHERE id = (SELECT id FROM system_config LIMIT 1);
```

## Edge Functions

### describe-image (Extended)

New `outputMode: 'scoring'` that uses the scoring template from `prompt_templates`:

```typescript
// In describe-image/index.ts
if (outputMode === 'scoring') {
  // Fetch scoring template from prompt_templates
  const { data: template } = await supabase
    .from('prompt_templates')
    .select('system_prompt')
    .eq('use_case', 'scoring')
    .eq('is_active', true)
    .single();

  // Replace {{original_prompt}} placeholder
  systemPrompt = template.system_prompt.replace('{{original_prompt}}', originalPrompt);
}
```

### score-generation (New)

Orchestrates the scoring process:

1. Check if scoring enabled in system_config
2. Call describe-image with outputMode: 'scoring'
3. Parse vision analysis JSON
4. Compute composite_score from weights
5. Insert into prompt_scores table

### fal-webhook (Modified)

Fire-and-forget trigger after job completion:

```typescript
// After job marked complete
const scoringConfig = await getPromptScoringConfig(supabase);
if (scoringConfig?.enabled && scoringConfig?.autoAnalysisEnabled) {
  EdgeRuntime.waitUntil(
    supabase.functions.invoke('score-generation', {
      body: {
        jobId: job.id,
        imageUrl: resultUrl,
        originalPrompt: job.original_prompt,
        enhancedPrompt: job.enhanced_prompt,
        apiModelId: job.api_model_id,
        userId: job.user_id
      }
    })
  );
}
```

## Admin Dashboard

### Per-Model Performance Table

| Model | Action | Appear | Quality | Score | n |
|-------|--------|--------|---------|-------|---|
| Seedream v4.5 | 3.6 | 4.1 | 3.9 | 3.8 | 1234 |
| Flux | 3.4 | 3.8 | 4.1 | 3.7 | 892 |

- Sortable columns
- Click row to drill into model-specific patterns
- Color-code cells: green >= 4, yellow 2.5-4, red < 2.5

### Pattern Mining View

- List of high-scoring prompts for selected model
- Common issues (tag frequency)
- No fancy visualizations - just sorted lists

## Implementation Phases

### Phase 1: Foundation (P0)
- [x] Design documentation
- [ ] Create `prompt_scores` table
- [ ] Add `promptScoring` config to `system_config`
- [ ] Extend `describe-image` with `outputMode: 'scoring'`
- [ ] Create `score-generation` edge function
- [ ] Add trigger in `fal-webhook`

### Phase 2: Admin UI (P1)
- [ ] Create `usePromptScores` hook
- [ ] Create `PromptScorePanel` component
- [ ] Integrate into `AssetPreviewModal`
- [ ] Add toggle in `SystemConfigTab`

### Phase 3: Analytics (P2)
- [ ] Create `PromptScoringAnalytics` admin tab
- [ ] Per-model performance tables
- [ ] Score distribution views

### Phase 4: Pattern Mining (P3)
- [ ] Aggregation queries for model-specific patterns
- [ ] High-scoring prompt extraction
- [ ] Common issue identification

## Related Documentation

- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt template system
- [I2I_SYSTEM.md](./I2I_SYSTEM.md) - Image-to-image generation
- [FAL_AI.md](../09-REFERENCE/FAL_AI.md) - fal.ai integration
