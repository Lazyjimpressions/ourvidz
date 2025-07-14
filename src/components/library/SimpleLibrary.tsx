import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

interface SimpleAsset {
  id: string;
  type: 'image' | 'video';
  title: string | null;
  prompt: string;
  thumbnailUrl: string | null;
  url: string | null;
  status: string;
  createdAt: Date;
  metadata: any;
  // Extended properties for SDXL support
  isSDXL?: boolean;
  isSDXLImage?: boolean;
  sdxlIndex?: number;
  originalAssetId?: string;
}

const SimpleLibrary = () => {
  const [typeFilter, setTypeFilter] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset page when switching types
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  // Enhanced bucket detection logic (from TestMediaGrid)
  const inferBucketFromJob = useCallback((metadata: any, quality: string = 'fast'): string => {
    // Primary: Use bucket from metadata if available
    if (metadata?.bucket) {
      console.log(`Using bucket from metadata: ${metadata.bucket}`);
      return metadata.bucket;
    }

    // Fallback logic based on job properties
    const modelVariant = metadata?.model_variant || '';
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced || modelVariant.includes('7b');

    // Enhanced model variants
    if (isEnhanced) {
      const bucket = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      console.log(`Using enhanced bucket for ${modelVariant}: ${bucket}`);
      return bucket;
    }

    // SDXL models
    if (isSDXL) {
      const bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      console.log(`Using SDXL bucket: ${bucket}`);
      return bucket;
    }

    // Default buckets
    const bucket = quality === 'high' ? 'image_high' : 'image_fast';
    console.log(`Using default bucket: ${bucket}`);
    return bucket;
  }, []);

  // Efficient signed URL generation with caching (from LibraryV2)
  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const cacheKey = `signed_urls_${bucket}`;
    const cached = sessionStorage.getItem(cacheKey);
    const urlCache = cached ? JSON.parse(cached) : {};
    
    const results: string[] = [];
    const newUrls: { [key: string]: string } = {};
    
    // Process paths in parallel with caching
    await Promise.all(paths.map(async (path) => {
      const pathCacheKey = `${bucket}|${path}`;
      
      if (urlCache[pathCacheKey]) {
        results.push(urlCache[pathCacheKey]);
        return;
      }
      
      try {
        console.log(`Requesting signed URL for bucket=${bucket}, path=${path}`);
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry
        
        if (data?.signedUrl) {
          results.push(data.signedUrl);
          newUrls[pathCacheKey] = data.signedUrl;
          console.log(`Successfully signed URL for ${path}`);
        } else {
          console.warn(`Failed to generate signed URL for ${path} in ${bucket}:`, error);
          // Try alternative buckets if primary fails
          await tryAlternativeBuckets(path, bucket, results, newUrls);
        }
      } catch (error) {
        console.error(`Error generating signed URL for ${path}:`, error);
        // Try alternative buckets on error
        await tryAlternativeBuckets(path, bucket, results, newUrls);
      }
    }));
    
    // Update cache with new URLs
    if (Object.keys(newUrls).length > 0) {
      const updatedCache = { ...urlCache, ...newUrls };
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    }
    
    return results;
  }, []);

  // Helper function to try alternative buckets if primary fails
  const tryAlternativeBuckets = useCallback(async (path: string, primaryBucket: string, results: string[], newUrls: { [key: string]: string }) => {
    const alternativeBuckets = [
      'sdxl_image_fast', 'sdxl_image_high',
      'image7b_fast_enhanced', 'image7b_high_enhanced', 
      'image_fast', 'image_high'
    ].filter(bucket => bucket !== primaryBucket);

    for (const bucket of alternativeBuckets) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        
        if (data?.signedUrl) {
          results.push(data.signedUrl);
          newUrls[`${bucket}|${path}`] = data.signedUrl;
          console.log(`✅ Found image in alternative bucket: ${bucket}`);
          return;
        }
      } catch (error) {
        // Continue trying other buckets
        continue;
      }
    }
    console.warn(`❌ Failed to find ${path} in any bucket`);
  }, []);

  // Enhanced fetch assets with proper URL generation and SDXL expansion
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['simple-assets', typeFilter, currentPage],
    queryFn: async () => {
      console.log(`🔍 Fetching ${typeFilter}s for page ${currentPage}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const offset = (currentPage - 1) * pageSize;
      const allAssets: SimpleAsset[] = [];
      
      if (typeFilter === 'image') {
        // Query with all necessary fields including image_urls and metadata
        const { data, error } = await supabase
          .from('images')
          .select(`
            id, 
            title, 
            prompt, 
            image_url, 
            image_urls, 
            thumbnail_url, 
            status, 
            quality,
            format,
            created_at, 
            metadata
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching images:', error);
          throw error;
        }
        
        // Process each image with proper bucket detection and URL generation
        for (const image of data || []) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromJob(metadata, image.quality);
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          // Handle SDXL multiple images (expand like LibraryV2)
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            // Generate signed URLs for all images in the array
            const imageUrls = image.image_urls as string[];
            const signedUrls = await generateSignedUrls(imageUrls, bucket);
            
            // Create individual assets for each SDXL image
            signedUrls.forEach((url, index) => {
              if (url) { // Only add if URL was successfully generated
                allAssets.push({
                  id: `${image.id}_${index}`,
                  type: 'image',
                  title: `${image.title || image.prompt} (Image ${index + 1})`,
                  prompt: `${image.prompt} (Image ${index + 1})`,
                  thumbnailUrl: url,
                  url: url,
                  status: image.status,
                  createdAt: image.created_at ? new Date(image.created_at) : new Date(),
                  metadata: metadata,
                  isSDXL: true,
                  isSDXLImage: true,
                  sdxlIndex: index,
                  originalAssetId: image.id,
                });
              }
            });
          } else {
            // Single image (WAN or SDXL with single image)
            let url: string | undefined;
            
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              // Single image from array
              const firstImageUrl = image.image_urls[0] as string;
              const signedUrls = await generateSignedUrls([firstImageUrl], bucket);
              url = signedUrls[0];
            } else if (image.image_url) {
              // Single image from image_url field
              const signedUrls = await generateSignedUrls([image.image_url], bucket);
              url = signedUrls[0];
            }
            
            if (url) { // Only add if URL was successfully generated
              allAssets.push({
                id: image.id,
                type: 'image',
                title: image.title,
                prompt: image.prompt || '',
                thumbnailUrl: url,
                url: url,
                status: image.status,
                createdAt: image.created_at ? new Date(image.created_at) : new Date(),
                metadata: metadata,
                isSDXL: isSDXL,
              });
            }
          }
        }
      } else {
        // Video processing with signed URLs
        const { data, error } = await supabase
          .from('videos')
          .select(`
            id, 
            title, 
            video_url, 
            thumbnail_url, 
            status, 
            format,
            created_at, 
            metadata
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching videos:', error);
          throw error;
        }
        
        // Process videos with signed URLs
        for (const video of data || []) {
          const metadata = video.metadata as any;
          const bucket = metadata?.bucket || 'video_fast'; // Default to video_fast since videos table doesn't have quality field
          
          // Generate signed URL for video
          let url: string | undefined;
          if (video.video_url) {
            const signedUrls = await generateSignedUrls([video.video_url], bucket);
            url = signedUrls[0];
          }
          
          if (url) { // Only add if URL was successfully generated
            allAssets.push({
              id: video.id,
              type: 'video',
              title: video.title,
              prompt: metadata?.prompt || 'Generated video',
              thumbnailUrl: video.thumbnail_url,
              url: url,
              status: video.status,
              createdAt: video.created_at ? new Date(video.created_at) : new Date(),
              metadata: metadata,
            });
          }
        }
      }
      
      console.log(`✅ Processed ${allAssets.length} ${typeFilter}s with working URLs`);
      return allAssets;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });

  // Enhanced counts query that accounts for SDXL expansion
  const { data: counts } = useQuery({
    queryKey: ['asset-counts', typeFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (typeFilter === 'image') {
        // Get image count with SDXL expansion
        const { data: images } = await supabase
          .from('images')
          .select('image_urls, metadata')
          .eq('user_id', user.id);

        let totalImageCount = 0;
        for (const image of images || []) {
          const metadata = image.metadata as any;
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            // Count each SDXL image separately
            totalImageCount += image.image_urls.length;
          } else {
            // Single image
            totalImageCount += 1;
          }
        }

        return { images: totalImageCount, videos: 0 };
      } else {
        // Simple video count
        const { count } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        return { images: 0, videos: count || 0 };
      }
    }
  });

  const totalPages = Math.ceil((typeFilter === 'image' ? (counts?.images || 0) : (counts?.videos || 0)) / pageSize);

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="text-center py-8">
          <p className="text-destructive">Error loading assets: {error.message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            This might be a permissions issue. Check if you're logged in and have access to your assets.
          </p>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-muted-foreground">
            Showing {assets.length} of {typeFilter === 'image' ? (counts?.images || 0) : (counts?.videos || 0)} {typeFilter}s
          </p>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2">
          <Button
            variant={typeFilter === 'image' ? "default" : "outline"}
            onClick={() => setTypeFilter('image')}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Images ({counts?.images || 0})
          </Button>
          <Button
            variant={typeFilter === 'video' ? "default" : "outline"}
            onClick={() => setTypeFilter('video')}
            className="gap-2"
          >
            <VideoIcon className="h-4 w-4" />
            Videos ({counts?.videos || 0})
          </Button>
        </div>

        {/* Assets Grid */}
        {assets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No {typeFilter}s found. Start creating some content!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={() => {}}
                  onPreview={() => {}}
                  onDelete={() => {}}
                  onDownload={() => {}}
                  isSelected={false}
                  selectionMode={false}
                  isDeleting={false}
                />
              ))}
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default SimpleLibrary;