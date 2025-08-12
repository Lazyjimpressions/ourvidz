/**
 * Advanced caching system with stale-while-revalidate pattern
 * Provides instant cache hits while refreshing data in the background
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  refreshPromise?: Promise<T>;
}

interface CacheOptions {
  staleTime: number;    // Time before data becomes stale
  maxAge: number;       // Time before data expires completely
  maxSize?: number;     // Maximum cache entries
}

export class StaleWhileRevalidateCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  
  constructor(options: CacheOptions) {
    this.options = {
      maxSize: 100,
      ...options
    };
  }

  async get(
    key: string, 
    fetchFn: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    try {
      const now = Date.now();
      const entry = this.cache.get(key);

      // Force refresh bypasses all caching
      if (forceRefresh) {
        this.cache.delete(key);
        const data = await fetchFn();
        this.set(key, data);
        return data;
      }

      // No cache entry - fetch fresh data
      if (!entry) {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      }

      // Data is expired - fetch fresh data
      if (now > entry.timestamp + this.options.maxAge) {
        this.cache.delete(key);
        const data = await fetchFn();
        this.set(key, data);
        return data;
      }

      // Data is fresh - return immediately
      if (now < entry.staleAt) {
        return entry.data;
      }

      // Data is stale - return cached data and refresh in background
      if (!entry.refreshPromise) {
        entry.refreshPromise = fetchFn()
          .then(data => {
            this.set(key, data);
            return data;
          })
          .catch(error => {
            console.warn('Background refresh failed for key:', key, error);
            return entry.data; // Return stale data on error
          })
          .finally(() => {
            if (this.cache.has(key)) {
              delete this.cache.get(key)!.refreshPromise;
            }
          });
      }

      return entry.data; // Return stale data immediately
    } catch (error) {
      console.error('Cache error, falling back to direct fetch:', error);
      return fetchFn(); // Fallback to direct fetch if cache fails
    }
  }

  set(key: string, data: T): void {
    const now = Date.now();
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.options.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      staleAt: now + this.options.staleTime,
    });
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.includes(keyPattern));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now < entry.staleAt) {
        fresh++;
      } else if (now < entry.timestamp + this.options.maxAge) {
        stale++;
      } else {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      fresh,
      stale,
      expired,
      hitRate: fresh / (fresh + stale + expired) || 0
    };
  }
}

// Global cache instances - optimized TTLs
export const assetMetadataCache = new StaleWhileRevalidateCache({
  staleTime: 15 * 60 * 1000,    // 15 minutes (longer for metadata)
  maxAge: 60 * 60 * 1000,       // 1 hour
  maxSize: 1000
});

export const assetUrlCache = new StaleWhileRevalidateCache({
  staleTime: 30 * 60 * 1000,    // 30 minutes (Supabase default)
  maxAge: 2 * 60 * 60 * 1000,   // 2 hours (shorter refresh)
  maxSize: 2000
});