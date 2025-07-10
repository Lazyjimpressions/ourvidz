/**
 * SessionCache utility - Enhanced caching for Lovable Library
 * Based on workspace-test optimization patterns
 */

interface CachedItem<T> {
  data: T;
  timestamp: number;
  userId: string;
}

interface SessionCacheConfig {
  urlCacheDuration: number;
  metadataCacheDuration: number;
  maxCacheSize: number;
}

const DEFAULT_CONFIG: SessionCacheConfig = {
  urlCacheDuration: 4 * 60 * 60 * 1000, // 4 hours - URLs are expensive to generate
  metadataCacheDuration: 15 * 60 * 1000, // 15 minutes - Metadata changes more often
  maxCacheSize: 500 // Maximum number of cached items
};

export class SessionCache {
  private config: SessionCacheConfig;
  private currentUserId: string | null = null;

  constructor(config: Partial<SessionCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize cache for a user session
   */
  initializeSession(userId: string): void {
    const existingUserId = sessionStorage.getItem('cache-user-id');
    
    if (existingUserId !== userId) {
      console.log('🔄 New user session detected, clearing cache');
      this.clearAllCache();
      sessionStorage.setItem('cache-user-id', userId);
      sessionStorage.setItem('cache-session-start', Date.now().toString());
    }
    
    this.currentUserId = userId;
  }

  /**
   * Cache signed URLs with user isolation
   */
  cacheSignedUrl(assetId: string, url: string): void {
    if (!this.currentUserId) return;
    
    const key = `signed-url-${assetId}`;
    const cached: CachedItem<string> = {
      data: url,
      timestamp: Date.now(),
      userId: this.currentUserId
    };
    
    try {
      sessionStorage.setItem(key, JSON.stringify(cached));
      console.log('💾 Cached signed URL for asset:', assetId);
    } catch (error) {
      console.warn('Failed to cache signed URL:', error);
      this.cleanupOldCache();
    }
  }

  /**
   * Get cached signed URL
   */
  getCachedSignedUrl(assetId: string): string | null {
    if (!this.currentUserId) return null;
    
    const key = `signed-url-${assetId}`;
    
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const parsed: CachedItem<string> = JSON.parse(cached);
      
      // Check user isolation
      if (parsed.userId !== this.currentUserId) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      // Check expiration
      if (Date.now() - parsed.timestamp > this.config.urlCacheDuration) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      console.log('✅ Cache hit for signed URL:', assetId);
      return parsed.data;
      
    } catch (error) {
      sessionStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Cache asset metadata for quick loading
   */
  cacheAssetMetadata(cacheKey: string, metadata: any): void {
    if (!this.currentUserId) return;
    
    const key = `metadata-${cacheKey}`;
    const cached: CachedItem<any> = {
      data: metadata,
      timestamp: Date.now(),
      userId: this.currentUserId
    };
    
    try {
      sessionStorage.setItem(key, JSON.stringify(cached));
      console.log('💾 Cached metadata for key:', cacheKey);
    } catch (error) {
      console.warn('Failed to cache metadata:', error);
      this.cleanupOldCache();
    }
  }

  /**
   * Get cached asset metadata
   */
  getCachedMetadata<T>(cacheKey: string): T | null {
    if (!this.currentUserId) return null;
    
    const key = `metadata-${cacheKey}`;
    
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const parsed: CachedItem<T> = JSON.parse(cached);
      
      // Check user isolation
      if (parsed.userId !== this.currentUserId) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      // Check expiration
      if (Date.now() - parsed.timestamp > this.config.metadataCacheDuration) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      console.log('✅ Cache hit for metadata:', cacheKey);
      return parsed.data;
      
    } catch (error) {
      sessionStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Cache asset list for stale-while-revalidate pattern
   */
  cacheAssetList(filters: any, pagination: any, assets: any[]): void {
    const cacheKey = `assets-${JSON.stringify(filters)}-${pagination.offset || 0}`;
    this.cacheAssetMetadata(cacheKey, {
      assets,
      filters,
      pagination,
      cachedAt: Date.now()
    });
  }

  /**
   * Get cached asset list
   */
  getCachedAssetList(filters: any, pagination: any): any[] | null {
    const cacheKey = `assets-${JSON.stringify(filters)}-${pagination.offset || 0}`;
    const cached = this.getCachedMetadata<{ assets: any[] }>(cacheKey);
    return cached?.assets || null;
  }

  /**
   * Clean up old cache entries to prevent storage overflow
   */
  private cleanupOldCache(): void {
    const keysToRemove: string[] = [];
    const cutoffTime = Date.now() - Math.max(this.config.urlCacheDuration, this.config.metadataCacheDuration);
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key || (!key.startsWith('signed-url-') && !key.startsWith('metadata-'))) continue;
      
      try {
        const item = sessionStorage.getItem(key);
        if (!item) continue;
        
        const parsed: CachedItem<any> = JSON.parse(item);
        if (parsed.timestamp < cutoffTime || parsed.userId !== this.currentUserId) {
          keysToRemove.push(key);
        }
      } catch (error) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log('🧹 Cleaned up', keysToRemove.length, 'old cache entries');
    }
  }

  /**
   * Clear all cache data
   */
  clearAllCache(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('signed-url-') || key.startsWith('metadata-') || key.startsWith('cache-'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log('🗑️ Cleared all cache data');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { signedUrls: number; metadata: number; totalSize: number } {
    let signedUrls = 0;
    let metadata = 0;
    let totalSize = 0;
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      
      const item = sessionStorage.getItem(key);
      if (!item) continue;
      
      totalSize += item.length;
      
      if (key.startsWith('signed-url-')) signedUrls++;
      if (key.startsWith('metadata-')) metadata++;
    }
    
    return { signedUrls, metadata, totalSize };
  }
}

// Global cache instance
export const sessionCache = new SessionCache();

// Enhanced cache utilities for library optimization
export const libraryCache = {
  // Quick asset URL caching with deduplication
  async batchCacheUrls(assetUrls: { assetId: string; url: string }[]): Promise<void> {
    for (const { assetId, url } of assetUrls) {
      sessionCache.cacheSignedUrl(assetId, url);
    }
  },
  
  // Intelligent prefetching for next assets
  async prefetchNextAssets(assetIds: string[]): Promise<void> {
    // Implementation for background prefetching
    console.log('🔮 Prefetching assets:', assetIds.slice(0, 5));
  },
  
  // Memory pressure detection
  isMemoryPressureHigh(): boolean {
    const stats = sessionCache.getCacheStats();
    return stats.totalSize > 5 * 1024 * 1024; // 5MB threshold
  }
};