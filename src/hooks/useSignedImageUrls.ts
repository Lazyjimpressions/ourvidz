
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const useSignedImageUrls = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSignedUrl = useCallback(async (path: string, bucket?: string, expiresIn?: number): Promise<string | null> => {
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

      // Use longer expiration for regeneration scenarios (2 hours instead of 1)
      const defaultExpiresIn = expiresIn || 7200; // 2 hours
      const cleanPath = path; // Keep the complete storage path

      // Smart bucket determination based on OptimizedAssetService logic
      let bucketName = bucket;
      if (!bucketName) {
        // Default to SDXL fast bucket as most common - will be overridden by bucket hint
        bucketName = 'sdxl_image_fast';
      }

      console.log(`🔍 Generating signed URL for regeneration: "${path}" in bucket: "${bucketName}" (expires in ${defaultExpiresIn}s)`);

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
            .createSignedUrl(cleanPath, defaultExpiresIn);

          if (!error && data?.signedUrl) {
            console.log(`✅ Success: Generated signed URL for regeneration "${cleanPath}" in bucket "${tryBucket}" (expires in ${defaultExpiresIn}s)`);
            return data.signedUrl;
          }
          
          if (error) {
            console.log(`❌ Failed bucket "${tryBucket}": ${error.message}`);
          }
        } catch (bucketError) {
          console.log(`❌ Error with bucket "${tryBucket}":`, bucketError);
        }
      }

      console.error(`❌ All buckets failed for regeneration path: "${cleanPath}"`);
      setError(`Failed to generate signed URL for regeneration: ${cleanPath}`);
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in getSignedUrl for regeneration:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSignedUrls = useCallback(async (paths: string[], bucket?: string, expiresIn?: number): Promise<(string | null)[]> => {
    const promises = paths.map(path => getSignedUrl(path, bucket, expiresIn));
    return Promise.all(promises);
  }, [getSignedUrl]);

  // New function specifically for regeneration with validation
  const getRegenerationSignedUrl = useCallback(async (path: string, bucket?: string): Promise<string | null> => {
    console.log('🔄 Getting regeneration signed URL with validation:', { path, bucket });
    
    // Use 3-hour expiration for regeneration to ensure it doesn't expire during queue processing
    const signedUrl = await getSignedUrl(path, bucket, 10800); // 3 hours
    
    if (!signedUrl) {
      console.error('❌ Failed to generate regeneration signed URL');
      return null;
    }

    // Validate the signed URL is accessible
    try {
      const response = await fetch(signedUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.error('❌ Regeneration reference image not accessible:', response.status);
        setError('Reference image is not accessible');
        return null;
      }
      console.log('✅ Regeneration reference image validated successfully');
      return signedUrl;
    } catch (error) {
      console.error('❌ Error validating regeneration reference image:', error);
      setError('Failed to validate reference image');
      return null;
    }
  }, [getSignedUrl]);

  return {
    getSignedUrl,
    getSignedUrls,
    getRegenerationSignedUrl,
    loading,
    error
  };
};

export default useSignedImageUrls;
