
# Async Video Generation via fal.ai Queue API + Webhook

## Status: ✅ IMPLEMENTED

## What Changed

### 1. New Edge Function: `fal-webhook`
Handles async completion callbacks from fal.ai. Verifies `FAL_WEBHOOK_SECRET` via query parameter. Downloads result, uploads to `workspace-temp`, creates `workspace_assets`, updates job to `completed`, and runs post-processing (character portraits, scene updates) fire-and-forget.

### 2. Updated Edge Function: `fal-image`
- **Table-driven URL**: Uses `api_providers.base_url` + `model_key` instead of hardcoded `https://fal.run/`
- **Async branch**: If `api_models.endpoint_path` is set (e.g., `'fal-webhook'`), submits to queue with webhook URL and returns immediately with `{ jobId, status: 'queued' }`
- **Merged job insert**: Single `INSERT` with `status: 'queued'|'processing'` and `started_at` instead of insert + update
- **Reused signed URL**: Video thumbnails use already-signed `modelInput.image_url` instead of re-signing
- **Fire-and-forget post-processing**: `handlePostProcessing` no longer blocks the HTTP response
- **Fallback**: If async submission fails or `FAL_WEBHOOK_SECRET` missing, falls back to synchronous `fal.run`

### 3. Database: `api_models.endpoint_path`
All active video models now have `endpoint_path = 'fal-webhook'`. This column drives async vs sync routing:
- `endpoint_path = 'fal-webhook'` → async queue + webhook
- `endpoint_path = null` → synchronous (images)
- `endpoint_path = 'replicate-webhook'` → could be used for Replicate models

### 4. Secret: `FAL_WEBHOOK_SECRET`
User-generated random token stored in Supabase secrets. Appended as `?secret=` query param to webhook URL for verification.

## Architecture

```
Image (sync, endpoint_path = null):
  fal-image → fal.run/{model} → download → upload → respond
  Total: 3-15s

Video (async, endpoint_path = 'fal-webhook'):
  fal-image → queue.fal.run/{model}?fal_webhook=... → respond immediately (~1-2s)
  ... later ...
  fal-webhook ← fal.ai callback → download → upload → job completed
```

## No Client Changes Required
Existing job polling (`useGenerationStatus`, `GeneratedMediaContext`) handles async jobs.
