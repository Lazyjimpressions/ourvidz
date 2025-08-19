import { useState, useEffect, useCallback, useMemo } from 'react';
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
    thumbTtlSec = bucket === 'user-library' ? 24 * 60 * 60 : 15 * 60, // 24h for library, 15min for workspace
    originalTtlSec = bucket === 'user-library' ? 72 * 60 * 60 : 60 * 60, // 72h for library, 1h for workspace
    enabled = true
  } = opts;

  const [signedUrls, setSignedUrls] = useState<Record<string, { thumbUrl?: string; url?: string }>>({});
  const [isSigning, setIsSigning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract unique paths that need signing
  const pathsToSign = useMemo(() => {
    if (!enabled) return { thumbPaths: [], originalPaths: [] };
    
    const thumbPaths: string[] = [];
    const originalPaths: string[] = [];
    
    for (const asset of assets) {
      const p = asset.thumbPath;
      if (p && !p.startsWith('.') && p.includes('/') && !signedUrls[asset.id]?.thumbUrl) {
        thumbPaths.push(p);
      }
      // Don't pre-sign originals - they're signed on-demand in lightbox
    }
    
    return { thumbPaths, originalPaths };
  }, [assets, enabled, signedUrls, refreshKey]);

  // Sign thumbnails in batches
  useEffect(() => {
    if (!enabled || pathsToSign.thumbPaths.length === 0) return;

    let cancelled = false;
    setIsSigning(true);

    const signThumbnails = async () => {
      try {
        const pathToAssetMap = new Map<string, string>();
        
        // Map paths to asset IDs
        for (const asset of assets) {
          const p = asset.thumbPath;
          if (p && !p.startsWith('.') && p.includes('/')) {
            pathToAssetMap.set(p, asset.id);
          }
        }

        const signedThumbs = await urlSigningService.getSignedUrls(
          pathsToSign.thumbPaths,
          bucket,
          { ttlSec: thumbTtlSec }
        );

        if (cancelled) return;

        // Update state with signed thumbnails
        setSignedUrls(prev => {
          const next = { ...prev };
          
          for (const [path, url] of Object.entries(signedThumbs)) {
            const assetId = pathToAssetMap.get(path);
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
  }, [assets, bucket, enabled, pathsToSign.thumbPaths, thumbTtlSec]);

  // Function to sign original on-demand (for lightbox)
  const signOriginal = useCallback(async (asset: SharedAsset): Promise<string> => {
    if (!asset.originalPath) {
      throw new Error('No original path available');
    }

    // Check if already signed
    const existing = signedUrls[asset.id]?.url;
    if (existing) {
      return existing;
    }

    try {
      const signedUrl = await urlSigningService.getSignedUrl(
        asset.originalPath,
        bucket,
        { ttlSec: originalTtlSec }
      );

      // Update state
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
  }, []);

  // Combine assets with signed URLs
  const signedAssets = useMemo((): SignedAsset[] => {
    return assets.map(asset => ({
      ...asset,
      thumbUrl: signedUrls[asset.id]?.thumbUrl || null,
      url: signedUrls[asset.id]?.url || null,
      // Add the signOriginal function to metadata for lightbox use
      signOriginal: () => signOriginal(asset)
    }));
  }, [assets, signedUrls, signOriginal]);

  return {
    signedAssets,
    isSigning,
    refresh
  };
}