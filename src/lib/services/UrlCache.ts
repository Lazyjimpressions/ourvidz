import { supabase } from '@/integrations/supabase/client';

type CacheKey = string; // `${bucket}:${path}`

interface CachedUrlEntry {
  signedUrl: string;
  expiresAt: number; // epoch ms
}

/**
 * Simple in-memory signed URL cache with TTL awareness.
 * - Keys are `${bucket}:${storagePath}`
 * - Reuses URLs until 60s before expiry; refreshes on demand
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
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);
      if (error || !data?.signedUrl) {
        this.pending.delete(k);
        throw error || new Error('Failed to create signed URL');
      }
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      this.cache.set(k, { signedUrl: data.signedUrl, expiresAt });
      this.pending.delete(k);
      return data.signedUrl;
    })();

    this.pending.set(k, promise);
    return promise;
  }
}

export const UrlCache = new UrlCacheImpl();


