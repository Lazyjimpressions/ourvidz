

# Fix: Video Generation Results Not Appearing Without Refresh

## Root Cause

The backend works perfectly -- all 3 video generations completed successfully via webhook. The problem is on the **client side**: the optimistic spinner tile disappears but the completed asset doesn't appear until manual page refresh.

Two issues cause this:

1. **Optimistic placeholder removed before real data arrives**: When the `workspace_assets` INSERT realtime event fires, the code immediately removes the optimistic placeholder tile AND adds the refetch to a 2-second debounce queue. During that 2s window, there is nothing to display -- the placeholder is gone and the real data hasn't been fetched yet.

2. **No polling fallback**: `useGenerationStatus` has `refetchInterval: false`, relying entirely on Supabase Realtime. If the realtime event is missed (network hiccup, cold channel), the UI never updates.

## Fix 1: Don't Remove Optimistic Placeholder Until Real Data Is in Cache

In `useLibraryFirstWorkspace.ts` (line 504-506), the optimistic placeholder is removed immediately on the realtime INSERT event. Instead, defer removal until after the query cache has been updated with real data.

```
// BEFORE: Remove placeholder immediately (causes flash of empty)
if (asset.job_id) {
  setOptimisticAssets(prev => prev.filter(a => a.metadata?.job_id !== asset.job_id));
}

// AFTER: Remove placeholder only after cache is refreshed
if (asset.job_id) {
  const jobId = asset.job_id;
  queryClient.invalidateQueries({ queryKey: ['assets', true] }).then(() => {
    setOptimisticAssets(prev => prev.filter(a => a.metadata?.job_id !== jobId));
  });
}
```

This ensures the spinner stays visible until the real asset tile is ready to render.

## Fix 2: Add Polling Fallback for Active Jobs

Add a safety-net polling interval in `useLibraryFirstWorkspace.ts` that checks for completed jobs when there are active optimistic placeholders. This catches cases where realtime events are missed.

When `optimisticAssets.length > 0`, set up a 5-second interval that queries the `jobs` table for any optimistic job IDs. If a job is `completed`, invalidate the assets cache and remove the placeholder.

This is a lightweight fallback (one query every 5s, only while generating) that guarantees delivery even if realtime fails.

## Fix 3: Immediate Cache Invalidation (Remove Debounce for Inserts)

The 2-second debounce on `localDebouncedInvalidate()` (line 486) is appropriate for batch operations but too slow for a single video completion. For INSERT events, invalidate immediately instead of debouncing.

```
// For INSERTs: invalidate immediately (user is waiting)
queryClient.invalidateQueries({ queryKey: ['assets', true] });

// Keep debounce only for DELETE events (batch operations)
```

## Files Changed

1. **`src/hooks/useLibraryFirstWorkspace.ts`**:
   - Defer optimistic placeholder removal until after cache refresh
   - Remove debounce for INSERT-triggered invalidation
   - Add polling fallback for active optimistic placeholders

No backend changes needed -- the webhook pipeline is working correctly.

## Technical Details

### Polling Fallback Implementation

```
useEffect(() => {
  if (optimisticAssets.length === 0) return;

  const interval = setInterval(async () => {
    const jobIds = optimisticAssets
      .map(a => a.metadata?.job_id)
      .filter(Boolean);

    if (jobIds.length === 0) return;

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status')
      .in('id', jobIds);

    const completedJobs = jobs?.filter(j => j.status === 'completed' || j.status === 'failed') || [];

    if (completedJobs.length > 0) {
      await queryClient.invalidateQueries({ queryKey: ['assets', true] });
      setOptimisticAssets(prev =>
        prev.filter(a => !completedJobs.some(j => j.id === a.metadata?.job_id))
      );
    }
  }, 5000);

  return () => clearInterval(interval);
}, [optimisticAssets, queryClient]);
```

### Why Not Just Fix Realtime?

Realtime is already working -- the `workspace_assets` and `jobs` tables are both in the `supabase_realtime` publication. The issue is timing: the placeholder is removed before the refetch completes. The polling fallback is a safety net, not the primary delivery mechanism.

