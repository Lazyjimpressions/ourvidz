/**
 * Normalize Supabase Storage signed URLs to always be absolute.
 * 
 * Supabase's createSignedUrl can return relative paths like:
 *   /object/sign/bucket/path?token=...
 * 
 * This utility converts them to absolute URLs:
 *   https://<project>.supabase.co/storage/v1/object/sign/bucket/path?token=...
 */

const SUPABASE_PROJECT_REF = 'ulmdmzhcdwfadbvfpckt';
const SUPABASE_STORAGE_BASE = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1`;

export function normalizeSignedUrl(signedUrl: string | null | undefined): string | null {
  if (!signedUrl) {
    return null;
  }

  // Already absolute - return as-is
  if (signedUrl.startsWith('http://') || signedUrl.startsWith('https://')) {
    return signedUrl;
  }

  // Relative path starting with /object/sign/... - make absolute
  if (signedUrl.startsWith('/object/')) {
    const absoluteUrl = `${SUPABASE_STORAGE_BASE}${signedUrl}`;
    console.log('⚠️ Normalized relative signed URL to absolute:', {
      original: signedUrl.substring(0, 50) + '...',
      absolute: absoluteUrl.substring(0, 80) + '...'
    });
    return absoluteUrl;
  }

  // Other relative paths (shouldn't happen, but handle gracefully)
  if (signedUrl.startsWith('/')) {
    const absoluteUrl = `${SUPABASE_STORAGE_BASE}${signedUrl}`;
    console.warn('⚠️ Normalized unexpected relative path:', signedUrl.substring(0, 50));
    return absoluteUrl;
  }

  // Not a URL we recognize - return as-is but log
  console.warn('⚠️ Unrecognized signed URL format:', signedUrl.substring(0, 50));
  return signedUrl;
}

/**
 * Check if a URL is properly absolute (not relative)
 */
export function isAbsoluteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
