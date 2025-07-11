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

      // Try multiple buckets in order of preference
      const bucketsToTry = [
        bucketName,
        'sdxl_image_fast',
        'sdxl_image_high', 
        'image_fast',
        'image_high'
      ].filter((b, i, arr) => arr.indexOf(b) === i); // Remove duplicates

      for (const tryBucket of bucketsToTry) {
        try {
          const { data, error } = await supabase.storage
            .from(tryBucket)
            .createSignedUrl(cleanPath, 3600); // 1 hour expiry

          if (!error && data?.signedUrl) {
            console.log(`✅ Success with bucket: ${tryBucket}`);
            return data.signedUrl;
          }
          
          if (error) {
            console.log(`❌ Failed with bucket ${tryBucket}:`, error.message);
          }
        } catch (bucketError) {
          console.log(`❌ Error with bucket ${tryBucket}:`, bucketError);
        }
      }

      console.error('All buckets failed for path:', cleanPath);
      setError('Failed to generate signed URL from any bucket');
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