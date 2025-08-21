
import React from 'react';

export interface WorkspaceGridVirtualizedProps {
  assets: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    prompt?: string; // Make prompt optional to match data format
    created_at: string;
    metadata?: any;
  }>;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  onRefresh: () => void;
  onDelete: (itemId: string) => void;
  onAssetClick: (asset: any) => void;
  selectedAssets?: string[];
  onSelectAsset?: (assetId: string) => void;
}

export const WorkspaceGridVirtualized: React.FC<WorkspaceGridVirtualizedProps> = ({
  assets,
  isLoading,
  onLoadMore,
  hasMore,
  onRefresh,
  onDelete,
  onAssetClick,
  selectedAssets = [],
  onSelectAsset
}) => {
  console.log('🔲 WORKSPACE GRID: Rendering with', assets?.length || 0, 'assets');

  if (isLoading && (!assets || assets.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No assets found</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="relative cursor-pointer group"
          onClick={() => onAssetClick(asset)}
        >
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            <img
              src={asset.url}
              alt={asset.prompt || 'Generated asset'}
              className="w-full h-full object-cover"
            />
          </div>
          {onSelectAsset && (
            <input
              type="checkbox"
              checked={selectedAssets.includes(asset.id)}
              onChange={(e) => {
                e.stopPropagation();
                onSelectAsset(asset.id);
              }}
              className="absolute top-2 left-2"
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset.id);
            }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded p-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
