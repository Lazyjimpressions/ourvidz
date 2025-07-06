import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface UseLazyAssetsProps {
  assets: UnifiedAsset[];
  enabled?: boolean;
}

interface LazyAsset extends UnifiedAsset {
  isVisible?: boolean;
  urlsLoaded?: boolean;
}

export const useLazyAssets = ({ assets, enabled = true }: UseLazyAssetsProps) => {
  const [lazyAssets, setLazyAssets] = useState<LazyAsset[]>([]);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const assetRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Initialize lazy assets
  useEffect(() => {
    setLazyAssets(assets.map(asset => ({ ...asset, isVisible: false, urlsLoaded: false })));
  }, [assets]);

  // Load URLs for visible assets
  const loadAssetUrls = useCallback(async (assetId: string) => {
    if (loadingUrls.has(assetId)) return;

    const asset = lazyAssets.find(a => a.id === assetId);
    if (!asset || asset.urlsLoaded) return;

    setLoadingUrls(prev => new Set(prev).add(assetId));

    try {
      const updatedAsset = await OptimizedAssetService.generateAssetUrls(asset);
      
      setLazyAssets(prev => 
        prev.map(a => 
          a.id === assetId 
            ? { ...updatedAsset, isVisible: true, urlsLoaded: true }
            : a
        )
      );
    } catch (error) {
      console.error(`Failed to load URLs for asset ${assetId}:`, error);
    } finally {
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(assetId);
        return newSet;
      });
    }
  }, [lazyAssets, loadingUrls]);

  // Set up intersection observer
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const assetId = entry.target.getAttribute('data-asset-id');
          if (!assetId) return;

          if (entry.isIntersecting) {
            // Mark as visible and load URLs
            setLazyAssets(prev => 
              prev.map(asset => 
                asset.id === assetId 
                  ? { ...asset, isVisible: true }
                  : asset
              )
            );
            
            // Load URLs with a small delay to avoid overwhelming the system
            setTimeout(() => loadAssetUrls(assetId), 100);
          } else {
            // Mark as not visible
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
        rootMargin: '200px', // Start loading 200px before entering viewport
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
  }, [enabled, loadAssetUrls]);

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

  // Force load URLs for a specific asset (useful for preview)
  const forceLoadAssetUrls = useCallback(async (assetId: string) => {
    await loadAssetUrls(assetId);
  }, [loadAssetUrls]);

  return {
    lazyAssets,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    isLoading: loadingUrls.size > 0
  };
};