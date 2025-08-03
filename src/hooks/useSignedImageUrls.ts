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

      // If we have an asset ID instead of a path, try to get bucket info from database
      if (path && !path.includes('/') && !path.includes('.')) {
        console.log('🔍 Path looks like asset ID, checking database for bucket info...');
        try {
          const { data: imageData } = await supabase
            .from('images')
            .select('image_url, metadata')
            .eq('id', path)
            .single();
          
          if (imageData?.image_url) {
            console.log('✅ Found image data in database:', imageData);
            // Use the actual storage path from database
            const storagePath = imageData.image_url;
            const bucketFromMeta = (imageData.metadata as any)?.bucket;
            if (bucketFromMeta) {
              bucketName = bucketFromMeta;
              console.log(`🎯 Using bucket from metadata: ${bucketName}`);
            }
            // Try with the actual storage path
            const { data, error } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(storagePath, 3600);
            
            if (!error && data?.signedUrl) {
              console.log(`✅ Success: Generated signed URL using database path`);
              return data.signedUrl;
            }
          }
        } catch (dbError) {
          console.log('⚠️ Failed to get image from database, continuing with bucket search');
        }
      }

      // PHASE 2 FIX: Smart bucket detection for SDXL images
      let bucketList = [bucketName];
      
      // Add SDXL buckets if path suggests it's an SDXL image
      if (path.includes('sdxl_') || bucketName?.includes('sdxl')) {
        bucketList = ['sdxl_image_high', 'sdxl_image_fast', ...bucketList];
      }
      
      // Complete bucket list with fallbacks
      const bucketsToTry = [
        ...bucketList,
        'sdxl_image_high', // Most common for recent images
        'sdxl_image_fast',
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