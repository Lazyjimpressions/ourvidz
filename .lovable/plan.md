
# Fix: Images Spinning Forever in ImagePickerDialog

## Root Cause

The `queuedIdsRef` in `useSignedAssets.ts` (line 38) is a `useRef<Set<string>>` that tracks which asset IDs have been queued for signing. Once an ID is added (line 60), it is **never cleared** unless `refresh()` is explicitly called. This means:

1. Dialog opens, workspace tab active -- 110 assets get queued, IDs added to `queuedIdsRef`
2. Signing runs (or fails silently)
3. User switches to Library tab -- new assets arrive, but their IDs may overlap or the ref still blocks re-evaluation
4. Dialog closes and reopens -- `queuedIdsRef` still holds all old IDs since the hook instance persists (the Dialog component stays mounted)
5. `pathsToSign` memo returns **empty arrays** because every asset ID is already in `queuedIdsRef`
6. The signing `useEffect` never fires -- images spin forever

The console logs confirm: **no signing requests are being made** (no `UrlSigningService` log lines). The workspace data loads successfully (110 assets), but the signing step is completely skipped.

## Additional Issue

The `ImagePickerDialog` stays mounted even when closed (`isOpen=false`) because React keeps the component tree. The `useSignedAssets` hook's `enabled` flag correctly gates the effect, but `queuedIdsRef` accumulates IDs across open/close cycles without clearing.

## Fix Plan

### Fix 1: Clear `queuedIdsRef` when assets array identity changes

**File: `src/lib/hooks/useSignedAssets.ts`**

Add a `useEffect` that clears `queuedIdsRef` whenever the `assets` array reference changes. This ensures that when the user switches tabs (workspace to library) or when the dialog reopens with fresh data, all assets get re-queued for signing.

```typescript
// After line 38 (queuedIdsRef declaration)
// Reset queued tracking when assets change (e.g., tab switch, dialog reopen)
useEffect(() => {
  queuedIdsRef.current.clear();
}, [assets]);
```

### Fix 2: Also clear `queuedIdsRef` when `enabled` transitions from false to true

When the dialog reopens (`enabled` goes from `false` to `true`), the ref should be cleared so all assets get signed fresh.

```typescript
// Track previous enabled state
const prevEnabledRef = useRef(enabled);
useEffect(() => {
  if (enabled && !prevEnabledRef.current) {
    // Re-enabled: clear queued IDs so all assets get signed
    queuedIdsRef.current.clear();
  }
  prevEnabledRef.current = enabled;
}, [enabled]);
```

### Fix 3: Clear stale signed URLs when switching source tabs

**File: `src/components/storyboard/ImagePickerDialog.tsx`**

The `useSignedAssets` hook receives different `sharedAssets` and `bucket` when switching tabs, but old `signedUrls` state may persist. Add a `refresh` call from the hook when the active source changes.

```typescript
const { signedAssets, isSigning, refresh } = useSignedAssets(sharedAssets, bucket, {
  enabled: isOpen,
});

// Clear signed state when switching source tabs
useEffect(() => {
  refresh();
}, [activeSource]);
```

## Files to Change

| File | Change | Lines |
|------|--------|-------|
| `src/lib/hooks/useSignedAssets.ts` | Clear `queuedIdsRef` on assets change and enabled transition | After line 38 |
| `src/components/storyboard/ImagePickerDialog.tsx` | Call `refresh()` when `activeSource` changes | After line 114 |

## Why This Fixes Both Workspace AND Library

- **Workspace**: Assets load (confirmed by console log showing 110 assets), but `queuedIdsRef` blocks signing. Clearing the ref on assets change allows signing to proceed.
- **Library**: Same mechanism -- library assets are mapped to `SharedAsset[]` but signing is skipped because IDs are already in the ref from previous renders.
- **Tab switching**: The `refresh()` call clears both `signedUrls` state and `queuedIdsRef`, ensuring a clean signing pass for the new source.
