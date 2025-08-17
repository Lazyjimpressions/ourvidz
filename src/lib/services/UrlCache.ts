import { supabase } from '@/integrations/supabase/client';

type CacheKey = string; // `${bucket}:${path}`

interface CachedUrlEntry {
\tsignedUrl: string;
\texpiresAt: number; // epoch ms
}

/**
 * Simple in-memory signed URL cache with TTL awareness.
 * - Keys are `${bucket}:${storagePath}`
 * - Reuses URLs until 60s before expiry; refreshes on demand
 */
class UrlCacheImpl {
\tprivate cache: Map<CacheKey, CachedUrlEntry> = new Map();
\tprivate pending: Map<CacheKey, Promise<string>> = new Map();
\tprivate refreshSkewMs = 60_000; // refresh 60s before expiry

\tprivate key(bucket: string, storagePath: string): CacheKey {
\t\treturn `${bucket}:${storagePath}`;
\t}

\tgetCached(bucket: string, storagePath: string): string | null {
\t\tconst k = this.key(bucket, storagePath);
\t\tconst entry = this.cache.get(k);
\t\tif (!entry) return null;
\t\tconst now = Date.now();
\t\tif (entry.expiresAt - now <= this.refreshSkewMs) {
\t\t\treturn null;
\t\t}
\t\treturn entry.signedUrl;
\t}

\tasync getSignedUrl(bucket: string, storagePath: string, expiresInSeconds = 3600): Promise<string> {
\t\tconst k = this.key(bucket, storagePath);
\t\tconst cached = this.getCached(bucket, storagePath);
\t\tif (cached) return cached;

\t\t// Coalesce concurrent sign requests for same key
\t\tconst existing = this.pending.get(k);
\t\tif (existing) return existing;

\t\tconst promise = (async () => {
\t\t\tconst { data, error } = await supabase.storage
\t\t\t\t.from(bucket)
\t\t\t\t.createSignedUrl(storagePath, expiresInSeconds);
\t\t\tif (error || !data?.signedUrl) {
\t\t\t\tthis.pending.delete(k);
\t\t\t\tthrow error || new Error('Failed to create signed URL');
\t\t\t}
\t\t\tconst expiresAt = Date.now() + expiresInSeconds * 1000;
\t\t\tthis.cache.set(k, { signedUrl: data.signedUrl, expiresAt });
\t\t\tthis.pending.delete(k);
\t\t\treturn data.signedUrl;
\t\t})();

\t\tthis.pending.set(k, promise);
\t\treturn promise;
\t}
}

export const UrlCache = new UrlCacheImpl();


