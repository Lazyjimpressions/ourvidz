import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { toSharedFromLibrary } from '@/lib/services/AssetMappers';
import { useSignedAssets } from '@/lib/hooks/useSignedAssets';
import { SharedGrid } from '@/components/shared/SharedGrid';
import { LibraryAssetActions } from '@/components/shared/LightboxActions';
import { UnifiedLightbox, LightboxItem } from '@/components/shared/UnifiedLightbox';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const UpdatedOptimizedLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();
  
  // State
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastLightboxClose, setLastLightboxClose] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'all' | 'characters' | 'scenes'>('all');

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch library assets with pagination
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useLibraryAssets();

  // Flatten paginated data
  const rawAssets = useMemo(() => {
    if (!paginatedData?.pages) return [];
    return paginatedData.pages.flatMap(page => page.assets);
  }, [paginatedData]);

  const totalAssets = paginatedData?.pages?.[0]?.total ?? 0;

  // Convert to shared asset format and filter by tab
  const sharedAssets = useMemo(() => {
    const allAssets = rawAssets.map(toSharedFromLibrary);
    
    if (activeTab === 'characters') {
      return allAssets.filter(asset => 
        asset.metadata?.roleplay_metadata?.type === 'character_portrait' ||
        asset.metadata?.tags?.includes('character') ||
        asset.metadata?.content_category === 'character'
      );
    }

    if (activeTab === 'scenes') {
      return allAssets.filter(asset => 
        asset.metadata?.roleplay_metadata?.type === 'roleplay_scene' ||
        asset.metadata?.tags?.includes('scene') ||
        asset.metadata?.content_category === 'scene'
      );
    }
    
    return allAssets;
  }, [rawAssets, activeTab]);

  // Get signed URLs for thumbnails - no loading gate
  const { signedAssets } = useSignedAssets(sharedAssets, 'user-library', {
    thumbTtlSec: 24 * 60 * 60,
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
      counts.completed++;
      return counts;
    }, {
      images: 0,
      videos: 0,
      completed: 0,
      processing: 0,
      failed: 0
    });
  }, [sharedAssets]);

  // Infinite scroll triggers fetchNextPage
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '600px' }
    );
    
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    const now = Date.now();
    if (now - lastLightboxClose < 200) return;
    
    const index = filteredAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) setLightboxIndex(index);
  }, [filteredAssets, lastLightboxClose]);

  const handleDownload = useCallback(async (asset: any) => {
    try {
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
      let referenceUrl: string | null = asset.url || null;
      
      if (!referenceUrl && typeof asset.signOriginal === 'function') {
        referenceUrl = await asset.signOriginal();
      }
      
      if (!referenceUrl) {
        toast.error('Could not get a URL for this asset');
        return;
      }

      navigate(`/workspace?mode=${asset.type === 'video' ? 'video' : 'image'}`,
        {
          state: {
            referenceUrl,
            prompt: asset.prompt,
            referenceAsset: {
              id: asset.id,
              storagePath: asset.originalPath,
              bucket: 'user-library'
            }
          }
        }
      );
      toast.success('Opened workspace with reference image');
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

  const handleRequireOriginalUrl = useCallback(async (asset: any) => {
    if ((asset as any).signOriginal) {
      return (asset as any).signOriginal();
    }
    throw new Error('Original URL signing not available');
  }, []);

  // Only gate on initial data fetch, NOT on signing
  if (isLoading) {
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
        <div className="max-w-7xl mx-auto px-3 md:px-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-40 -mx-3 px-3 md:-mx-6 md:px-6 pt-3 md:pt-4 pb-2 md:pb-3 bg-background/80 backdrop-blur border-b border-border">
            <CompactLibraryHeader
              searchTerm={searchState.query}
              onSearchChange={updateQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalAssets={totalAssets}
              filteredCount={filteredAssets.length}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearSearch}
            />
            
            {/* Tabs */}
            <div className="mt-3">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'characters' | 'scenes')}>
                <TabsList className="grid w-full max-w-md grid-cols-3 text-xs md:text-sm">
                  <TabsTrigger value="all">All Assets</TabsTrigger>
                  <TabsTrigger value="characters">Characters</TabsTrigger>
                  <TabsTrigger value="scenes">Scenes</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
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
            onAddToWorkspace={async () => {
              const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
              try {
                const results = await Promise.allSettled(
                  selectedAssetList.map(asset => LibraryAssetService.addToWorkspace(asset.id))
                );
                
                const successes = results.filter(r => r.status === 'fulfilled').length;
                const failures = results.filter(r => r.status === 'rejected').length;
                
                if (failures === 0) {
                  toast.success(`Added ${successes} assets to workspace`);
                } else if (successes === 0) {
                  const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
                  toast.error(`Failed to add assets: ${firstError?.reason?.message || 'Unknown error'}`);
                } else {
                  toast.success(`Added ${successes} · Failed ${failures}`);
                }
                handleClearSelection();
              } catch (error) {
                console.error('Failed to add assets to workspace:', error);
                toast.error('Failed to add assets to workspace');
              }
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
                  assets={filteredAssets as any}
                  onPreview={handlePreview}
                  selection={{
                    enabled: true,
                    selectedIds: selectedAssets,
                    onToggle: handleToggleSelection
                  }}
                  actions={{
                    onDelete: handleDelete,
                    onDownload: handleDownload,
                    onUseAsReference: handleUseAsReference,
                    onAddToWorkspace: async (asset) => {
                      try {
                        await LibraryAssetService.addToWorkspace(asset.id);
                        toast.success('Asset added to workspace');
                      } catch (error) {
                        console.error('Failed to add asset to workspace:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        toast.error(`Failed to add asset: ${errorMessage}`);
                      }
                    }
                  }}
                />
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
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
        <UnifiedLightbox
          items={filteredAssets.map((a: any) => ({
            id: a.id,
            url: a.thumbUrl || a.url || '',
            type: a.type || 'image',
            title: a.title,
            prompt: a.prompt,
            originalPath: a.originalPath,
            metadata: a.metadata,
            width: a.width,
            height: a.height,
            modelType: a.modelType,
            mimeType: a.mimeType,
          } as LightboxItem))}
          startIndex={lightboxIndex}
          onClose={() => {
            setLightboxIndex(null);
            setLastLightboxClose(Date.now());
          }}
          onRequireOriginalUrl={async (item) => {
            const asset = filteredAssets.find((a: any) => a.id === item.id);
            if (asset && (asset as any).signOriginal) {
              return (asset as any).signOriginal();
            }
            return item.url;
          }}
          actionsSlot={(item) => {
            const asset = filteredAssets.find((a: any) => a.id === item.id);
            if (!asset) return null;
            return (
              <LibraryAssetActions
                asset={asset as any}
                onDelete={() => handleDelete(asset as any)}
                onDownload={() => handleDownload(asset as any)}
                onUseAsReference={() => handleUseAsReference(asset as any)}
              />
            );
          }}
        />
      )}
    </>
  );
};
