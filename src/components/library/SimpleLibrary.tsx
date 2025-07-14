import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { LibraryLightboxStatic } from "@/components/library/LibraryLightboxStatic";
import { UnifiedAsset } from "@/lib/services/OptimizedAssetService";

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
}

const SimpleLibrary = () => {
  const [typeFilter, setTypeFilter] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxAsset, setLightboxAsset] = useState<UnifiedAsset | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const pageSize = 20;

  // Reset page when switching types
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  // Simple bucket detection from metadata
  const inferBucketFromMetadata = useCallback((metadata: any): string => {
    // Use bucket from metadata if available
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    // Fallback based on model type
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced;
    const quality = metadata?.quality || 'fast';

    if (isSDXL) {
      return `sdxl_image_${quality}`;
    } else if (isEnhanced) {
      return `image7b_${quality}_enhanced`;
    } else {
      return `image_${quality}`;
    }
  }, []);

  // Generate signed URL for a single path
  const generateSignedUrl = useCallback(async (path: string, bucket: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (data?.signedUrl) {
        return data.signedUrl;
      } else {
        console.warn(`Failed to generate signed URL for ${path} in ${bucket}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Error generating signed URL for ${path}:`, error);
      return null;
    }
  }, []);

  // Fetch assets - now simple since each record is one asset
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['simple-assets', typeFilter, currentPage],
    queryFn: async () => {
      console.log(`🔍 Fetching ${typeFilter}s for page ${currentPage}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const offset = (currentPage - 1) * pageSize;
      const allAssets: SimpleAsset[] = [];
      
      if (typeFilter === 'image') {
        // Query images with job_id for the new architecture
        const { data, error } = await supabase
          .from('images')
          .select(`
            id, 
            title, 
            prompt, 
            image_url, 
            thumbnail_url, 
            status, 
            quality,
            format,
            created_at, 
            metadata,
            job_id
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching images:', error);
          throw error;
        }
        
        // Process each image - simple 1:1 mapping
        for (const image of data || []) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata);
          
          // Generate signed URL for the single image
          let url: string | null = null;
          if (image.image_url) {
            url = await generateSignedUrl(image.image_url, bucket);
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
            });
          }
        }
      } else {
        // Video processing - unchanged
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
          const bucket = metadata?.bucket || 'video_fast';
          
          // Generate signed URL for video
          let url: string | null = null;
          if (video.video_url) {
            url = await generateSignedUrl(video.video_url, bucket);
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

  // Simple counts query - no expansion needed
  const { data: counts } = useQuery({
    queryKey: ['asset-counts', typeFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (typeFilter === 'image') {
        const { count } = await supabase
          .from('images')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        return { images: count || 0, videos: 0 };
      } else {
        const { count } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        return { images: 0, videos: count || 0 };
      }
    }
  });

  const totalPages = Math.ceil((typeFilter === 'image' ? (counts?.images || 0) : (counts?.videos || 0)) / pageSize);

  // Transform SimpleAsset to UnifiedAsset format
  const transformToUnifiedAssets = (assets: SimpleAsset[]): UnifiedAsset[] => {
    return assets.map(asset => ({
      id: asset.id,
      type: asset.type as 'image' | 'video',
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      prompt: asset.prompt,
      title: asset.title,
      status: asset.status as 'completed' | 'processing' | 'failed',
      createdAt: asset.createdAt,
      metadata: asset.metadata,
      quality: 'fast', // Default quality for SimpleLibrary
      bucketHint: asset.type === 'image' ? 'image_fast' : 'video_fast'
    }));
  };

  const unifiedAssets = transformToUnifiedAssets(assets);

  // Handle lightbox actions
  const handlePreview = (asset: SimpleAsset) => {
    const assetIndex = assets.findIndex(a => a.id === asset.id);
    if (assetIndex !== -1) {
      setLightboxIndex(assetIndex);
      setLightboxAsset(unifiedAssets[assetIndex]);
    }
  };

  const handleCloseLightbox = () => {
    setLightboxAsset(null);
    setLightboxIndex(0);
  };

  const handleDownload = async (asset: UnifiedAsset) => {
    if (!asset.url) return;
    
    try {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${asset.title || asset.id}.${asset.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${asset.type === 'image' ? 'Image' : 'Video'} download started`);
    } catch (error) {
      toast.error("Failed to download asset");
    }
  };

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
              {assets.map((asset, index) => (
                <AssetCard
                  key={asset.id}
                  asset={unifiedAssets[index]}
                  onSelect={() => {}}
                  onPreview={() => handlePreview(asset)}
                  onDelete={() => {}}
                  onDownload={() => handleDownload(unifiedAssets[index])}
                  isSelected={false}
                  selectionMode={false}
                  isDeleting={false}
                />
              ))}
            </div>

            {/* Pagination */}
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
      
      {/* Lightbox Modal */}
      {lightboxAsset && (
        <LibraryLightboxStatic
          assets={unifiedAssets}
          startIndex={lightboxIndex}
          onClose={handleCloseLightbox}
          onDownload={handleDownload}
        />
      )}
    </OurVidzDashboardLayout>
  );
};

export default SimpleLibrary;
