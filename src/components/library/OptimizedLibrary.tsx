import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { OurVidzDashboardLayout } from '../OurVidzDashboardLayout';
import { LoadingSpinner } from '../LoadingSpinner';
import { LibraryLightbox } from './LibraryLightbox';
import { AssetListView } from './AssetListView';
import { CompactLibraryHeader } from './CompactLibraryHeader';
import { CompactLibraryFilters } from './CompactLibraryFilters';
import { CompactBulkActionBar } from './CompactBulkActionBar';
import { CompactAssetCard } from './CompactAssetCard';
import { AssetService } from '../../lib/services/AssetService';
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch';
import { toast } from 'sonner';

export const OptimizedLibrary = () => {
  // State management
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Data fetching using AssetService.getUserAssetsOptimized()
  const {
    data: rawAssets = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['library-assets-optimized'],
    queryFn: async () => {
      console.log('🎯 LIBRARY: Fetching assets via AssetService');
      
      // Use the proven AssetService.getUserAssetsOptimized() method
      const allAssets = await AssetService.getUserAssetsOptimized(false);
      
      console.log(`✅ LIBRARY: AssetService returned ${allAssets.length} assets`);
      return allAssets;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Search and filtering
  const {
    searchState,
    filteredAssets,
    updateQuery,
    updateFilters,
    clearSearch,
    hasActiveFilters
  } = useWorkspaceSearch(rawAssets);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return rawAssets.reduce((counts, asset) => {
      // Type counts
      if (asset.type === 'image') counts.images++;
      if (asset.type === 'video') counts.videos++;
      
      // Status counts
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
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  }, [filteredAssets]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  // Asset actions
  const handlePreview = useCallback((asset: UnifiedAsset) => {
    const index = filteredAssets.findIndex(a => a.id === asset.id);
    setLightboxIndex(index);
  }, [filteredAssets]);

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
    const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
    for (const asset of selectedAssetList) {
      await handleDownload(asset);
    }
    handleClearSelection();
  }, [filteredAssets, selectedAssets, handleDownload, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
      
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
  }, [filteredAssets, selectedAssets, handleClearSelection, refetch]);

  const handleAddToWorkspace = useCallback(() => {
    toast.info('Add to workspace feature coming soon');
    handleClearSelection();
  }, [handleClearSelection]);

  if (isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <LoadingSpinner />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  if (error) {
    return (
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-red-400">
            <p>Failed to load assets: {error.message}</p>
          </div>
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <>
      <OurVidzDashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <CompactLibraryHeader
            searchTerm={searchState.query}
            onSearchChange={updateQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalAssets={rawAssets.length}
            filteredCount={filteredAssets.length}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearSearch}
          />
          
          {/* Filters */}
          <CompactLibraryFilters
            typeFilter={searchState.filters.contentType}
            onTypeFilterChange={(type) => updateFilters({ contentType: type })}
            statusFilter={searchState.filters.status === 'generating' ? 'processing' : searchState.filters.status}
            onStatusFilterChange={(status) => updateFilters({ status: status === 'processing' ? 'generating' : status })}
            counts={filterCounts}
          />
          
          {/* Content */}
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                {hasActiveFilters ? 'No assets match your filters' : 'No assets found'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filteredAssets.map((asset) => (
                <CompactAssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={(selected) => handleSelectAsset(asset.id, selected)}
                  onPreview={() => handlePreview(asset)}
                  onDelete={() => handleDelete(asset)}
                  onDownload={() => handleDownload(asset)}
                  selectionMode={selectedAssets.size > 0}
                />
              ))}
            </div>
          ) : (
            <AssetListView
              assets={filteredAssets.map(asset => ({
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
      </OurVidzDashboardLayout>

      {/* Bulk Action Bar */}
      <CompactBulkActionBar
        selectedCount={selectedAssets.size}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
        onAddToWorkspace={handleAddToWorkspace}
        totalFilteredCount={filteredAssets.length}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <LibraryLightbox
          assets={filteredAssets}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
};