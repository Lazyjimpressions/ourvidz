/**
 * Advanced memory management for library assets
 * Handles cleanup, memory pressure detection, and asset lifecycle
 */

interface MemoryStats {
  totalMemory: number;
  usedMemory: number;
  assetCacheSize: number;
  sessionCacheSize: number;
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface AssetReference {
  id: string;
  lastAccessed: number;
  size: number;
  isVisible: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class MemoryManager {
  private static instance: MemoryManager;
  private assetReferences = new Map<string, AssetReference>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryObserver: PerformanceObserver | null = null;
  
  // Memory thresholds
  private readonly MEMORY_THRESHOLDS = {
    medium: 0.7,   // 70% memory usage
    high: 0.85,    // 85% memory usage
    critical: 0.95 // 95% memory usage
  };

  private readonly CLEANUP_INTERVALS = {
    low: 60000,     // 1 minute
    medium: 30000,  // 30 seconds  
    high: 15000,    // 15 seconds
    critical: 5000  // 5 seconds
  };

  private constructor() {
    this.initializeMemoryMonitoring();
    this.startPeriodicCleanup();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private initializeMemoryMonitoring(): void {
    // Monitor memory usage if supported
    if ('memory' in performance) {
      this.memoryObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'memory') {
            this.handleMemoryPressure();
          }
        });
      });
      
      try {
        this.memoryObserver.observe({ entryTypes: ['memory'] });
      } catch (error) {
        console.warn('Memory monitoring not supported:', error);
      }
    }
  }

  registerAsset(id: string, size: number = 1024, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    this.assetReferences.set(id, {
      id,
      lastAccessed: Date.now(),
      size,
      isVisible: false,
      priority
    });
  }

  updateAssetVisibility(id: string, isVisible: boolean): void {
    const asset = this.assetReferences.get(id);
    if (asset) {
      asset.isVisible = isVisible;
      asset.lastAccessed = Date.now();
    }
  }

  unregisterAsset(id: string): void {
    this.assetReferences.delete(id);
    
    // Clean up related caches
    this.cleanupAssetCaches(id);
  }

  getMemoryStats(): MemoryStats {
    const memInfo = (performance as any).memory;
    const totalMemory = memInfo?.jsHeapSizeLimit || 0;
    const usedMemory = memInfo?.usedJSHeapSize || 0;
    
    const assetCacheSize = this.calculateAssetCacheSize();
    const sessionCacheSize = this.calculateSessionCacheSize();
    
    const memoryRatio = totalMemory > 0 ? usedMemory / totalMemory : 0;
    
    let pressureLevel: MemoryStats['pressureLevel'] = 'low';
    if (memoryRatio > this.MEMORY_THRESHOLDS.critical) {
      pressureLevel = 'critical';
    } else if (memoryRatio > this.MEMORY_THRESHOLDS.high) {
      pressureLevel = 'high';
    } else if (memoryRatio > this.MEMORY_THRESHOLDS.medium) {
      pressureLevel = 'medium';
    }

    return {
      totalMemory,
      usedMemory,
      assetCacheSize,
      sessionCacheSize,
      pressureLevel
    };
  }

  private handleMemoryPressure(): void {
    const stats = this.getMemoryStats();
    console.log('🧠 Memory pressure detected:', stats.pressureLevel);

    switch (stats.pressureLevel) {
      case 'critical':
        this.aggressiveCleanup();
        break;
      case 'high':
        this.mediumCleanup();
        break;
      case 'medium':
        this.lightCleanup();
        break;
    }
  }

  private aggressiveCleanup(): void {
    console.log('🧹 Performing aggressive memory cleanup');
    
    // Remove all non-visible assets
    const assetsToRemove = Array.from(this.assetReferences.entries())
      .filter(([_, asset]) => !asset.isVisible)
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed); // Oldest first
    
    assetsToRemove.forEach(([id]) => {
      this.unregisterAsset(id);
    });

    // Clear session storage of old URLs
    this.cleanupOldSessionData(5 * 60 * 1000); // 5 minutes

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  private mediumCleanup(): void {
    console.log('🧹 Performing medium memory cleanup');
    
    // Remove low priority non-visible assets
    const assetsToRemove = Array.from(this.assetReferences.entries())
      .filter(([_, asset]) => !asset.isVisible && asset.priority === 'low')
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    assetsToRemove.slice(0, Math.floor(assetsToRemove.length / 2)).forEach(([id]) => {
      this.unregisterAsset(id);
    });

    this.cleanupOldSessionData(15 * 60 * 1000); // 15 minutes
  }

  private lightCleanup(): void {
    console.log('🧹 Performing light memory cleanup');
    
    // Remove oldest non-visible low priority assets
    const oldAssets = Array.from(this.assetReferences.entries())
      .filter(([_, asset]) => !asset.isVisible && asset.priority === 'low')
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
      .slice(0, 10); // Only remove 10 oldest
    
    oldAssets.forEach(([id]) => {
      this.unregisterAsset(id);
    });

    this.cleanupOldSessionData(30 * 60 * 1000); // 30 minutes
  }

  private startPeriodicCleanup(): void {
    const cleanup = () => {
      const stats = this.getMemoryStats();
      const interval = this.CLEANUP_INTERVALS[stats.pressureLevel];
      
      // Schedule next cleanup
      if (this.cleanupInterval) {
        clearTimeout(this.cleanupInterval);
      }
      
      this.cleanupInterval = setTimeout(cleanup, interval);
      
      // Perform cleanup based on pressure level
      if (stats.pressureLevel !== 'low') {
        this.handleMemoryPressure();
      }
    };

    cleanup();
  }

  private cleanupAssetCaches(assetId: string): void {
    // Clean up sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes(assetId)) {
        sessionStorage.removeItem(key);
      }
    });

    // Remove from any in-memory caches
    try {
      if ((window as any).assetUrlCache) {
        (window as any).assetUrlCache.delete(assetId);
      }
    } catch (error) {
      // Cache may not exist, ignore
    }
  }

  private cleanupOldSessionData(maxAge: number): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('asset_') || key.startsWith('url_')) {
        try {
          const data = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (data.timestamp && now - data.timestamp > maxAge) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove invalid entries
          keysToRemove.push(key);
        }
      }
    });

    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} old session entries`);
  }

  private calculateAssetCacheSize(): number {
    return Array.from(this.assetReferences.values())
      .reduce((total, asset) => total + asset.size, 0);
  }

  private calculateSessionCacheSize(): number {
    let totalSize = 0;
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('asset_') || key.startsWith('url_')) {
        totalSize += (sessionStorage.getItem(key) || '').length;
      }
    });
    return totalSize;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearTimeout(this.cleanupInterval);
    }
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
    this.assetReferences.clear();
  }
}

// Global instance
export const memoryManager = MemoryManager.getInstance();