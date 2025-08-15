import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface UseLazyUrlGenerationProps {
  assets: UnifiedAsset[];
  enabled?: boolean;
  prefetchThreshold?: number;
}

interface LazyAsset extends UnifiedAsset {
  isVisible?: boolean;
  urlsLoaded?: boolean;
  isLoading?: boolean;
}

export const useLazyUrlGeneration = ({ 
  assets, 
  enabled = true, 
  prefetchThreshold = 200 
}: UseLazyUrlGenerationProps) => {
  const [lazyAssets, setLazyAssets] = useState<LazyAsset[]>([]);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const assetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<LazyAsset>>>(new Map());

  // Enhanced bucket detection supporting user-library
  const inferBucketFromMetadata = useCallback((metadata: any, quality: string = 'fast', assetSource?: string): string => {
    // Primary: Use bucket from metadata if available
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    // Check if this is a library asset (from user_library table)
    if (assetSource === 'library' || metadata?.source === 'library') {
      return 'user-library';
    }

    // Fallback logic based on metadata properties for workspace assets
    const modelVariant = metadata?.model_variant || '';
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced || modelVariant.includes('7b');

    // Enhanced model variants
    if (isEnhanced) {
      return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    }

    // SDXL models
    if (isSDXL) {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }

    // Default buckets
    return quality === 'high' ? 'image_high' : 'image_fast';
  }, []);

  // Efficient signed URL generation with caching (same as LibraryV2)
  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const cacheKey = `signed_urls_${bucket}`;
    const cached = sessionStorage.getItem(cacheKey);
    const urlCache = cached ? JSON.parse(cached) : {};
    
    const results: string[] = [];
    const newUrls: { [key: string]: string } = {};
    
    // Process paths in parallel with caching
    await Promise.all(paths.map(async (path) => {
      const cacheKey = `${bucket}|${path}`;
      
      if (urlCache[cacheKey]) {
        results.push(urlCache[cacheKey]);
        return;
      }
      
      try {
        // FIX: Clean storage path - remove bucket prefix if present
        let cleanPath = path;
        if (cleanPath.startsWith(`${bucket}/`)) {
          cleanPath = cleanPath.replace(`${bucket}/`, '');
        }
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, 3600); // 1 hour expiry
        
        if (data?.signedUrl) {
          results.push(data.signedUrl);
          newUrls[cacheKey] = data.signedUrl;
        } else {
          console.warn(`Failed to generate signed URL for ${cleanPath} in ${bucket}:`, error);
        }
      } catch (error) {
        console.error(`Error generating signed URL for ${path}:`, error);
      }
    }));
    
    // Update cache with new URLs
    if (Object.keys(newUrls).length > 0) {
      const updatedCache = { ...urlCache, ...newUrls };
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    }
    
    return results;
  }, []);

  // Initialize lazy assets with session cache check
  useEffect(() => {
    const initialAssets = assets.map(asset => {
      // Check if we have cached URLs for this asset
      const cacheKey = `signed_urls_${asset.id}`;
      const cachedUrl = sessionStorage.getItem(cacheKey);
      
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
  const loadAssetUrls = useCallback(async (assetId: string): Promise<LazyAsset | undefined> => {
    // Prevent duplicate requests
    if (loadingUrls.has(assetId) || loadingPromises.current.has(assetId)) {
      return await loadingPromises.current.get(assetId);
    }

    const asset = lazyAssets.find(a => a.id === assetId);
    if (!asset || asset.urlsLoaded) return asset;

    // Check session cache first
    const cacheKey = `signed_urls_${assetId}`;
    const cachedUrl = sessionStorage.getItem(cacheKey);
    if (cachedUrl) {
      const updatedAsset = { ...asset, url: cachedUrl, urlsLoaded: true, isLoading: false };
      setLazyAssets(prev => 
        prev.map(a => 
          a.id === assetId ? updatedAsset : a
        )
      );
      return updatedAsset;
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

    const loadingPromise = (async () => {
      try {
        // Enhanced URL generation with user-library support
        const metadata = (asset as any).metadata || {};
        const assetSource = (asset as any).source || (metadata?.source);
        const bucket = asset.type === 'video' 
          ? (metadata?.bucket || (assetSource === 'library' ? 'user-library' : (asset.quality === 'high' ? 'video_high' : 'video_fast')))
          : inferBucketFromMetadata(metadata, asset.quality, assetSource);

        // Get raw paths from asset
        const rawPaths = (asset as any).rawPaths || [];
        if (rawPaths.length === 0) {
          throw new Error('No raw paths available for asset');
        }

        // Generate signed URLs
        const signedUrls = await generateSignedUrls(rawPaths, bucket);
        
        if (signedUrls.length === 0) {
          throw new Error('Failed to generate any signed URLs');
        }

        const updatedAsset: LazyAsset = {
          ...asset,
          url: signedUrls[0],
          thumbnailUrl: signedUrls[0],
          signedUrls: signedUrls,
          urlsLoaded: true,
          isLoading: false,
          isVisible: true
        };

        // Cache the primary URL
        sessionStorage.setItem(cacheKey, signedUrls[0]);

        setLazyAssets(prev => 
          prev.map(a => 
            a.id === assetId ? updatedAsset : a
          )
        );

        return updatedAsset;
        
      } catch (error) {
        console.error(`Failed to load URLs for asset ${assetId}:`, error);
        const errorAsset = { ...asset, isLoading: false, error: 'Failed to load' };
        setLazyAssets(prev => 
          prev.map(a => 
            a.id === assetId ? errorAsset : a
          )
        );
        return errorAsset;
      }
    })();

    loadingPromise.finally(() => {
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(assetId);
        return newSet;
      });
      loadingPromises.current.delete(assetId);
    });

    loadingPromises.current.set(assetId, loadingPromise);
    return await loadingPromise;

  }, [lazyAssets, loadingUrls, inferBucketFromMetadata, generateSignedUrls]);

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
