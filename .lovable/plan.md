

# Fix: Select.Item Empty Value Error + Scene Generation 400 Error

## Two Issues Found

### Issue 1: Runtime Error - `<Select.Item />` with empty value

**File:** `src/components/roleplay/SceneSetupSheet.tsx` (lines 418, 420)

Two `<SelectItem>` elements use `value=""` for loading/empty states, which Radix UI explicitly forbids (empty string is reserved for clearing selection).

**Fix:** Replace `value=""` with placeholder `value` strings like `"__loading__"` and `"__empty__"` so they are valid Radix items while remaining disabled.

```
Before:
  <SelectItem value="" disabled>Loading characters...</SelectItem>
  <SelectItem value="" disabled>No user profiles created yet</SelectItem>

After:
  <SelectItem value="__loading__" disabled>Loading characters...</SelectItem>
  <SelectItem value="__empty__" disabled>No user profiles created yet</SelectItem>
```

### Issue 2: Scene Generation Returns 400

**Root cause:** In `src/pages/MobileRoleplayChat.tsx`, `modelProvider` is initialized as `''` (line 212). When the user triggers scene generation before models finish loading (or if the init effect hasn't run yet), the request sends `model_provider: ''` to the edge function. The server-side validation (line 364) checks `!model_provider`, which is `true` for empty string, returning a 400 error.

**Fix:** Guard all scene generation handlers to ensure `modelProvider` is non-empty before making the request. If it's empty, fall back to `ModelRoutingService.getDefaultChatModelKey()` inline.

In `handleGenerateScene` and `handleGenerateSceneForMessage` (and the main `handleSend`), replace:
```
model_provider: modelProvider,
```
with:
```
model_provider: modelProvider || ModelRoutingService.getDefaultChatModelKey(),
```

This pattern already exists in the kickoff handler (line 920: `const effectiveChatModel = modelState?.selectedChatModel || modelProvider || ModelRoutingService.getDefaultChatModelKey()`), so this aligns all paths to the same fallback logic.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/roleplay/SceneSetupSheet.tsx` | Replace `value=""` with non-empty placeholder values on lines 418, 420 |
| `src/pages/MobileRoleplayChat.tsx` | Add `ModelRoutingService.getDefaultChatModelKey()` fallback for `model_provider` in all `roleplay-chat` invocations |

## Impact

- Eliminates the runtime error that crashes the Select component rendering
- Ensures scene generation requests always pass validation, even if models haven't finished loading yet
- No edge function changes needed
