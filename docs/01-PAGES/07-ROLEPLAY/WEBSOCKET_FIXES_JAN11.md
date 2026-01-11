# WebSocket Connection Errors - Investigation & Fixes - January 11, 2026

**Status:** ✅ Fixed
**Priority:** 🔴 Critical (Blocks scene completion notifications)

---

## Issue Reported

User experiencing repeated WebSocket connection failures on roleplay page:

```
WebSocket connection to 'wss://ulmdmzhcdwfadbvfpckt.supabase.co/realtime/v1/websocket?apikey=...' failed
```

**Impact:**
- Scene generation job completion notifications fail
- User doesn't see real-time updates when scenes finish
- Browser console fills with connection errors
- Scenes still generate but users must refresh to see them

---

## Root Causes Identified

### 1. No Subscription Cleanup on Component Unmount ✅ FIXED

**Problem:** Active Realtime subscriptions weren't cleaned up when user navigated away from chat page.

**Evidence:**
- `subscribeToJobCompletion()` creates channels for each scene generation job
- Cleanup only happened on successful completion or 2-minute timeout
- No cleanup in component unmount effect
- Orphaned subscriptions continued attempting reconnection after component unmounted

**Impact:** Multiple failed WebSocket reconnection attempts as orphaned subscriptions tried to maintain connections.

**Fix Applied** ([src/pages/MobileRoleplayChat.tsx:287-306](../../../src/pages/MobileRoleplayChat.tsx#L287-306)):

```typescript
// Track active Realtime subscriptions for cleanup
const activeChannelsRef = useRef<Set<any>>(new Set());

// Cleanup on unmount - remove all active subscriptions
useEffect(() => {
  return () => {
    hasInitialized.current = false;
    currentRouteRef.current = '';

    // Clean up all active Realtime subscriptions
    if (activeChannelsRef.current.size > 0) {
      console.log('🧹 Cleaning up', activeChannelsRef.current.size, 'active Realtime subscriptions');
      activeChannelsRef.current.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      });
      activeChannelsRef.current.clear();
    }
  };
}, []);
```

### 2. No Error Handling for Failed Subscriptions ✅ FIXED

**Problem:** Subscription failures had no error handling or user feedback.

**Evidence:**
- Original `.subscribe()` had no status callback
- No handling for CHANNEL_ERROR, TIMED_OUT, or CLOSED states
- User not informed when Realtime connection fails

**Impact:** Silent failures - user unaware that real-time updates won't work.

**Fix Applied** ([src/pages/MobileRoleplayChat.tsx:1115-1136](../../../src/pages/MobileRoleplayChat.tsx#L1115-1136)):

```typescript
.subscribe((status, err) => {
  // Handle subscription status changes
  if (status === 'SUBSCRIBED') {
    console.log('✅ Subscribed to job completion channel:', jobId);
    activeChannelsRef.current.add(channel);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('❌ Channel error for job:', jobId, err);
    activeChannelsRef.current.delete(channel);

    // Show user-friendly error (Realtime might not be enabled)
    toast({
      title: 'Connection issue',
      description: 'Scene updates may be delayed. Your scene will still generate.',
    });
  } else if (status === 'TIMED_OUT') {
    console.warn('⏱️ Subscription timed out for job:', jobId);
    activeChannelsRef.current.delete(channel);
  } else if (status === 'CLOSED') {
    console.log('🔒 Channel closed for job:', jobId);
    activeChannelsRef.current.delete(channel);
  }
});
```

### 3. Channels Not Tracked for Cleanup ✅ FIXED

**Problem:** No centralized tracking of active channels for cleanup.

**Evidence:**
- Each `subscribeToJobCompletion()` call created a channel
- No shared state to track all active channels
- Impossible to clean up all subscriptions on unmount

**Impact:** Memory leaks and orphaned subscriptions accumulating over time.

**Fix Applied:**
- Created `activeChannelsRef` to track all channels
- Added channels to set on SUBSCRIBED status
- Removed channels from set on cleanup (success, error, timeout, close)
- Cleanup effect iterates through set to remove all channels

### 4. Supabase Realtime May Not Be Enabled ⚠️ NEEDS VERIFICATION

**Problem:** Supabase Realtime might not be enabled in project settings.

**Evidence:**
- WebSocket connection failures are consistent
- Error handling now catches CHANNEL_ERROR
- Project may not have Realtime enabled (default is OFF for new projects)

**Impact:** All Realtime subscriptions will fail regardless of code fixes.

**Verification Steps:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select project: `ourvidz` (ulmdmzhcdwfadbvfpckt)
3. Navigate to: Settings → API → Realtime
4. Check if "Enable Realtime" is toggled ON

**If Realtime is Disabled:**
1. Toggle "Enable Realtime" to ON
2. Save settings
3. Wait 1-2 minutes for changes to propagate
4. Test scene generation with real-time updates

---

## Files Modified

### src/pages/MobileRoleplayChat.tsx

**Line 262:** Added activeChannelsRef to track subscriptions
```typescript
// Track active Realtime subscriptions for cleanup
const activeChannelsRef = useRef<Set<any>>(new Set());
```

**Lines 287-306:** Updated cleanup effect to remove all subscriptions
```typescript
// Clean up all active Realtime subscriptions
if (activeChannelsRef.current.size > 0) {
  console.log('🧹 Cleaning up', activeChannelsRef.current.size, 'active Realtime subscriptions');
  activeChannelsRef.current.forEach(channel => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error removing channel:', error);
    }
  });
  activeChannelsRef.current.clear();
}
```

**Lines 1105-1150:** Enhanced subscribeToJobCompletion with error handling and tracking
- Added subscription status callback
- Track channels in activeChannelsRef
- Remove channels on all cleanup paths (success, error, timeout)
- Show user-friendly toast on CHANNEL_ERROR
- Clear timeout ID when channel removed early

### src/pages/MobileRoleplayDashboard.tsx

**Lines 183-236:** Fixed character image updates subscription cleanup
```typescript
let isSubscribed = false;
const channel = supabase
  .channel(`character-image-updates-${Date.now()}`)
  // ... event handlers ...
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      console.log('✅ Subscribed to character updates');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Character updates channel error:', err);
    }
  });

return () => {
  // Only remove channel if it was successfully subscribed
  if (isSubscribed) {
    try {
      supabase.removeChannel(channel);
      console.log('🧹 Cleaned up character updates subscription');
    } catch (error) {
      console.error('Error removing character updates channel:', error);
    }
  } else {
    // Channel never connected, just unsubscribe to stop connection attempts
    try {
      channel.unsubscribe();
    } catch (error) {
      // Ignore errors during unsubscribe of non-connected channels
    }
  }
};
```

### src/hooks/useCharacterImageUpdates.ts

**Lines 6-99:** Fixed character image updates hook subscription cleanup
- Added `isSubscribed` flag to track connection status
- Only call `removeChannel()` if successfully subscribed
- Call `unsubscribe()` if channel never connected
- Added status callback with error handling

---

## Testing Checklist

### Test 1: Subscription Cleanup on Navigation

1. Start roleplay chat with any character
2. Send a message to trigger scene generation
3. **Before scene completes**, navigate back to dashboard
4. Check browser console for: `🧹 Cleaning up X active Realtime subscriptions`
5. ✅ **Expected:** No WebSocket errors after navigation

### Test 2: Subscription Error Handling

1. **If Realtime is DISABLED in Supabase:**
2. Start roleplay chat and send message with scene generation
3. Check browser console for: `❌ Channel error for job: ...`
4. Check UI for toast notification: "Connection issue - Scene updates may be delayed..."
5. ✅ **Expected:** User informed of connection issue, no silent failures

### Test 3: Successful Subscription

1. **If Realtime is ENABLED in Supabase:**
2. Start roleplay chat and send message with scene generation
3. Check browser console for: `✅ Subscribed to job completion channel: ...`
4. Wait for scene to complete
5. Check console for: `✅ Workspace asset created for job: ...`
6. Check console for: `✅ Cleaned up subscription for job: ...`
7. ✅ **Expected:** Scene image appears in chat without refresh

### Test 4: Multiple Subscriptions

1. Send 3 messages in quick succession (all with scene generation)
2. Check browser console for 3 successful subscriptions
3. Navigate away before any complete
4. Check console for cleanup of all 3 subscriptions
5. ✅ **Expected:** All subscriptions cleaned up, no errors

### Test 5: Timeout Cleanup

1. Send message with scene generation
2. Wait 2 minutes without scene completing (simulate stuck job)
3. Check console for: `⏱️ Cleaned up subscription after timeout for job: ...`
4. ✅ **Expected:** Subscription cleaned up after 2-minute fallback timeout

---

## Browser Console Logs to Monitor

### ✅ Success Path:
```
🔄 Asset not found, subscribing for realtime updates...
✅ Subscribed to job completion channel: {jobId}
✅ Workspace asset created for job: {jobId}
✅ Cleaned up subscription for job: {jobId}
```

### ⚠️ Error Path (Realtime Disabled):
```
🔄 Asset not found, subscribing for realtime updates...
❌ Channel error for job: {jobId} {error}
[Toast notification: "Connection issue"]
```

### 🧹 Cleanup Path (Unmount):
```
🧹 Cleaning up {count} active Realtime subscriptions
✅ Cleaned up subscription for job: {jobId}
```

### ⏱️ Timeout Path (Stuck Job):
```
⏱️ Cleaned up subscription after timeout for job: {jobId}
```

---

## Alternative: Polling Fallback

If Realtime cannot be enabled, consider implementing polling fallback:

```typescript
// Poll workspace_assets table every 5 seconds instead of Realtime subscription
const pollForJobCompletion = async (jobId: string, messageId: string) => {
  const maxAttempts = 24; // 2 minutes total (24 * 5 seconds)
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    attempts++;

    const { data: asset } = await supabase
      .from('workspace_assets')
      .select('id, temp_storage_path, generation_settings')
      .eq('job_id', jobId)
      .maybeSingle();

    if (asset?.temp_storage_path) {
      // Asset found - update message
      const sceneId = (asset.generation_settings as any)?.scene_id;
      await updateMessageWithAsset({ ...asset, scene_id: sceneId });
      clearInterval(pollInterval);
    } else if (attempts >= maxAttempts) {
      // Timeout - stop polling
      console.warn('⏱️ Polling timeout for job:', jobId);
      clearInterval(pollInterval);
    }
  }, 5000);
};
```

**Pros:**
- Works without Realtime enabled
- Simpler implementation
- No WebSocket connection failures

**Cons:**
- Higher database query cost
- 5-10 second delay in updates
- Less efficient than Realtime

---

## Next Steps

1. ✅ **Code Fixes Applied** - Subscription cleanup and error handling implemented
2. ⚠️ **Verify Realtime Status** - Check if enabled in Supabase project settings
3. 🔵 **Test Complete Flow** - Run through all test cases above
4. 🔵 **Monitor Production** - Watch for WebSocket errors in user sessions
5. 🔵 **Consider Polling Fallback** - If Realtime can't be enabled, implement polling

---

## Related Files

- [src/pages/MobileRoleplayChat.tsx](../../../src/pages/MobileRoleplayChat.tsx) - Fixed subscription cleanup and error handling
- [docs/01-PAGES/07-ROLEPLAY/SCENE_INVESTIGATION_JAN11.md](./SCENE_INVESTIGATION_JAN11.md) - Related scene system fixes

---

**Document Purpose:** Track WebSocket connection error investigation, root causes, fixes applied, and testing procedures for Supabase Realtime subscriptions in roleplay chat.
