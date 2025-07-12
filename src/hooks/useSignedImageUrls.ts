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

      // CRITICAL FIX: Use full storage path - user_id prefix is part of storage structure
      const cleanPath = path; // Keep the complete storage path

      // Smart bucket determination based on OptimizedAssetService logic
      let bucketName = bucket;
      if (!bucketName) {
        // Default to SDXL fast bucket as most common - will be overridden by bucket hint
        bucketName = 'sdxl_image_fast';
      }

      console.log(`🔍 Generating signed URL for path: "${path}" in bucket: "${bucketName}"`);

      // Try buckets in order aligned with OptimizedAssetService
      const bucketsToTry = [
        bucketName,
        'sdxl_image_fast',
        'sdxl_image_high',
        'image7b_fast_enhanced', 
        'image7b_high_enhanced',
        'image_fast',
        'image_high'
      ].filter((b, i, arr) => arr.indexOf(b) === i); // Remove duplicates

      for (const tryBucket of bucketsToTry) {
        try {
          const { data, error } = await supabase.storage
            .from(tryBucket)
            .createSignedUrl(cleanPath, 3600); // 1 hour expiry

          if (!error && data?.signedUrl) {
            console.log(`✅ Success: Generated signed URL for "${cleanPath}" in bucket "${tryBucket}"`);
            return data.signedUrl;
          }
          
          if (error) {
            console.log(`❌ Failed bucket "${tryBucket}": ${error.message}`);
          }
        } catch (bucketError) {
          console.log(`❌ Error with bucket "${tryBucket}":`, bucketError);
        }
      }

      console.error(`❌ All buckets failed for path: "${cleanPath}"`);
      setError(`Failed to generate signed URL for ${cleanPath}`);
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