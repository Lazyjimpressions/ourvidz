

# Fix: Video Duration Not Synced With Model Settings

## Problem

The video extend output is only 5 seconds because:

1. `videoDuration` state in `useLibraryFirstWorkspace.ts` is initialized as `useState(5)` and **never updated** when the model changes
2. The `useVideoModelSettings` hook (which correctly calculates `defaultDuration = 8` for extend models) is **not used** by `useLibraryFirstWorkspace`
3. The edge function receives `duration: 5` in metadata, calculates `5 * 30 = 150 frames`, so the output matches the source length exactly

## Fix

### 1. Wire `useVideoModelSettings` into `useLibraryFirstWorkspace.ts`

Import and call `useVideoModelSettings` with the currently selected video model ID. When the settings change (e.g., user switches to an extend model), update `videoDuration` to the model's `defaultDuration`.

```typescript
import { useVideoModelSettings } from './useVideoModelSettings';

// Inside the hook, after selectedModel state:
const { settings: videoSettings } = useVideoModelSettings(
  mode === 'video' ? selectedModel?.id || null : null
);

// Sync videoDuration when model changes
useEffect(() => {
  if (videoSettings?.defaultDuration) {
    setVideoDuration(videoSettings.defaultDuration);
  }
}, [videoSettings?.defaultDuration]);
```

### 2. Expose duration options from model settings

Pass `videoSettings.durationOptions` to the UI components so the duration picker shows valid options for the selected model (not a hardcoded list).

In `useLibraryFirstWorkspace.ts`, add to the return object:
```typescript
videoDurationOptions: videoSettings?.durationOptions || [3, 5, 8],
```

### 3. Update UI components to use dynamic duration options

**`SimplePromptInput.tsx`** and **`MobileSettingsSheet.tsx`**: Accept `videoDurationOptions` prop and render those values in the duration picker instead of any hardcoded list.

## Technical Details

| File | Change |
|---|---|
| `src/hooks/useLibraryFirstWorkspace.ts` | Import `useVideoModelSettings`, add `useEffect` to sync `videoDuration` with model default, expose `videoDurationOptions` |
| `src/pages/SimplifiedWorkspace.tsx` | Pass `videoDurationOptions` to `SimplePromptInput` |
| `src/components/workspace/SimplePromptInput.tsx` | Accept and use `videoDurationOptions` prop for duration picker |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Pass `videoDurationOptions` to mobile settings |
| `src/components/workspace/MobileSettingsSheet.tsx` | Accept and use `videoDurationOptions` prop |

## Result

- Switching to an extend model auto-sets duration to 8s (241 frames at 30fps)
- Duration picker shows model-valid options (e.g., 1-8s for extend)
- Edge function receives correct duration, producing meaningfully longer output
