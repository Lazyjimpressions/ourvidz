

# Fix: Scene Generation Not Working in Manual Mode

## Problem

Scene generation works in **auto mode** (image with every AI response) but fails in **manual mode** (on-demand "Generate Scene" button). Two separate manual paths are broken:

1. **`handleGenerateScene`** (camera button in prompt bar) -- calls `roleplay-chat` with `scene_generation: true`, expects a `scene_job_id` in the response. But the edge function fires scene generation asynchronously via `EdgeRuntime.waitUntil()` and returns the HTTP response immediately -- with no `job_id`. The client falls into the "no job ID" error branch (line 1758) and shows a failure toast.

2. **`handleGenerateSceneForMessage`** (per-message "Generate Scene" button in manual mode) -- same issue, plus sends a `scene_only: true` flag that the edge function completely ignores.

The auto-mode path works because it falls through to `subscribeToConversationScenes()`, which uses a Supabase realtime subscription on the `character_scenes` table to detect when the background scene is created. The manual paths skip this fallback.

## Root Cause

The edge function always returns `scene_generating_async: true` but never returns `scene_job_id` (line 704: "No scene_job_id yet"). The manual generation handlers don't check `scene_generating_async` and instead bail out when they can't find a `job_id`.

## Fix

### File: `src/pages/MobileRoleplayChat.tsx`

#### 1. Fix `handleGenerateScene` (line ~1734-1790)

After checking for `newJobId` and not finding one, add a fallback that checks `data?.scene_generating_async` and subscribes to conversation scenes -- exactly like the auto-mode path already does.

```
Before (line 1758):
  } else {
    // Error: no job ID
    ...show error toast...
  }

After:
  } else if (data?.scene_generating_async && conversationId) {
    // Scene is generating asynchronously - subscribe to realtime updates
    const placeholderMessage = { ... scene generating placeholder ... };
    setMessages(prev => [...prev, placeholderMessage]);
    subscribeToConversationScenes(conversationId, placeholderMessage.id);
    toast({ title: 'Scene requested', description: "Generating in background..." });
  } else {
    // Genuine error: no job ID and not async
    ...existing error handling...
  }
```

#### 2. Fix `handleGenerateSceneForMessage` (line ~1890-1916)

Same pattern: after checking `newJobId`, add an `else if (data?.scene_generating_async)` branch that subscribes to conversation scenes for that specific `messageId`.

```
Before (line 1914):
  } else {
    throw new Error('No job ID returned');
  }

After:
  } else if (data?.scene_generating_async && conversationId) {
    // Scene generating asynchronously
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, metadata: { ...msg.metadata, scene_generated: true } }
        : msg
    ));
    subscribeToConversationScenes(conversationId, messageId);
    toast({ title: 'Generating scene...', description: 'Image is being created in the background.' });
  } else {
    throw new Error('No job ID returned');
  }
```

## Why This Works

- The edge function already creates a `character_scenes` record with a `job_id` when the background scene generation calls `fal-image`. The realtime subscription in `subscribeToConversationScenes` detects this INSERT/UPDATE and chains into `subscribeToJobCompletion` to track the image until it appears.
- This is the exact same mechanism that already works for auto-mode scenes.
- No edge function changes needed -- the fix is purely client-side.

## Previous Scene Handling

The "previous scene had not been generated" scenario is already handled correctly in the edge function:
- Line 2407-2428: Server-side continuity fallback queries the DB for the latest completed scene if the frontend doesn't provide one
- Line 2430-2496: Validates and verifies the previous scene exists with an image
- Line 2508-2510: Falls back to T2I if no previous scene image is available

This logic is sound. The real issue is that manual scene generation never gets past the client-side "no job ID" check to even reach the edge function's scene generation code.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/MobileRoleplayChat.tsx` | Add `scene_generating_async` fallback in both `handleGenerateScene` and `handleGenerateSceneForMessage` |

## No Edge Function Changes

The edge function is correct -- it fires scene generation asynchronously and returns `scene_generating_async: true`. The client just needs to handle that flag in the manual paths, the same way it already does in the auto path.
