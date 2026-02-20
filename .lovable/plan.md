
# Fix: Images on Generate Page Only Resolve After Visiting Library

## Root Cause

There are two compounding issues that cause images not to resolve on the Generate Images page unless the library page was visited first.

### Issue 1: `SessionCache.currentUserId` is never set on the Generate page

`SessionCache` is a singleton with `currentUserId = null` by default. Its `getCachedSignedUrl` and `cacheSignedUrl` methods silently return `null` when `currentUserId` is not set. The only place `initializeSession(userId)` is called is inside `useOptimizedWorkspaceUrls` — but the Generate page (`SimplifiedWorkspace`) only calls `useOptimizedWorkspaceUrls` **after** `useLibraryFirstWorkspace` initializes, and the `initializeSession` call inside it is an async `useEffect` that fires after render. Meanwhile, `useLazyAssetsV3` checks the session cache first, gets `null` back, and proceeds to the IntersectionObserver path.

### Issue 2: IntersectionObserver race condition in `useLazyAssetsV3`

The IntersectionObserver in `useLazyAssetsV3` is set up in a `useEffect` that runs **after** the initial render. The `loadAssetUrls` callback is **not** a dependency of the observer effect (intentionally removed to prevent loops). This means:

1. Assets render with raw (unsigned) storage paths as their `url`
2. The `IntersectionObserver` triggers entries for visible assets  
3. It calls `loadAssetUrls` from the closure — but this is the **stale closure version** that doesn't include newly-added assets
4. The batch queue fires but `lazyAssets` in `processBatchQueue` is the old empty array

When the library page is visited first, `UrlSigningService`'s **in-memory cache** gets populated (because `useSignedAssets` eagerly signs all paths in a `useEffect` batch). When you then navigate to the Generate page, `UrlSigningService.getSignedUrl()` returns immediately from its cache — bypassing the stale closure issue entirely.

## The Fix

### Fix 1: Initialize `SessionCache` at the app level (root cause fix)

Move `sessionCache.initializeSession(userId)` to the `AuthContext` or to `App.tsx` so it runs once when the user is authenticated — not lazily inside a specific page hook.

**File: `src/contexts/AuthContext.tsx`**

Add a `useEffect` that calls `sessionCache.initializeSession(user.id)` whenever the auth user changes. This ensures the session cache is always ready before any page tries to use it.

### Fix 2: Eagerly sign workspace asset thumbnails on mount (parallel fix)

In `SimplifiedWorkspace.tsx`, the page already calls `useSignedAssets(sharedAssets, 'workspace-temp', ...)` which will eagerly batch-sign all thumbnail paths via the `UrlSigningService`. However, `sharedAssets` is derived from `workspaceAssets` which comes from `useAssetsWithDebounce`. The debounce is 2000ms — meaning the signing doesn't start for 2 seconds after mount.

The fix is to use `useSignedAssets` results (already computed in `SimplifiedWorkspace`) as the actual data passed to `SharedGrid` instead of falling through to the `useOptimizedWorkspaceUrls` / `useLazyAssetsV3` path. Currently the `signedAssets` variable is computed but **never actually used** — `SharedGrid` still receives the assets from `useLibraryFirstWorkspace` which go through the lazy IntersectionObserver path.

**File: `src/pages/SimplifiedWorkspace.tsx`**

Wire `signedAssets` (the output of `useSignedAssets`) into the `SharedGrid` component as the assets source instead of `workspaceAssets` from the hook. This makes the Generate page use the same eager-signing strategy as the Library page.

### Fix 3: Remove the `currentUserId` guard from SessionCache for URL caching

The `currentUserId` guard in `SessionCache.cacheSignedUrl` and `getCachedSignedUrl` silently drops all caching when not initialized. This makes failures silent and hard to debug.

**File: `src/lib/cache/SessionCache.ts`**

Use the user ID from `sessionStorage` as a fallback when `currentUserId` is not set, or simply remove the early-return guard from `getCachedSignedUrl` when a cached value exists but `currentUserId` is null (the isolation check already handles cross-user leakage).

## Technical Details

### Files to Change

| File | Change | Risk |
|------|--------|------|
| `src/contexts/AuthContext.tsx` | Call `sessionCache.initializeSession(user.id)` on auth state change | Very Low |
| `src/pages/SimplifiedWorkspace.tsx` | Pass `signedAssets` to `SharedGrid` instead of `workspaceAssets` | Low |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Same wiring fix for mobile | Low |
| `src/lib/cache/SessionCache.ts` | Remove silent no-op when `currentUserId` is null | Low |

### Data Flow After Fix

```text
App mounts → AuthContext sets user → sessionCache.initializeSession() called immediately
     ↓
Navigate to Generate Images
     ↓
useAssetsWithDebounce loads assets (2s debounce)
     ↓
sharedAssets mapped → useSignedAssets eagerly signs all thumbs
     ↓
signedAssets (with thumbUrl set) passed to SharedGrid
     ↓
Images render immediately with signed URLs ✓
```

### No Changes Needed To
- `useLazyAssetsV3` — the IntersectionObserver lazy-load path still works for large grids, just won't be the primary URL source for workspace thumbnails
- `useOptimizedWorkspaceUrls` — still used for `signedUrls` Map and `registerAssetRef`
- `UrlSigningService` — already works correctly once session is initialized
