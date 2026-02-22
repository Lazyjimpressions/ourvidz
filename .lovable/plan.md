

## Fix API Cost Tracking -- Replicate + Aggregate Accuracy

### Problems Found

**Problem 1: Replicate cost is 100% missing**
All 6 successful Replicate requests have NULL cost. The `replicate-image` function logs usage at prediction creation time (status 201), but Replicate doesn't provide cost until the prediction completes. The `replicate-webhook` attempts to backfill cost by querying `provider_metadata->>prediction_id`, but this JSONB path query appears to never match (no webhook-sourced cost updates exist in the data).

**Problem 2: Aggregates not updated when webhook backfills cost**
When the Replicate webhook does find and update a usage log's `cost_usd`, the aggregate table is never updated with the new cost. There's a TODO comment at line 289 acknowledging this.

**Problem 3: Potential fal.ai double-counting**
The `fal-webhook` inserts a second usage log (line 249) for requests that `fal-image` already logged, potentially double-counting costs for webhook-routed fal jobs.

**Problem 4: FAL_PRICING map is incomplete**
Many fal.ai models (Flux-2, Flux Pro, grok-image, LTX variants) are not in the static pricing map and fall back to default pricing ($0.03 image / $0.25 video). These defaults may be inaccurate.

### What Changes

#### 1. Fix Replicate webhook cost extraction

**File:** `supabase/functions/replicate-webhook/index.ts`

The JSONB path query `provider_metadata->>prediction_id` likely fails because Supabase/PostgREST may not support this filter syntax reliably. Fix by:
- Query using `.contains('provider_metadata', { prediction_id: predictionId })` instead (uses `@>` operator, GIN-indexable)
- Also update the aggregate table when backfilling cost (call `upsert_usage_aggregate` with just the cost delta)

#### 2. Fix Replicate initial cost estimation  

**File:** `supabase/functions/replicate-image/index.ts`

- At prediction creation time, there are no metrics. Store the model's pricing from `api_models.pricing` as the estimated cost instead of the broken `predict_time * 0.0001` estimate
- Fetch pricing from the `apiModel.pricing` object that's already available in scope

#### 3. Prevent fal.ai double-counting

**File:** `supabase/functions/fal-webhook/index.ts`

- Before inserting a new usage log, check if one already exists for the same `request_id` in `provider_metadata`
- If found, update it (e.g., with the webhook timestamp) instead of inserting a duplicate

#### 4. Expand FAL_PRICING map

**File:** `supabase/functions/fal-image/index.ts`

Add actual pricing for models currently hitting the default fallback:
- `flux-2/flash/edit` (i2i)
- `flux-2/flash` (t2i) 
- `flux-2` (t2i)
- `flux-pro/v1.1` (i2i)
- `grok-image` (t2i/i2i)
- `ltx-video/v0.9.7` variants (i2v, t2v, extend)
- `wan/v2.1/i2v`

These prices should come from fal.ai's pricing page or be set as accurate estimates.

#### 5. Update aggregates on webhook cost backfill

**File:** `supabase/functions/replicate-webhook/index.ts`

After updating a usage log with actual cost, also call `upsert_usage_aggregate` with the cost delta so the dashboard aggregates stay accurate without needing a full recalculation.

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/replicate-webhook/index.ts` | Fix JSONB query to use `.contains()`, update aggregates on cost backfill |
| `supabase/functions/replicate-image/index.ts` | Use model pricing for initial cost estimate instead of broken predict_time formula |
| `supabase/functions/fal-webhook/index.ts` | Check for existing usage log before inserting (prevent double-count) |
| `supabase/functions/fal-image/index.ts` | Expand `FAL_PRICING` map with actual prices for all active models |

### What Stays the Same

- OpenRouter cost tracking (already working perfectly)
- The dashboard UI and aggregate query logic (already correctly excludes errors from avg cost)
- The `api_usage_logs` and `api_usage_aggregates` table schemas
- The `logApiUsage` and `extractOpenRouterUsage` shared utilities

