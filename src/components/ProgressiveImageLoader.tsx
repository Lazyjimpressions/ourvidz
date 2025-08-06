import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { UnifiedUrlService } from '@/lib/services/UnifiedUrlService';
import type { UnifiedAsset } from '@/lib/services/AssetService';

interface ProgressiveImageLoaderProps {
  asset: UnifiedAsset;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  alt?: string;
  loadingStrategy?: 'lazy' | 'eager' | 'progressive';
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Progressive Image Loader Component
 * 
 * Loads images progressively with multiple quality levels and fallback strategies.
 * Features:
 * - Progressive loading (low-res → high-res)
 * - Intelligent caching
 * - Error handling with retry
 * - Loading states and placeholders
 * - Performance optimization
 */
export const ProgressiveImageLoader: React.FC<ProgressiveImageLoaderProps> = ({
  asset,
  priority = false,
  onLoad,
  onError,
  className = '',
  alt,
  loadingStrategy = 'progressive',
  placeholder,
  fallback
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const maxRetries = 3;
  const imageAlt = alt || asset.prompt || `Asset ${asset.id}`;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loadingStrategy === 'lazy' && imageRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before entering viewport
          threshold: 0.1
        }
      );
      
      observerRef.current.observe(imageRef.current);
    } else {
      setIsIntersecting(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadingStrategy]);

  // Load image based on strategy
  const loadImage = useCallback(async () => {
    if (!isIntersecting) return;
    
    setImageState('loading');
    
    try {
      let finalUrl: string | null = null;
      
      if (loadingStrategy === 'progressive') {
        // Load thumbnail first
        const thumbnail = await UnifiedUrlService.getThumbnailUrl(asset);
        if (thumbnail) {
          setThumbnailUrl(thumbnail);
          finalUrl = thumbnail;
        }
        
        // Load high-res in background
        const highRes = await UnifiedUrlService.getHighResUrl(asset);
        if (highRes) {
          setHighResUrl(highRes);
          finalUrl = highRes;
        }
      } else {
        // Direct loading
        const result = await UnifiedUrlService.generateAssetUrls(asset);
        finalUrl = result.url || null;
      }
      
      if (finalUrl) {
        setCurrentUrl(finalUrl);
        setImageState('loaded');
        onLoad?.();
      } else {
        throw new Error('No URL available');
      }
    } catch (error) {
      console.error(`❌ Failed to load image for asset ${asset.id}:`, error);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Retry after exponential backoff
        setTimeout(() => {
          loadImage();
        }, Math.pow(2, retryCount) * 1000);
      } else {
        setImageState('error');
        onError?.(error as Error);
      }
    }
  }, [asset, loadingStrategy, isIntersecting, retryCount, onLoad, onError]);

  // Load image when dependencies change
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setImageState('error');
    onError?.(new Error('Failed to load image'));
  }, [onError]);

  // Retry loading
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setImageState('loading');
    loadImage();
  }, [loadImage]);

  // Determine which URL to display
  const displayUrl = currentUrl || thumbnailUrl || highResUrl;

  // Render loading state
  if (imageState === 'loading') {
    return (
      <div className={`progressive-image-loader loading ${className}`}>
        {placeholder || (
          <div className="loading-placeholder">
            <Loader2 className="loading-spinner" />
            <span className="loading-text">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (imageState === 'error') {
    return (
      <div className={`progressive-image-loader error ${className}`}>
        {fallback || (
          <div className="error-placeholder">
            <AlertCircle className="error-icon" />
            <span className="error-text">Failed to load</span>
            <button onClick={handleRetry} className="retry-button">
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render loaded image
  return (
    <div className={`progressive-image-loader ${className}`}>
      {displayUrl && (
        <img
          ref={imageRef}
          src={displayUrl}
          alt={imageAlt}
          className="progressive-image"
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: imageState === 'loaded' ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
      
      {/* Show loading indicator while transitioning from thumbnail to high-res */}
      {thumbnailUrl && highResUrl && thumbnailUrl !== highResUrl && (
        <div className="quality-indicator">
          <small>Loading high quality...</small>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing progressive image loading
 */
export const useProgressiveImage = (asset: UnifiedAsset, priority = false) => {
  const [state, setState] = useState({
    url: null as string | null,
    thumbnailUrl: null as string | null,
    highResUrl: null as string | null,
    isLoading: true,
    hasError: false,
    error: null as Error | null
  });

  const loadImage = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, hasError: false, error: null }));
    
    try {
      // Load thumbnail first
      const thumbnail = await UnifiedUrlService.getThumbnailUrl(asset);
      
      if (thumbnail) {
        setState(prev => ({ 
          ...prev, 
          thumbnailUrl: thumbnail, 
          url: thumbnail,
          isLoading: false 
        }));
      }
      
      // Load high-res in background
      const highRes = await UnifiedUrlService.getHighResUrl(asset);
      
      if (highRes) {
        setState(prev => ({ 
          ...prev, 
          highResUrl: highRes, 
          url: highRes,
          isLoading: false 
        }));
      }
      
      if (!thumbnail && !highRes) {
        throw new Error('No URLs available');
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        hasError: true, 
        error: error as Error 
      }));
    }
  }, [asset]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  return {
    ...state,
    reload: loadImage
  };
};

/**
 * Hook for managing image preloading
 */
export const useImagePreloader = (assets: UnifiedAsset[]) => {
  const [preloadedAssets, setPreloadedAssets] = useState<Set<string>>(new Set());
  
  const preloadAsset = useCallback(async (asset: UnifiedAsset) => {
    if (preloadedAssets.has(asset.id)) return;
    
    try {
      await UnifiedUrlService.generateAssetUrls(asset);
      setPreloadedAssets(prev => new Set([...prev, asset.id]));
    } catch (error) {
      console.warn(`Failed to preload asset ${asset.id}:`, error);
    }
  }, [preloadedAssets]);
  
  const preloadAssets = useCallback(async (assetsToPreload: UnifiedAsset[]) => {
    // Preload in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < assetsToPreload.length; i += batchSize) {
      const batch = assetsToPreload.slice(i, i + batchSize);
      await Promise.all(batch.map(preloadAsset));
    }
  }, [preloadAsset]);
  
  return {
    preloadedAssets,
    preloadAsset,
    preloadAssets,
    isPreloaded: (assetId: string) => preloadedAssets.has(assetId)
  };
}; 