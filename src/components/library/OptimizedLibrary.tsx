import { useState, useEffect, useMemo, useCallback } from "react";
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
  // Data state
  const [assets, setAssets] = useState<UnifiedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>("all");
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>("all");
  const [qualityFilter, setQualityFilter] = useState<'all' | 'fast' | 'high'>("all");
  
  // UI states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Modal states  
  const [previewAsset, setPreviewAsset] = useState<UnifiedAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<UnifiedAsset | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Deletion states
  const [deletingAssets, setDeletingAssets] = useState<Set<string>>(new Set());
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // OPTIMIZATION: Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load assets with optimized service
  const loadAssets = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setAssets([]);
        setSelectedAssets(new Set());
      } else {
        setIsLoadingMore(true);
      }
      
      setError(null);

      const filters = {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        quality: qualityFilter !== 'all' ? qualityFilter : undefined,
        search: debouncedSearchTerm || undefined,
      };

      const result = await OptimizedAssetService.getUserAssets(filters, {
        limit: 50,
        offset: reset ? 0 : assets.length
      });

      if (reset) {
        setAssets(result.assets);
      } else {
        setAssets(prev => [...prev, ...result.assets]);
      }
      
      setHasMore(result.hasMore);
      
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [typeFilter, statusFilter, qualityFilter, debouncedSearchTerm, assets.length]);

  // Auto-cleanup stuck jobs on initial load
  useEffect(() => {
    const cleanup = async () => {
      try {
        await OptimizedAssetService.cleanupStuckJobs();
      } catch (error) {
        console.error('Initial cleanup failed:', error);
      }
    };
    cleanup();
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    loadAssets(true);
  }, [typeFilter, statusFilter, qualityFilter, debouncedSearchTerm]);

  // Filtered assets for display (client-side filtering for responsive UI)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // The server already filtered these, but we apply additional client-side search
      if (searchTerm && searchTerm !== debouncedSearchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesPrompt = asset.prompt.toLowerCase().includes(searchLower);
        const matchesTitle = asset.title?.toLowerCase().includes(searchLower);
        const matchesProject = asset.projectTitle?.toLowerCase().includes(searchLower);
        return matchesPrompt || matchesTitle || matchesProject;
      }
      return true;
    });
  }, [assets, searchTerm, debouncedSearchTerm]);

  // Initialize lazy loading for assets
  const { 
    lazyAssets, 
    loadingUrls, 
    registerAssetRef, 
    forceLoadAssetUrls 
  } = useLazyAssets({ 
    assets: filteredAssets, 
    enabled: viewMode === 'grid' 
  });

  // Calculate counts for filter UI
  const counts = useMemo(() => {
    const completed = assets.filter(a => a.status === 'completed').length;
    const processing = assets.filter(a => a.status === 'processing' || a.status === 'queued').length;
    const failed = assets.filter(a => a.status === 'failed' || a.status === 'error').length;
    
    return {
      total: filteredAssets.length,
      images: filteredAssets.filter(a => a.type === 'image').length,
      videos: filteredAssets.filter(a => a.type === 'video').length,
      completed: completed,
      processing: processing,
      failed: failed,
      fast: filteredAssets.filter(a => a.quality === 'fast').length,
      high: filteredAssets.filter(a => a.quality === 'high').length,
    };
  }, [assets, filteredAssets]);

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
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  };

  const handleClearSelection = () => {
    setSelectedAssets(new Set());
  };

  // Download handler
  const handleDownload = async (asset: UnifiedAsset) => {
    // Force load URLs if not already loaded
    if (!asset.url) {
      toast.loading("Preparing download...", { id: asset.id });
      try {
        const updatedAsset = await OptimizedAssetService.generateAssetUrls(asset);
        if (!updatedAsset.url) {
          toast.error("Asset URL not available", { id: asset.id });
          return;
        }
        asset = updatedAsset;
      } catch (error) {
        toast.error("Failed to prepare download", { id: asset.id });
        return;
      }
      toast.dismiss(asset.id);
    }

    try {
      const response = await fetch(asset.url);
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
    const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    selectedAssetList.forEach(asset => handleDownload(asset));
    toast.success(`Downloading ${selectedAssetList.length} assets...`);
  };

  // Optimized deletion with complete cleanup
  const handleDelete = async (asset: UnifiedAsset) => {
    if (deletingAssets.has(asset.id)) {
      console.log('🚫 Delete already in progress for asset:', asset.id);
      return;
    }

    console.log('🗑️ Starting optimized complete deletion for:', asset.id);
    
    setDeletingAssets(prev => new Set(prev).add(asset.id));
    
    // Optimistic update - remove from UI immediately
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    if (selectedAssets.has(asset.id)) {
      setSelectedAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
    
    toast.loading(`Deleting ${asset.type}...`, { id: asset.id });
    
    try {
      await OptimizedAssetService.deleteAssetCompletely(asset.id, asset.type);
      toast.success(`${asset.type} deleted completely`, { id: asset.id });
      console.log('✅ Complete deletion finished for:', asset.id);
      
    } catch (error) {
      console.error('❌ Complete deletion failed for:', asset.id, error);
      
      // Restore asset on error
      setAssets(prev => {
        const restored = [...prev, asset];
        return restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });
      
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
    const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    console.log('🗑️ Starting bulk complete deletion for:', selectedAssetList.length, 'assets');
    
    // Optimistic updates
    const selectedIds = new Set(selectedAssetList.map(a => a.id));
    setAssets(prev => prev.filter(a => !selectedIds.has(a.id)));
    setSelectedAssets(new Set());
    setShowBulkDelete(false);
    
    toast.loading(`Deleting ${selectedAssetList.length} assets...`, { id: 'bulk-delete' });
    
    try {
      const assetsToDelete = selectedAssetList.map(asset => ({ id: asset.id, type: asset.type }));
      const result = await OptimizedAssetService.bulkDeleteAssets(assetsToDelete);
      
      if (result.failed.length > 0) {
        console.warn('❌ Some deletions failed:', result.failed);
        toast.warning(`${result.success} deleted, ${result.failed.length} failed`, { id: 'bulk-delete' });
        
        // Restore failed assets
        const failedIds = new Set(result.failed.map(f => f.id));
        const failedAssets = selectedAssetList.filter(a => failedIds.has(a.id));
        setAssets(prev => {
          const restored = [...prev, ...failedAssets];
          return restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        });
      } else {
        toast.success(`${result.success} assets deleted successfully`, { id: 'bulk-delete' });
      }
      
      console.log('✅ Bulk complete deletion finished');
      
    } catch (error) {
      console.error('❌ Bulk complete deletion failed:', error);
      
      // Restore all assets on error
      setAssets(prev => {
        const restored = [...prev, ...selectedAssetList];
        return restored.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });
      
      toast.error("Failed to delete selected assets", { id: 'bulk-delete' });
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    toast.loading("Cleaning up stuck jobs...", { id: 'cleanup' });
    try {
      const result = await OptimizedAssetService.cleanupStuckJobs();
      if (result.cleaned > 0) {
        toast.success(`Cleaned up ${result.cleaned} stuck jobs`, { id: 'cleanup' });
        loadAssets(true); // Refresh the list
      } else {
        toast.info("No stuck jobs found", { id: 'cleanup' });
      }
      
      if (result.errors.length > 0) {
        console.warn('Cleanup errors:', result.errors);
        toast.warning(`Cleanup completed with ${result.errors.length} warnings`, { id: 'cleanup' });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error("Failed to cleanup stuck jobs", { id: 'cleanup' });
    } finally {
      setIsCleaningUp(false);
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
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => loadAssets(true)}
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
            totalAssets={assets.length}
            filteredCount={filteredAssets.length}
            isLoading={isLoadingMore}
            onCleanup={handleCleanup}
          />

          {/* Filters */}
          <LibraryFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            qualityFilter={qualityFilter}
            onQualityFilterChange={setQualityFilter}
            counts={counts}
          />

          {/* Assets Display */}
          {filteredAssets.length === 0 ? (
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
              assets={filteredAssets}
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

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-8">
                  <button
                    onClick={() => loadAssets(false)}
                    disabled={isLoadingMore}
                    className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
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
          totalFilteredCount={filteredAssets.length}
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