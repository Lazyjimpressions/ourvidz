import { supabase } from '@/integrations/supabase/client';
import { normalizeSignedUrl } from '@/lib/utils/normalizeSignedUrl';

// Import for mobile detection
declare const navigator: Navigator | undefined;

type CacheKey = string; // `${bucket}:${path}`

interface CachedUrlEntry {
  signedUrl: string;
  expiresAt: number; // epoch ms
}

/**
 * Simple in-memory signed URL cache with TTL awareness.
 * - Keys are `${bucket}:${storagePath}`
 * - Reuses URLs until 60s before expiry; refreshes on demand
 * - Always returns ABSOLUTE URLs (normalized)
 */
class UrlCacheImpl {
  private cache: Map<CacheKey, CachedUrlEntry> = new Map();
  private pending: Map<CacheKey, Promise<string>> = new Map();
  private refreshSkewMs = 60_000; // refresh 60s before expiry

  private key(bucket: string, storagePath: string): CacheKey {
    return `${bucket}:${storagePath}`;
  }

  getCached(bucket: string, storagePath: string): string | null {
    const k = this.key(bucket, storagePath);
    const entry = this.cache.get(k);
    if (!entry) return null;
    const now = Date.now();
    if (entry.expiresAt - now <= this.refreshSkewMs) {
      return null;
    }
    return entry.signedUrl;
  }

  async getSignedUrl(bucket: string, storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const k = this.key(bucket, storagePath);
    const cached = this.getCached(bucket, storagePath);
    if (cached) return cached;

    // Coalesce concurrent sign requests for same key
    const existing = this.pending.get(k);
    if (existing) return existing;

    const promise = (async () => {
      // RELAXED AUTH: Try getSession first (cheap, local), only fail after retries
      let user = null;
      let retries = 0;
      const maxRetries = 3;
      const retryDelayMs = 200;

      while (!user && retries < maxRetries) {
        try {
          // Prefer getSession (local, fast) over getUser (network call)
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
          
          if (!user && retries < maxRetries - 1) {
            // Wait before retry - auth may still be initializing
            await new Promise(r => setTimeout(r, retryDelayMs));
          }
        } catch (authError) {
          console.warn(`⚠️ UrlCache: Auth check attempt ${retries + 1} failed:`, authError);
        }
        retries++;
      }

      if (!user) {
        console.error(`❌ UrlCache: No authenticated user after ${maxRetries} attempts`);
        this.pending.delete(k);
        throw new Error('User must be authenticated to generate signed URLs');
      }

      console.log(`🔐 UrlCache: Generating signed URL for ${bucket}/${storagePath.substring(0, 40)}... (user: ${user.id.substring(0, 8)}...)`);
      
      // Use longer expiration on mobile (24 hours) to reduce network issues
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const effectiveExpiry = isMobile ? Math.max(expiresInSeconds, 86400) : expiresInSeconds;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, effectiveExpiry);
        
      if (error || !data?.signedUrl) {
        console.error(`❌ UrlCache: Failed to create signed URL for ${bucket}/${storagePath.substring(0, 40)}...:`, error?.message || 'No signed URL returned');
        this.pending.delete(k);
        throw error || new Error('Failed to create signed URL');
      }
      
      // CRITICAL: Normalize to absolute URL (Supabase may return relative paths)
      const absoluteUrl = normalizeSignedUrl(data.signedUrl);
      if (!absoluteUrl) {
        this.pending.delete(k);
        throw new Error('Failed to normalize signed URL');
      }
      
      const expiresAt = Date.now() + effectiveExpiry * 1000;
      this.cache.set(k, { signedUrl: absoluteUrl, expiresAt });
      this.pending.delete(k);
      console.log(`✅ UrlCache: Generated signed URL (expires in ${Math.round(effectiveExpiry / 3600)}h)`);
      return absoluteUrl;
    })();

    this.pending.set(k, promise);
    return promise;
  }

  // Invalidate specific cached URLs
  invalidate(bucket: string, storagePath: string): void {
    const k = this.key(bucket, storagePath);
    this.cache.delete(k);
    this.pending.delete(k);
  }

  // Invalidate cache entries by pattern (e.g., all URLs for a user)
  invalidateByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pending.keys()) {
      if (key.includes(pattern)) {
        this.pending.delete(key);
      }
    }
  }

  // Clear all cached URLs
  clearAll(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

export const UrlCache = new UrlCacheImpl();


