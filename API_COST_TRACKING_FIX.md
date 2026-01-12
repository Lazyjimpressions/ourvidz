# API Cost Tracking Fix - Fetching Actual Costs

## Problem Identified

**Current State:**
- ✅ **OpenRouter**: Cost included in response (`response.cost`) - Working correctly
- ❌ **fal.ai**: Cost NOT in response, not fetching from API - **0% cost tracking**
- ⚠️ **Replicate**: Cost may not be in initial response, webhook fetches prediction but doesn't extract cost

**Database Evidence:**
```sql
-- Last 7 days:
- OpenRouter: 4 logs, 100% have cost ($0.013518 total)
- fal.ai: 4 logs, 0% have cost (all NULL)
```

## Solution

### 1. **fal.ai Cost Fetching**
- fal.ai Platform API provides usage/cost data via `/v1/usage/line-items` endpoint
- Requires ADMIN API key (different from regular API key)
- Need to fetch cost after request completes using `request_id`

### 2. **Replicate Cost Fetching**
- Replicate prediction object includes `metrics.cost` when completed
- Webhook already fetches prediction (line 255) but doesn't extract cost
- Need to extract `actualPrediction.metrics?.cost` from fetched prediction

### 3. **Implementation Plan**

#### Phase 1: Update fal-image to fetch cost
- After successful fal.ai request, fetch cost from Platform API
- Use `request_id` to query usage line items
- Update `extractFalUsage` to accept cost parameter
- Log cost when available

#### Phase 2: Update replicate-webhook to extract cost
- Extract `actualPrediction.metrics?.cost` from fetched prediction
- Update existing usage log with actual cost
- Or create new log entry with cost

#### Phase 3: Update replicate-image to fetch cost if missing
- After prediction creation, check if cost is available
- If not, fetch prediction details to get cost
- Update usage log with cost

## Files to Update

1. `supabase/functions/fal-image/index.ts`
   - Add `fetchFalCost()` function
   - Update `extractFalUsage()` to accept cost
   - Call cost fetch after successful request

2. `supabase/functions/replicate-webhook/index.ts`
   - Extract cost from `actualPrediction.metrics?.cost`
   - Update usage log with cost

3. `supabase/functions/replicate-image/index.ts`
   - Optionally fetch cost if not in initial response

## API Endpoints Needed

### fal.ai Platform API
- **Endpoint**: `https://fal.ai/api/v1/usage/line-items`
- **Method**: GET
- **Auth**: ADMIN API key (different from regular key)
- **Query**: `?request_id={request_id}` or `?model={model_key}&created_at={timestamp}`

### Replicate API
- **Endpoint**: Already using `replicate.predictions.get(predictionId)`
- **Cost Field**: `prediction.metrics?.cost` or `prediction.cost`

## Configuration Needed

1. **fal.ai ADMIN API Key**
   - Add to Supabase secrets as `FAL_ADMIN_API_KEY`
   - Different from regular `FAL_API_KEY`

2. **Verify Replicate API**
   - Check if `metrics.cost` is available in prediction object
   - May need to check billing API endpoint
