import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const useSignedImageUrls = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSignedUrl = useCallback(async (path: string, bucket?: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      // Determine bucket from path or use provided bucket
      let bucketName = bucket;
      
      if (!bucketName) {
        // Try to infer bucket from path
        if (path.includes('sdxl_image_fast/')) bucketName = 'sdxl_image_fast';
        else if (path.includes('sdxl_image_high/')) bucketName = 'sdxl_image_high';
        else if (path.includes('image_fast/')) bucketName = 'image_fast';
        else if (path.includes('image_high/')) bucketName = 'image_high';
        else if (path.includes('image7b_fast_enhanced/')) bucketName = 'image7b_fast_enhanced';
        else if (path.includes('image7b_high_enhanced/')) bucketName = 'image7b_high_enhanced';
        else bucketName = 'sdxl_image_fast'; // default
      }

      // Clean path - remove bucket prefix if present
      let cleanPath = path;
      if (path.includes('/')) {
        const pathParts = path.split('/');
        cleanPath = pathParts[pathParts.length - 1];
      }

      console.log(`Generating signed URL for: ${cleanPath} in bucket: ${bucketName}`);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error generating signed URL:', error);
        setError(error.message);
        return null;
      }

      if (!data?.signedUrl) {
        console.error('No signed URL returned');
        setError('No signed URL returned');
        return null;
      }

      return data.signedUrl;
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