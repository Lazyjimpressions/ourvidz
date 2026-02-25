

# Fix: fal.ai Can't Access workspace-temp Signed URLs

## Root Cause

The `fal-image` edge function's re-signing logic correctly detects anon-signed Supabase URLs and tries to re-sign them with the service role. However, **re-signing fails with "Object not found"** for `workspace-temp` files. This means fal.ai receives the original anon-signed URL, which it cannot download externally.

This likely started because:
- More generation flows now use `workspace-temp` URLs (e.g., using generated images as references), whereas before most refs came from `reference_images` or `user-library`
- The `workspace-temp` bucket may have restrictive storage policies

## Fix Strategy

Instead of re-signing (which fails), **download the file server-side and upload it to fal.ai's CDN**, or more practically: **generate a public URL** instead.

**Simpler approach**: When re-signing fails, try creating a **public URL** or use Supabase's `getPublicUrl` as a fallback. But since workspace-temp is private, the best fix is:

### Option: Send raw storage path instead of pre-signed URL from frontend

**File: `src/hooks/useLibraryFirstWorkspace.ts`**

When building `image_urls` / `image_url` for the generation request, send the **raw storage path** (e.g., `workspace-temp/userId/file.png`) instead of the pre-signed URL. The edge function already handles raw paths correctly — it signs them with the service role key.

### Changes

1. **`src/hooks/useLibraryFirstWorkspace.ts`** — When building `allRefUrls` and `inputObj.image_url(s)`, strip signed URLs back to raw storage paths before sending to the edge function
   - Detect Supabase signed URLs (contain `/object/sign/`)
   - Extract `bucket/path` from the URL
   - Send that raw path instead

2. **`supabase/functions/fal-image/index.ts`** — Update `signIfStoragePath` to handle `workspace-temp/...` paths correctly (it already does via the `knownBuckets` logic on line 124, but verify the default bucket fallback)

### Implementation Detail

Add a utility function `stripToStoragePath(url)` in `useLibraryFirstWorkspace.ts`:

```text
Input:  https://xxx.supabase.co/storage/v1/object/sign/workspace-temp/userId/file.png?token=xxx
Output: workspace-temp/userId/file.png

Input:  https://xxx.supabase.co/storage/v1/object/sign/user-library/userId/file.png?token=xxx  
Output: user-library/userId/file.png

Input:  https://example.com/external-image.png (non-Supabase)
Output: https://example.com/external-image.png (unchanged)
```

This ensures the edge function always receives either:
- A raw storage path (which it signs server-side with service role -- works)
- An external URL (passed through -- works)

Never an anon-signed URL (which fal.ai can't download).

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useLibraryFirstWorkspace.ts` | Add `stripToStoragePath()` helper; apply it to all URLs in `allRefUrls` before adding to `inputObj` |
| `supabase/functions/fal-image/index.ts` | No changes needed -- existing `signIfStoragePath` already handles raw `workspace-temp/...` paths |

