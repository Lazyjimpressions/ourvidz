import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, Download, Save, Trash2, Image, Shuffle, ArrowRight, Copy } from 'lucide-react';
import type { SharedAsset } from '@/lib/services/AssetMappers';
import type { SignedAsset } from '@/lib/hooks/useSignedAssets';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Global concurrency control for original image loading
class OriginalImageLoader {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrency = 3;

  async load(loadFn: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          await loadFn();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrency) {
        this.running++;
        task();
      } else {
        this.queue.push(() => {
          this.running++;
          return task();
        });
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

const originalImageLoader = new OriginalImageLoader();

export type SharedGridProps = {
  assets: SignedAsset[];
  onPreview: (asset: SharedAsset) => void;
  selection?: {
    enabled: boolean;
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
  };
  actions?: {
    // For Workspace
    onSaveToLibrary?: (asset: SharedAsset) => void;
    onClear?: (asset: SharedAsset) => void; // Save to library then remove
    onDiscard?: (asset: SharedAsset) => void;
    onSendToRef?: (asset: SharedAsset) => void;
    // For Library
    onDelete?: (asset: SharedAsset) => void;
    onDownload?: (asset: SharedAsset) => void;
    onUseAsReference?: (asset: SharedAsset) => void;
    onAddToWorkspace?: (asset: SharedAsset) => void;
  };
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  registerAssetRef?: (element: HTMLElement | null, assetId: string) => void;
};

export const SharedGrid: React.FC<SharedGridProps> = ({
  assets,
  onPreview,
  selection,
  actions,
  isLoading,
  emptyState,
  registerAssetRef
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleCardRef = useCallback((element: HTMLElement | null, assetId: string) => {
    registerAssetRef?.(element, assetId);
  }, [registerAssetRef]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return emptyState || (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No assets found</p>
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
    >
      {assets.map((asset) => (
        <SharedGridCard
          key={asset.id}
          asset={asset}
          onPreview={onPreview}
          selection={selection}
          actions={actions}
          registerRef={handleCardRef}
        />
      ))}
    </div>
  );
};

type SharedGridCardProps = {
  asset: SignedAsset;
  onPreview: (asset: SharedAsset) => void;
  selection?: SharedGridProps['selection'];
  actions?: SharedGridProps['actions'];
  registerRef?: (element: HTMLElement | null, assetId: string) => void;
};

const SharedGridCard: React.FC<SharedGridCardProps> = ({
  asset,
  onPreview,
  selection,
  actions,
  registerRef
}) => {
  const isSelected = selection?.selectedIds.has(asset.id) ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Register ref for lazy loading
  React.useEffect(() => {
    registerRef?.(cardRef.current, asset.id);
  }, [registerRef, asset.id]);

  // Intersection observer for visibility detection
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '300px' }
    );
    
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Load fallback URL only when visible, no thumbUrl, and asset is an image
  useEffect(() => {
    if (!asset.thumbUrl && asset.type === 'image' && !fallbackUrl && !isLoadingFallback && isVisible) {
      setIsLoadingFallback(true);
      
      // Use concurrency-controlled loader
      originalImageLoader.load(async () => {
        try {
          const url = await asset.signOriginal();
          setFallbackUrl(url);
        } catch (err) {
          console.warn('Failed to load fallback image for asset', asset.id, err);
        }
      }).finally(() => {
        setIsLoadingFallback(false);
      });
    }
  }, [asset.thumbUrl, asset.type, asset.id, fallbackUrl, isLoadingFallback, asset, isVisible]);

  const handleSelect = useCallback((checked: boolean) => {
    selection?.onToggle(asset.id);
  }, [selection, asset.id]);

  const handlePreview = useCallback(() => {
    onPreview(asset);
  }, [onPreview, asset]);

  const isWorkspace = asset.metadata?.source === 'workspace';
  const isLibrary = asset.metadata?.source === 'library';

  return (
    <div
      ref={cardRef}
      className={`group relative bg-card rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'
      }`}
    >
      {/* Selection checkbox */}
      {selection?.enabled && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelect}
            className="bg-background/80 backdrop-blur-sm"
          />
        </div>
      )}

      {/* Send to ref icon - always visible top-left for workspace items when no selection */}
      {isWorkspace && actions?.onSendToRef && !selection?.enabled && (
        <div className="absolute top-2 left-2 z-10">
          <Button
            size="sm"
            variant="outline"
            className="h-3.5 w-3.5 p-0 bg-background/80 backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              actions.onSendToRef!(asset);
            }}
            title="Add to REF (Modify)"
          >
            <ArrowRight className="w-2 h-2" />
          </Button>
        </div>
      )}

      {/* Asset type badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
          {asset.type === 'video' ? 'Video' : 'Image'}
        </Badge>
      </div>

      {/* Main image/thumbnail */}
      <div className="aspect-square bg-muted relative cursor-pointer" onClick={handlePreview}>
        {asset.thumbUrl ? (
          <img
            src={asset.thumbUrl}
            alt={asset.title || 'Asset'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => {
              // On thumbnail error, load original for images with concurrency control
              if (asset.type === 'image' && !fallbackUrl && !isLoadingFallback && isVisible && asset.originalPath) {
                setIsLoadingFallback(true);
                console.log('🔄 Loading fallback original for asset:', { id: asset.id, originalPath: asset.originalPath });
                originalImageLoader.load(async () => {
                  try {
                    const url = await asset.signOriginal();
                    setFallbackUrl(url);
                  } catch (err) {
                    console.warn('❌ Failed to load original for asset', asset.id, err);
                  }
                }).finally(() => setIsLoadingFallback(false));
              } else if (!asset.originalPath) {
                console.warn('🚫 No originalPath available for fallback loading:', asset.id);
              }
            }}
          />
        ) : fallbackUrl && asset.type === 'image' ? (
          <img
            src={fallbackUrl}
            alt={asset.title || 'Asset'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Button 
            size="sm" 
            variant="secondary" 
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handlePreview();
            }}
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-medium text-sm line-clamp-1" title={asset.title}>
          {asset.title}
        </h3>
        
        {/* Prompt preview */}
        {asset.prompt && (
          <p className="text-xs text-muted-foreground line-clamp-2" title={asset.prompt}>
            {asset.prompt}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {asset.modelType && (
            <span className="truncate">{asset.modelType}</span>
          )}
          {asset.width && asset.height && (
            <span>{asset.width}×{asset.height}</span>
          )}
        </div>
      </div>

       {/* Action buttons */}
      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Workspace actions */}
        
        {isWorkspace && actions?.onSaveToLibrary && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onSaveToLibrary!(asset);
            }}
            title="Save to Library"
          >
            <Save className="w-3 h-3" />
          </Button>
        )}
        
        {isWorkspace && actions?.onClear && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onClear!(asset);
            }}
            title="Clear (save to library then remove)"
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
        
        {isWorkspace && actions?.onDiscard && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDiscard!(asset);
            }}
            title="Delete permanently"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}

        {/* Library actions */}
        {isLibrary && actions?.onDownload && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDownload!(asset);
            }}
            title="Download"
          >
            <Download className="w-3 h-3" />
          </Button>
        )}

        {isLibrary && actions?.onUseAsReference && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onUseAsReference!(asset);
            }}
            title="Exact Copy"
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}

        {isLibrary && actions?.onAddToWorkspace && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onAddToWorkspace!(asset);
            }}
            title="Add to Workspace"
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}

        {isLibrary && actions?.onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              actions.onDelete!(asset);
            }}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};