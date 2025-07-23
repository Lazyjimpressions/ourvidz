
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceUrlState {
  url: string;
  expiresAt: Date;
  isRefreshing: boolean;
}

interface ReferenceUrlCache {
  [path: string]: ReferenceUrlState;
}

export const useReferenceUrls = () => {
  const [urlCache, setUrlCache] = useState<ReferenceUrlCache>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getSignedUrl = useCallback(async (path: string): Promise<string | null> => {
    try {
      // Check cache first
      const cached = urlCache[path];
      if (cached && cached.expiresAt > new Date(Date.now() + 10 * 60 * 1000)) { // 10 min buffer
        return cached.url;
      }

      // If refreshing this path, return cached URL while waiting
      if (cached?.isRefreshing) {
        return cached.url;
      }

      // Mark as refreshing
      setUrlCache(prev => ({
        ...prev,
        [path]: {
          ...prev[path],
          isRefreshing: true
        }
      }));

      const { data, error } = await supabase.storage
        .from('reference_images')
        .createSignedUrl(path, 14400); // 4 hours

      if (error || !data?.signedUrl) {
        console.error('Failed to get signed URL:', error);
        return cached?.url || null;
      }

      // Update cache
      const expiresAt = new Date(Date.now() + 14400 * 1000); // 4 hours
      setUrlCache(prev => ({
        ...prev,
        [path]: {
          url: data.signedUrl,
          expiresAt,
          isRefreshing: false
        }
      }));

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return urlCache[path]?.url || null;
    }
  }, [urlCache]);

  const refreshUrl = useCallback(async (path: string): Promise<string | null> => {
    // Remove from cache to force refresh
    setUrlCache(prev => {
      const newCache = { ...prev };
      delete newCache[path];
      return newCache;
    });
    
    return getSignedUrl(path);
  }, [getSignedUrl]);

  const preloadUrls = useCallback(async (paths: string[]): Promise<void> => {
    setIsRefreshing(true);
    try {
      await Promise.all(paths.map(path => getSignedUrl(path)));
    } finally {
      setIsRefreshing(false);
    }
  }, [getSignedUrl]);

  // Auto-refresh URLs that are about to expire
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const expiringSoon = new Date(now.getTime() + 30 * 60 * 1000); // 30 min buffer
      
      Object.entries(urlCache).forEach(([path, state]) => {
        if (state.expiresAt < expiringSoon && !state.isRefreshing) {
          getSignedUrl(path);
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [urlCache, getSignedUrl]);

  return {
    getSignedUrl,
    refreshUrl,
    preloadUrls,
    isRefreshing,
    urlCache
  };
};
