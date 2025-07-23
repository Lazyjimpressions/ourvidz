import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { AssetListView } from "@/components/library/AssetListView";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video as VideoIcon, RefreshCw } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxAsset, setLightboxAsset] = useState<UnifiedAsset | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [newAssetsBanner, setNewAssetsBanner] = useState(false);
  
  // Page size with localStorage persistence
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('library-page-size');
    return saved ? parseInt(saved, 10) : 20;
  });

  const queryClient = useQueryClient();

  // Reset page and selection when switching types, view modes, or search
  useEffect(() => {
    setCurrentPage(1);
    setSelectedAssets(new Set());
    setNewAssetsBanner(false);
  }, [typeFilter, viewMode, searchTerm, pageSize]);

  // Handle page size changes with localStorage persistence
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    localStorage.setItem('library-page-size', newPageSize.toString());
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Listen for generation completion events and update library
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type, jobId } = event.detail;
      
      console.log('📚 Library received generation completion:', { assetId, type, jobId });
      
      // Show new assets banner if user is on first page
      if (currentPage === 1) {
        setNewAssetsBanner(true);
      }
      
      // Invalidate queries for the completed asset type
      if (type === typeFilter || !type) {
        // Smart invalidation: only invalidate page 1 and counts
        queryClient.invalidateQueries({ 
          queryKey: ['simple-assets', typeFilter, 1] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['asset-counts', typeFilter] 
        });
        
        toast.success(`New ${type || 'asset'} added to library!`, {
          duration: 3000,
          action: {
            label: 'View',
            onClick: () => {
              if (type && type !== typeFilter) {
                setTypeFilter(type as 'image' | 'video');
              }
              if (currentPage !== 1) {
                setCurrentPage(1);
              }
              setNewAssetsBanner(false);
            }
          }
        });
      }
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [currentPage, typeFilter, queryClient]);

  // Handle new assets banner refresh
  const handleRefreshForNewAssets = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['simple-assets', typeFilter, currentPage] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['asset-counts', typeFilter] 
    });
    setNewAssetsBanner(false);
    toast.success('Library refreshed!');
  };

  // Simple bucket detection from metadata
  const inferBucketFromMetadata = useCallback((metadata: any, assetType: 'image' | 'video' = 'image'): string => {
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    if (assetType === 'video') {
      const quality = metadata?.quality || metadata?.generation_format?.includes('high') ? 'high' : 'fast';
      return `video_${quality}`;
    }

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

  // Fetch assets with search filtering
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['simple-assets', typeFilter, currentPage, searchTerm, pageSize],
    queryFn: async () => {
      console.log(`🔍 Fetching ${typeFilter}s for page ${currentPage} with search: "${searchTerm}"`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const offset = (currentPage - 1) * pageSize;
      const allAssets: SimpleAsset[] = [];
      
      if (typeFilter === 'image') {
        let query = supabase
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
          .order('created_at', { ascending: false });

        if (searchTerm.trim()) {
          query = query.or(`prompt.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching images:', error);
          throw error;
        }
        
        for (const image of data || []) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, 'image');
          
          let url: string | null = null;
          if (image.image_url) {
            url = await generateSignedUrl(image.image_url, bucket);
            if (!url) {
              console.warn(`Failed to generate signed URL for image ${image.id}, bucket: ${bucket}, path: ${image.image_url}`);
            }
          }
          
          if (url) {
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
        let query = supabase
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
          .order('created_at', { ascending: false });

        if (searchTerm.trim()) {
          query = query.or(`title.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.range(offset, offset + pageSize - 1);
          
        if (error) {
          console.error('❌ Error fetching videos:', error);
          throw error;
        }
        
        for (const video of data || []) {
          const metadata = video.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, 'video');
          
          let url: string | null = null;
          if (video.video_url) {
            url = await generateSignedUrl(video.video_url, bucket);
            if (!url) {
              console.warn(`Failed to generate signed URL for video ${video.id}, bucket: ${bucket}, path: ${video.video_url}`);
            }
          }
          
          let thumbnailUrl = null;
          
          const isPlaceholderThumbnail = video.thumbnail_url?.startsWith('system_assets/') || 
                                       (metadata && typeof metadata === 'object' && metadata.thumbnail_placeholder);
          
          if (video.thumbnail_url && !isPlaceholderThumbnail) {
            thumbnailUrl = video.thumbnail_url;
          }
          
          allAssets.push({
            id: video.id,
            type: 'video',
            title: video.title,
            prompt: metadata?.prompt || video.title || 'Generated video',
            thumbnailUrl: thumbnailUrl,
            url: url, // Can be null - UI will handle gracefully
            status: video.status,
            createdAt: video.created_at ? new Date(video.created_at) : new Date(),
            metadata: metadata,
          });
        }
      }
      
      console.log(`✅ Processed ${allAssets.length} ${typeFilter}s with working URLs`);
      return allAssets;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });

  // Counts query with search filtering
  const { data: counts } = useQuery({
    queryKey: ['asset-counts', typeFilter, searchTerm],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (typeFilter === 'image') {
        let query = supabase
          .from('images')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (searchTerm.trim()) {
          query = query.or(`prompt.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
        }

        const { count } = await query;
        return { images: count || 0, videos: 0 };
      } else {
        let query = supabase
          .from('videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (searchTerm.trim()) {
          query = query.or(`title.ilike.%${searchTerm}%`);
        }

        const { count } = await query;
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

  // Bulk selection handlers
  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    } else {
      setSelectedAssets(new Set());
    }
  };

  // Individual delete functionality
  const handleIndividualDelete = async (asset: SimpleAsset) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${asset.title || asset.prompt.substring(0, 50)}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (asset.type === 'image') {
        const { data: imageData, error: fetchError } = await supabase
          .from('images')
          .select('id, image_url, metadata, job_id')
          .eq('id', asset.id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        if (imageData.image_url) {
          const bucket = inferBucketFromMetadata(imageData.metadata);
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([imageData.image_url]);
          
          if (storageError) {
            console.warn(`Failed to delete file from storage: ${storageError.message}`);
          }
        }

        const { error: deleteError } = await supabase
          .from('images')
          .delete()
          .eq('id', asset.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        if (imageData.job_id) {
          const { count } = await supabase
            .from('images')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', imageData.job_id);

          if (count === 0) {
            await supabase
              .from('jobs')
              .delete()
              .eq('id', imageData.job_id)
              .eq('user_id', user.id);
          }
        }
      } else {
        const { data: videoData, error: fetchError } = await supabase
          .from('videos')
          .select('id, video_url, metadata')
          .eq('id', asset.id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        if (videoData.video_url) {
          const metadata = videoData.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, 'video');
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([videoData.video_url]);
          
          if (storageError) {
            console.warn(`Failed to delete file from storage: ${storageError.message}`);
          }
        }

        const { error: deleteError } = await supabase
          .from('videos')
          .delete()
          .eq('id', asset.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['simple-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-counts'] });

      toast.success(`Successfully deleted ${asset.type}`);

    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete functionality
  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedAssets.size} asset${selectedAssets.size !== 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    let deletedCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      for (const assetId of selectedAssets) {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) continue;

        try {
          if (asset.type === 'image') {
            const { data: imageData, error: fetchError } = await supabase
              .from('images')
              .select('id, image_url, metadata, job_id')
              .eq('id', assetId)
              .eq('user_id', user.id)
              .single();

            if (fetchError) throw fetchError;

            if (imageData.image_url) {
              const bucket = inferBucketFromMetadata(imageData.metadata);
              const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([imageData.image_url]);
              
              if (storageError) {
                console.warn(`Failed to delete file from storage: ${storageError.message}`);
              }
            }

            const { error: deleteError } = await supabase
              .from('images')
              .delete()
              .eq('id', assetId)
              .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            if (imageData.job_id) {
              const { count } = await supabase
                .from('images')
                .select('id', { count: 'exact', head: true })
                .eq('job_id', imageData.job_id);

              if (count === 0) {
                await supabase
                  .from('jobs')
                  .delete()
                  .eq('id', imageData.job_id)
                  .eq('user_id', user.id);
              }
            }
          } else {
            const { data: videoData, error: fetchError } = await supabase
              .from('videos')
              .select('id, video_url, metadata')
              .eq('id', assetId)
              .eq('user_id', user.id)
              .single();

            if (fetchError) throw fetchError;

            if (videoData.video_url) {
              const metadata = videoData.metadata as any;
              const bucket = inferBucketFromMetadata(metadata, 'video');
              const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([videoData.video_url]);
              
              if (storageError) {
                console.warn(`Failed to delete file from storage: ${storageError.message}`);
              }
            }

            const { error: deleteError } = await supabase
              .from('videos')
              .delete()
              .eq('id', assetId)
              .eq('user_id', user.id);

            if (deleteError) throw deleteError;
          }

          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete asset ${assetId}:`, error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['simple-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-counts'] });

      setSelectedAssets(new Set());

      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} asset${deletedCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} asset${errorCount !== 1 ? 's' : ''}`);
      }

    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete assets');
    } finally {
      setIsDeleting(false);
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
        <LibraryHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalAssets={typeFilter === 'image' ? (counts?.images || 0) : (counts?.videos || 0)}
          isLoading={isLoading}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          currentPage={currentPage}
          totalPages={totalPages}
        />

        <div className="flex items-center justify-between">
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
        </div>

        {newAssetsBanner && currentPage === 1 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <p className="text-primary font-medium">
                  New {typeFilter}s available! 
                </p>
                <span className="text-sm text-muted-foreground">
                  Your latest generations are ready to view.
                </span>
              </div>
              <Button
                onClick={handleRefreshForNewAssets}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {assets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm.trim() ? `No ${typeFilter}s found matching "${searchTerm}"` : `No ${typeFilter}s found. Start creating some content!`}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset, index) => (
              <AssetCard
                key={asset.id}
                asset={unifiedAssets[index]}
                onSelect={() => handleSelectAsset(asset.id)}
                onPreview={() => handlePreview(asset)}
                onDelete={() => handleIndividualDelete(asset)}
                onDownload={() => handleDownload(unifiedAssets[index])}
                isSelected={selectedAssets.has(asset.id)}
                selectionMode={selectedAssets.size > 0}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          <AssetListView
            assets={assets}
            selectedAssets={selectedAssets}
            onSelectAsset={handleSelectAsset}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            onIndividualDelete={handleIndividualDelete}
            onPreview={handlePreview}
            isDeleting={isDeleting}
          />
        )}

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
      </div>
      
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
