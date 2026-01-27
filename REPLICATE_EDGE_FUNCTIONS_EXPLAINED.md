# Replicate Edge Functions Explained

## Overview

The Replicate integration uses **two separate edge functions** that work together in an asynchronous workflow:

1. **`replicate-image`** - Initiates image generation requests
2. **`replicate-webhook`** - Receives completion notifications from Replicate

---

## Function 1: `replicate-image` Edge Function

### Purpose
**Initiates** image generation requests to Replicate API and creates a job record.

### When It's Called
- Frontend requests image generation via `/functions/v1/replicate-image`
- User submits prompt, model selection, and generation parameters

### What It Does

1. **Validates Request**
   - Checks user authentication
   - Validates prompt length (warns if exceeds CLIP 77-token limit)
   - Resolves model configuration from `api_models` table

2. **Creates Job Record**
   - Inserts record in `jobs` table with status `'queued'`
   - Stores user ID, prompt, metadata

3. **Calls Replicate API**
   ```typescript
   const prediction = await replicate.predictions.create({
     version: versionId,
     input: modelInput,
     webhook: webhookUrl,  // Points to replicate-webhook function
     webhook_events_filter: ["start", "completed"]
   });
   ```

4. **Logs Initial Usage**
   - Logs API usage with prediction creation
   - Cost may not be available yet (prediction still processing)

5. **Returns Immediately**
   - Returns `jobId` and `predictionId` to frontend
   - Job status: `'processing'`
   - **Does NOT wait for image generation to complete**

### Secrets Used
- `REPLICATE_API_TOKEN` - Authenticates with Replicate API

### Response
```json
{
  "jobId": "uuid",
  "predictionId": "replicate-prediction-id",
  "status": "queued"
}
```

---

## Function 2: `replicate-webhook` Edge Function

### Purpose
**Receives** completion notifications from Replicate when prediction finishes.

### When It's Called
- **Automatically by Replicate** when prediction status changes
- Called for events: `"start"` and `"completed"`
- Replicate sends HTTP POST to webhook URL

### What It Does

1. **Verifies Webhook Signature** (Security)
   ```typescript
   // Uses REPLICATE_WEBHOOK_SECRET to verify request is from Replicate
   if (WEBHOOK_SECRET) {
     // Verifies HMAC SHA-256 signature
     // Prevents unauthorized webhook calls
   }
   ```

2. **Finds Associated Job**
   - Looks up job by `prediction_id` in `jobs.metadata`
   - Ensures webhook corresponds to existing job

3. **Handles Success Case** (`status === 'succeeded'`)
   - Downloads generated image from Replicate
   - Uploads to Supabase Storage (`workspace-temp` bucket)
   - Creates `workspace_assets` record
   - Updates job status to `'completed'`
   - **Extracts cost from prediction** (our recent fix)
   - Updates usage log with actual cost

4. **Handles Failure Case** (`status === 'failed'`)
   - Updates job status to `'failed'`
   - Stores error message

5. **Handles Status Updates** (`status === 'starting'`, etc.)
   - Updates job metadata with status
   - Doesn't process output yet

### Secrets Used
- `REPLICATE_WEBHOOK_SECRET` - Verifies webhook signature (security)
- `REPLICATE_API_TOKEN` - Fetches prediction details for validation/cost

### Webhook URL Format
```
https://{project-ref}.supabase.co/functions/v1/replicate-webhook
```

This URL is passed to Replicate when creating the prediction.

---

## Workflow Diagram

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ POST /functions/v1/replicate-image
       │ { prompt, apiModelId, ... }
       ▼
┌─────────────────────┐
│  replicate-image    │
│  Edge Function      │
├─────────────────────┤
│ 1. Create job       │
│ 2. Call Replicate   │
│    API              │
│ 3. Set webhook URL  │
│ 4. Return jobId     │
└──────┬──────────────┘
       │
       │ Returns immediately
       │ (doesn't wait)
       ▼
┌─────────────┐
│   Frontend  │
│  (Polling)  │
└─────────────┘

       │
       │ (Async - minutes later)
       ▼
┌─────────────────────┐
│    Replicate API    │
│  (Processing...)    │
└──────┬──────────────┘
       │
       │ POST webhook
       │ (when complete)
       ▼
┌─────────────────────┐
│  replicate-webhook  │
│  Edge Function      │
├─────────────────────┤
│ 1. Verify signature │
│ 2. Find job         │
│ 3. Download image   │
│ 4. Upload to storage│
│ 5. Create asset     │
│ 6. Update job       │
│ 7. Extract cost      │
└──────┬──────────────┘
       │
       │ Updates database
       ▼
┌─────────────┐
│  Database   │
│  (jobs,     │
│   assets)   │
└─────────────┘
```

---

## Key Differences

| Aspect | `replicate-image` | `replicate-webhook` |
|--------|-------------------|---------------------|
| **Trigger** | Frontend request | Replicate API callback |
| **Timing** | Synchronous (immediate) | Asynchronous (minutes later) |
| **Purpose** | Start generation | Complete generation |
| **Secrets** | `REPLICATE_API_TOKEN` | `REPLICATE_WEBHOOK_SECRET` + `REPLICATE_API_TOKEN` |
| **Response Time** | < 1 second | Variable (depends on model) |
| **Cost Tracking** | Initial log (may be null) | Final cost extraction |

---

## Security: Webhook Signature Verification

The `REPLICATE_WEBHOOK_SECRET` is used to verify that webhook requests are actually from Replicate, not malicious actors.

### How It Works

1. **Replicate Signs Request**
   - Replicate computes HMAC SHA-256 of request body
   - Uses webhook secret (configured in Replicate dashboard)
   - Sends signature in `X-Replicate-Signature` header

2. **Our Function Verifies**
   ```typescript
   // Compute expected signature
   const expectedSignature = computeHMAC(requestBody, WEBHOOK_SECRET);
   
   // Compare with received signature
   if (signature !== expectedSignature) {
     return 401; // Unauthorized
   }
   ```

3. **Why It Matters**
   - Prevents unauthorized webhook calls
   - Ensures only Replicate can trigger completion
   - Protects against webhook spoofing attacks

### Configuration

- **Replicate Dashboard**: Set webhook secret (must match `REPLICATE_WEBHOOK_SECRET`)
- **Supabase Secrets**: Set `REPLICATE_WEBHOOK_SECRET` environment variable
- **Optional**: If not set, webhook verification is disabled (not recommended for production)

---

## Cost Tracking Flow

### Initial Log (replicate-image)
```typescript
// Logged when prediction is created
// Cost may be null (prediction still processing)
logApiUsage({
  costUsd: prediction.cost || null,  // Usually null at this stage
  ...
});
```

### Final Cost (replicate-webhook)
```typescript
// Extracted from completed prediction
const actualPrediction = await replicate.predictions.get(predictionId);
const cost = actualPrediction.metrics?.cost || actualPrediction.cost;

// Update existing usage log
await supabase
  .from('api_usage_logs')
  .update({ cost_usd: cost })
  .eq('id', usageLogId);
```

---

## Why Two Functions?

### Asynchronous Processing
- Replicate image generation takes **minutes**, not seconds
- Frontend can't wait for completion
- Webhook pattern allows non-blocking workflow

### Separation of Concerns
- **replicate-image**: User-facing, handles request initiation
- **replicate-webhook**: System-facing, handles completion processing

### Scalability
- Frontend doesn't hold connections open
- Multiple predictions can process concurrently
- Webhook handles completion independently

---

## Related Files

- `supabase/functions/replicate-image/index.ts` - Request initiation
- `supabase/functions/replicate-webhook/index.ts` - Completion handling
- `docs/05-APIS/REPLICATE_API.md` - API documentation
- `docs/04-WORKERS/REPLICATE_IMAGE_EDGE_FUNCTION.md` - Detailed function docs

---

## Troubleshooting

### Webhook Not Receiving Calls
1. Check webhook URL is correct in Replicate dashboard
2. Verify `REPLICATE_WEBHOOK_SECRET` matches Replicate configuration
3. Check Supabase edge function logs
4. Verify network connectivity

### Cost Not Being Tracked
1. Check webhook is extracting cost from prediction
2. Verify `REPLICATE_API_TOKEN` has access to prediction details
3. Check usage logs for cost updates

### Signature Verification Failing
1. Ensure `REPLICATE_WEBHOOK_SECRET` matches Replicate dashboard
2. Check signature header name (`X-Replicate-Signature` or `Replicate-Signature`)
3. Verify HMAC computation matches Replicate's format
