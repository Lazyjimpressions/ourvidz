import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { OurVidzDashboardLayout } from '../OurVidzDashboardLayout';
import { LibraryLightbox } from './LibraryLightbox';

import { AssetListView } from './AssetListView';
import { CompactLibraryHeader } from './CompactLibraryHeader';
import { CompactLibraryFilters } from './CompactLibraryFilters';
import { CompactBulkActionBar } from './CompactBulkActionBar';
import { CompactAssetCard } from './CompactAssetCard';
import { AssetService } from '../../lib/services/AssetService';
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import { MobileFullScreenViewer } from './MobileFullScreenViewer';
import { useLazyAssetsV3 } from '@/hooks/useLazyAssetsV3';

export const OptimizedLibrary = () => {
  // State management
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Infinite scroll controls
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { isMobile } = useMobileDetection();
  const [visibleCount, setVisibleCount] = useState<number>(24);
  // Sticky measurements
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState<number>(0);

  useEffect(() => {
    const updateOffset = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      setStickyOffset(h);
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  // Unified asset loading with optimized lazy loading for all devices
  const {
    data: rawAssets = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['library-assets'],
    queryFn: async () => {
      console.log('🔄 Loading assets with optimized approach');
      const allAssets = await AssetService.getUserAssetsOptimized();
      console.log(`✅ AssetService returned ${allAssets.length} assets`);
      return allAssets;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Lazy loading for all devices
  const {
    lazyAssets: lazyAssetsData = [],
    registerAssetRef: lazyRegisterAssetRef
  } = useLazyAssetsV3({ 
    assets: rawAssets, 
    enabled: true,
    prefetchThreshold: 100,
    batchSize: 6
  });

  // Search and filtering - use raw assets to avoid dependency issues
  const {
    searchState,
    filteredAssets,
    updateQuery,
    updateFilters,
    clearSearch,
    hasActiveFilters
  } = useWorkspaceSearch(rawAssets);
  
  // Merge lazy URLs back into filtered assets for display
  const finalAssets = useMemo(() => {
    return filteredAssets.map(asset => {
      const lazyAsset = lazyAssetsData.find(la => la.id === asset.id);
      if (lazyAsset && lazyAsset.urlsLoaded) {
        return { ...asset, url: lazyAsset.url, thumbnailUrl: lazyAsset.thumbnailUrl };
      }
      return asset;
    });
  }, [filteredAssets, lazyAssetsData]);
  
  const finalRegisterAssetRef = lazyRegisterAssetRef;

  // Reset visible items when results change
  useEffect(() => {
    const base = isMobile ? 16 : 24;
    setVisibleCount(Math.min(base, finalAssets.length));
  }, [finalAssets, isMobile]);

  // Calculate if there are more items to show
  const hasMoreToShow = visibleCount < finalAssets.length;

  // IntersectionObserver to load more on scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const element = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + (isMobile ? 16 : 24), finalAssets.length));
        }
      },
      { root: null, rootMargin: '600px', threshold: 0 }
    );
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [finalAssets.length, isMobile]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return rawAssets.reduce((counts, asset) => {
      if (asset.type === 'image') counts.images++;
      if (asset.type === 'video') counts.videos++;
      if (asset.status === 'completed') counts.completed++;
      if (asset.status === 'processing' || asset.status === 'queued') counts.processing++;
      if (asset.status === 'failed') counts.failed++;
      return counts;
    }, {
      images: 0,
      videos: 0,
      completed: 0,
      processing: 0,
      failed: 0
    });
  }, [rawAssets]);

  // Selection handlers
  const handleSelectAsset = useCallback((assetId: string, selected: boolean) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(assetId);
      } else {
        newSet.delete(assetId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAssets(new Set(finalAssets.map(asset => asset.id)));
  }, [finalAssets]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  // Asset actions
  const handlePreview = useCallback((asset: UnifiedAsset) => {
    const index = finalAssets.findIndex(a => a.id === asset.id);
    setLightboxIndex(index);
  }, [finalAssets]);

  const handleDownload = useCallback(async (asset: UnifiedAsset) => {
    try {
      if (!asset.url) {
        toast.error('Asset URL not available');
        return;
      }
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.id}.${asset.format || (asset.type === 'image' ? 'jpg' : 'mp4')}`;
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

  const handleDelete = useCallback(async (asset: UnifiedAsset) => {
    try {
      setIsDeleting(true);
      await AssetService.deleteAsset(asset.id, asset.type);
      toast.success('Asset deleted');
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
    }
  }, [refetch]);

  const handleBulkDownload = useCallback(async () => {
    const selectedAssetList = finalAssets.filter(asset => selectedAssets.has(asset.id));
    for (const asset of selectedAssetList) {
      await handleDownload(asset);
    }
    handleClearSelection();
  }, [finalAssets, selectedAssets, handleDownload, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      const selectedAssetList = finalAssets.filter(asset => selectedAssets.has(asset.id));
      await Promise.all(
        selectedAssetList.map(asset => AssetService.deleteAsset(asset.id, asset.type))
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
  }, [finalAssets, selectedAssets, handleClearSelection, refetch]);

  const handleAddToWorkspace = useCallback(() => {
    toast.info('Add to workspace feature coming soon');
    handleClearSelection();
  }, [handleClearSelection]);

  // Skeleton grid for initial load
  const SkeletonGrid = ({ count = 12 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-muted/40 rounded-lg aspect-square animate-pulse" />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 pb-6 space-y-3">
          <div className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <CompactLibraryHeader
              searchTerm={''}
              onSearchChange={() => {}}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalAssets={0}
              filteredCount={0}
              hasActiveFilters={false}
              onClearFilters={() => {}}
            />
            <CompactLibraryFilters
              typeFilter={'all'}
              onTypeFilterChange={() => {}}
              statusFilter={'all'}
              onStatusFilterChange={() => {}}
              counts={{ images: 0, videos: 0, completed: 0, processing: 0, failed: 0 }}
            />
          </div>
          <SkeletonGrid count={isMobile ? 6 : 12} />
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
          <div ref={headerRef} className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <CompactLibraryHeader
              searchTerm={searchState.query}
              onSearchChange={updateQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalAssets={rawAssets.length}
              filteredCount={finalAssets.length}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearSearch}
            />
            {/* Mobile Filters Drawer Trigger */}
            {isMobile && (
              <div className="mt-3">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Filters</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pt-0">
                      <CompactLibraryFilters
                        typeFilter={searchState.filters.contentType}
                        onTypeFilterChange={(type) => updateFilters({ contentType: type })}
                        statusFilter={searchState.filters.status === 'generating' ? 'processing' : searchState.filters.status}
                        onStatusFilterChange={(status) => updateFilters({ status: status === 'processing' ? 'generating' : status })}
                        counts={filterCounts}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            )}
          </div>

          {/* Desktop Content Grid */}
          <div className="hidden lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 lg:min-h-0 overflow-hidden">
            {/* Left Sidebar (Desktop Only) */}
            <aside className="lg:block">
              <div className="sticky space-y-4" style={{ top: stickyOffset + 8 }}>
                <CompactLibraryFilters
                  typeFilter={searchState.filters.contentType}
                  onTypeFilterChange={(type) => updateFilters({ contentType: type })}
                  statusFilter={searchState.filters.status === 'generating' ? 'processing' : searchState.filters.status}
                  onStatusFilterChange={(status) => updateFilters({ status: status === 'processing' ? 'generating' : status })}
                  counts={filterCounts}
                />
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="min-w-0">
              {finalAssets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">
                    {hasActiveFilters ? 'No assets match your filters' : 'No assets found'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {finalAssets.slice(0, visibleCount).map((asset) => (
                      <CompactAssetCard
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedAssets.has(asset.id)}
                        onSelect={(selected) => handleSelectAsset(asset.id, selected)}
                        onPreview={() => handlePreview(asset)}
                        onDelete={() => handleDelete(asset)}
                        onDownload={() => handleDownload(asset)}
                        selectionMode={selectedAssets.size > 0}
                        registerAssetRef={finalRegisterAssetRef}
                      />
                    ))}
                  </div>
                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} />
                </>
              ) : (
                <AssetListView
                  assets={finalAssets.map(asset => ({
                    ...asset,
                    title: asset.title || 'Untitled',
                    thumbnailUrl: asset.thumbnailUrl || null,
                    url: asset.url || null,
                    metadata: asset.metadata || {}
                  }))}
                  selectedAssets={selectedAssets}
                  onSelectAsset={(assetId) => handleSelectAsset(assetId, !selectedAssets.has(assetId))}
                  onSelectAll={(checked) => checked ? handleSelectAll() : handleClearSelection()}
                  onBulkDelete={handleBulkDelete}
                  onIndividualDelete={handleDelete}
                  onPreview={handlePreview}
                  isDeleting={isDeleting}
                />
              )}
            </main>
          </div>

          {/* Mobile Content (outside desktop grid) */}
          <div className="lg:hidden">
            {finalAssets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {hasActiveFilters ? 'No assets match your filters' : 'No assets found'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {finalAssets.slice(0, visibleCount).map((asset) => (
                    <CompactAssetCard
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAssets.has(asset.id)}
                      onSelect={(selected) => handleSelectAsset(asset.id, selected)}
                      onPreview={() => handlePreview(asset)}
                      onDelete={() => handleDelete(asset)}
                      onDownload={() => handleDownload(asset)}
                      selectionMode={selectedAssets.size > 0}
                      registerAssetRef={finalRegisterAssetRef}
                    />
                  ))}
                </div>
                <div ref={sentinelRef} />
              </>
            ) : (
              <AssetListView
                assets={finalAssets.map(asset => ({
                  ...asset,
                  title: asset.title || 'Untitled',
                  thumbnailUrl: asset.thumbnailUrl || null,
                  url: asset.url || null,
                  metadata: asset.metadata || {}
                }))}
                selectedAssets={selectedAssets}
                onSelectAsset={(assetId) => handleSelectAsset(assetId, !selectedAssets.has(assetId))}
                onSelectAll={(checked) => checked ? handleSelectAll() : handleClearSelection()}
                onBulkDelete={handleBulkDelete}
                onIndividualDelete={handleDelete}
                onPreview={handlePreview}
                isDeleting={isDeleting}
              />
            )}
          </div>
        </div>
      </OurVidzDashboardLayout>

      {/* Bulk Action Bar */}
      <CompactBulkActionBar
        selectedCount={selectedAssets.size}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
        onAddToWorkspace={handleAddToWorkspace}
        totalFilteredCount={finalAssets.length}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        isMobile ? (
          <MobileFullScreenViewer
            assets={finalAssets}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onDownload={handleDownload}
          />
        ) : (
          <LibraryLightbox
            assets={finalAssets}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onDownload={handleDownload}
          />
        )
      )}
    </>
  );
};