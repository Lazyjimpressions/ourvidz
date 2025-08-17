import { useState, useEffect, useCallback } from 'react';
import { UnifiedAsset } from '@/lib/services/AssetService';
import { sessionCache } from '@/lib/cache/SessionCache';
import { UrlCache } from '@/lib/services/UrlCache';
import { useLazyAssetsV3 } from './useLazyAssetsV3';

interface UseOptimizedWorkspaceUrlsOptions {
  enabled?: boolean;
  batchSize?: number;
  prefetchThreshold?: number;
}

/**
 * Optimized URL loading for workspace assets with:
 * - Session cache persistence
 * - Lazy loading with intersection observer
 * - Batch URL generation
 * - Cache invalidation on asset changes
 */
export const useOptimizedWorkspaceUrls = (
  assets: UnifiedAsset[],
  options: UseOptimizedWorkspaceUrlsOptions = {}
) => {
  const { enabled = true, batchSize = 10, prefetchThreshold = 0.5 } = options;
  
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  
  // Use lazy assets hook for intelligent URL loading
  const {
    lazyAssets,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    isLoading: isLazyLoading
  } = useLazyAssetsV3({
    assets,
    enabled,
    prefetchThreshold,
    batchSize
  });

  // Initialize session cache with current user
  useEffect(() => {
    const initializeCache = async () => {
      const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
      if (user) {
        sessionCache.initializeSession(user.id);
      }
    };
    initializeCache();
  }, []);

  // Restore cached URLs from session storage
  useEffect(() => {
    const restored = new Map<string, string>();
    
    for (const asset of assets) {
      const cachedUrl = sessionCache.getCachedSignedUrl(asset.id);
      if (cachedUrl) {
        restored.set(asset.id, cachedUrl);
      }
    }
    
    if (restored.size > 0) {
      setSignedUrls(prev => new Map([...prev, ...restored]));
    }
  }, [assets]);

  // Generate signed URLs for assets with cache persistence
  const generateSignedUrl = useCallback(async (asset: UnifiedAsset): Promise<string | null> => {
    try {
      // Check session cache first
      const cached = sessionCache.getCachedSignedUrl(asset.id);
      if (cached) {
        return cached;
      }

      // Determine bucket and path
      const bucket = asset.bucketHint || 'workspace-temp';
      const storagePath = asset.url || `${asset.userId}/${asset.id}`;

      // Generate signed URL using UrlCache
      const signedUrl = await UrlCache.getSignedUrl(bucket, storagePath, 3600);
      
      if (signedUrl) {
        // Cache in session storage
        sessionCache.cacheSignedUrl(asset.id, signedUrl);
        
        // Update local state
        setSignedUrls(prev => new Map(prev.set(asset.id, signedUrl)));
      }

      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL for asset:', asset.id, error);
      return null;
    }
  }, []);

  // Generate video thumbnail
  const generateVideoThumbnail = useCallback(async (videoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(thumbnailUrl);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error generating video thumbnail:', error);
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      video.src = videoUrl;
    });
  }, []);

  // Batch URL generation for visible assets
  const loadAssetUrlsBatch = useCallback(async (assetIds: string[]) => {
    const assetsToLoad = assets.filter(asset => 
      assetIds.includes(asset.id) && !signedUrls.has(asset.id)
    );

    const urlPromises = assetsToLoad.map(async (asset) => {
      const url = await generateSignedUrl(asset);
      if (url && asset.type === 'video') {
        // Generate thumbnail for videos
        const thumbnail = await generateVideoThumbnail(url);
        if (thumbnail) {
          // Update the asset with thumbnail
          asset.thumbnailUrl = thumbnail;
        }
      }
      return { assetId: asset.id, url };
    });

    await Promise.allSettled(urlPromises);
  }, [assets, signedUrls, generateSignedUrl, generateVideoThumbnail]);

  // Invalidate cache when assets are deleted
  const invalidateAssetCache = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      const bucket = asset.bucketHint || 'workspace-temp';
      const storagePath = asset.url || `${asset.userId}/${asset.id}`;
      
      // Clear from all caches
      UrlCache.invalidate(bucket, storagePath);
      sessionCache.getCachedSignedUrl(assetId); // This removes it from session cache
      setSignedUrls(prev => {
        const newMap = new Map(prev);
        newMap.delete(assetId);
        return newMap;
      });
    }
  }, [assets]);

  // Clear all cached URLs
  const clearAllCache = useCallback(() => {
    UrlCache.clearAll();
    sessionCache.clearAllCache();
    setSignedUrls(new Map());
  }, []);

  // Return enhanced assets with URLs - ensure original URL is preserved if no signed URL
  const assetsWithUrls = assets.map(asset => {
    const signedUrl = signedUrls.get(asset.id);
    return {
      ...asset,
      url: signedUrl || asset.url, // Keep original URL if no signed URL generated yet
      signedUrl, // Also provide the signed URL separately for debugging
      isUrlLoaded: signedUrls.has(asset.id),
      isVisible: lazyAssets.find(la => la.id === asset.id)?.isVisible || false
    };
  });

  return {
    assets: assetsWithUrls,
    signedUrls,
    loadingUrls,
    registerAssetRef,
    forceLoadAssetUrls,
    preloadNextAssets,
    loadAssetUrlsBatch,
    invalidateAssetCache,
    clearAllCache,
    isLoading: isLazyLoading
  };
};