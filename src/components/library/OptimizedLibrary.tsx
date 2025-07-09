import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OurVidzDashboardLayout } from "@/components/OurVidzDashboardLayout";
import { AssetCard } from "@/components/AssetCard";
import { AssetPreviewModal } from "@/components/AssetPreviewModal";
import { AssetTableView } from "@/components/AssetTableView";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LibraryHeader } from "./LibraryHeader";
import { LibraryFilters } from "./LibraryFilters";
import { BulkActionBar } from "./BulkActionBar";
import { OptimizedAssetService, UnifiedAsset } from "@/lib/services/OptimizedAssetService";
import { useLazyAssets } from "@/hooks/useLazyAssets";
import { toast } from "sonner";

const OptimizedLibrary = () => {
  const queryClient = useQueryClient();
  
  // Simplified filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>("all");
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>("all");
  
  // UI states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Modal states  
  const [previewAsset, setPreviewAsset] = useState<UnifiedAsset | null>(null);
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

  // React Query for intelligent caching
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['library-assets', typeFilter, statusFilter, debouncedSearchTerm],
    queryFn: async () => {
      const filters = {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearchTerm || undefined,
      };

      const result = await OptimizedAssetService.getUserAssets(filters, {
        limit: 1000, // Support up to 1000 assets as requested
        offset: 0
      });

      return result.assets;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
    refetchOnWindowFocus: false,
  });

  // Transform assets to handle SDXL images like workspace (individual images)
  const transformedAssets = useMemo(() => {
    const transformed: UnifiedAsset[] = [];
    
    assets.forEach(asset => {
      if (asset.type === 'image' && asset.signedUrls && asset.signedUrls.length > 1) {
        // SDXL job with multiple images - create individual assets
        asset.signedUrls.forEach((url, index) => {
          transformed.push({
            ...asset,
            id: `${asset.id}_${index}`, // Unique ID for each image
            url: url,
            thumbnailUrl: url,
            prompt: `${asset.prompt} (Image ${index + 1})`,
            isSDXLImage: true,
            sdxlIndex: index,
            originalAssetId: asset.id,
          });
        });
      } else {
        // Single image or video
        transformed.push(asset);
      }
    });
    
    return transformed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [assets]);

  // Initialize lazy loading for assets
  const { 
    lazyAssets, 
    loadingUrls, 
    registerAssetRef, 
    forceLoadAssetUrls 
  } = useLazyAssets({ 
    assets: transformedAssets, 
    enabled: viewMode === 'grid' 
  });

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
    queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm], 
      (oldData: UnifiedAsset[]) => oldData?.filter(a => a.id !== asset.id) || []
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
      queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm], 
        (oldData: UnifiedAsset[]) => {
          if (!oldData) return oldData;
          const restored = [...oldData, asset];
          return restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm], 
      (oldData: UnifiedAsset[]) => oldData?.filter(a => !selectedIds.has(a.id)) || []
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
      queryClient.setQueryData(['library-assets', typeFilter, statusFilter, debouncedSearchTerm], 
        (oldData: UnifiedAsset[]) => {
          if (!oldData) return oldData;
          const restored = [...oldData, ...selectedAssetList];
          return restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
              onPreview={setPreviewAsset}
              onDelete={setAssetToDelete}
              onDownload={handleDownload}
              selectionMode={true}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {lazyAssets.map((asset) => (
                  <div
                    key={asset.id}
                    ref={(el) => registerAssetRef(asset.id, el)}
                  >
                    <AssetCard
                      asset={asset}
                      isSelected={selectedAssets.has(asset.id)}
                      onSelect={(selected) => handleAssetSelection(asset.id, selected)}
                      onPreview={async () => {
                        await forceLoadAssetUrls(asset.id);
                        setPreviewAsset(asset);
                      }}
                      onDelete={() => setAssetToDelete(asset)}
                      onDownload={() => handleDownload(asset)}
                      selectionMode={true}
                      isDeleting={deletingAssets.has(asset.id)}
                      isLoadingUrl={loadingUrls.has(asset.id)}
                    />
                  </div>
                ))}
              </div>
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

        {/* Modals */}
        <AssetPreviewModal
          asset={previewAsset}
          open={!!previewAsset}
          onClose={() => setPreviewAsset(null)}
          onDownload={handleDownload}
        />

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