# Roleplay Model Health Check System

**Last Updated:** December 17, 2025  
**Status:** ✅ **Production Ready**

## Overview

The roleplay feature uses a health check system to conditionally show local models (Qwen chat, SDXL image) only when the corresponding workers are available and healthy. This ensures users can't select unavailable models while maintaining flexibility for when local infrastructure is available.

## Architecture

### Health Check Hook: `useLocalModelHealth`

**Location:** `src/hooks/useLocalModelHealth.ts`

**Purpose:** Monitors worker health status from `system_config.workerHealthCache`

**Features:**
- Real-time updates via Supabase subscriptions
- Auto-refresh every 30 seconds
- Proactive health checks every 60 seconds
- Tracks both chat worker (Qwen) and SDXL worker status

**Health Status Structure:**
```typescript
{
  chatWorker: {
    isAvailable: boolean,    // Worker is healthy AND has URL configured
    isHealthy: boolean,       // Health check passed
    lastChecked: string,      // ISO timestamp
    responseTimeMs: number,   // Response time in milliseconds
    error: string | null      // Error message if unhealthy
  },
  sdxlWorker: {
    isAvailable: boolean,
    isHealthy: boolean,
    lastChecked: string,
    responseTimeMs: number,
    error: string | null
  },
  isLoading: boolean
}
```

### Model Hooks Integration

#### `useRoleplayModels`
- **Local Model:** Qwen 2.5-7B-Instruct (Local)
- **Availability Check:** `chatWorker.isAvailable`
- **Behavior:** Only included in `allModelOptions` when chat worker is healthy

#### `useImageModels`
- **Local Model:** SDXL (Local)
- **Availability Check:** `sdxlWorker.isAvailable`
- **Behavior:** Only included in `modelOptions` when SDXL worker is healthy

## UI Implementation

### Settings Modal (`RoleplaySettingsModal.tsx`)

**Features:**
1. **Disabled State:** Local models are disabled (not selectable) when unavailable
2. **Visual Indicators:** 
   - "Available" badge (green) for healthy local models
   - "Unavailable" badge (gray) for unhealthy local models
   - Opacity reduction for disabled items
3. **Empty State Handling:** Shows warning message if no models configured
4. **Model Info Card:** Shows availability status for selected local models

**Example UI States:**
- ✅ **Available Local Model:** "Qwen 2.5-7B-Instruct (Local) [Available]" (selectable, green badge)
- ❌ **Unavailable Local Model:** "Qwen 2.5-7B-Instruct (Local) [Unavailable]" (disabled, gray badge, 50% opacity)
- ✅ **API Model:** Always available, no badge

## Health Check Flow

```
1. Component Mounts
   ↓
2. useLocalModelHealth hook initializes
   ↓
3. Fetches system_config.workerHealthCache
   ↓
4. Subscribes to real-time updates
   ↓
5. Triggers health-check-workers edge function
   ↓
6. Health check pings worker URLs (/health endpoint)
   ↓
7. Results cached in system_config.workerHealthCache
   ↓
8. Hook updates state with availability
   ↓
9. Model hooks filter local models based on availability
   ↓
10. UI shows/hides local models accordingly
```

## Edge Function: `health-check-workers`

**Location:** `supabase/functions/health-check-workers/index.ts`

**Purpose:** Checks worker health and updates `system_config.workerHealthCache`

**Checks:**
- Chat Worker: `/health` endpoint on `config.chatWorkerUrl`
- SDXL Worker: `/health` endpoint on `config.workerUrl` (WAN worker)

**Update Frequency:** 
- Manual trigger via `triggerHealthCheck()`
- Automatic every 60 seconds
- On worker registration/URL changes

## Best Practices

### 1. **Never Remove Local Models from Code**
- ✅ Keep local model definitions in hooks
- ✅ Conditionally include based on health
- ❌ Don't hardcode removal

### 2. **Graceful Degradation**
- ✅ Always show API models (fallback)
- ✅ Disable unavailable local models (don't hide)
- ✅ Show clear availability indicators

### 3. **Error Handling**
- ✅ Handle health check failures gracefully
- ✅ Default to "unavailable" on errors
- ✅ Log errors for debugging

### 4. **Performance**
- ✅ Cache health status (30s refresh)
- ✅ Use real-time subscriptions for updates
- ✅ Don't block UI on health checks

### 5. **User Experience**
- ✅ Show availability status clearly
- ✅ Disable (don't hide) unavailable models
- ✅ Provide feedback on why model is unavailable

## Database Configuration

### Required Tables

**`api_models`** - Stores API model configurations
- `modality`: 'roleplay' | 'image'
- `is_active`: boolean
- `is_default`: boolean (recommended)
- `priority`: integer (sort order)

**`api_providers`** - Stores provider information
- `name`: provider identifier (e.g., 'openrouter', 'replicate')
- `display_name`: user-friendly name
- `is_active`: boolean

**`system_config`** - Stores worker health cache
- `config.workerHealthCache.chatWorker`: Chat worker health
- `config.workerHealthCache.wanWorker`: SDXL worker health

### Verification Script

**Location:** `scripts/verify-roleplay-models.ts`

**Usage:**
```bash
npm run verify:models  # (if added to package.json)
# or
tsx scripts/verify-roleplay-models.ts
```

**Checks:**
- ✅ At least 1 active roleplay model
- ✅ At least 1 active image model
- ✅ Default models configured (recommended)
- ✅ Provider status
- ✅ Worker health status

## Production Checklist

- [x] Health check system implemented
- [x] Local models conditionally available
- [x] UI shows availability status
- [x] Error handling for health check failures
- [x] Real-time updates via subscriptions
- [x] Verification script created
- [ ] Database models verified (run verification script)
- [ ] Health checks tested with workers online/offline
- [ ] UI tested with all model states
- [ ] Error states tested

## Troubleshooting

### Local Models Not Showing
1. Check `system_config.workerHealthCache` in database
2. Verify worker URLs are configured
3. Check worker `/health` endpoints are accessible
4. Review console for health check errors

### Models Not Loading
1. Verify `api_models` table has active models
2. Check `modality` field is correct ('roleplay' or 'image')
3. Verify `api_providers` relationship exists
4. Check RLS policies allow read access

### Health Checks Failing
1. Verify `health-check-workers` edge function is deployed
2. Check worker URLs in `system_config`
3. Verify network connectivity to workers
4. Check worker `/health` endpoint responses

## Future Enhancements

- [ ] Admin UI for manual health check trigger
- [ ] Health check history/analytics
- [ ] Automatic failover to API models
- [ ] Health check retry logic with exponential backoff
- [ ] WebSocket-based real-time health updates

