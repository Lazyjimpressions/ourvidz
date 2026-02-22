# Webhook-Based Async Video Processing

**Added:** February 2026
**Status:** PRODUCTION
**Location:** `supabase/functions/fal-webhook/index.ts`

## Overview

Provider-agnostic webhook system for handling long-running video generation jobs. Replaces polling-based approach with callback-driven completion.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │      │   fal-image     │      │   fal.ai        │
│   (submit job)  │─────►│   edge function │─────►│   queue API     │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           │ async processing
                                                           │ (30-180 seconds)
                                                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   UI updates    │◄─────│   fal-webhook   │◄─────│   fal.ai        │
│   (realtime)    │      │   edge function │      │   (callback)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Edge Functions

### fal-image (Submission)

When model has `endpoint_path = 'fal-webhook'`, uses async submission:

```typescript
// Detect async model
const isAsync = apiModel.endpoint_path === 'fal-webhook';

if (isAsync) {
  // Submit to queue endpoint with webhook callback
  const webhookUrl = `${supabaseUrl}/functions/v1/fal-webhook?secret=${FAL_WEBHOOK_SECRET}`;

  await fetch(`https://queue.fal.run/${modelKey}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}` },
    body: JSON.stringify({
      ...modelInput,
      webhook_url: webhookUrl
    })
  });

  // Return immediately - webhook will complete the job
  return { status: 'queued', job_id: job.id };
}
```

### fal-webhook (Completion)

Handles callbacks from fal.ai when generation completes:

**Endpoint:** `POST /functions/v1/fal-webhook?secret={FAL_WEBHOOK_SECRET}`

**Flow:**

1. **Verify secret** - Reject unauthorized requests
2. **Parse payload** - Extract `request_id` and result
3. **Find job** - Query by `metadata->>fal_request_id`
4. **Handle failure** - Update job status if fal.ai reports error
5. **Extract result** - Get video/image URL from payload
6. **Download & upload** - Transfer to `workspace-temp` bucket
7. **Create thumbnail** - Use reference image for video thumbnails
8. **Create workspace_asset** - Insert asset record
9. **Update job** - Mark as completed with metadata
10. **Post-processing** - Handle destinations (character_portrait, character_scene)
11. **Log usage** - Update or create API usage log

## Security

### Webhook Secret

Environment variable `FAL_WEBHOOK_SECRET` required:

```bash
# Set in Supabase Edge Function secrets
FAL_WEBHOOK_SECRET=your-secret-string
```

Secret passed as query parameter:

```
https://xxx.supabase.co/functions/v1/fal-webhook?secret=your-secret-string
```

**Verification:**

```typescript
const secret = url.searchParams.get("secret");
const expectedSecret = Deno.env.get("FAL_WEBHOOK_SECRET");

if (secret !== expectedSecret) {
  return new Response("Unauthorized", { status: 401 });
}
```

## Database Configuration

### api_models.endpoint_path

Set to `'fal-webhook'` for async video models:

```sql
UPDATE api_models
SET endpoint_path = 'fal-webhook'
WHERE model_key IN (
  'fal-ai/ltx-video-13b/image-to-video',
  'fal-ai/wan/i2v',
  -- other async video models
);
```

### jobs.metadata

Webhook uses `fal_request_id` to correlate callbacks:

```typescript
// Set when submitting async job
await supabase.from('jobs').insert({
  metadata: {
    fal_request_id: response.request_id,
    // ...other metadata
  }
});

// Webhook queries by this field
const { data: job } = await supabase
  .from('jobs')
  .select('*')
  .eq('metadata->>fal_request_id', requestId)
  .single();
```

## Payload Structure

### fal.ai Webhook Payload

```typescript
interface FalWebhookPayload {
  request_id: string;
  status: 'COMPLETED' | 'ERROR';

  // Success payload (may be nested under .payload)
  payload?: {
    video?: { url: string };
    images?: Array<{ url: string }>;
    output?: { url: string };
    seed?: number;
    timings?: object;
  };

  // Error payload
  error?: string;
  detail?: string;
}
```

### Result Extraction

```typescript
const result = payload.payload || payload;

let resultUrl: string | null = null;
let resultType = "image";

if (result.video?.url) {
  resultUrl = result.video.url;
  resultType = "video";
} else if (result.images && result.images.length > 0) {
  resultUrl = result.images[0].url;
  resultType = "image";
} else if (result.output?.url) {
  resultUrl = result.output.url;
  resultType = job.format === "video" ? "video" : "image";
}
```

## Post-Processing

Same destinations as sync path:

| Destination | Action |
|-------------|--------|
| `character_portrait` | Update `characters.image_url`, create `character_portraits` record |
| `character_scene` | Update `character_scenes.image_url` |
| `roleplay_scene` | Update scene in roleplay context |

```typescript
const destination = job.metadata?.destination;
if (destination) {
  handlePostProcessing(supabase, job, storagePath, resultType, ...)
    .catch((err) => console.error("❌ Post-processing error:", err));
}
```

## Usage Logging

Prevents double-counting by checking for existing log:

```typescript
// Check if fal-image already created a log
const { data: existingLog } = await supabase
  .from("api_usage_logs")
  .select("id")
  .contains("provider_metadata", { request_id: requestId })
  .limit(1);

if (existingLog && existingLog.length > 0) {
  // Update existing log
  await supabase.from("api_usage_logs").update({
    response_status: 200,
    webhook_completed: true
  }).eq("id", existingLog[0].id);
} else {
  // Create new log
  await supabase.from("api_usage_logs").insert({ ... });
}
```

## Error Handling

### fal.ai Error

```typescript
if (falStatus === "ERROR") {
  const errorMsg = payload.error || payload.detail;

  await supabase.from("jobs").update({
    status: "failed",
    error_message: errorMsg,
    completed_at: new Date().toISOString(),
  }).eq("id", job.id);
}
```

### Download Failure

```typescript
const downloadResponse = await fetch(resultUrl);
if (!downloadResponse.ok) {
  await supabase.from("jobs").update({
    status: "failed",
    error_message: `Failed to download result: ${downloadResponse.status}`,
  }).eq("id", job.id);
}
```

### Upload Failure

```typescript
const { error: uploadError } = await supabase.storage
  .from("workspace-temp")
  .upload(storagePath, resultBuffer, { contentType, upsert: true });

if (uploadError) {
  await supabase.from("jobs").update({
    status: "failed",
    error_message: `Storage upload failed: ${uploadError.message}`,
  }).eq("id", job.id);
}
```

## Comparison: Sync vs Async

| Aspect | Sync (fal.run) | Async (queue.fal.run + webhook) |
|--------|----------------|----------------------------------|
| **Timeout** | 60s edge function limit | No limit |
| **Use Case** | Images, short videos | Long videos (30s+) |
| **Response** | Immediate result | `{ status: 'queued' }` |
| **Completion** | Same request | Webhook callback |
| **Models** | `endpoint_path = null` | `endpoint_path = 'fal-webhook'` |

## Related Documentation

- [FAL_AI.md](./FAL_AI.md) - fal.ai platform integration
- [DATABASE.md](../08-DATABASE/DATABASE.md) - jobs table schema
- [SYSTEM_SUMMARY.md](../04-WORKERS/SYSTEM_SUMMARY.md) - Worker architecture
