# Supabase Schema Reference

> Last Updated: 2025-08-23T18:16:39.258Z
> Project ID: ulmdmzhcdwfadbvfpckt (Local Mirror)
> Local URL: http://127.0.0.1:54321

This file is auto-generated from your LOCAL Supabase instance by `scripts/sync-schema-local.js`
Run `npm run sync:schema:local` to update.

## Database Tables (26 tables)

### admin_development_progress

*No columns found or access restricted*

### api_models

*No columns found or access restricted*

### api_providers

*No columns found or access restricted*

### character_scenes

*No columns found or access restricted*

### characters

*No columns found or access restricted*

### compel_configs

*No columns found or access restricted*

### conversations

*No columns found or access restricted*

### enhancement_presets

*No columns found or access restricted*

### jobs

*No columns found or access restricted*

### messages

*No columns found or access restricted*

### model_config_history

*No columns found or access restricted*

### model_performance_logs

*No columns found or access restricted*

### model_test_results

*No columns found or access restricted*

### negative_prompts

*No columns found or access restricted*

### profiles

*No columns found or access restricted*

### projects

*No columns found or access restricted*

### prompt_ab_tests

*No columns found or access restricted*

### prompt_templates

*No columns found or access restricted*

### scenes

*No columns found or access restricted*

### system_config

*No columns found or access restricted*

### usage_logs

*No columns found or access restricted*

### user_activity_log

*No columns found or access restricted*

### user_collections

*No columns found or access restricted*

### user_library

*No columns found or access restricted*

### user_roles

*No columns found or access restricted*

### workspace_assets

*No columns found or access restricted*

## Edge Functions (23 functions)

- `delete-workspace-item` → http://127.0.0.1:54321/functions/v1/delete-workspace-item
- `enhance-prompt` → http://127.0.0.1:54321/functions/v1/enhance-prompt
- `enhance-prompt-old` → http://127.0.0.1:54321/functions/v1/enhance-prompt-old
- `generate-admin-image` → http://127.0.0.1:54321/functions/v1/generate-admin-image
- `generate-avatars` → http://127.0.0.1:54321/functions/v1/generate-avatars
- `generate-content` → http://127.0.0.1:54321/functions/v1/generate-content
- `get-active-worker-url` → http://127.0.0.1:54321/functions/v1/get-active-worker-url
- `get-negative-prompt` → http://127.0.0.1:54321/functions/v1/get-negative-prompt
- `get-schema-info` → http://127.0.0.1:54321/functions/v1/get-schema-info
- `health-check-workers` → http://127.0.0.1:54321/functions/v1/health-check-workers
- `job-callback` → http://127.0.0.1:54321/functions/v1/job-callback
- `playground-chat` → http://127.0.0.1:54321/functions/v1/playground-chat
- `queue-job` → http://127.0.0.1:54321/functions/v1/queue-job
- `refresh-prompt-cache` → http://127.0.0.1:54321/functions/v1/refresh-prompt-cache
- `register-chat-worker` → http://127.0.0.1:54321/functions/v1/register-chat-worker
- `replicate-callback` → http://127.0.0.1:54321/functions/v1/replicate-callback
- `replicate-image` → http://127.0.0.1:54321/functions/v1/replicate-image
- `replicate-webhook` → http://127.0.0.1:54321/functions/v1/replicate-webhook
- `system-metrics` → http://127.0.0.1:54321/functions/v1/system-metrics
- `test-edge-functions` → http://127.0.0.1:54321/functions/v1/test-edge-functions
- `update-worker-url` → http://127.0.0.1:54321/functions/v1/update-worker-url
- `validate-enhancement-fix` → http://127.0.0.1:54321/functions/v1/validate-enhancement-fix
- `workspace-actions` → http://127.0.0.1:54321/functions/v1/workspace-actions

## Storage Buckets (0 buckets)

| Bucket | Public | ID |
|--------|--------|----|;

## Local Development Queries

```javascript
// Connect to local Supabase
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// Example queries (no RLS restrictions locally)
const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
const { data: jobs } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(10);
```
