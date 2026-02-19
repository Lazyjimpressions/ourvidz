

# Fix: Remove All Hardcoded Model References, Use DB-Driven Defaults

## Problem

The codebase has hardcoded model keys (`cognitivecomputations/dolphin3.0-r1-mistral-24b:free`, etc.) in two places that don't exist in the database. The architecture should be fully table-driven: defaults come from the `api_models` table (set via Admin UI), and the client should never need to know specific model keys.

## Root Cause Chain

1. `ModelRoutingService.ts` has a hardcoded `DEFAULT_CHAT_MODELS` array with 5 model keys -- most don't exist in the DB
2. `getDefaultChatModelKey()` returns the first hardcoded key, which gets sent to the edge function
3. Edge function `getDefaultOpenRouterModel()` queries `modality = 'roleplay'` but the DB uses `modality = 'chat'` + `task = 'roleplay'`
4. Both DB queries fail, so it falls to a hardcoded return of the same non-existent model
5. `getModelConfig()` can't find it, function returns 400

## Design Principle

- **Client side**: Resolves the default from the database via `useRoleplayModels` hook (already works correctly -- finds `gryphe/mythomax-l2-13b` from DB). If not yet loaded, sends empty string to edge function.
- **Edge function**: When `model_provider` is empty, resolves the default from the `api_models` table server-side. This is the single source of truth.
- **No hardcoded model keys anywhere.**

## Changes

### 1. `src/lib/services/ModelRoutingService.ts`

- **Delete** the `DEFAULT_CHAT_MODELS` array entirely (lines 38-69)
- **Delete** `getDefaultChatModelKey()` and `getDefaultChatModel()` static methods (lines 80-107)
- These are replaced by the DB-driven default from `useRoleplayModels` hook on the client and `getDefaultOpenRouterModel()` on the server
- Keep `getDefaultImageModel()` (already queries DB)
- Keep `buildChatRoute()` and `buildImageRoute()` but update them to not reference `DEFAULT_CHAT_MODELS`

### 2. `src/hooks/useRoleplayModels.ts`

- Remove import of `DEFAULT_CHAT_MODELS` from `ModelRoutingService`
- Remove the `fallbackModelOptions` block (lines 147-164) that maps hardcoded models -- if the DB query returns zero rows, the hook simply returns an empty list
- Remove the `ModelRoutingService.getDefaultChatModelKey()` ultimate fallback (lines 179-189) -- if no DB models exist, `defaultModel` is `undefined`
- The hook already correctly finds the DB default via `apiModelOptions.find(m => m.metadata?.is_default)`

### 3. `src/pages/MobileRoleplayChat.tsx`

- Replace all `ModelRoutingService.getDefaultChatModelKey()` fallbacks (8 occurrences) with empty string `''`
- When `modelProvider` is empty, the edge function will resolve the default server-side
- This means the client says "use whatever the default is" rather than guessing a model key

### 4. `supabase/functions/roleplay-chat/index.ts`

- **Fix `getDefaultOpenRouterModel()`**: Change `modality = 'roleplay'` to `modality = 'chat'` + `task = 'roleplay'` in both queries (lines 893, 905)
- **Remove hardcoded fallback**: Delete the `return 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free'` line (917). If both DB queries fail, return `null` and let the caller handle it gracefully
- **Fix empty model_provider handling**: At the top of the function where `model_provider` is validated (around line 364), instead of returning 400 on empty, call `getDefaultOpenRouterModel()` to resolve it:
  ```
  if (!model_provider) {
    model_provider = await getDefaultOpenRouterModel(supabase);
  }
  if (!model_provider) {
    return new Response(JSON.stringify({ error: 'No default model configured' }), { status: 500 });
  }
  ```

### 5. `src/hooks/useRoleplaySettings.ts`

- Change `DEFAULT_SETTINGS.modelProvider` from `'chat_worker'` to `''` (empty string means "use DB default")
- The hook already resolves from `defaultChatModel?.value` which comes from the DB

## Files Modified

| File | Change |
|------|--------|
| `src/lib/services/ModelRoutingService.ts` | Remove `DEFAULT_CHAT_MODELS`, `getDefaultChatModelKey()`, `getDefaultChatModel()` |
| `src/hooks/useRoleplayModels.ts` | Remove hardcoded fallback model list and `ModelRoutingService` default reference |
| `src/hooks/useRoleplaySettings.ts` | Change default `modelProvider` from `'chat_worker'` to `''` |
| `src/pages/MobileRoleplayChat.tsx` | Replace 8 `getDefaultChatModelKey()` calls with `''` |
| `supabase/functions/roleplay-chat/index.ts` | Fix modality filter, remove hardcoded fallback, handle empty model_provider gracefully |

## No Database Changes

The `api_models` table already has the correct default (`gryphe/mythomax-l2-13b` with `default_for_tasks = ['roleplay']`). No migrations needed.

