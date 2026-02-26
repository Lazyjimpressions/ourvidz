

# Fix Image Compare Tab Freezing on I2I Model Selection

## Root Causes

The freeze stems from a cascade of unnecessary re-renders in `ImageCompareView.tsx`:

### 1. Inline array derivations trigger effects repeatedly
Lines 69-72 compute `t2iModels`, `i2iModels`, `i2vModels`, `allModels` as new array references on every render. When `visualModels` is undefined (during initial load or after a query refetch), `visualModels?.t2i ?? []` creates a NEW empty array each time. The `useEffect` at line 87 depends on `[t2iModels]`, so it re-fires on every render during loading, calling `setPanelA`/`setPanelB` each time (even though they bail out via functional update checks, the effect itself still runs).

### 2. `renderPanel` is a function, not a component
Because `renderPanel` is a plain function (not a React component), React cannot skip re-rendering its output. Every state change to either panel re-renders BOTH panels fully, including all their Select dropdowns, ReferenceImageSlots, and generation history.

### 3. PlaygroundContext value is not memoized
`PlaygroundProvider` creates a new `value` object on every render (line 316). Since `ChatInterface` consumes this context, ANY state change in PlaygroundProvider forces `ChatInterface` to re-render, which forces `ImageCompareView` to re-render, which forces both panels to re-render.

### 4. Auto-sync effect creates new objects on every sync
The auto-sync effect (line 317) creates new `ReferenceImage` objects with `crypto.randomUUID()` on every run. If it fires multiple times (due to cascading renders), it creates new array references each time for Panel B.

## Fix

### File: `src/components/playground/ImageCompareView.tsx`

**A. Memoize model arrays** (lines 69-72):
```typescript
const t2iModels = useMemo(() => visualModels?.t2i ?? [], [visualModels]);
const i2iModels = useMemo(() => visualModels?.i2i ?? [], [visualModels]);
const i2vModels = useMemo(() => visualModels?.i2v ?? [], [visualModels]);
const allModels = useMemo(() => visualModels?.all ?? [], [visualModels]);
```
This prevents the default-model useEffect from re-firing on every render.

**B. Memoize `getModelById`**:
```typescript
const getModelById = useCallback(
  (id: string) => allModels.find(m => m.id === id),
  [allModels]
);
```

**C. Wrap the auto-sync effect with a guard** to prevent cascading updates. Add a `useRef` flag to skip redundant syncs:
```typescript
const isSyncing = useRef(false);

useEffect(() => {
  if (isSyncing.current) return;
  // ... existing logic
  isSyncing.current = true;
  setPanelB(prev => ({ ... }));
  requestAnimationFrame(() => { isSyncing.current = false; });
}, [panelA.referenceImages, panelB.modelId]);
```

### File: `src/contexts/PlaygroundContext.tsx`

**D. Memoize the context value** to stop cascading re-renders into ChatInterface and ImageCompareView:
```typescript
const value = useMemo<PlaygroundContextType>(() => ({
  messages, sendMessage, isLoading, state, isLoadingMessages,
  createConversation, refreshPromptCache, sfwMode, setSfwMode,
  deleteConversation, updateConversationTitle, conversations,
  isLoadingConversations, setActiveConversation,
  regenerateAssistantMessage, settings, updateSettings,
}), [
  messages, isLoading, state, isLoadingMessages,
  conversations, isLoadingConversations, sfwMode, settings
]);
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/playground/ImageCompareView.tsx` | Memoize model arrays, getModelById, and guard auto-sync effect |
| `src/contexts/PlaygroundContext.tsx` | Memoize context value object |

