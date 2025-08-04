import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const useSignedImageUrls = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSignedUrl = useCallback(async (path: string, bucket?: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      // If path is already a full URL, return it directly
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }

      // Handle empty or invalid paths
      if (!path || path.trim() === '') {
        console.warn('Empty path provided to getSignedUrl');
        return null;
      }

      // Auto-detect bucket if not provided
      if (!bucket) {
        if (path.includes('sdxl_image_high') || path.includes('/sdxl_image_high/')) {
          bucket = 'sdxl_image_high';
        } else if (path.includes('sdxl_image_fast') || path.includes('/sdxl_image_fast/')) {
          bucket = 'sdxl_image_fast';
        } else if (path.includes('image_high') || path.includes('/image_high/')) {
          bucket = 'image_high';
        } else if (path.includes('image_fast') || path.includes('/image_fast/')) {
          bucket = 'image_fast';
        } else {
          console.error('Cannot determine bucket from path and no bucket provided:', path);
          setError('Cannot determine bucket for signed URL generation');
          return null;
        }
        console.log(`🔍 Auto-detected bucket "${bucket}" from path: "${path}"`);
      }

      console.log(`🔍 Generating signed URL for path: "${path}" in bucket: "${bucket}"`);

      // FIX: Clean storage path - remove bucket prefix if present
      let cleanPath = path;
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.replace(`${bucket}/`, '');
      }

      // Direct signed URL generation using exact bucket and path
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(cleanPath, 3600); // 1 hour expiry

      if (!error && data?.signedUrl) {
        console.log(`✅ Success: Generated signed URL for "${cleanPath}" in bucket "${bucket}"`);
        return data.signedUrl;
      }
      
      if (error) {
        console.error(`❌ Failed to generate signed URL: ${error.message}`, {
          bucket,
          path: cleanPath,
          error
        });
        setError(`Failed to generate signed URL: ${error.message}`);
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in getSignedUrl:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSignedUrls = useCallback(async (paths: string[], bucket?: string): Promise<(string | null)[]> => {
    const promises = paths.map(path => getSignedUrl(path, bucket));
    return Promise.all(promises);
  }, [getSignedUrl]);

  return {
    getSignedUrl,
    getSignedUrls,
    loading,
    error
  };
};

export default useSignedImageUrls;