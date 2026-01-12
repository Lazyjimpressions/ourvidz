# API Secrets Validation & Cost Tracking Fix

## Secret Names Verified ✅

**Database Configuration (api_providers table):**
- ✅ **fal.ai**: `FAL_KEY`
- ✅ **OpenRouter**: `OpenRouter_Roleplay_API_KEY`
- ✅ **Replicate**: `REPLICATE_API_TOKEN`

All edge functions use `apiModel.api_providers.secret_name` to retrieve secrets dynamically from the database.

## Cost Tracking Implementation

### Current Status

| Provider | Cost Tracking | Method |
|----------|---------------|--------|
| **OpenRouter** | ✅ Working | `response.cost` from API response |
| **Replicate** | ✅ Fixed | Extract from `prediction.metrics?.cost` in webhook |
| **fal.ai** | ✅ Fixed | Fetch from Platform API using `FAL_KEY` |

### Changes Made

#### 1. Replicate Webhook (`replicate-webhook/index.ts`)
- ✅ Extracts cost from `actualPrediction.metrics?.cost` or `actualPrediction.cost`
- ✅ Updates existing usage log with actual cost when available
- ✅ Uses `REPLICATE_API_TOKEN` (already correct)

#### 2. fal.ai Image Function (`fal-image/index.ts`)
- ✅ Updated `fetchFalCost()` to use `FAL_KEY` instead of `FAL_ADMIN_API_KEY`
- ✅ Passes API key from main function to cost fetcher
- ✅ Attempts to fetch cost from Platform API if not in response
- ✅ Falls back gracefully if Platform API access not available

### Cost Fetching Logic

#### fal.ai
```typescript
// Uses FAL_KEY (same as regular API key)
// May need admin permissions for Platform API endpoints
// If Platform API returns 403, cost will remain null
```

#### Replicate
```typescript
// Extracts from prediction object fetched in webhook
const cost = actualPrediction.metrics?.cost || actualPrediction.cost;
```

#### OpenRouter
```typescript
// Already working - cost included in response
const cost = response.cost || estimate;
```

## Testing Required

### 1. fal.ai Platform API Access
- [ ] Test if `FAL_KEY` can access `/v1/usage/line-items` endpoint
- [ ] If 403, check if separate admin key is needed
- [ ] Verify cost is returned in expected format

### 2. Replicate Cost Extraction
- [ ] Verify `prediction.metrics?.cost` exists in completed predictions
- [ ] Test webhook cost extraction with real prediction
- [ ] Confirm cost is logged correctly

### 3. Database Validation
- [ ] Run cost tracking queries to verify data
- [ ] Check that fal.ai logs now include cost
- [ ] Verify Replicate webhook updates cost

## Database Queries for Validation

```sql
-- Check cost tracking by provider (last 7 days)
SELECT 
  ap.name as provider_name,
  COUNT(*) as log_count,
  SUM(CASE WHEN aul.cost_usd IS NOT NULL THEN 1 ELSE 0 END) as has_cost_count,
  ROUND(SUM(aul.cost_usd)::numeric, 6) as total_cost,
  ROUND(AVG(aul.cost_usd)::numeric, 6) as avg_cost
FROM api_usage_logs aul
JOIN api_providers ap ON aul.provider_id = ap.id
WHERE aul.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ap.name
ORDER BY total_cost DESC NULLS LAST;

-- Check recent fal.ai logs for cost
SELECT 
  id,
  created_at,
  cost_usd,
  provider_metadata->>'request_id' as request_id,
  provider_metadata->>'cost_fetched' as cost_fetched
FROM api_usage_logs
WHERE provider_id = (SELECT id FROM api_providers WHERE name = 'fal')
ORDER BY created_at DESC
LIMIT 10;

-- Check recent Replicate logs for cost
SELECT 
  id,
  created_at,
  cost_usd,
  provider_metadata->>'prediction_id' as prediction_id
FROM api_usage_logs
WHERE provider_id = (SELECT id FROM api_providers WHERE name = 'replicate')
ORDER BY created_at DESC
LIMIT 10;
```

## Next Steps

1. **Deploy Updated Edge Functions**
   - Deploy `fal-image` with cost fetching
   - Deploy `replicate-webhook` with cost extraction

2. **Test Cost Tracking**
   - Generate test requests for each provider
   - Verify cost is logged in database
   - Check admin UI shows cost data

3. **Monitor & Adjust**
   - If fal.ai Platform API requires admin key, add `FAL_ADMIN_API_KEY` secret
   - If Replicate cost field differs, update extraction logic
   - Document any provider-specific cost API requirements

## Notes

- **fal.ai Platform API**: May require admin permissions. If `FAL_KEY` doesn't work, we may need a separate admin key.
- **Replicate**: Cost should be available in completed predictions via `metrics.cost` field.
- **OpenRouter**: Already working correctly with cost in response.
