

# Fix: Playground Hardcoded to `fal-image` — Enable Multi-Provider Routing

## Problem

The Playground's `ImageCompareView.tsx` hardcodes `supabase.functions.invoke('fal-image', ...)` at line 198, regardless of which provider the selected model belongs to. When a user picks a Replicate model in the Playground, the request goes to the `fal-image` edge function, which correctly rejects it with `"Model provider must be fal"`.

The main workspace (`useLibraryFirstWorkspace.ts`) already has proper multi-provider routing (lines 1147-1151), but the Playground never adopted that pattern.

## Fix

**File:** `src/components/playground/ImageCompareView.tsx`

In the `generateForPanel` function (~line 175), resolve the provider from the model's `api_providers.name` field (already available via `useAllVisualModels`) and route to the correct edge function:

```typescript
const model = getModelById(panel.modelId);
if (!model) return;

// Resolve edge function from provider
const providerName = (model as any).api_providers?.name || 'fal';
const edgeFunction = providerName === 'replicate' ? 'replicate-image' : 'fal-image';
```

Then at line 198, replace `'fal-image'` with the resolved `edgeFunction`.

For Replicate models, the payload shape differs from fal (Replicate expects `apiModelId` at the top level and dimensions in `input`). We need to branch the payload construction similarly to how `useLibraryFirstWorkspace.ts` does it (lines 1166-1240).

### Payload branching

```typescript
if (providerName === 'replicate') {
  requestPayload = {
    prompt: finalPrompt,
    apiModelId: panel.modelId,
    jobType: isVideo ? 'video' : 'image_high',
    input: { ...input },
    metadata: { source: 'playground-image-compare' },
  };
} else {
  requestPayload = {
    prompt: finalPrompt,
    apiModelId: panel.modelId,
    job_type: isVideo ? 'video' : 'image_high',
    input,
    metadata: { source: 'playground-image-compare' },
  };
}

const { data, error } = await supabase.functions.invoke(edgeFunction, {
  body: requestPayload,
});
```

Note: For Replicate, the field name is `jobType` (camelCase) while fal uses `job_type` (snake_case) — matching existing patterns in `useLibraryFirstWorkspace.ts`.

## Files to Change

| File | Change |
|------|--------|
| `src/components/playground/ImageCompareView.tsx` | Resolve provider from model data; route to correct edge function; branch payload shape for Replicate vs Fal |

## What This Fixes

- Replicate models in the Playground will route to `replicate-image` instead of `fal-image`
- Fal models continue working as before
- Future providers (OpenAI, etc.) can be added by extending the routing map
