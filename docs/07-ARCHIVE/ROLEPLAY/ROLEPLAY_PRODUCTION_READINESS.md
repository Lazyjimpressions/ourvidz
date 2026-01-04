# Roleplay Production Readiness Checklist

**Last Updated:** December 17, 2025  
**Status:** ✅ **Production Ready** (Pending Final Testing)

## Summary

The roleplay feature has been refactored for production with:
- ✅ Health check system for local models
- ✅ Conditional availability of local models
- ✅ UI indicators for model availability
- ✅ Direct navigation (no modal blockers)
- ✅ Non-blocking drawers for settings and character info
- ✅ Auto-scene selection
- ✅ Comprehensive error handling

## Implementation Complete

### ✅ Phase 1: Core Simplification
- [x] Direct navigation on character card click
- [x] Removed preview modal requirement
- [x] Auto-scene selection when available
- [x] Removed setTimeout delays causing dark screen

### ✅ Phase 2: Drawer System
- [x] CharacterInfoDrawer component (Sheet-based)
- [x] Settings converted to Sheet (non-blocking)
- [x] Integrated into chat page

### ✅ Phase 3: Model Health System
- [x] `useLocalModelHealth` hook created
- [x] Health check integration with `system_config`
- [x] Conditional local model availability
- [x] UI indicators (Available/Unavailable badges)
- [x] Disabled state for unavailable models
- [x] Real-time health updates via subscriptions

## Production Checklist

### Database Configuration
- [ ] **Verify API Models:** Run `scripts/verify-roleplay-models.ts`
  - At least 1 active roleplay model
  - At least 1 active image model
  - Default models configured (recommended)
  - Provider status verified

### Health Check System
- [ ] **Verify Worker Health:**
  - Check `system_config.workerHealthCache` in database
  - Verify chat worker URL configured (if using local Qwen)
  - Verify SDXL worker URL configured (if using local SDXL)
  - Test health check edge function: `health-check-workers`

### UI/UX Testing
- [ ] **Character Selection:**
  - [ ] Click character card → Chat starts immediately
  - [ ] No dark screen overlay
  - [ ] Preview available via menu button (drawer)

- [ ] **Settings Drawer:**
  - [ ] Opens from settings button
  - [ ] All tabs accessible (General, Model, Advanced)
  - [ ] Model selection works
  - [ ] Image model selection works
  - [ ] Local models show availability status
  - [ ] Unavailable local models are disabled

- [ ] **Chat Interface:**
  - [ ] Messages send successfully
  - [ ] Scene generation works
  - [ ] Model selection persists
  - [ ] Character info drawer accessible

### Model Selection Testing
- [ ] **Roleplay Models:**
  - [ ] API models always available
  - [ ] Local model (Qwen) only shown if chat worker healthy
  - [ ] Model selection saves correctly
  - [ ] Model changes apply to chat

- [ ] **Image Models:**
  - [ ] API models (Replicate) always available
  - [ ] Local model (SDXL) only shown if SDXL worker healthy
  - [ ] Model selection saves correctly
  - [ ] Image generation uses selected model

### Error Handling
- [ ] **Health Check Failures:**
  - [ ] Graceful degradation (shows API models only)
  - [ ] No UI crashes
  - [ ] Error messages logged

- [ ] **Model Loading Failures:**
  - [ ] Empty state messages shown
  - [ ] Warning messages for missing models
  - [ ] No UI crashes

### Performance
- [ ] **Health Check Performance:**
  - [ ] Health checks don't block UI
  - [ ] Subscriptions cleaned up properly
  - [ ] No memory leaks

- [ ] **Model Loading:**
  - [ ] Models load quickly (<2s)
  - [ ] Loading states shown
  - [ ] No unnecessary re-renders

## Known Issues Fixed

1. ✅ **Dark Screen Issue:** Fixed by removing setTimeout delays and modal blockers
2. ✅ **Subscription Errors:** Fixed by proper channel cleanup and unique channel names
3. ✅ **Local Models Always Shown:** Fixed by health check integration
4. ✅ **No Availability Indicators:** Fixed by adding badges and disabled states

## Remaining Work (Optional Enhancements)

### Phase 3: Touch Interactions (Future)
- [ ] Long-press for character preview
- [ ] Swipe gestures for drawer navigation
- [ ] Pinch-to-zoom for images

### Phase 3: Loading States (Future)
- [ ] Skeleton loaders for character cards
- [ ] Skeleton loaders for chat messages
- [ ] Improved transition animations

## Testing Commands

```bash
# Verify model configuration
tsx scripts/verify-roleplay-models.ts

# Build for production
npm run build

# Run development server
npm run dev
```

## Documentation

- **Model Health System:** `docs/01-PAGES/ROLEPLAY_MODEL_HEALTH_SYSTEM.md`
- **PRD:** `docs/01-PAGES/07_ROLEPLAY_PURPOSE.md`
- **Development Status:** `docs/01-PAGES/ROLEPLAY_DEVELOPMENT_STATUS.md`

## Deployment Notes

1. **Before Deployment:**
   - Run verification script
   - Test all model selections
   - Verify health checks working
   - Test with workers online/offline

2. **Environment Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Worker URLs configured in `system_config`

3. **Edge Functions:**
   - `health-check-workers` must be deployed
   - `roleplay-chat` must be deployed
   - `queue-job` must be deployed (for image generation)

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database configuration
3. Check worker health status
4. Review documentation

