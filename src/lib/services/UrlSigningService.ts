import { supabase } from '@/integrations/supabase/client';

export type SignOptions = { 
  ttlSec: number;
};

type CacheEntry = {
  url: string;
  expiresAt: number;
};

export class UrlSigningService {
  private cache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<string>>();

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
      const cacheKey = `${bucket}:${path}`;
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
    const cacheKey = `${bucket}:${path}`;
    
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
    const request = this.createSignedUrl(path, bucket, opts);
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
      const cacheKey = `${bucket}:${path}`;
      
      // Check if already requesting
      if (this.inflightRequests.has(cacheKey)) {
        const url = await this.inflightRequests.get(cacheKey)!;
        return { path, url };
      }

      const request = this.createSignedUrl(path, bucket, opts);
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
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, opts.ttlSec);

      if (error) {
        console.error(`Failed to sign URL ${bucket}:${path}:`, error);
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(`No signed URL returned for ${bucket}:${path}`);
      }

      // Cache the result
      const cacheKey = `${bucket}:${path}`;
      this.cache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt: Date.now() + (opts.ttlSec * 1000) - 60000 // Expire 1min early
      });

      return data.signedUrl;
    } catch (error) {
      console.error(`Error signing URL ${bucket}:${path}:`, error);
      throw error;
    }
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