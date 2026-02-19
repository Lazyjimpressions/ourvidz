

# Fix: Scene Images Not Displaying -- Realtime Publication Missing + Client Robustness

## Root Cause

**`character_scenes` table is NOT in the Supabase Realtime publication.**

The delivery chain for scene images works as follows:

1. Edge function returns dialogue immediately with `scene_generating_async: true` (no job_id yet)
2. Client subscribes to `character_scenes` table via Supabase Realtime to detect when a scene record gets a `job_id`
3. Edge function's background task generates the scene, creates a `character_scenes` record, calls `fal-image`, gets a `job_id`, and updates the scene record
4. Client should receive the UPDATE notification with `job_id`
5. Client then subscribes to `workspace_assets` for that `job_id` to get the final image

**Step 4 never fires** because `character_scenes` is not in the `supabase_realtime` publication. Only `jobs` and `workspace_assets` are currently published. The client subscribes but never receives any events, so it stays stuck on "generating scene" forever.

The backend is working perfectly -- logs confirm scenes complete successfully with job_ids. The images exist in storage. The client just never learns about them.

## Fix Strategy

Two-part fix: enable Realtime for the table AND add a polling fallback for robustness.

### Part 1: Database Migration -- Add `character_scenes` to Realtime publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE character_scenes;
```

This is the primary fix. Once `character_scenes` is in the publication, the existing client subscription code will work as designed.

### Part 2: Client-side polling fallback (robustness)

Even with Realtime enabled, subscriptions can occasionally miss events (network glitches, cold starts). Add a polling fallback inside `subscribeToConversationScenes` that periodically checks for completed scenes.

**File: `src/pages/MobileRoleplayChat.tsx`**

In the `subscribeToConversationScenes` function (around line 1324), add a periodic poll alongside the Realtime subscription:

```typescript
// Poll every 5 seconds as fallback (in case Realtime misses the event)
const pollInterval = setInterval(async () => {
  const { data: scenes } = await supabase
    .from('character_scenes')
    .select('id, job_id')
    .eq('conversation_id', convId)
    .not('job_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (scenes?.[0]?.job_id) {
    clearInterval(pollInterval);
    // Same logic as the Realtime handler: update message, subscribe to job completion
    messageSceneIdsRef.current.set(messageId, scenes[0].id);
    subscribeToJobCompletion(scenes[0].job_id, messageId);
    supabase.removeChannel(channel);
    activeChannelsRef.current.delete(channel);
  }
}, 5000);

// Clear poll on channel cleanup
setTimeout(() => {
  clearInterval(pollInterval);
  supabase.removeChannel(channel);
  activeChannelsRef.current.delete(channel);
}, 180000);
```

This ensures that even if Realtime has issues, the client will detect scene completion within 5 seconds.

## Files Modified

| File | Change |
|------|--------|
| Database migration | `ALTER PUBLICATION supabase_realtime ADD TABLE character_scenes;` |
| `src/pages/MobileRoleplayChat.tsx` | Add polling fallback to `subscribeToConversationScenes` |

## No Edge Function Changes

The edge function is working correctly. The scenes complete successfully. This is purely a client-side delivery problem caused by missing Realtime configuration.

