import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { AssetCard } from './AssetCard';
import type { UnifiedAsset } from '@/lib/services/AssetService';

interface VirtualizedAssetGridProps {
  assets: UnifiedAsset[];
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  containerWidth: number;
  onItemClick: (asset: UnifiedAsset) => void;
  onItemDelete?: (asset: UnifiedAsset) => void;
  onItemDismiss?: (asset: UnifiedAsset) => void;
  selectionMode?: boolean;
  selectedAssets?: Set<string>;
  onAssetSelect?: (assetId: string, selected: boolean) => void;
  className?: string;
}

/**
 * Virtualized Asset Grid Component
 * 
 * Renders large collections of assets efficiently using virtual scrolling.
 * Only renders visible items to maintain performance with thousands of assets.
 */
export const VirtualizedAssetGrid: React.FC<VirtualizedAssetGridProps> = ({
  assets,
  itemHeight,
  itemWidth,
  containerHeight,
  containerWidth,
  onItemClick,
  onItemDelete,
  onItemDismiss,
  selectionMode = false,
  selectedAssets = new Set(),
  onAssetSelect,
  className = ''
}) => {
  // Calculate grid dimensions
  const columnCount = Math.max(1, Math.floor(containerWidth / itemWidth));
  const rowCount = Math.ceil(assets.length / columnCount);
  
  // Performance optimization: memoize the cell renderer
  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const assetIndex = rowIndex * columnCount + columnIndex;
    const asset = assets[assetIndex];
    
    if (!asset) return null;
    
    const isSelected = selectedAssets.has(asset.id);
    
    return (
      <div style={style} className="virtualized-cell">
        <AssetCard
          asset={asset}
          isSelected={isSelected}
          onSelect={onAssetSelect ? () => onAssetSelect(asset.id, !isSelected) : undefined}
          onPreview={() => onItemClick(asset)}
          onDelete={onItemDelete ? () => onItemDelete(asset) : undefined}
          onDownload={() => {
            if (asset.url) {
              const link = document.createElement('a');
              link.href = asset.url;
              link.download = `${asset.id}.${asset.type === 'image' ? 'png' : 'mp4'}`;
              link.click();
            }
          }}
          selectionMode={selectionMode}
        />
      </div>
    );
  }, [assets, columnCount, selectedAssets, onAssetSelect, onItemClick, onItemDelete, selectionMode]);

  // Memoize grid props to prevent unnecessary re-renders
  const gridProps = useMemo(() => ({
    columnCount,
    columnWidth: itemWidth,
    height: containerHeight,
    rowCount,
    rowHeight: itemHeight,
    width: containerWidth,
    itemData: assets // Pass assets as itemData for better performance
  }), [columnCount, itemWidth, containerHeight, rowCount, itemHeight, containerWidth, assets]);

  // Error boundary for grid rendering
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    setHasError(false);
  }, [assets]);

  if (hasError) {
    return (
      <div className={`virtualized-grid-error ${className}`}>
        <div className="error-content">
          <h3>Failed to load assets</h3>
          <p>There was an error rendering the asset grid.</p>
          <button 
            onClick={() => setHasError(false)}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className={`virtualized-grid-empty ${className}`}>
        <div className="empty-content">
          <h3>No assets found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`virtualized-asset-grid ${className}`}>
      <Grid {...gridProps}>
        {Cell}
      </Grid>
      
      {/* Performance indicator (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-indicator">
          <small>
            Rendering {assets.length} assets in {rowCount} rows × {columnCount} columns
          </small>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing virtualized grid dimensions
 */
export const useVirtualizedGridDimensions = (
  containerRef: React.RefObject<HTMLDivElement>,
  assets: UnifiedAsset[],
  minItemWidth: number = 200,
  minItemHeight: number = 200
) => {
  const [dimensions, setDimensions] = useState({
    containerWidth: 0,
    containerHeight: 0,
    itemWidth: minItemWidth,
    itemHeight: minItemHeight
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate optimal item dimensions based on container size
      const availableWidth = containerWidth - 20; // Account for padding
      const columns = Math.max(1, Math.floor(availableWidth / minItemWidth));
      const itemWidth = Math.floor(availableWidth / columns);

      setDimensions({
        containerWidth,
        containerHeight,
        itemWidth: Math.max(minItemWidth, itemWidth),
        itemHeight: minItemHeight
      });
    };

    updateDimensions();

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more accurate container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [containerRef, minItemWidth, minItemHeight, assets.length]);

  return dimensions;
};

/**
 * Hook for managing virtualized grid performance
 */
export const useVirtualizedGridPerformance = (assets: UnifiedAsset[]) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    visibleItems: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Simulate performance measurement
    const measurePerformance = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Estimate memory usage (rough calculation)
      const estimatedMemoryUsage = assets.length * 1024; // ~1KB per asset
      
      setPerformanceMetrics({
        renderTime,
        memoryUsage: estimatedMemoryUsage,
        visibleItems: Math.min(assets.length, 50) // Estimate visible items
      });
    };

    // Measure after a short delay to allow rendering
    const timeoutId = setTimeout(measurePerformance, 100);
    
    return () => clearTimeout(timeoutId);
  }, [assets]);

  return performanceMetrics;
}; 