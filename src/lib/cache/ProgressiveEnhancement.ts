/**
 * Progressive enhancement and smart prefetching system
 * Provides intelligent preloading based on user behavior and context
 */

import { memoryManager } from './MemoryManager';
import { sessionCache } from './SessionCache';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface UserBehaviorData {
  viewedAssets: string[];
  searchPatterns: string[];
  filterPreferences: Record<string, any>;
  timeSpentInLibrary: number;
  lastVisit: number;
}

interface PrefetchStrategy {
  priority: number;
  confidence: number;
  reason: string;
}

export class ProgressiveEnhancement {
  private static instance: ProgressiveEnhancement;
  private behaviorData: UserBehaviorData;
  private prefetchQueue: Array<{ asset: UnifiedAsset; strategy: PrefetchStrategy }> = [];
  private isProcessingQueue = false;
  private prefetchWorker: Worker | null = null;

  private constructor() {
    this.behaviorData = this.loadBehaviorData();
    this.initializePrefetchWorker();
  }

  static getInstance(): ProgressiveEnhancement {
    if (!ProgressiveEnhancement.instance) {
      ProgressiveEnhancement.instance = new ProgressiveEnhancement();
    }
    return ProgressiveEnhancement.instance;
  }

  // Smart prefetching based on user behavior
  analyzeAndPrefetch(assets: UnifiedAsset[], currentFilters: any): void {
    console.log('🔮 Analyzing user behavior for smart prefetching');
    
    const strategies = this.calculatePrefetchStrategies(assets, currentFilters);
    
    // Sort by priority and confidence
    const prioritizedAssets = strategies
      .sort((a, b) => (b.strategy.priority * b.strategy.confidence) - (a.strategy.priority * a.strategy.confidence))
      .slice(0, 10); // Limit to top 10

    // Add to prefetch queue
    this.prefetchQueue.push(...prioritizedAssets);
    this.processPrefetchQueue();
  }

  private calculatePrefetchStrategies(assets: UnifiedAsset[], currentFilters: any): Array<{ asset: UnifiedAsset; strategy: PrefetchStrategy }> {
    return assets.map(asset => ({
      asset,
      strategy: this.calculateAssetStrategy(asset, currentFilters)
    }));
  }

  private calculateAssetStrategy(asset: UnifiedAsset, currentFilters: any): PrefetchStrategy {
    let priority = 1;
    let confidence = 0.5;
    const reasons: string[] = [];

    // Recently viewed similar assets - check if any previously viewed assets have same type
    const hasSimilarViewedAssets = this.behaviorData.viewedAssets.some(viewedId => {
      // This is a simple heuristic - in a real app you'd have more sophisticated similarity detection
      return viewedId.includes(asset.type);
    });
    
    if (hasSimilarViewedAssets) {
      priority += 3;
      confidence += 0.3;
      reasons.push('similar content viewed');
    }

    // Matches search patterns
    if (this.behaviorData.searchPatterns.some(pattern => 
      asset.prompt.toLowerCase().includes(pattern.toLowerCase()))) {
      priority += 2;
      confidence += 0.2;
      reasons.push('matches search history');
    }

    // Matches filter preferences
    if (this.behaviorData.filterPreferences.type === asset.type) {
      priority += 1;
      confidence += 0.1;
      reasons.push('matches filter preference');
    }

    // High quality assets get priority
    if (asset.quality === 'high') {
      priority += 1;
      confidence += 0.1;
      reasons.push('high quality');
    }

    // Recent assets get slight priority
    const daysSinceCreated = (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      priority += 1;
      confidence += 0.1;
      reasons.push('recent content');
    }

    return {
      priority: Math.min(priority, 10),
      confidence: Math.min(confidence, 1),
      reason: reasons.join(', ')
    };
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.isProcessingQueue || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🚀 Processing prefetch queue: ${this.prefetchQueue.length} items`);

    const memoryStats = memoryManager.getMemoryStats();
    
    // Adjust prefetch rate based on memory pressure
    const batchSize = memoryStats.pressureLevel === 'low' ? 3 : 
                     memoryStats.pressureLevel === 'medium' ? 2 : 1;

    while (this.prefetchQueue.length > 0 && memoryStats.pressureLevel !== 'critical') {
      const batch = this.prefetchQueue.splice(0, batchSize);
      
      try {
        await Promise.all(
          batch.map(({ asset, strategy }) => this.prefetchAsset(asset, strategy))
        );
        
        // Small delay between batches to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn('Prefetch batch failed:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async prefetchAsset(asset: UnifiedAsset, strategy: PrefetchStrategy): Promise<void> {
    try {
      console.log(`🔄 Prefetching asset ${asset.id} (${strategy.reason})`);
      
      // Register with memory manager
      memoryManager.registerAsset(asset.id, 1024, 'low');
      
      // Generate URLs in background
      const enhancedAsset = await OptimizedAssetService.generateAssetUrls(asset);
      
      // Cache the URLs
      if (enhancedAsset.url) {
        sessionCache.cacheSignedUrl(asset.id, enhancedAsset.url);
      }
      
      // Update behavior data
      this.updateBehaviorData('prefetched', asset);
      
    } catch (error) {
      console.warn(`Failed to prefetch asset ${asset.id}:`, error);
    }
  }

  // Track user behavior for improved predictions
  trackAssetView(asset: UnifiedAsset): void {
    this.behaviorData.viewedAssets.unshift(asset.id);
    this.behaviorData.viewedAssets = this.behaviorData.viewedAssets.slice(0, 50); // Keep last 50
    
    this.updateBehaviorData('viewed', asset);
    this.saveBehaviorData();
  }

  trackSearch(searchTerm: string): void {
    if (searchTerm.trim().length > 0) {
      this.behaviorData.searchPatterns.unshift(searchTerm);
      this.behaviorData.searchPatterns = this.behaviorData.searchPatterns.slice(0, 20); // Keep last 20
      this.saveBehaviorData();
    }
  }

  trackFilterChange(filters: any): void {
    this.behaviorData.filterPreferences = { ...this.behaviorData.filterPreferences, ...filters };
    this.saveBehaviorData();
  }

  trackLibraryTime(timeSpent: number): void {
    this.behaviorData.timeSpentInLibrary += timeSpent;
    this.behaviorData.lastVisit = Date.now();
    this.saveBehaviorData();
  }

  // Offline caching for frequently accessed assets
  enableOfflineMode(assets: UnifiedAsset[]): void {
    console.log('📱 Enabling offline mode for frequently accessed assets');
    
    const frequentAssets = assets
      .filter(asset => this.behaviorData.viewedAssets.includes(asset.id))
      .slice(0, 10); // Top 10 frequently accessed

    frequentAssets.forEach(asset => {
      this.cacheAssetForOffline(asset);
    });
  }

  private async cacheAssetForOffline(asset: UnifiedAsset): Promise<void> {
    try {
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cache = await caches.open('library-assets-v1');
        const enhancedAsset = await OptimizedAssetService.generateAssetUrls(asset);
        
        if (enhancedAsset.url) {
          await cache.add(enhancedAsset.url);
          console.log(`📦 Cached asset for offline: ${asset.id}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to cache asset for offline: ${asset.id}`, error);
    }
  }

  private initializePrefetchWorker(): void {
    if ('Worker' in window) {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            if (type === 'prefetch') {
              // Simulate background prefetching work
              setTimeout(() => {
                self.postMessage({ type: 'prefetch-complete', assetId: data.assetId });
              }, 100);
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.prefetchWorker = new Worker(URL.createObjectURL(blob));
        
        this.prefetchWorker.onmessage = (e) => {
          console.log('Worker message:', e.data);
        };
        
      } catch (error) {
        console.warn('Failed to initialize prefetch worker:', error);
      }
    }
  }

  private updateBehaviorData(action: string, asset: UnifiedAsset): void {
    // Update learning data for better predictions
    console.log(`📊 Behavior: ${action} asset ${asset.type} (${asset.modelType})`);
  }

  private loadBehaviorData(): UserBehaviorData {
    const stored = localStorage.getItem('library-behavior-data');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to load behavior data:', error);
      }
    }

    return {
      viewedAssets: [],
      searchPatterns: [],
      filterPreferences: {},
      timeSpentInLibrary: 0,
      lastVisit: Date.now()
    };
  }

  private saveBehaviorData(): void {
    try {
      localStorage.setItem('library-behavior-data', JSON.stringify(this.behaviorData));
    } catch (error) {
      console.warn('Failed to save behavior data:', error);
    }
  }

  destroy(): void {
    if (this.prefetchWorker) {
      this.prefetchWorker.terminate();
    }
    this.prefetchQueue = [];
  }
}

// Global instance
export const progressiveEnhancement = ProgressiveEnhancement.getInstance();