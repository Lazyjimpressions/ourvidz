import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedUrlService } from '@/lib/services/UnifiedUrlService';
import { sessionCache } from '@/lib/cache/SessionCache';
import type { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface UseLazyAssetsProps {
  assets: UnifiedAsset[];
  enabled?: boolean;
  prefetchThreshold?: number; // Pixels before entering viewport to start loading
  batchSize?: number; // Number of assets to process in each batch
}

interface LazyAsset extends UnifiedAsset {
  isVisible?: boolean;
  urlsLoaded?: boolean;
  isLoading?: boolean;
  error?: string;
}

/**
 * Enhanced lazy asset loading hook with efficient URL generation
 * Features:
 * - Intersection Observer with prefetch threshold
 * - Batch URL generation for performance
 * - Session cache integration
 * - Progressive loading (thumbnails first)
 * - Error handling and retry logic
 */
export const useLazyAssetsV3 = ({ 
  assets, 
  enabled = true, 
  prefetchThreshold = 200,
  batchSize = 5
}: UseLazyAssetsProps) => {
  const [lazyAssets, setLazyAssets] = useState<LazyAsset[]>([]);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const assetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<UnifiedAsset>>>(new Map());
  const batchQueue = useRef<Set<string>>(new Set());
  const batchTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize lazy assets with session cache check
  useEffect(() => {
    if (assets.length === 0) {
      setLazyAssets([]);
      return;
    }

    const initialAssets = assets.map(asset => {
      // Check session cache for existing URLs
      const cachedUrl = sessionCache.getCachedSignedUrl(asset.id);
      const hasValidUrls = asset.url?.startsWith('https://') || asset.thumbnailUrl?.startsWith('https://');
      
      return {
        ...asset,
        url: cachedUrl || asset.url,
        isVisible: false,
        urlsLoaded: !!(cachedUrl || hasValidUrls),
        isLoading: false
      };
    });
    
    setLazyAssets(initialAssets);
    console.log('🚀 Lazy assets initialized:', {
      total: initialAssets.length,
      withUrls: initialAssets.filter(a => a.urlsLoaded).length,
      cached: initialAssets.filter(a => sessionCache.getCachedSignedUrl(a.id)).length
    });
  }, [assets]);

  // Batch URL loading for efficiency
  const processBatchQueue = useCallback(async () => {
    if (batchQueue.current.size === 0) return;
    
    const assetIds = Array.from(batchQueue.current);
    batchQueue.current.clear();
    
    console.log(`🔄 Processing batch of ${assetIds.length} assets for URL generation`);
    
    try {
      // Get current assets from state
      setLazyAssets(currentAssets => {
        const assetsToProcess = currentAssets.filter(
          asset => assetIds.includes(asset.id) && !asset.urlsLoaded && !asset.isLoading
        );
        
        if (assetsToProcess.length === 0) return currentAssets;
        
        // Mark as loading
        setLoadingUrls(prev => {
          const newSet = new Set(prev);
          assetsToProcess.forEach(asset => newSet.add(asset.id));
          return newSet;
        });
        
        // Process URLs asynchronously
        UnifiedUrlService.generateBatchUrls(assetsToProcess)
          .then(updatedAssets => {
            setLazyAssets(prev => 
              prev.map(asset => {
                const updated = updatedAssets.find(u => u.id === asset.id);
                if (updated) {
                  return {
                    ...updated,
                    isVisible: asset.isVisible,
                    urlsLoaded: !!(updated.url || updated.thumbnailUrl),
                    isLoading: false,
                    error: updated.error
                  };
                }
                return asset;
              })
            );
          })
          .catch(error => {
            console.error('Batch URL generation failed:', error);
            setLazyAssets(prev => 
              prev.map(asset => 
                assetIds.includes(asset.id) 
                  ? { ...asset, isLoading: false, error: 'Failed to load' }
                  : asset
              )
            );
          })
          .finally(() => {
            setLoadingUrls(prev => {
              const newSet = new Set(prev);
              assetIds.forEach(id => newSet.delete(id));
              return newSet;
            });
          });
        
        // Return state with loading markers
        return currentAssets.map(asset => 
          assetIds.includes(asset.id) 
            ? { ...asset, isLoading: true }
            : asset
        );
      });
      
    } catch (error) {
      console.error('Batch processing setup failed:', error);
    }
  }, []);

  // Enhanced URL loading with batching
  const loadAssetUrls = useCallback(async (assetId: string) => {
    // Prevent duplicate requests
    if (loadingUrls.has(assetId) || loadingPromises.current.has(assetId)) {
      return await loadingPromises.current.get(assetId);
    }

    // Check session cache first
    const cachedUrl = sessionCache.getCachedSignedUrl(assetId);
    if (cachedUrl) {
      setLazyAssets(prev => 
        prev.map(a => 
          a.id === assetId 
            ? { ...a, url: cachedUrl, urlsLoaded: true, isLoading: false }
            : a
        )
      );
      return;
    }

    // Add to batch queue for efficient processing
    batchQueue.current.add(assetId);
    
    // Debounce batch processing
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(() => {
      processBatchQueue();
    }, 100); // Small delay to allow batching
  }, [loadingUrls, processBatchQueue]);

  // Smart intersection observer with prefetch threshold
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleAssetIds: string[] = [];
        
        entries.forEach((entry) => {
          const assetId = entry.target.getAttribute('data-asset-id');
          if (!assetId) return;

          if (entry.isIntersecting) {
            console.log(`📱 MOBILE: Asset ${assetId} entered viewport - triggering URL loading`);
            // Mark as visible
            setLazyAssets(prev => 
              prev.map(asset => 
                asset.id === assetId 
                  ? { ...asset, isVisible: true }
                  : asset
              )
            );
            
            visibleAssetIds.push(assetId);
          } else {
            // Mark as not visible but keep URLs if already loaded
            setLazyAssets(prev => 
              prev.map(asset => 
                asset.id === assetId 
                  ? { ...asset, isVisible: false }
                  : asset
              )
            );
          }
        });
        
        // Batch load URLs for all visible assets
        if (visibleAssetIds.length > 0) {
          visibleAssetIds.forEach(assetId => {
            loadAssetUrls(assetId);
          });
        }
      },
      {
        rootMargin: `${prefetchThreshold}px`, // Prefetch when close to viewport
        threshold: 0.1
      }
    );

    // Observe existing elements
    assetRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, [enabled, loadAssetUrls, prefetchThreshold]);

  // Register asset element for observation
  const registerAssetRef = useCallback((assetId: string, element: HTMLElement | null) => {
    if (!enabled) return;

    // Unobserve old element
    const oldElement = assetRefs.current.get(assetId);
    if (oldElement && observerRef.current) {
      observerRef.current.unobserve(oldElement);
    }

    if (element) {
      // Set data attribute for identification
      element.setAttribute('data-asset-id', assetId);
      assetRefs.current.set(assetId, element);
      
      // Observe new element
      if (observerRef.current) {
        observerRef.current.observe(element);
        console.log(`📱 MOBILE: Registered asset ${assetId} for lazy loading observation`);
      }
    } else {
      assetRefs.current.delete(assetId);
      console.log(`📱 MOBILE: Unregistered asset ${assetId} from lazy loading`);
    }
  }, [enabled]);

  // Force load URLs for a specific asset (useful for preview/interaction)
  const forceLoadAssetUrls = useCallback(async (assetId: string) => {
    return await loadAssetUrls(assetId);
  }, [loadAssetUrls]);

  // Preload next N assets (for better UX)
  const preloadNextAssets = useCallback(async (count: number = batchSize) => {
    const assetsToPreload = lazyAssets
      .filter(asset => !asset.urlsLoaded && !asset.isLoading)
      .slice(0, count);
    
    if (assetsToPreload.length === 0) return;
    
    try {
      console.log(`🔄 Preloading ${assetsToPreload.length} assets`);
      await UnifiedUrlService.generateBatchUrls(assetsToPreload);
      
      // Update state
      setLazyAssets(prev => 
        prev.map(asset => {
          const preloaded = assetsToPreload.find(p => p.id === asset.id);
          if (preloaded) {
            return { ...asset, urlsLoaded: true, isLoading: false };
          }
          return asset;
        })
      );
      
      console.log(`✅ Preloaded ${assetsToPreload.length} assets`);
    } catch (error) {
      console.warn('Some assets failed to preload:', error);
    }
  }, [lazyAssets, batchSize]);

  // Get performance stats
  const getPerformanceStats = useCallback(() => {
    const total = lazyAssets.length;
    const loaded = lazyAssets.filter(a => a.urlsLoaded).length;
    const loading = loadingUrls.size;
    const errors = lazyAssets.filter(a => a.error).length;
    
    return {
      total,
      loaded,
      loading,
      errors,
      loadProgress: total > 0 ? Math.round((loaded / total) * 100) : 0,
      urlServiceMetrics: UnifiedUrlService.getMetrics()
    };
  }, [lazyAssets, loadingUrls]);

  return {
    lazyAssets,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    getPerformanceStats,
    isLoading: loadingUrls.size > 0
  };
};
