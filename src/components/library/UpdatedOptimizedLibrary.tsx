import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { toSharedFromLibrary } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { SharedLightbox, LibraryAssetActions } from '@/components/shared/SharedLightbox';
import { OurVidzDashboardLayout } from '../OurVidzDashboardLayout';
import { CompactLibraryHeader } from './CompactLibraryHeader';
import { CompactLibraryFilters } from './CompactLibraryFilters';
import { CompactBulkActionBar } from './CompactBulkActionBar';
import { AssetListView } from './AssetListView';
import { useWorkspaceSearch } from '@/hooks/useWorkspaceSearch';
import { LibraryAssetService } from '@/lib/services/LibraryAssetService';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useNavigate } from 'react-router-dom';

export const UpdatedOptimizedLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();
  
  // State
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(isMobile ? 8 : 12);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch library assets
  const {
    data: rawAssets = [],
    isLoading,
    error,
    refetch
  } = useLibraryAssets();

  // Convert to shared asset format
  const sharedAssets = useMemo(() => 
    rawAssets.map(toSharedFromLibrary), 
    [rawAssets]
  );

  // Get signed URLs for thumbnails
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'user-library', {
    thumbTtlSec: 24 * 60 * 60, // 24 hours for library
    enabled: true
  });

  // Search and filtering
  const {
    searchState,
    filteredAssets,
    updateQuery,
    updateFilters,
    clearSearch,
    hasActiveFilters
  } = useWorkspaceSearch(signedAssets as any);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return sharedAssets.reduce((counts, asset) => {
      if (asset.type === 'image') counts.images++;
      if (asset.type === 'video') counts.videos++;
      counts.completed++; // Library assets are always completed
      return counts;
    }, {
      images: 0,
      videos: 0,
      completed: 0,
      processing: 0,
      failed: 0
    });
  }, [sharedAssets]);

  // Infinite scroll
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredAssets.length) {
          setVisibleCount(prev => Math.min(prev + (isMobile ? 8 : 12), filteredAssets.length));
        }
      },
      { rootMargin: '600px' }
    );
    
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredAssets.length, isMobile, visibleCount]);

  // Selection handlers
  const handleToggleSelection = useCallback((assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  }, [filteredAssets]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  // Asset actions
  const handlePreview = useCallback((asset: any) => {
    const index = filteredAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  }, [filteredAssets]);

  const handleDownload = useCallback(async (asset: any) => {
    try {
      // Get original URL if available, or request it
      let downloadUrl = asset.url;
      if (!downloadUrl && (asset as any).signOriginal) {
        downloadUrl = await (asset as any).signOriginal();
      }
      
      if (!downloadUrl) {
        toast.error('Asset URL not available');
        return;
      }

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.title || asset.id}.${asset.format || (asset.type === 'image' ? 'jpg' : 'mp4')}`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  }, []);

  const handleDelete = useCallback(async (asset: any) => {
    try {
      setIsDeleting(true);
      await LibraryAssetService.deleteAsset(asset.id);
      toast.success('Asset deleted');
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
    }
  }, [refetch]);

  const handleUseAsReference = useCallback(async (asset: any) => {
    try {
      // Navigate to workspace with reference asset data
      navigate(`/?mode=${asset.type}`, { 
        state: { 
          referenceAsset: {
            id: asset.id,
            storagePath: asset.originalPath,
            bucket: 'user-library',
            metadata: asset.metadata,
            prompt: asset.prompt
          }
        } 
      });
      toast.success('Navigated to workspace with reference asset');
    } catch (error) {
      console.error('Failed to use as reference:', error);
      toast.error('Failed to use asset as reference');
    }
  }, [navigate]);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
      await Promise.all(
        selectedAssetList.map(asset => LibraryAssetService.deleteAsset(asset.id))
      );
      toast.success(`Deleted ${selectedAssetList.length} assets`);
      handleClearSelection();
      refetch();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Bulk delete failed');
    } finally {
      setIsDeleting(false);
    }
  }, [filteredAssets, selectedAssets, handleClearSelection, refetch]);

  // Sign original URL on demand for lightbox
  const handleRequireOriginalUrl = useCallback(async (asset: any) => {
    // Use the signOriginal function added by useSignedAssets
    if ((asset as any).signOriginal) {
      return (asset as any).signOriginal();
    }
    throw new Error('Original URL signing not available');
  }, []);

  if (isLoading || isSigning) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 pb-6 space-y-3">
          <SharedGrid
            assets={[]}
            onPreview={() => {}}
            isLoading={true}
          />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-red-400">
            <p>Failed to load assets: {(error as any).message}</p>
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <>
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-3 bg-background/80 backdrop-blur border-b border-border">
            <CompactLibraryHeader
              searchTerm={searchState.query}
              onSearchChange={updateQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalAssets={sharedAssets.length}
              filteredCount={filteredAssets.length}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearSearch}
            />
            
            {/* Filters */}
            <div className="mt-3">
              <CompactLibraryFilters
                typeFilter={searchState.filters.contentType}
                onTypeFilterChange={(type) => updateFilters({ contentType: type })}
                statusFilter={searchState.filters.status === 'generating' ? 'processing' : searchState.filters.status}
                onStatusFilterChange={(status) => updateFilters({ status: status === 'processing' ? 'generating' : status })}
                counts={filterCounts}
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedAssets.size > 0 && (
          <CompactBulkActionBar
            selectedCount={selectedAssets.size}
            totalFilteredCount={filteredAssets.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkDownload={async () => {
              const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
              for (const asset of selectedAssetList) {
                await handleDownload(asset);
              }
              handleClearSelection();
            }}
            onAddToWorkspace={() => {
              toast.info('Add to workspace feature coming soon');
              handleClearSelection();
            }}
          />
          )}

          {/* Main content */}
          <main>
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {hasActiveFilters ? 'No assets match your filters' : 'No saved assets yet'}
                </p>
                {!hasActiveFilters && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Assets you save from your workspace will appear here
                  </p>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <SharedGrid
                  assets={filteredAssets.slice(0, visibleCount) as any}
                  onPreview={handlePreview}
                  selection={{
                    enabled: true,
                    selectedIds: selectedAssets,
                    onToggle: handleToggleSelection
                  }}
                  actions={{
                    onDelete: handleDelete,
                    onDownload: handleDownload,
                    onUseAsReference: handleUseAsReference
                  }}
                />
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} />
              </>
            ) : (
              <AssetListView
                assets={filteredAssets.map(asset => ({
                  ...asset,
                  title: asset.title || 'Untitled',
                  thumbnailUrl: (asset as any).thumbUrl || null,
                  url: (asset as any).url || null,
                  metadata: asset.metadata || {}
                }))}
                lazyAssets={signedAssets as any}
                selectedAssets={selectedAssets}
                onSelectAsset={(assetId) => handleToggleSelection(assetId)}
                onSelectAll={(checked) => checked ? handleSelectAll() : handleClearSelection()}
                onBulkDelete={handleBulkDelete}
                onIndividualDelete={handleDelete}
                onPreview={handlePreview}
                isDeleting={isDeleting}
                registerAssetRef={() => {}}
              />
            )}
          </main>
        </div>
      </OurVidzDashboardLayout>
      
      {/* Lightbox */}
      {lightboxIndex !== null && filteredAssets.length > 0 && (
        <SharedLightbox
          assets={filteredAssets as any}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onRequireOriginalUrl={handleRequireOriginalUrl}
          actionsSlot={(asset) => (
            <LibraryAssetActions
              asset={asset}
              onDelete={() => handleDelete(asset)}
              onDownload={() => handleDownload(asset)}
              onUseAsReference={() => handleUseAsReference(asset)}
            />
          )}
        />
      )}
    </>
  );
};