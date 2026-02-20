
# Fix: queue-job Called for API Models + Model Hardcoding Audit

## Confirmed: Model Is NOT Hardcoded — But Has Two Bugs

After reading the full flow, here is the confirmation of the model resolution chain and where the bugs lie.

### How the Model is Resolved (Correct Architecture)

The model selection is fully dynamic and table-driven at every layer:

**Client side (`useLibraryFirstWorkspace.ts`)**
- On mount: reads `workspace-selected-model` from `localStorage` (full model object with `{id, type, display_name}`)
- If absent: queries `api_models` for the model flagged `default_for_tasks @> ['generation']` — this is the database default, not a hardcoded value
- `setSelectedModel()` persists the full object to `localStorage` so selection survives navigation

**Edge function (`fal-image/index.ts`)**
- Receives `apiModelId` (a UUID) from the client payload
- Queries `api_models` by that UUID to get `model_key`, `capabilities`, `input_defaults` etc.
- If no `apiModelId` provided: queries for the `default_for_tasks @> ['generation']` model from the `fal` provider
- ALL parameters (safety, aspect ratio, schema filtering) are derived from the database row — no hardcoding

**Conclusion: the model architecture is correct.** No hardcoded model keys are used in the routing or generation path.

---

## Root Cause of the queue-job Bug

The bug is **not** a hardcoded model. It's an **async initialization race** combined with a **wrong localStorage value being written for fal models**.

### Bug 1: Async Race Window (Primary)

```
Line 178: const [selectedModel, setSelectedModelInternal] = useState(
            { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' }  // ← initial state
          );

Line 181-241: useEffect(() => {
  const initializeSelectedModel = async () => {   // ← async, runs AFTER first render
    const savedModel = localStorage.getItem('workspace-selected-model');
    // ... parse and setSelectedModelInternal(parsed)
  };
  initializeSelectedModel();
}, []);
```

Between component mount and the async `useEffect` completing, `selectedModel.type` is `'sdxl'`. If `generate()` is triggered before the effect resolves (e.g., the user navigates from the Library page where generation was pending), the routing decision at line 1064 reads:

```typescript
const edgeFunction = selectedModel?.type === 'fal'
  ? 'fal-image'
  : selectedModel?.type === 'replicate'
    ? 'replicate-image'
    : 'queue-job';  // ← selectedModel.type is 'sdxl' during the race window
```

### Bug 2: fal Models Saved as 'sdxl' in Legacy Key

```typescript
// Line 294 — setSelectedModel callback:
const saveValue = newModel.type === 'replicate' ? 'replicate_rv51' : 'sdxl';
// ↑ fal models get written as 'sdxl' to the old-format key
localStorage.setItem('workspace-model-type', saveValue);
```

If `workspace-selected-model` is cleared (incognito, cache clear, new session), the old-format fallback at line 198-206 reads `'sdxl'` and restores SDXL instead of the fal model. This silently routes to `queue-job`.

---

## Fix Plan

### Fix 1: Initialize `selectedModel` State Synchronously

**File: `src/hooks/useLibraryFirstWorkspace.ts` — line 178**

Change the `useState` initializer from a hardcoded SDXL default to a function that reads `localStorage` synchronously. This eliminates the async race window entirely for returning users.

```typescript
// BEFORE (line 178):
const [selectedModel, setSelectedModelInternal] = useState<...>({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });

// AFTER: lazy initializer reads localStorage synchronously
const [selectedModel, setSelectedModelInternal] = useState<...>(() => {
  const savedModel = localStorage.getItem('workspace-selected-model');
  if (savedModel) {
    try {
      const parsed = JSON.parse(savedModel);
      if (parsed.id && parsed.type && parsed.display_name) {
        return parsed;
      }
    } catch (e) {}
  }
  return { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' };
});
```

The `useEffect` can still run for database-default lookup on first-ever load (when no localStorage entry exists).

### Fix 2: Correctly Write fal Model to Legacy Key

**File: `src/hooks/useLibraryFirstWorkspace.ts` — line 294**

```typescript
// BEFORE:
const saveValue = newModel.type === 'replicate' ? 'replicate_rv51' : 'sdxl';

// AFTER:
const saveValue = newModel.type === 'replicate' ? 'replicate_rv51'
                : newModel.type === 'fal' ? `fal_${newModel.id}`
                : 'sdxl';
```

This ensures the old-format fallback key accurately represents fal models rather than silently mapping them to `'sdxl'`.

### Fix 3: Add Pre-Generate Guard for UUID/Type Mismatch

**File: `src/hooks/useLibraryFirstWorkspace.ts` — before line 1064 (routing decision)**

Add a safety check that catches any remaining mismatch between the model ID (which looks like a UUID) and the type (which says `'sdxl'`):

```typescript
// Safety net: if selectedModel has a UUID id but type is 'sdxl', 
// it means initialization hasn't completed — resolve from DB before routing
let effectiveModel = selectedModel;
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedModel?.id || '');
if (isUUID && selectedModel?.type === 'sdxl') {
  const { data: modelRow } = await supabase
    .from('api_models')
    .select('id, model_key, display_name, api_providers!inner(name)')
    .eq('id', selectedModel.id)
    .single();
  if (modelRow) {
    const pName = (modelRow.api_providers as any)?.name || '';
    const resolvedType = pName === 'fal' ? 'fal' : pName === 'replicate' ? 'replicate' : 'sdxl';
    effectiveModel = { ...selectedModel, type: resolvedType };
    // Persist fix
    localStorage.setItem('workspace-selected-model', JSON.stringify(effectiveModel));
  }
}

// Use effectiveModel instead of selectedModel for routing
const edgeFunction = effectiveModel?.type === 'fal'
  ? 'fal-image'
  : effectiveModel?.type === 'replicate'
    ? 'replicate-image'
    : 'queue-job';
```

---

## Files to Change

| File | Change | Risk |
|------|--------|------|
| `src/hooks/useLibraryFirstWorkspace.ts` | Sync `useState` initializer from `localStorage` (Fix 1) | Very Low |
| `src/hooks/useLibraryFirstWorkspace.ts` | Fix fal model saved as `'sdxl'` in legacy key (Fix 2) | Very Low |
| `src/hooks/useLibraryFirstWorkspace.ts` | Pre-generate UUID/type mismatch guard (Fix 3) | Low |

No changes required to `fal-image/index.ts` or `queue-job/index.ts` — the edge functions resolve models correctly from the database using the UUID passed from the client.

## Confirmation: No Hardcoded Model Keys in the Generation Path

- `useLibraryFirstWorkspace.ts`: Model ID comes from UI state (user selection) or `api_models` database default
- `fal-image/index.ts`: Resolves `model_key`, `capabilities`, `input_defaults` from `api_models` table by the UUID sent from client
- `queue-job/index.ts`: SDXL-only path — only reached when `selectedModel.type === 'sdxl'`
- The `api_models` table's `default_for_tasks` array column is the single source of truth for which model is the system default — no hardcoded fallback model keys exist beyond `'sdxl'` for the local worker path
