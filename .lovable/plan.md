

# Fix: MultiCondition Video Reference — Wrong Field Name (`url` vs `video_url`)

## Root Cause

The fal.ai OpenAPI schema for `VideoConditioningInput` requires the field **`video_url`** (required). Both the client and edge function are using `url` instead, causing a 422 validation error.

```text
Client sends:       { url: "storage/path..." }
Edge function maps: { url: "signed-url..." }
fal.ai expects:     { video_url: "signed-url...", start_frame_num: 0 }
```

## Changes Required

### 1. Client: `src/hooks/useLibraryFirstWorkspace.ts` (~line 1489-1491)

Change the video reference object to use the correct field name:

```typescript
// BEFORE (broken)
inputObj.videos = [{
  url: stripToStoragePath(motionRefVideoUrl),
}];

// AFTER (correct)
inputObj.videos = [{
  video_url: stripToStoragePath(motionRefVideoUrl),
  start_frame_num: 0,
}];
```

### 2. Edge function: `supabase/functions/fal-image/index.ts` (~lines 540-548)

Fix the video conditioning mapper to output the correct field name:

```typescript
// BEFORE (broken)
const url = typeof vid === 'string' ? vid : vid.url;
const signed = await signIfStoragePath(supabase, url, 'reference_images');
if (signed) {
  const videoEntry: Record<string, any> = { url: signed };
  ...
}

// AFTER (correct)
const vidUrl = typeof vid === 'string' ? vid : (vid.video_url || vid.url);
const signed = await signIfStoragePath(supabase, vidUrl, 'reference_images');
if (signed) {
  const videoEntry: Record<string, any> = { video_url: signed, start_frame_num: vid.start_frame_num ?? 0 };
  ...
}
```

### 3. Also fix: `src/lib/services/ClipOrchestrationService.ts` (if it sends videos)

Same pattern -- ensure any `videos[]` entries use `video_url` not `url`.

## Why Previous Fixes Failed

Each iteration addressed a symptom (variable scope error, frame count) without checking the actual API contract. The OpenAPI schema clearly defines `VideoConditioningInput` with `video_url` as required -- this was the real blocker all along.

## Deployment

- Client changes deploy automatically via Lovable
- Edge function (`fal-image`) must be redeployed via Supabase dashboard

