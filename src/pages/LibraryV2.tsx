import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetCard } from '@/components/AssetCard';
import { AssetPreviewModal } from '@/components/AssetPreviewModal';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface LibraryAsset {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  status: string;
  quality?: string;
  format?: string;
  createdAt: Date;
  url?: string;
  thumbnailUrl?: string;
  signedUrls?: string[];
  modelType?: string;
  isSDXL?: boolean;
  // SDXL specific properties
  isSDXLImage?: boolean;
  sdxlIndex?: number;
  originalAssetId?: string;
}

const LibraryV2 = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // UI states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<LibraryAsset | null>(null);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounced search for efficiency
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Efficient bucket detection (same as WorkspaceTest)
  const inferBucketFromMetadata = useCallback((metadata: any, quality: string = 'fast'): string => {
    // Primary: Use bucket from metadata if available
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    // Fallback logic based on metadata properties
    const modelVariant = metadata?.model_variant || '';
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced || modelVariant.includes('7b');

    // Enhanced model variants
    if (isEnhanced) {
      return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    }

    // SDXL models
    if (isSDXL) {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }

    // Default buckets
    return quality === 'high' ? 'image_high' : 'image_fast';
  }, []);

  // Efficient signed URL generation with caching
  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const cacheKey = `signed_urls_${bucket}`;
    const cached = sessionStorage.getItem(cacheKey);
    const urlCache = cached ? JSON.parse(cached) : {};
    
    const results: string[] = [];
    const newUrls: { [key: string]: string } = {};
    
    // Process paths in parallel with caching
    await Promise.all(paths.map(async (path) => {
      const cacheKey = `${bucket}|${path}`;
      
      if (urlCache[cacheKey]) {
        results.push(urlCache[cacheKey]);
        return;
      }
      
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry
        
        if (data?.signedUrl) {
          results.push(data.signedUrl);
          newUrls[cacheKey] = data.signedUrl;
        } else {
          console.warn(`Failed to generate signed URL for ${path} in ${bucket}:`, error);
        }
      } catch (error) {
        console.error(`Error generating signed URL for ${path}:`, error);
      }
    }));
    
    // Update cache with new URLs
    if (Object.keys(newUrls).length > 0) {
      const updatedCache = { ...urlCache, ...newUrls };
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    }
    
    return results;
  }, []);

  // Main data fetching with React Query for caching
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['library-v2-assets', user?.id, typeFilter, statusFilter, debouncedSearchTerm],
    queryFn: async (): Promise<LibraryAsset[]> => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('🔄 Fetching library assets for user:', user.id);
      
      // Build efficient database queries
      const imageQuery = supabase
        .from('images')
        .select(`
          id, 
          prompt, 
          status, 
          quality, 
          format, 
          created_at, 
          image_url, 
          image_urls, 
          metadata
        `)
        .eq('user_id', user.id);
      
      const videoQuery = supabase
        .from('videos')
        .select(`
          id, 
          status, 
          format, 
          created_at, 
          video_url, 
          thumbnail_url, 
          metadata
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (statusFilter !== 'all') {
        imageQuery.eq('status', statusFilter);
        videoQuery.eq('status', statusFilter);
      }
      
      if (searchTerm) {
        imageQuery.ilike('prompt', `%${searchTerm}%`);
        // Videos don't have prompt field, so we'll filter them out if searching
      }

      // Execute queries based on type filter
      const promises = [];
      
      if (typeFilter !== 'video') {
        promises.push(imageQuery.order('created_at', { ascending: false }).limit(100));
      }
      
      if (typeFilter !== 'image') {
        promises.push(videoQuery.order('created_at', { ascending: false }).limit(100));
      }
      
      const [imageResult, videoResult] = await Promise.all(promises);
      
      if (imageResult.error) throw imageResult.error;
      if (videoResult.error) throw videoResult.error;
      
      const allAssets: LibraryAsset[] = [];
      
      // Process images (following WorkspaceTest pattern)
      if (imageResult.data) {
        for (const image of imageResult.data) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, image.quality);
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          // Handle SDXL multiple images (like WorkspaceTest)
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            // Generate signed URLs for all images in the array
            const signedUrls = await generateSignedUrls(image.image_urls, bucket);
            
            // Create individual assets for each SDXL image
            signedUrls.forEach((url, index) => {
              allAssets.push({
                id: `${image.id}_${index}`,
                type: 'image',
                prompt: `${image.prompt} (Image ${index + 1})`,
                status: image.status,
                quality: image.quality,
                format: image.format,
                createdAt: new Date(image.created_at),
                url: url,
                thumbnailUrl: url,
                modelType: 'SDXL',
                isSDXL: true,
                isSDXLImage: true,
                sdxlIndex: index,
                originalAssetId: image.id,
              });
            });
          } else {
            // Single image (WAN or SDXL with single image)
            let url: string | undefined;
            
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              // Single image from array
              const signedUrls = await generateSignedUrls([image.image_urls[0]], bucket);
              url = signedUrls[0];
            } else if (image.image_url) {
              // Single image from image_url field
              const signedUrls = await generateSignedUrls([image.image_url], bucket);
              url = signedUrls[0];
            }
            
            allAssets.push({
              id: image.id,
              type: 'image',
              prompt: image.prompt,
              status: image.status,
              quality: image.quality,
              format: image.format,
              createdAt: new Date(image.created_at),
              url: url,
              thumbnailUrl: url,
              modelType: isSDXL ? 'SDXL' : 'WAN',
              isSDXL: isSDXL,
            });
          }
        }
      }
      
      // Process videos
      if (videoResult.data) {
        for (const video of videoResult.data) {
          const metadata = video.metadata as any;
          const bucket = metadata?.bucket || (video.quality === 'high' ? 'video_high' : 'video_fast');
          
          // Generate signed URL for video
          let url: string | undefined;
          if (video.video_url) {
            const signedUrls = await generateSignedUrls([video.video_url], bucket);
            url = signedUrls[0];
          }
          
          allAssets.push({
            id: video.id,
            type: 'video',
            prompt: metadata?.prompt || 'Generated video',
            status: video.status,
            quality: video.quality || 'fast',
            format: video.format,
            createdAt: new Date(video.created_at),
            url: url,
            thumbnailUrl: video.thumbnail_url,
            modelType: 'WAN',
            isSDXL: false,
          });
        }
      }
      
      // Sort by creation date (newest first)
      return allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
    refetchOnWindowFocus: false,
  });

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    if (!debouncedSearchTerm) return assets;
    
    return assets.filter(asset => 
      asset.prompt.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [assets, debouncedSearchTerm]);

  // Selection handlers
  const handleAssetSelection = (assetId: string, selected: boolean) => {
    const newSelection = new Set(selectedAssets);
    if (selected) {
      newSelection.add(assetId);
    } else {
      newSelection.delete(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const handlePreview = (asset: LibraryAsset) => {
    setPreviewAsset(asset);
  };

  const handleClosePreview = () => {
    setPreviewAsset(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading your library...</p>
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Library</h2>
            <p className="text-gray-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['library-v2-assets'] })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <OurVidzDashboardLayout>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Library</h1>
              <p className="text-gray-400 mt-1">
                {filteredAssets.length} assets • {filteredAssets.filter(a => a.type === 'image').length} images • {filteredAssets.filter(a => a.type === 'video').length} videos
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
              </select>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
              
              {/* View Mode */}
              <div className="flex border border-gray-700 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="p-6">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-white mb-2">No assets found</h3>
              <p className="text-gray-400">
                {searchTerm ? 'Try adjusting your search terms.' : 'Generate some content to see it here!'}
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
                : 'grid-cols-1'
            }`}>
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset as UnifiedAsset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={(selected) => handleAssetSelection(asset.id, selected)}
                  onPreview={() => handlePreview(asset)}
                  onDelete={() => toast.info('Delete functionality coming soon')}
                  onDownload={() => toast.info('Download functionality coming soon')}
                  selectionMode={selectedAssets.size > 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewAsset && (
          <AssetPreviewModal
            asset={previewAsset as UnifiedAsset}
            open={!!previewAsset}
            onClose={handleClosePreview}
            onDownload={() => toast.info('Download functionality coming soon')}
          />
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};

export default LibraryV2; 