# Roleplay Chat 500 Error Fix

**Date:** 2026-01-10
**Status:** Fixed
**Priority:** CRITICAL

---

## Problem

Chat requests to `roleplay-chat` edge function were failing with 500 Internal Server Error:

```
POST https://ulmdmzhcdwfadbvfpckt.supabase.co/functions/v1/roleplay-chat 500 (Internal Server Error)
```

---

## Root Cause

The `getModelConfig` function was accessing `data.api_providers.id` without checking if `api_providers` exists. If the join failed or returned null, this would cause a runtime error.

**Issues:**
1. `getModelConfig` accessed `data.api_providers.id` without null check
2. `callModelWithConfig` didn't validate `modelConfig` before using it
3. `callOpenRouterWithConfig` was called with potentially null `provider_id`

---

## Solution

### 1. Added Null Check in `getModelConfig` ✅

**Before:**
```typescript
return {
  ...data,
  provider_id: data.api_providers.id,  // ❌ Could throw if api_providers is null
  provider_name: data.api_providers.name,
  provider_display_name: data.api_providers.display_name
};
```

**After:**
```typescript
// ✅ CRITICAL FIX: Check if api_providers exists before accessing
if (!data.api_providers) {
  console.error(`❌ Model config found but api_providers is missing for: ${modelKey}`);
  return null;
}

return {
  ...data,
  provider_id: data.api_providers.id,
  provider_name: data.api_providers.name,
  provider_display_name: data.api_providers.display_name
};
```

### 2. Added Validation in `callModelWithConfig` ✅

**Before:**
```typescript
): Promise<string> {
  console.log('🔧 Using database-driven model configuration:', {
    modelKey,
    provider: modelConfig.provider_name,  // ❌ Could throw if modelConfig is null
    ...
  });
```

**After:**
```typescript
): Promise<string> {
  // ✅ CRITICAL FIX: Validate modelConfig before using
  if (!modelConfig) {
    throw new Error('Model config is required');
  }
  if (!modelConfig.provider_name) {
    throw new Error('Model config missing provider_name');
  }
  
  console.log('🔧 Using database-driven model configuration:', {
    modelKey,
    provider: modelConfig.provider_name,
    ...
  });
```

### 3. Added Provider ID Validation Before OpenRouter Call ✅

**Before:**
```typescript
if (modelConfig.provider_name === 'openrouter') {
  return await callOpenRouterWithConfig(
    ...
    modelConfig.provider_id || null,  // ❌ Could be null
    ...
  );
}
```

**After:**
```typescript
if (modelConfig.provider_name === 'openrouter') {
  // ✅ CRITICAL FIX: Ensure provider_id exists before calling
  if (!modelConfig.provider_id) {
    console.error('❌ Model config missing provider_id:', {
      modelKey,
      provider_name: modelConfig.provider_name,
      hasId: !!modelConfig.id
    });
    throw new Error(`Model config missing provider_id for model: ${modelKey}`);
  }
  
  return await callOpenRouterWithConfig(
    ...
    modelConfig.provider_id,  // ✅ Guaranteed to exist
    ...
  );
}
```

---

## Expected Results

### Before
- Chat requests fail with 500 error
- No error details in logs
- User sees generic error message

### After
- Chat requests succeed
- Clear error messages if model config is invalid
- Proper null checks prevent runtime errors

---

## Testing

1. **Test with valid model**
   - Start a roleplay conversation
   - Verify chat works correctly
   - Check logs for successful model config lookup

2. **Test with missing provider**
   - If a model has no provider, verify graceful error handling
   - Check that error message is clear

3. **Test error logging**
   - Verify errors are logged with context
   - Check that error messages include model key

---

## Files Modified

1. `supabase/functions/roleplay-chat/index.ts`
   - Added null check for `api_providers` in `getModelConfig`
   - Added validation in `callModelWithConfig`
   - Added provider_id validation before OpenRouter call

---

## Related Documentation

- [API_USAGE_TRACKING_AUDIT.md](../../API_USAGE_TRACKING_AUDIT.md) - API usage tracking implementation

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Fix 500 error by adding null checks and validation | Claude |
