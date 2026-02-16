import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import type { SharedAsset } from '@/lib/services/AssetMappers';

export type SignedAsset = SharedAsset & { 
  thumbUrl: string | null; 
  url: string | null;
  signOriginal: () => Promise<string>;
};

export type UseSignedAssetsOptions = {
  thumbTtlSec?: number;
  originalTtlSec?: number;
  enabled?: boolean;
};

export function useSignedAssets(
  assets: SharedAsset[],
  bucket: 'workspace-temp' | 'user-library',
  opts: UseSignedAssetsOptions = {}
): {
  signedAssets: SignedAsset[];
  isSigning: boolean;
  refresh: () => void;
} {
  const {
    thumbTtlSec = bucket === 'user-library' ? 24 * 60 * 60 : 15 * 60,
    originalTtlSec = bucket === 'user-library' ? 72 * 60 * 60 : 60 * 60,
    enabled = true
  } = opts;

  const [signedUrls, setSignedUrls] = useState<Record<string, { thumbUrl?: string; url?: string }>>({});
  const [isSigning, setIsSigning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Track which asset IDs have been queued for signing to prevent dependency loops
  const queuedIdsRef = useRef<Set<string>>(new Set());

  // Extract unique paths that need signing - NO signedUrls dependency
  const pathsToSign = useMemo(() => {
    if (!enabled) return { thumbPaths: [] as string[], pathToAssetMap: new Map<string, string>() };
    
    const thumbPaths: string[] = [];
    const pathToAssetMap = new Map<string, string>();
    
    for (const asset of assets) {
      if (queuedIdsRef.current.has(asset.id)) continue; // already queued
      
      let thumbPath: string | null = null;
      if (asset.type === 'image') {
        thumbPath = asset.thumbPath || asset.originalPath;
      } else {
        thumbPath = asset.thumbPath;
      }
      
      if (thumbPath && !thumbPath.startsWith('.') && thumbPath.includes('/')) {
        thumbPaths.push(thumbPath);
        pathToAssetMap.set(thumbPath, asset.id);
        queuedIdsRef.current.add(asset.id);
      }
    }
    
    return { thumbPaths, pathToAssetMap };
  }, [assets, enabled, refreshKey]); // signedUrls removed from deps

  // Sign thumbnails in batches
  useEffect(() => {
    if (!enabled || pathsToSign.thumbPaths.length === 0) return;

    let cancelled = false;
    setIsSigning(true);

    const signThumbnails = async () => {
      try {
        const signedThumbs = await urlSigningService.getSignedUrls(
          pathsToSign.thumbPaths,
          bucket,
          { ttlSec: thumbTtlSec }
        );

        if (cancelled) return;

        setSignedUrls(prev => {
          const next = { ...prev };
          for (const [path, url] of Object.entries(signedThumbs)) {
            const assetId = pathsToSign.pathToAssetMap.get(path);
            if (assetId) {
              next[assetId] = { ...next[assetId], thumbUrl: url };
            }
          }
          return next;
        });
      } catch (error) {
        console.error('Failed to sign thumbnails:', error);
      } finally {
        if (!cancelled) {
          setIsSigning(false);
        }
      }
    };

    signThumbnails();

    return () => {
      cancelled = true;
    };
  }, [bucket, enabled, pathsToSign, thumbTtlSec]);

  // Function to sign original on-demand (for lightbox)
  const signOriginal = useCallback(async (asset: SharedAsset): Promise<string> => {
    if (!asset.originalPath) {
      throw new Error('No original path available');
    }

    const existing = signedUrls[asset.id]?.url;
    if (existing) return existing;

    try {
      const signedUrl = await urlSigningService.getSignedUrl(
        asset.originalPath,
        bucket,
        { ttlSec: originalTtlSec }
      );

      setSignedUrls(prev => ({
        ...prev,
        [asset.id]: { ...prev[asset.id], url: signedUrl }
      }));

      return signedUrl;
    } catch (error) {
      console.error('Failed to sign original:', error);
      throw error;
    }
  }, [bucket, originalTtlSec, signedUrls]);

  // Refresh function
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setSignedUrls({});
    queuedIdsRef.current.clear();
  }, []);

  // Combine assets with signed URLs
  const signedAssets = useMemo((): SignedAsset[] => {
    return assets.map(asset => {
      let thumbUrl = signedUrls[asset.id]?.thumbUrl || null;
      if (asset.type === 'video' && !thumbUrl && !asset.thumbPath) {
        thumbUrl = '/video-thumbnail-placeholder.svg';
      }
      
      return {
        ...asset,
        thumbUrl,
        url: signedUrls[asset.id]?.url || null,
        signOriginal: () => signOriginal(asset)
      };
    });
  }, [assets, signedUrls, signOriginal]);

  return {
    signedAssets,
    isSigning,
    refresh
  };
}
