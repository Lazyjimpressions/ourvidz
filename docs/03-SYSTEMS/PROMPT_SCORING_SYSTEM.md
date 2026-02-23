# Prompt Scoring System

**Last Updated:** February 23, 2026
**Status:** Implementation Phase 1 (In Progress)
**Purpose:** Model-specific prompt optimization through automated vision analysis and user feedback

## Overview

The Prompt Scoring System evaluates AI-generated images/videos against their original prompts to discover which prompting techniques work best for each model. Different models (Seedream, Flux, WAN) may require different prompt structures to achieve the same user intent - this system surfaces those patterns automatically.

## Goals

1. **Automated Vision Analysis**: Generations analyzed by vision model (on-demand or auto)
2. **Multi-Dimensional Scoring**: Action Match, Appearance Match, Overall Quality (1-5 scale)
3. **Model-Specific Insights**: Per-model dashboards and prompt pattern mining
4. **Admin-First Rollout**: Start with admin-only access, iterate, then expand
5. **Recursive Improvement**: Use scores to discover effective prompt patterns per model

## Architecture

### Scoring Trigger Strategy

The system uses **user/admin-initiated scoring first**, with auto-scoring planned for later once accuracy is validated.

```text
Trigger                  When                              Creates prompt_scores row?
-----------------------  --------------------------------  --------------------------
User Quick Rating        User clicks stars on tile         YES (upsert: insert if missing)
Manual Score button      Admin clicks "Score" in lightbox  YES (calls score-generation)
Batch Score (admin)      Admin action on unscored jobs     YES (bulk score-generation)
Auto-score (future)      After generation complete         YES (when accuracy is proven)
```

**Why not auto-score on every generation?**
1. Multiple API providers use different callback paths — fal-webhook only covers some fal.ai jobs
2. Client-side polling bypasses webhooks entirely
3. Auto-scoring every generation wastes vision API credits while tuning scoring accuracy

**Key insight:** When a user clicks stars, the system:
1. Upserts a `prompt_scores` row with the user rating
2. If `autoAnalysisEnabled` is true, fires `score-generation` in the background
3. If auto-analysis is off, the row exists with user ratings only — still valuable data

Quick Rating works even without vision scoring being enabled.

### Data Flow

```text
[User rates on tile / Admin clicks Score]
       │
       ├──► [PromptScoringService.upsertQuickRating]
       │           │
       │           ▼
       │    prompt_scores UPSERT (user ratings)
       │
       └──► [score-generation edge function] (if auto or manual)
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
                   │
                   ▼
            prompt_scores UPDATE (vision scores + cost tracking)
                   │
                   ▼
            workspace_asset_id populated
```

## Configuration

All configuration is maintained in the admin portal — **no hardcoded models or prompts**.

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
    "autoAnalysisEnabled": false,
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

When `showQuickRating` is enabled, asset tiles show a 5-star rating centered on hover:

- Stars appear as a translucent pill overlay centered in the middle of the tile
- Click to rate (1-5 stars)
- **Same score applied to all 3 dimensions** via `PromptScoringService.upsertQuickRating`
- **Write-only at tile level** — no DB read per tile, avoiding N+1 query overhead
- Stars render empty by default; submitted rating shows filled stars for the session
- To see full scoring details, user opens the Generation Details slider in the lightbox

### Prompt Score Section (in Generation Details Slider)

Scoring details are consolidated into the existing Generation Details panel:

- **Collapsible section** labeled "Prompt Score" with composite score badge
- **User rating**: 5-star inline rating (per-dimension refinement planned)
- **Vision analysis**: 4 color-coded score badges (Action, Appearance, Quality, Overall)
- **Vision description**: Expandable text from the vision model analysis
- **Admin controls**: "Score" / "Re-score" button to trigger `score-generation`
- Single DB query fired only when the section is expanded

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

### Vision Model Cost Tracking

Each vision analysis records cost metadata in the `vision_analysis` JSONB:

- `vision_model_used`: Model ID or 'default'
- `vision_cost_estimate`: From `api_models.pricing.per_generation` (null if unavailable)
- `processing_time_ms`: Duration of the scoring pipeline

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/PromptScoringService.ts` | Client-side scoring operations (upsert, fetch, trigger) |
| `src/components/QuickRating.tsx` | Write-only 5-star rating overlay for tiles |
| `src/components/shared/SharedGrid.tsx` | Renders QuickRating centered on tile hover |
| `src/components/lightbox/PromptDetailsSlider.tsx` | PromptScoreSection in Generation Details |
| `src/hooks/usePromptScores.ts` | Full scoring hook (admin operations) |
| `src/hooks/usePromptScoringConfig.ts` | Config hook with realtime subscription |
| `supabase/functions/score-generation/index.ts` | Vision analysis orchestration |
| `supabase/functions/describe-image/index.ts` | Vision model invocation (scoring mode) |

## Database Schema

### prompt_scores Table

```sql
CREATE TABLE prompt_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  api_model_id UUID REFERENCES api_models(id),
  workspace_asset_id UUID REFERENCES workspace_assets(id) ON DELETE SET NULL,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  system_prompt_used TEXT,
  vision_analysis JSONB DEFAULT '{}',
  action_match NUMERIC(2,1),
  appearance_match NUMERIC(2,1),
  overall_quality NUMERIC(2,1),
  composite_score NUMERIC(2,1),
  user_action_rating INTEGER CHECK (user_action_rating BETWEEN 1 AND 5),
  user_appearance_rating INTEGER CHECK (user_appearance_rating BETWEEN 1 AND 5),
  user_quality_rating INTEGER CHECK (user_quality_rating BETWEEN 1 AND 5),
  user_rated_at TIMESTAMPTZ,
  admin_action_rating INTEGER CHECK (admin_action_rating BETWEEN 1 AND 5),
  admin_appearance_rating INTEGER CHECK (admin_appearance_rating BETWEEN 1 AND 5),
  admin_quality_rating INTEGER CHECK (admin_quality_rating BETWEEN 1 AND 5),
  admin_rated_at TIMESTAMPTZ,
  admin_rated_by UUID REFERENCES profiles(id),
  feedback_tags TEXT[] DEFAULT '{}',
  admin_comment TEXT,
  preserve_image BOOLEAN DEFAULT false,
  preserve_reason TEXT,
  preserved_url TEXT,
  image_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scoring_version VARCHAR(10) DEFAULT 'v1',
  CONSTRAINT unique_job_score UNIQUE(job_id)
);
```

### RLS Policies

- Users can SELECT own scores (`user_id = auth.uid()`)
- Users can INSERT own scores (`user_id = auth.uid()`)
- Users can UPDATE own scores (`user_id = auth.uid()`)
- Service role has full access (edge functions)

## Edge Functions

### describe-image (Extended)

New `outputMode: 'scoring'` that uses the scoring template from `prompt_templates`:

```typescript
if (outputMode === 'scoring') {
  const { data: template } = await supabase
    .from('prompt_templates')
    .select('system_prompt')
    .eq('use_case', 'scoring')
    .eq('is_active', true)
    .single();
  systemPrompt = template.system_prompt.replace('{{original_prompt}}', originalPrompt);
}
```

### score-generation

Orchestrates the scoring process:

1. Check if scoring enabled in system_config
2. Call describe-image with outputMode: 'scoring'
3. Parse vision analysis JSON
4. Compute composite_score from weights
5. Look up vision model cost from `api_models.pricing.per_generation`
6. Insert/update prompt_scores with vision data + cost tracking
7. Populate `workspace_asset_id` by querying `workspace_assets` by `job_id`

## Implementation Phases

### Phase 1: Foundation (P0)

- [x] Design documentation
- [x] Create `prompt_scores` table with indexes and RLS
- [x] Add `promptScoring` config to `system_config`
- [x] Extend `describe-image` with `outputMode: 'scoring'`
- [x] Create `score-generation` edge function
- [x] Add trigger in `fal-webhook` (partial — only some fal jobs)
- [x] Create `usePromptScores` hook
- [x] Create `usePromptScoringConfig` hook with realtime subscription
- [x] Add toggle in `SystemConfigTab`
- [x] Add INSERT RLS policy for authenticated users
- [x] Create `PromptScoringService` (write-only client service)
- [x] Rewrite `QuickRating` as write-only (no per-tile DB reads)
- [x] Add Prompt Score section to Generation Details slider
- [x] Add `workspace_asset_id` population in `score-generation`
- [x] Add vision model cost tracking in `score-generation`

### Phase 2: User + Admin UI (P1)

- [x] QuickRating on tiles (centered hover, write-only)
- [x] User rating in Generation Details
- [ ] Per-dimension rating refinement in Generation Details
- [ ] Admin rating/tags/comment in Generation Details
- [ ] Manual "Score" / "Re-score" button (admin — UI done, wiring in progress)
- [ ] Batch scoring admin action
- [ ] Image preservation UI

### Phase 3: Analytics (P2)

- [ ] Create `PromptScoringAnalytics` admin tab
- [ ] Per-model performance tables
- [ ] Score distribution views

### Phase 4: Pattern Mining (P3)

- [ ] Aggregation queries for model-specific patterns
- [ ] High-scoring prompt extraction
- [ ] Common issue identification

## Medium Priority (Backlog)

### Reference Image Context in Scoring
Pass `reference_images_metadata` with multi-ref slot roles (position, clothing, style) to `score-generation` so the vision model can factor in whether the output matches the reference images. This would allow the scoring prompt to include "the user provided a reference image of X for position guidance" context.

### Scoring Dimension Relevance by Role
When multi-ref roles are active (e.g., position ref + clothing ref), automatically weight those dimensions higher in the composite score calculation. For example, if a clothing reference is provided, `appearance_match` weight could increase from 0.35 to 0.50.

### `scoring_status` Column
Add a `scoring_status` column (`pending | scoring | scored | failed`) to the `prompt_scores` table to enable:
- Retry logic for failed vision analyses
- Admin visibility into scoring pipeline health
- Filtering unscored jobs for batch processing

### Auto-Scoring Trigger
Re-enable automatic scoring after accuracy is validated. Options:
- **Database trigger** on `jobs` table when `status` changes to `completed` (cannot invoke edge functions directly, but could insert into a queue table)
- **Provider-agnostic callback**: Add scoring trigger to all completion paths (fal-webhook, replicate callback, polling completion)
- **Batch cron**: Periodic edge function that scores recent unscored completed jobs

## Low Priority (Future)

### Client-to-Postgres Aggregation Migration
Move `usePromptScoringStats` aggregation from client-side JavaScript to Postgres functions/views for performance at scale. Create materialized views for per-model averages.

### Pattern Mining
- Sorted lists of high-scoring prompts per model
- Common issue tag frequency analysis
- Template effectiveness comparison

### User-Facing Score Visibility
After admin validation confirms scoring accuracy, optionally show composite scores to users on their assets. Requires UX consideration to avoid discouraging users.

### A/B Prompt Template Testing
Use scores to compare prompt template variants per model. Run experiments with different system prompts and measure composite score differences.

### Score-Based Auto-Template Selection
When a model consistently scores higher with certain templates, auto-prefer those templates for that model. Requires sufficient scoring data to be statistically significant.

## Design Considerations

- **Performance**: Scoring must never block or slow generation. All scoring is fire-and-forget or user-initiated.
- **Write-only tiles**: Quick rating is write-only at tile level; reads happen only in lightbox details. This prevents N+1 DB queries on large grids.
- **URL expiry**: fal.ai URLs expire. Scoring should use persisted `storage_path` with signed URLs from Supabase Storage, not raw provider URLs.
- **Human data value**: Quick rating without auto-analysis still creates valuable human-labeled data for future model tuning.
- **Type safety**: The `as any` casts on Supabase queries are tech debt; should be resolved when `prompt_scores` is added to generated types.
- **Dependency**: Quick rating creates a `prompt_scores` INSERT (upsert). If the upsert fails, the rating is lost. The service handles this gracefully with toast feedback.
- **Cost tracking**: Vision model costs are tracked per-analysis in the `vision_analysis` JSONB using `api_models.pricing.per_generation`. Missing pricing results in `null` cost, not hardcoded fallbacks.

## Related Documentation

- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt template system
- [I2I_SYSTEM.md](./I2I_SYSTEM.md) - Image-to-image generation
- [FAL_AI.md](../09-REFERENCE/FAL_AI.md) - fal.ai integration
