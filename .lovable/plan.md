

# Prompt Scoring System: Revised Design + Implementation

## Design Philosophy Changes

The original design assumed auto-scoring on every generation via webhooks. This is wrong for three reasons:
1. Multiple API providers use different callback paths -- fal-webhook only covers some fal.ai jobs
2. Client-side polling bypasses webhooks entirely (which is why there are 0 scores)
3. Auto-scoring every generation wastes vision API credits while we're still tuning scoring accuracy

**New approach: User/Admin-initiated scoring first, auto-scoring later.**

## Scoring Trigger Strategy

```text
Trigger                  When                              Creates prompt_scores row?
-----------------------  --------------------------------  --------------------------
User Quick Rating        User clicks stars on tile         YES (upsert: insert if missing)
Manual Score button      Admin clicks "Score" in lightbox  YES (calls score-generation)
Batch Score (admin)      Admin action on unscored jobs     YES (bulk score-generation)
Auto-score (future)      After generation complete         YES (when accuracy is proven)
```

Key insight: When a user clicks stars, the system:
1. Upserts a `prompt_scores` row with the user rating
2. If `autoAnalysisEnabled` is true, fires `score-generation` in the background to get vision scores
3. If auto-analysis is off, the row exists with user ratings only -- still valuable data

This means Quick Rating works even without vision scoring being enabled.

## Changes

### 1. QuickRating: Remove DB Query Per Tile

**Problem**: Current `QuickRating` component calls `usePromptScores(jobId)` which fires a Supabase SELECT for every visible tile. With 40 tiles on screen, that's 40 queries.

**Solution**: Remove the per-tile DB fetch entirely. The stars are a write-only interaction at the tile level.

- Stars render in their unrated state (empty) by default
- On click, the component calls a lightweight `upsertQuickRating(jobId, rating)` function directly (no hook)
- This function does a Supabase upsert on `prompt_scores` using `job_id` as the conflict key
- Toast confirms the rating
- No need to read back the score on tiles -- if the user wants to see their rating and scoring details, they open the lightbox Generation Details

**New file**: `src/lib/services/PromptScoringService.ts`
- `upsertQuickRating(jobId, userId, rating)`: Upserts prompt_scores with user ratings + fetches job metadata (original_prompt, api_model_id) to populate required fields on insert
- `triggerVisionScoring(jobId)`: Invokes `score-generation` edge function
- `fetchScoreForJob(jobId)`: Single fetch for lightbox use

### 2. QuickRating UI: Centered on Hover

**File**: `src/components/QuickRating.tsx`

- Remove `usePromptScores` hook (no DB read)
- Accept `jobId` and `userId` props
- Stars render centered horizontally in middle third of tile
- Use `pointer-events-none` on the wrapper, `pointer-events-auto` on the stars row
- Position: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
- Only show on hover via parent's `opacity-0 group-hover:opacity-100`
- Remove debug console.log statements

**File**: `src/components/shared/SharedGrid.tsx`
- Remove `console.log` debug statement on line 456
- Move QuickRating from bottom-left to center: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
- Pass `userId` from auth context or prop

### 3. Scoring Details in Generation Details Slider

**File**: `src/components/lightbox/PromptDetailsSlider.tsx`

Add a new collapsible "Prompt Score" section after "Generation Details":

- Fetch score via `fetchScoreForJob(jobId)` when the slider opens (single query, only when user explicitly opens details)
- Show vision analysis scores (action_match, appearance_match, overall_quality, composite) as colored badges
- Show user rating if present
- Show admin rating if present
- Show feedback tags as chips
- Show "Score" button (admin) or "Re-score" button to trigger `score-generation`
- Show detailed star rating inputs (per-dimension) for users who want to refine their quick rating
- Admin users see additional fields: admin rating inputs, comment textarea, feedback tag selector, preserve toggle

This consolidates the scoring UI into the existing details panel rather than creating a separate panel.

### 4. score-generation Edge Function Updates

**File**: `supabase/functions/score-generation/index.ts`

- After inserting the score, query `workspace_assets` by `job_id` and update the score row with `workspace_asset_id`
- Add vision model cost tracking to `vision_analysis` JSONB:
  - `vision_model_used`: the model ID used
  - `vision_cost_estimate`: looked up from `api_models.pricing`
- The function already handles the "score exists" check, so re-scoring should use an upsert or delete-then-insert pattern

### 5. QuickRating Upsert Logic

The `upsertQuickRating` service function needs to handle the case where no `prompt_scores` row exists yet (user rates before auto-scoring runs):

```text
1. Fetch job metadata: original_prompt, enhanced_prompt, api_model_id, user_id
2. Upsert into prompt_scores:
   - ON CONFLICT (job_id) DO UPDATE SET user ratings + user_rated_at
   - ON INSERT: populate job_id, user_id, api_model_id, original_prompt, enhanced_prompt
3. If autoAnalysisEnabled and no vision_analysis exists, fire score-generation in background
```

This requires the `unique_job_score` constraint already exists on `prompt_scores(job_id)`.

### 6. Documentation Update

**File**: `docs/03-SYSTEMS/PROMPT_SCORING_SYSTEM.md`

**Architecture section**: Replace webhook-centric diagram with the new trigger strategy table.

**Phase checklist update**:
- Phase 1 (Foundation):
  - [x] prompt_scores table
  - [x] system_config scoring section
  - [x] describe-image scoring mode
  - [x] score-generation edge function
  - [x] fal-webhook trigger (partial -- only some fal jobs)
  - [x] usePromptScores hook
  - [x] usePromptScoringConfig hook
  - [x] SystemConfigTab toggle
  - [ ] Fix: QuickRating upsert (no per-tile DB reads)
  - [ ] Fix: Score details in Generation Details slider
  - [ ] workspace_asset_id population
  - [ ] Vision model cost tracking

- Phase 2 (User + Admin UI):
  - [ ] QuickRating on tiles (centered hover)
  - [ ] Per-dimension rating in Generation Details
  - [ ] Admin rating/tags/comment in Generation Details
  - [ ] Manual "Score" / "Re-score" button
  - [ ] Batch scoring admin action

- Phase 3 (Analytics): unchanged

**New sections to add**:

**Medium Priority (Backlog)**:
- Reference image context in scoring: Pass multi-ref slot roles to score-generation so vision model factors in reference match
- Scoring dimension relevance by role: Weight dimensions based on active reference roles
- `scoring_status` column: Track pending/scoring/scored/failed for retry logic
- Auto-scoring trigger: Re-enable after accuracy is validated, using a provider-agnostic approach (e.g., DB trigger on job status change to 'completed')

**Low Priority (Future)**:
- Move aggregation from client to Postgres functions
- Pattern mining: sorted high-scoring prompts per model
- User-facing score visibility after admin validation
- A/B prompt template testing using scores
- Score-based auto-template selection

**Design Considerations**:
- Scoring must never block or slow generation
- Quick rating is write-only at tile level; read happens only in lightbox details
- fal.ai URLs expire; scoring should use persisted storage paths with signed URLs
- Quick rating without auto-analysis still creates valuable human-labeled data
- The `as any` casts on Supabase queries are tech debt; resolve when prompt_scores is added to generated types

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/PromptScoringService.ts` | Create | upsertQuickRating, triggerVisionScoring, fetchScoreForJob |
| `src/components/QuickRating.tsx` | Rewrite | Remove DB reads, center on tile, write-only interaction |
| `src/components/shared/SharedGrid.tsx` | Edit | Center QuickRating, remove debug logs, pass userId |
| `src/components/lightbox/PromptDetailsSlider.tsx` | Edit | Add Prompt Score section with ratings + admin panel |
| `supabase/functions/score-generation/index.ts` | Edit | Add workspace_asset_id + vision cost tracking |
| `docs/03-SYSTEMS/PROMPT_SCORING_SYSTEM.md` | Edit | Update architecture, checklist, add backlog sections |

