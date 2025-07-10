import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { sessionCache } from '@/lib/cache/SessionCache';

interface UseLazyAssetsProps {
  assets: UnifiedAsset[];
  enabled?: boolean;
  prefetchThreshold?: number; // How many pixels before entering viewport to start loading
}

interface LazyAsset extends UnifiedAsset {
  isVisible?: boolean;
  urlsLoaded?: boolean;
  isLoading?: boolean;
}

export const useLazyAssetsV2 = ({ 
  assets, 
  enabled = true, 
  prefetchThreshold = 200 
}: UseLazyAssetsProps) => {
  const [lazyAssets, setLazyAssets] = useState<LazyAsset[]>([]);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const assetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<UnifiedAsset>>>(new Map());

  // Initialize lazy assets with session cache check
  useEffect(() => {
    const initialAssets = assets.map(asset => {
      // Check if we have cached URLs for this asset
      const cachedUrl = sessionCache.getCachedSignedUrl(asset.id);
      return {
        ...asset,
        url: cachedUrl || asset.url,
        isVisible: false,
        urlsLoaded: !!cachedUrl || !!asset.url,
        isLoading: false
      };
    });
    
    setLazyAssets(initialAssets);
    console.log('🚀 Initialized lazy assets with cache check:', {
      total: initialAssets.length,
      withCachedUrls: initialAssets.filter(a => a.urlsLoaded).length
    });
  }, [assets]);

  // Enhanced URL loading with deduplication
  const loadAssetUrls = useCallback(async (assetId: string) => {
    // Prevent duplicate requests
    if (loadingUrls.has(assetId) || loadingPromises.current.has(assetId)) {
      return await loadingPromises.current.get(assetId);
    }

    const asset = lazyAssets.find(a => a.id === assetId);
    if (!asset || asset.urlsLoaded) return asset;

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
      return { ...asset, url: cachedUrl, urlsLoaded: true };
    }

    // Start loading
    setLoadingUrls(prev => new Set(prev).add(assetId));
    setLazyAssets(prev => 
      prev.map(a => 
        a.id === assetId 
          ? { ...a, isLoading: true }
          : a
      )
    );

    const loadingPromise = OptimizedAssetService.generateAssetUrls(asset)
      .then(updatedAsset => {
        setLazyAssets(prev => 
          prev.map(a => 
            a.id === assetId 
              ? { ...updatedAsset, isVisible: true, urlsLoaded: true, isLoading: false }
              : a
          )
        );
        return updatedAsset;
      })
      .catch(error => {
        console.error(`Failed to load URLs for asset ${assetId}:`, error);
        setLazyAssets(prev => 
          prev.map(a => 
            a.id === assetId 
              ? { ...a, isLoading: false, error: 'Failed to load' }
              : a
          )
        );
        return asset;
      })
      .finally(() => {
        setLoadingUrls(prev => {
          const newSet = new Set(prev);
          newSet.delete(assetId);
          return newSet;
        });
        loadingPromises.current.delete(assetId);
      });

    loadingPromises.current.set(assetId, loadingPromise);
    return await loadingPromise;

  }, [lazyAssets, loadingUrls]);

  // Smart intersection observer with prefetch threshold
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const assetId = entry.target.getAttribute('data-asset-id');
          if (!assetId) return;

          if (entry.isIntersecting) {
            // Mark as visible and load URLs immediately
            setLazyAssets(prev => 
              prev.map(asset => 
                asset.id === assetId 
                  ? { ...asset, isVisible: true }
                  : asset
              )
            );
            
            // Load URLs without delay for visible items
            loadAssetUrls(assetId);
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
      }
    } else {
      assetRefs.current.delete(assetId);
    }
  }, [enabled]);

  // Force load URLs for a specific asset (useful for preview/interaction)
  const forceLoadAssetUrls = useCallback(async (assetId: string) => {
    return await loadAssetUrls(assetId);
  }, [loadAssetUrls]);

  // Batch preload next N assets (for better UX)
  const preloadNextAssets = useCallback(async (count: number = 5) => {
    const assetsToPreload = lazyAssets
      .filter(asset => !asset.urlsLoaded && !asset.isLoading)
      .slice(0, count);
    
    const preloadPromises = assetsToPreload.map(asset => loadAssetUrls(asset.id));
    
    try {
      await Promise.all(preloadPromises);
      console.log(`✅ Preloaded ${assetsToPreload.length} assets`);
    } catch (error) {
      console.warn('Some assets failed to preload:', error);
    }
  }, [lazyAssets, loadAssetUrls]);

  return {
    lazyAssets,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    isLoading: loadingUrls.size > 0
  };
};
