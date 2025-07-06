import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PathResolutionResult {
  resolvedPath: string | null;
  bucket: string | null;
  error: string | null;
}

// Smart path resolution for files that may be stored with different naming conventions
export const usePathResolution = () => {
  const [isResolving, setIsResolving] = useState(false);

  const resolveAssetPath = useCallback(async (
    originalPath: string,
    preferredBucket: string,
    assetType: 'image' | 'video'
  ): Promise<PathResolutionResult> => {
    setIsResolving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { resolvedPath: null, bucket: null, error: 'User not authenticated' };
      }

      // Generate possible path variants
      const pathVariants = generatePathVariants(originalPath, user.id, assetType);
      
      // Generate possible bucket variants
      const bucketVariants = generateBucketVariants(preferredBucket, assetType);
      
      console.log('🔍 Path resolution attempt:', {
        originalPath,
        preferredBucket,
        pathVariants: pathVariants.length,
        bucketVariants: bucketVariants.length
      });

      // Try each combination until we find a match
      for (const bucket of bucketVariants) {
        for (const path of pathVariants) {
          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 60); // Short-lived test URL

            if (!error && data?.signedUrl) {
              console.log(`✅ Path resolved: ${bucket}/${path}`);
              return { resolvedPath: path, bucket, error: null };
            }
          } catch (err) {
            // Silent failure - continue trying
            continue;
          }
        }
      }

      return { 
        resolvedPath: null, 
        bucket: null, 
        error: `Could not resolve path: ${originalPath}` 
      };
      
    } catch (error) {
      return { 
        resolvedPath: null, 
        bucket: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolveAssetPath, isResolving };
};

function generatePathVariants(originalPath: string, userId: string, assetType: 'image' | 'video'): string[] {
  const variants: string[] = [];
  const fileName = originalPath.split('/').pop() || originalPath;
  
  // 1. Original path as-is
  variants.push(originalPath);
  
  // 2. User-prefixed path
  if (!originalPath.startsWith(`${userId}/`)) {
    variants.push(`${userId}/${originalPath}`);
  }
  
  // 3. Remove user prefix if present
  if (originalPath.startsWith(`${userId}/`)) {
    variants.push(originalPath.replace(`${userId}/`, ''));
  }
  
  // 4. Type-specific paths
  if (assetType === 'video') {
    variants.push(`${userId}/videos/${fileName}`);
    variants.push(`${userId}/video/${fileName}`);
    variants.push(`videos/${fileName}`);
    variants.push(`video/${fileName}`);
  } else {
    variants.push(`${userId}/images/${fileName}`);
    variants.push(`${userId}/image/${fileName}`);
    variants.push(`images/${fileName}`);
    variants.push(`image/${fileName}`);
  }
  
  // 5. Direct filename
  variants.push(fileName);
  
  // Remove duplicates while preserving order
  return [...new Set(variants)];
}

function generateBucketVariants(preferredBucket: string, assetType: 'image' | 'video'): string[] {
  const variants = [preferredBucket];
  
  if (assetType === 'video') {
    // Video bucket fallbacks
    variants.push('video7b_fast_enhanced', 'video7b_high_enhanced');
    variants.push('video_fast', 'video_high');
    variants.push('videos'); // Legacy bucket
  } else {
    // Image bucket fallbacks
    variants.push('image7b_fast_enhanced', 'image7b_high_enhanced');
    variants.push('sdxl_image_fast', 'sdxl_image_high');
    variants.push('image_fast', 'image_high');
  }
  
  // Remove duplicates while preserving order
  return [...new Set(variants)];
}