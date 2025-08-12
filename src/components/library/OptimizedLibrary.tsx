import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { AssetCard } from '../AssetCard';
import { OurVidzDashboardLayout } from '../OurVidzDashboardLayout';
import { LoadingSpinner } from '../LoadingSpinner';
import { AssetService } from '../../lib/services/AssetService';

export const OptimizedLibrary = () => {
  // Simple state for testing
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // Data fetching using AssetService.getUserAssetsOptimized()
  const {
    data: rawAssets = [],
    isLoading,
    error
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

  // Simple selection handler
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
    <OurVidzDashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Library ({rawAssets.length} assets)</h1>
        
        {rawAssets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {rawAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAssets.has(asset.id)}
                onSelect={(selected) => handleSelectAsset(asset.id, selected)}
                onPreview={() => console.log('Preview:', asset.id)}
                onDelete={() => console.log('Delete:', asset.id)}
                onDownload={() => console.log('Download:', asset.id)}
                selectionMode={selectedAssets.size > 0}
              />
            ))}
          </div>
        )}
      </div>
    </OurVidzDashboardLayout>
  );
};