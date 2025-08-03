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

      // Require bucket parameter for workspace items
      if (!bucket) {
        console.error('Bucket parameter is required for signed URL generation');
        setError('Bucket parameter is required');
        return null;
      }

      console.log(`🔍 Generating signed URL for path: "${path}" in bucket: "${bucket}"`);

      // Direct signed URL generation using exact bucket and path
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (!error && data?.signedUrl) {
        console.log(`✅ Success: Generated signed URL for "${path}" in bucket "${bucket}"`);
        return data.signedUrl;
      }
      
      if (error) {
        console.error(`❌ Failed to generate signed URL: ${error.message}`, {
          bucket,
          path,
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