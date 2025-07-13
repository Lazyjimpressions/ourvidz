import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { LibraryLightbox } from "./LibraryLightbox";
import { AssetTableView } from "@/components/AssetTableView";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LibraryHeader } from "./LibraryHeader";
import { LibraryFilters } from "./LibraryFilters";
import { BulkActionBar } from "./BulkActionBar";
import { OptimizedAssetService, UnifiedAsset } from "@/lib/services/OptimizedAssetService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

import { sessionCache } from "@/lib/cache/SessionCache";
import { memoryManager } from "@/lib/cache/MemoryManager";
import { progressiveEnhancement } from "@/lib/cache/ProgressiveEnhancement";
import { performanceMonitor } from "@/lib/cache/PerformanceMonitor";
import { toast } from "sonner";

const OptimizedLibrary = () => {
  console.log('🔍 OptimizedLibrary component rendering...');
  const queryClient = useQueryClient();
  
  // Phase 3: Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.startLibrarySession();
    performanceMonitor.markStart('library-load');
    
    return () => {
      const metrics = performanceMonitor.endLibrarySession();
      const summary = performanceMonitor.getPerformanceSummary();
      
      if (summary.suggestions.length > 0) {
        console.log('💡 Performance suggestions:', summary.suggestions);
      }
    };
  }, []);
  
  // Initialize session cache on mount with memory management
  useEffect(() => {
    const initializeCache = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        sessionCache.initializeSession(user.id);
        console.log('🚀 Library: Session cache initialized for user:', user.id);
        
        // Phase 3: Track library usage
        progressiveEnhancement.trackLibraryTime(Date.now());
      }
    };
    initializeCache();
  }, []);
  
  // Simplified filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>("all");
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>("all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('library-page-size');
    return saved ? Number(saved) : 50;
  });
  
  // UI states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number>(-1);
  console.log('🔍 selectedAssetIndex state:', selectedAssetIndex);

  // Modal states  
  const [assetToDelete, setAssetToDelete] = useState<UnifiedAsset | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Deletion states
  const [deletingAssets, setDeletingAssets] = useState<Set<string>>(new Set());

  // OPTIMIZATION: Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, debouncedSearchTerm]);

  // Save page size preference
  useEffect(() => {
    localStorage.setItem('library-page-size', pageSize.toString());
  }, [pageSize]);

  // Calculate pagination
  const offset = (currentPage - 1) * pageSize;

  // Efficient bucket detection (from LibraryV2)
  const inferBucketFromMetadata = useCallback((metadata: any, quality: string = 'fast'): string => {
    if (metadata?.bucket) {
      return metadata.bucket;
    }

    const modelVariant = metadata?.model_variant || '';
    const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
    const isEnhanced = metadata?.is_enhanced || modelVariant.includes('7b');

    if (isEnhanced) {
      return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    }

    if (isSDXL) {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }

    return quality === 'high' ? 'image_high' : 'image_fast';
  }, []);

  // Efficient signed URL generation with caching (from LibraryV2)
  const generateSignedUrls = useCallback(async (paths: string[], bucket: string): Promise<string[]> => {
    const cacheKey = `signed_urls_${bucket}`;
    const cached = sessionStorage.getItem(cacheKey);
    const urlCache = cached ? JSON.parse(cached) : {};
    
    const results: string[] = [];
    const newUrls: { [key: string]: string } = {};
    
    await Promise.all(paths.map(async (path) => {
      const cacheKey = `${bucket}|${path}`;
      
      if (urlCache[cacheKey]) {
        results.push(urlCache[cacheKey]);
        return;
      }
      
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        
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
    
    if (Object.keys(newUrls).length > 0) {
      const updatedCache = { ...urlCache, ...newUrls };
      sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    }
    
    return results;
  }, []);

  // Direct URL generation like LibraryV2 (no lazy loading)
  const { data: assetsData, isLoading, error } = useQuery({
    queryKey: ['library-assets', typeFilter, statusFilter, debouncedSearchTerm, currentPage, pageSize],
    queryFn: async () => {
      performanceMonitor.markStart('assets-fetch');
      
      if (!supabase) throw new Error('Supabase not available');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      console.log('🔄 Fetching library assets with URLs for user:', user.id);
      
      // Build database queries
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
      
      if (debouncedSearchTerm) {
        imageQuery.ilike('prompt', `%${debouncedSearchTerm}%`);
      }

      // Execute queries based on type filter with pagination
      const promises = [];
      
      if (typeFilter !== 'video') {
        promises.push(imageQuery.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1));
      }
      
      if (typeFilter !== 'image') {
        promises.push(videoQuery.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1));
      }
      
      const [imageResult, videoResult] = await Promise.all(promises);
      
      if (imageResult?.error) throw imageResult.error;
      if (videoResult?.error) throw videoResult.error;
      
      const allAssets: UnifiedAsset[] = [];
      
      // Process images with direct URL generation
      if (imageResult?.data) {
        for (const image of imageResult.data) {
          const metadata = image.metadata as any;
          const bucket = inferBucketFromMetadata(metadata, image.quality);
          const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
          
          // Handle SDXL multiple images
          if (isSDXL && image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 1) {
            const signedUrls = await generateSignedUrls(image.image_urls, bucket);
            
            signedUrls.forEach((url, index) => {
              allAssets.push({
                id: `${image.id}_${index}`,
                type: 'image' as const,
                prompt: `${image.prompt} (Image ${index + 1})`,
                status: image.status,
                quality: image.quality || 'fast',
                format: image.format || 'png',
                createdAt: new Date(image.created_at),
                metadata: metadata,
                title: `${image.prompt} (Image ${index + 1})`,
                url: url,
                thumbnailUrl: url,
                signedUrls: [url],
                rawPaths: [image.image_urls[index]],
                isSDXL: isSDXL,
                isSDXLImage: true,
                sdxlIndex: index,
                originalAssetId: image.id,
              });
            });
          } else {
            // Single image
            let url: string | undefined;
            
            if (image.image_urls && Array.isArray(image.image_urls) && image.image_urls.length > 0) {
              const signedUrls = await generateSignedUrls([image.image_urls[0]], bucket);
              url = signedUrls[0];
            } else if (image.image_url) {
              const signedUrls = await generateSignedUrls([image.image_url], bucket);
              url = signedUrls[0];
            }
            
            allAssets.push({
              id: image.id,
              type: 'image' as const,
              prompt: image.prompt,
              status: image.status,
              quality: image.quality || 'fast',
              format: image.format || 'png',
              createdAt: new Date(image.created_at),
              metadata: metadata,
              title: image.prompt,
              url: url,
              thumbnailUrl: url,
              signedUrls: url ? [url] : undefined,
              rawPaths: image.image_urls || (image.image_url ? [image.image_url] : []),
              isSDXL: isSDXL,
            });
          }
        }
      }
      
      // Process videos with direct URL generation
      if (videoResult?.data) {
        for (const video of videoResult.data) {
          const metadata = video.metadata as any;
          const bucket = metadata?.bucket || (video.quality === 'high' ? 'video_high' : 'video_fast');
          
          let url: string | undefined;
          if (video.video_url) {
            const signedUrls = await generateSignedUrls([video.video_url], bucket);
            url = signedUrls[0];
          }
          
          allAssets.push({
            id: video.id,
            type: 'video' as const,
            prompt: metadata?.prompt || 'Generated video',
            status: video.status,
            quality: video.quality || 'fast',
            format: video.format || 'mp4',
            createdAt: new Date(video.created_at),
            metadata: metadata,
            title: metadata?.prompt || 'Generated video',
            url: url,
            thumbnailUrl: video.thumbnail_url,
            signedUrls: url ? [url] : undefined,
            rawPaths: video.video_url ? [video.video_url] : [],
          });
        }
      }

      performanceMonitor.markEnd('assets-fetch');
      
      if (debouncedSearchTerm) {
        progressiveEnhancement.trackSearch(debouncedSearchTerm);
      }
      progressiveEnhancement.trackFilterChange({ 
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearchTerm || undefined,
      });
      
      console.log(`✅ Fetched ${allAssets.length} assets with URLs`);
      const sortedAssets = allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Return data with pagination info
      return {
        assets: sortedAssets,
        totalCount: sortedAssets.length,
        hasMore: sortedAssets.length === pageSize
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Extract assets and pagination info
  const assets = assetsData?.assets || [];
  const totalCount = assetsData?.totalCount || 0;
  const hasMore = assetsData?.hasMore || false;
  
  // Calculate total pages (estimated)
  const totalPages = Math.max(1, hasMore ? currentPage + 1 : currentPage);

  // Use assets directly (no transformation needed since URLs are already generated)
  const transformedAssets = useMemo(() => {
    // Register assets with memory manager and progressive enhancement
    assets.forEach(asset => {
      memoryManager.registerAsset(asset.id, 1024, 'medium');
    });
    
    if (assets.length > 0) {
      progressiveEnhancement.analyzeAndPrefetch(assets, { typeFilter, statusFilter });
    }
    
    // Track asset visibility
    assets.forEach(asset => {
      memoryManager.updateAssetVisibility(asset.id, true);
      progressiveEnhancement.trackAssetView(asset);
    });
    
    return assets;
  }, [assets, typeFilter, statusFilter]);

  // Calculate simplified counts for filter UI
  const counts = useMemo(() => {
    const completed = transformedAssets.filter(a => a.status === 'completed').length;
    const processing = transformedAssets.filter(a => a.status === 'processing' || a.status === 'queued').length;
    const failed = transformedAssets.filter(a => a.status === 'failed' || a.status === 'error').length;
    
    return {
      total: transformedAssets.length,
      images: transformedAssets.filter(a => a.type === 'image').length,
      videos: transformedAssets.filter(a => a.type === 'video').length,
      completed: completed,
      processing: processing,
      failed: failed,
    };
  }, [transformedAssets]);

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

  const handleSelectAll = () => {
    setSelectedAssets(new Set(transformedAssets.map(asset => asset.id)));
  };

  const handleClearSelection = () => {
    setSelectedAssets(new Set());
  };

  // Download handler with session caching
  const handleDownload = async (asset: UnifiedAsset) => {
    // Check session cache first
    const cachedUrl = sessionStorage.getItem(`download_${asset.id}`);
    let downloadUrl = cachedUrl || asset.url;
    
    if (!downloadUrl) {
      toast.loading("Preparing download...", { id: asset.id });
      try {
        const updatedAsset = await OptimizedAssetService.generateAssetUrls(asset);
        if (!updatedAsset.url) {
          toast.error("Asset URL not available", { id: asset.id });
          return;
        }
        downloadUrl = updatedAsset.url;
        // Cache the URL for this session
        sessionStorage.setItem(`download_${asset.id}`, downloadUrl);
      } catch (error) {
        toast.error("Failed to prepare download", { id: asset.id });
        return;
      }
      toast.dismiss(asset.id);
    }

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${asset.title || 'asset'}-${asset.id}.${asset.format || (asset.type === 'image' ? 'png' : 'mp4')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started!");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download asset");
    }
  };

  const handleBulkDownload = () => {
    const selectedAssetList = transformedAssets.filter(asset => selectedAssets.has(asset.id));
    selectedAssetList.forEach(asset => handleDownload(asset));
    toast.success(`Downloading ${selectedAssetList.length} assets...`);
  };

  // Add to workspace functionality
  const handleAddToWorkspace = () => {
    const selectedAssetList = transformedAssets.filter(asset => selectedAssets.has(asset.id));
    // Dispatch custom event for workspace to pick up
    window.dispatchEvent(new CustomEvent('add-to-workspace', {
      detail: { assetIds: selectedAssetList.map(a => a.originalAssetId || a.id) }
    }));
    toast.success(`Added ${selectedAssetList.length} assets to workspace`);
    setSelectedAssets(new Set());
  };

  // Optimized deletion with complete cleanup
  const handleDelete = async (asset: UnifiedAsset) => {
    if (deletingAssets.has(asset.id)) {
      return;
    }

    setDeletingAssets(prev => new Set(prev).add(asset.id));
    
    // Optimistic update - remove from UI immediately
    queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm, currentPage, pageSize], 
      (oldData: any) => oldData ? { ...oldData, assets: oldData.assets?.filter((a: UnifiedAsset) => a.id !== asset.id) || [] } : oldData
    );
    
    if (selectedAssets.has(asset.id)) {
      setSelectedAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
    
    toast.loading(`Deleting ${asset.type}...`, { id: asset.id });
    
    try {
      // Delete the original asset (not the individual SDXL image)
      const assetIdToDelete = asset.originalAssetId || asset.id;
      await OptimizedAssetService.deleteAssetCompletely(assetIdToDelete, asset.type);
      toast.success(`${asset.type} deleted completely`, { id: asset.id });
      
    } catch (error) {
      console.error('❌ Deletion failed for:', asset.id, error);
      
      // Restore asset on error
      queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm, currentPage, pageSize], 
        (oldData: any) => {
          if (!oldData) return oldData;
          const restored = [...(oldData.assets || []), asset];
          return { 
            ...oldData, 
            assets: restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) 
          };
        }
      );
      
      toast.error(`Failed to delete ${asset.type}`, { id: asset.id });
      
    } finally {
      setDeletingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async () => {
    const selectedAssetList = transformedAssets.filter(asset => selectedAssets.has(asset.id));
    
    // Optimistic updates
    const selectedIds = new Set(selectedAssetList.map(a => a.id));
    queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm, currentPage, pageSize], 
      (oldData: any) => oldData ? { ...oldData, assets: oldData.assets?.filter((a: UnifiedAsset) => !selectedIds.has(a.id)) || [] } : oldData
    );
    setSelectedAssets(new Set());
    setShowBulkDelete(false);
    
    toast.loading(`Deleting ${selectedAssetList.length} assets...`, { id: 'bulk-delete' });
    
    try {
      // Group by original asset IDs to avoid duplicate deletions
      const uniqueAssetIds = new Set(selectedAssetList.map(asset => asset.originalAssetId || asset.id));
      const assetsToDelete = Array.from(uniqueAssetIds).map(id => {
        const asset = selectedAssetList.find(a => (a.originalAssetId || a.id) === id);
        return { id, type: asset?.type || 'image' };
      });
      
      const result = await OptimizedAssetService.bulkDeleteAssets(assetsToDelete);
      
      if (result.failed.length > 0) {
        toast.warning(`${result.success} deleted, ${result.failed.length} failed`, { id: 'bulk-delete' });
      } else {
        toast.success(`${result.success} assets deleted successfully`, { id: 'bulk-delete' });
      }
      
    } catch (error) {
      console.error('❌ Bulk deletion failed:', error);
      
      // Restore all assets on error
      queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm, currentPage, pageSize], 
        (oldData: any) => {
          if (!oldData) return oldData;
          const restored = [...(oldData.assets || []), ...selectedAssetList];
          return { 
            ...oldData, 
            assets: restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) 
          };
        }
      );
      
      toast.error("Failed to delete selected assets", { id: 'bulk-delete' });
    }
  };

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

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Library</h2>
            <p className="text-gray-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['library-assets'] })}
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
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <LibraryHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalAssets={transformedAssets.length}
            isLoading={isLoading}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            totalPages={totalPages}
          />

          {/* Simplified Filters */}
          <LibraryFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            counts={counts}
          />

          {/* Assets Display */}
          {transformedAssets.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {assets.length === 0 ? "No assets yet" : "No assets match your filters"}
              </h2>
              <p className="text-gray-400">
                {assets.length === 0 
                  ? "Generate some images or videos to see them here"
                  : "Try adjusting your search terms or filters"
                }
              </p>
            </div>
          ) : viewMode === "list" ? (
            <AssetTableView
              assets={transformedAssets}
              selectedAssets={selectedAssets}
              onAssetSelection={handleAssetSelection}
              onPreview={(asset) => {
                const index = transformedAssets.findIndex(a => a.id === asset.id);
                setSelectedAssetIndex(index);
              }}
              onDelete={setAssetToDelete}
              onDownload={handleDownload}
              selectionMode={true}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {transformedAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    isSelected={selectedAssets.has(asset.id)}
                    onSelect={(selected) => handleAssetSelection(asset.id, selected)}
                    onPreview={() => {
                      const index = transformedAssets.findIndex(a => a.id === asset.id);
                      setSelectedAssetIndex(index);
                    }}
                    onDelete={() => setAssetToDelete(asset)}
                    onDownload={() => handleDownload(asset)}
                    selectionMode={selectedAssets.size > 0}
                    isDeleting={deletingAssets.has(asset.id)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (page > totalPages) return null;
                        
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={page === currentPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedAssets.size}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={() => setShowBulkDelete(true)}
          onAddToWorkspace={handleAddToWorkspace}
          totalFilteredCount={transformedAssets.length}
        />

        {/* Library Lightbox */}
        {selectedAssetIndex >= 0 && (
          <LibraryLightbox
            assets={transformedAssets}
            startIndex={selectedAssetIndex}
            onClose={() => setSelectedAssetIndex(-1)}
            onDownload={handleDownload}
          />
        )}

        <DeleteConfirmationModal
          video={assetToDelete ? { 
            id: assetToDelete.id, 
            prompt: assetToDelete.prompt
          } : null}
          open={!!assetToDelete}
          onClose={() => setAssetToDelete(null)}
          onConfirm={() => {
            if (assetToDelete) {
              handleDelete(assetToDelete);
              setAssetToDelete(null);
            }
          }}
        />

        <DeleteConfirmationModal
          video={selectedAssets.size > 0 ? {
            id: 'bulk',
            prompt: `${selectedAssets.size} selected assets`
          } : null}
          open={showBulkDelete}
          onClose={() => setShowBulkDelete(false)}
          onConfirm={handleBulkDelete}
        />
      </div>
    </OurVidzDashboardLayout>
  );
};

export default OptimizedLibrary;