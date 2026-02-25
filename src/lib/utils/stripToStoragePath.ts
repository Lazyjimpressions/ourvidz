/**
 * Strip Supabase signed URLs back to raw storage paths.
 * 
 * The fal-image edge function can sign raw paths with the service-role key,
 * but anon-signed URLs are not externally downloadable by fal.ai.
 * 
 * Examples:
 *   https://xxx.supabase.co/storage/v1/object/sign/workspace-temp/uid/file.png?token=xxx
 *   → workspace-temp/uid/file.png
 * 
 *   https://example.com/external.png → unchanged
 */
export function stripToStoragePath(url: string): string {
  if (!url) return url;

  // Match Supabase signed URLs: .../object/sign/<bucket>/<path>?token=...
  const match = url.match(/\/object\/sign\/([^?]+)/);
  if (match) {
    const raw = decodeURIComponent(match[1]);
    console.log('🔗 Stripped signed URL to storage path:', raw.substring(0, 60));
    return raw;
  }

  // Also strip public object URLs: .../object/public/<bucket>/<path>
  const pubMatch = url.match(/\/object\/public\/([^?]+)/);
  if (pubMatch) {
    return decodeURIComponent(pubMatch[1]);
  }

  return url;
}
