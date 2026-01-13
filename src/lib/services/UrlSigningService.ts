import { supabase } from '@/integrations/supabase/client';
import { normalizeSignedUrl } from '@/lib/utils/normalizeSignedUrl';

export type SignOptions = { 
  ttlSec: number;
};

type CacheEntry = {
  url: string;
  expiresAt: number;
};

// Global concurrency limiter for URL signing
class ConcurrencyLimiter {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrency = 4;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrency) {
        this.running++;
        task();
      } else {
        this.queue.push(() => {
          this.running++;
          return task();
        });
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

const concurrencyLimiter = new ConcurrencyLimiter();

export class UrlSigningService {
  private cache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<string>>();

  /**
   * Normalize storage path by removing bucket prefixes
   */
  private normalizePath(path: string, bucket: string): string {
    if (!path || path.trim() === '') return path;
    
    // Handle absolute URLs - return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Remove bucket prefix if present
    const bucketPrefixes = [bucket, 'workspace-temp', 'user-library'];
    for (const prefix of bucketPrefixes) {
      if (path.startsWith(`${prefix}/`)) {
        return path.substring(prefix.length + 1);
      }
    }
    
    return path;
  }

  /**
   * Check if path is an absolute URL
   */
  private isAbsoluteUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Get signed URLs for multiple storage paths, with batching and caching
   */
  async getSignedUrls(
    paths: string[], 
    bucket: 'workspace-temp' | 'user-library', 
    opts: SignOptions = { ttlSec: 3600 }
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const pathsToSign: string[] = [];

    // Check cache first
    for (const path of paths) {
      // Handle absolute URLs
      if (this.isAbsoluteUrl(path)) {
        result[path] = path;
        continue;
      }
      
      const normalizedPath = this.normalizePath(path, bucket);
      const cacheKey = `${bucket}:${normalizedPath}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        result[path] = cached.url;
      } else {
        pathsToSign.push(path);
      }
    }

    if (pathsToSign.length === 0) {
      return result;
    }

    // Batch sign remaining paths in chunks of 20
    const batchSize = 20;
    for (let i = 0; i < pathsToSign.length; i += batchSize) {
      const batch = pathsToSign.slice(i, i + batchSize);
      const batchResults = await this.signBatch(batch, bucket, opts);
      Object.assign(result, batchResults);
    }

    return result;
  }

  /**
   * Get signed URL for a single storage path
   */
  async getSignedUrl(
    path: string, 
    bucket: 'workspace-temp' | 'user-library', 
    opts: SignOptions = { ttlSec: 3600 }
  ): Promise<string> {
    // Handle absolute URLs
    if (this.isAbsoluteUrl(path)) {
      return path;
    }
    
    const normalizedPath = this.normalizePath(path, bucket);
    const cacheKey = `${bucket}:${normalizedPath}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    // Check if already requesting
    if (this.inflightRequests.has(cacheKey)) {
      return this.inflightRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.createSignedUrl(normalizedPath, bucket, opts);
    this.inflightRequests.set(cacheKey, request);

    try {
      const url = await request;
      return url;
    } finally {
      this.inflightRequests.delete(cacheKey);
    }
  }

  /**
   * Prime cache with pre-signed URLs
   */
  primeCache(entries: Array<{ path: string; url: string; expiresAt: number; bucket: string }>): void {
    for (const entry of entries) {
      const cacheKey = `${entry.bucket}:${entry.path}`;
      this.cache.set(cacheKey, {
        url: entry.url,
        expiresAt: entry.expiresAt
      });
    }
  }

  /**
   * Evict cached entry
   */
  evict(path: string, bucket?: string): void {
    if (bucket) {
      this.cache.delete(`${bucket}:${path}`);
    } else {
      // Evict from all buckets
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.endsWith(`:${path}`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  private async signBatch(
    paths: string[], 
    bucket: 'workspace-temp' | 'user-library', 
    opts: SignOptions
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    // Sign each path individually (Supabase doesn't have batch signing)
    const promises = paths.map(async (path) => {
      // Handle absolute URLs
      if (this.isAbsoluteUrl(path)) {
        return { path, url: path };
      }
      
      const normalizedPath = this.normalizePath(path, bucket);
      const cacheKey = `${bucket}:${normalizedPath}`;
      
      // Check if already requesting
      if (this.inflightRequests.has(cacheKey)) {
        const url = await this.inflightRequests.get(cacheKey)!;
        return { path, url };
      }

      const request = this.createSignedUrl(normalizedPath, bucket, opts);
      this.inflightRequests.set(cacheKey, request);

      try {
        const url = await request;
        return { path, url };
      } finally {
        this.inflightRequests.delete(cacheKey);
      }
    });

    const results = await Promise.allSettled(promises);
    
    for (const res of results) {
      if (res.status === 'fulfilled') {
        const { path, url } = res.value;
        result[path] = url;
      }
    }

    return result;
  }

  private async createSignedUrl(
    path: string, 
    bucket: 'workspace-temp' | 'user-library', 
    opts: SignOptions
  ): Promise<string> {
    // Use concurrency limiter to prevent overwhelming the system
    return concurrencyLimiter.execute(async () => {
      try {
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
            console.warn(`⚠️ UrlSigningService: Auth check attempt ${retries + 1} failed:`, authError);
          }
          retries++;
        }

        if (!user) {
          console.error(`❌ UrlSigningService: No authenticated user after ${maxRetries} attempts for ${bucket}:${path}`);
          throw new Error('User must be authenticated to generate signed URLs');
        }

        // Use longer expiration on mobile (24 hours) to reduce network issues
        const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const effectiveExpiry = isMobile ? Math.max(opts.ttlSec, 86400) : opts.ttlSec;
        
        console.log(`🔐 UrlSigningService: Generating signed URL for ${bucket}/${path.substring(0, 40)}... (user: ${user.id.substring(0, 8)}..., expiry: ${Math.round(effectiveExpiry / 3600)}h)`);

        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, effectiveExpiry);

        if (error) {
          console.error(`❌ UrlSigningService: Failed to sign URL ${bucket}:${path}:`, error);
          throw error;
        }

        if (!data?.signedUrl) {
          throw new Error(`No signed URL returned for ${bucket}:${path}`);
        }

        // CRITICAL: Normalize to absolute URL (Supabase may return relative paths)
        const absoluteUrl = normalizeSignedUrl(data.signedUrl);
        if (!absoluteUrl) {
          throw new Error(`Failed to normalize signed URL for ${bucket}:${path}`);
        }

        // Cache the result (use effectiveExpiry for cache TTL)
        const cacheKey = `${bucket}:${path}`;
        this.cache.set(cacheKey, {
          url: absoluteUrl,
          expiresAt: Date.now() + (effectiveExpiry * 1000) - 60000 // Expire 1min early
        });

        console.log(`✅ UrlSigningService: Generated signed URL (expires in ${Math.round(effectiveExpiry / 3600)}h)`);
        return absoluteUrl;
      } catch (error) {
        console.error(`❌ UrlSigningService: Error signing URL ${bucket}:${path}:`, error);
        throw error;
      }
    });
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Singleton instance
export const urlSigningService = new UrlSigningService();

// Auto cleanup every 5 minutes
setInterval(() => {
  urlSigningService.cleanupCache();
}, 5 * 60 * 1000);