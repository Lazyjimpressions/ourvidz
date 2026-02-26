
# Fix Flux Colossus Rendering in Playground Image Compare

## Root Cause

The Flux Colossus model on Replicate has cold starts of ~100-300 seconds. The client-side polling timeout in `ImageCompareView.tsx` is only 120 seconds, causing most attempts to time out before the prediction completes. The server-side logs confirm the prediction DOES succeed (at ~103 seconds in the latest attempt), but the client gives up too early on cold starts.

## Secondary Issue: Wasteful Polling

Each 2-second poll request goes through the FULL edge function pipeline (model resolution from DB, version validation, API key retrieval) before reaching the simple `predictionId` status check at line 310. This adds unnecessary latency and DB load.

## Changes

### 1. Edge Function: Move `predictionId` check before model resolution

**File:** `supabase/functions/replicate-image/index.ts`

Move the `body.predictionId` status check block (lines 310-321) to BEFORE the model resolution logic (line 191). This way, polling requests skip the entire model resolution pipeline and go directly to the Replicate API status check.

The moved block needs its own Replicate client initialization using `REPLICATE_API_TOKEN` directly (since there's no model to resolve the secret from):

```text
// Right after auth check (~line 189), before model resolution:
if (body.predictionId) {
  const replicateKey = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateKey) {
    return error response;
  }
  const rep = new Replicate({ auth: replicateKey });
  const prediction = await rep.predictions.get(body.predictionId);
  // Ensure output URLs are plain strings (not FileOutput objects)
  let output = prediction.output;
  if (Array.isArray(output)) {
    output = output.map(item =>
      typeof item === 'string' ? item
        : item?.url ? (typeof item.url === 'function' ? item.url() : item.url)
        : String(item)
    );
  }
  return Response({ ...prediction, output });
}
```

### 2. Client: Increase polling timeout and pass apiModelId

**File:** `src/components/playground/ImageCompareView.tsx`

- Increase `maxWait` from `120000` (120s) to `300000` (5 minutes) for Replicate models
- Pass `apiModelId` in polling requests for efficiency (even though the edge function fix makes this less critical)
- Add progress status display during polling (show "starting", "processing" states)

The relevant changes in the `generateForPanel` function:

```text
// Line 234: Increase timeout
const maxWait = 300000; // 5 minutes for cold start models

// Line 239: Pass apiModelId in poll request
body: { predictionId: data.predictionId, apiModelId: panel.modelId }

// Add: Log progress transitions
if (statusData?.status && statusData.status !== lastStatus) {
  console.log(`Replicate status: ${statusData.status}`);
  lastStatus = statusData.status;
}
```

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/replicate-image/index.ts` | Move predictionId check before model resolution; add output URL normalization |
| `src/components/playground/ImageCompareView.tsx` | Increase poll timeout to 300s; pass apiModelId in poll requests |
