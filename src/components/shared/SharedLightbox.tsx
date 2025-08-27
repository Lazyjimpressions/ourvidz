import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Save, 
  Trash2, 
  Shuffle,
  Copy,
  Clock,
  Palette,
  Zap
} from 'lucide-react';
import type { SharedAsset } from '@/lib/services/AssetMappers';

export type SharedLightboxProps = {
  assets: SharedAsset[];
  startIndex: number;
  onClose: () => void;
  onRequireOriginalUrl: (asset: SharedAsset) => Promise<string>; // signs original on demand
  detailsSlot?: (asset: SharedAsset) => React.ReactNode; // prompt/seed/model
  actionsSlot?: (asset: SharedAsset) => React.ReactNode; // buttons
};

export const SharedLightbox: React.FC<SharedLightboxProps> = ({
  assets,
  startIndex,
  onClose,
  onRequireOriginalUrl,
  detailsSlot,
  actionsSlot
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());

  // Reset currentIndex when startIndex changes
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const currentAsset = useMemo(() => assets[currentIndex] || null, [assets, currentIndex]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(assets.length - 1, prev + 1));
  }, [assets.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  // Load original URL for current asset
  const loadOriginalUrl = useCallback(async (asset: SharedAsset) => {
    if (!asset || originalUrls[asset.id] || loadingUrls.has(asset.id)) {
      return;
    }

    setLoadingUrls(prev => new Set(prev).add(asset.id));
    
    try {
      const url = await onRequireOriginalUrl(asset);
      setOriginalUrls(prev => ({ ...prev, [asset.id]: url }));
    } catch (error) {
      console.error('Failed to load original URL:', error);
    } finally {
      setLoadingUrls(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }, [onRequireOriginalUrl, originalUrls, loadingUrls]);

  // Auto-load current asset's original URL
  useEffect(() => {
    if (currentAsset) {
      loadOriginalUrl(currentAsset);
    }
  }, [currentAsset, loadOriginalUrl]);

  // Pre-load adjacent assets
  useEffect(() => {
    const preloadAdjacent = async () => {
      const prevAsset = assets[currentIndex - 1];
      const nextAsset = assets[currentIndex + 1];
      
      if (prevAsset) loadOriginalUrl(prevAsset);
      if (nextAsset) loadOriginalUrl(nextAsset);
    };

    // Delay preload slightly to prioritize current asset
    const timer = setTimeout(preloadAdjacent, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, assets, loadOriginalUrl]);

  if (!currentAsset) {
    return null;
  }

  const currentOriginalUrl = originalUrls[currentAsset.id];
  const isLoading = loadingUrls.has(currentAsset.id);
  
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < assets.length - 1;

  const isWorkspace = currentAsset.metadata?.source === 'workspace';

  // Touch handlers for swipe navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && canGoNext) {
      goToNext();
    }
    if (isRightSwipe && canGoPrevious) {
      goToPrevious();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black border-none">
        <DialogTitle className="sr-only">Asset preview</DialogTitle>
        <DialogDescription className="sr-only">Use left and right arrow keys to navigate. Press Escape to close.</DialogDescription>
        <div className="relative w-full h-full flex flex-col group">
          {/* Header - hidden by default, shows on hover */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3 pointer-events-auto">
                <span className="text-white/70 text-sm">
                  {currentIndex + 1} of {assets.length}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-10 w-10 p-0 pointer-events-auto"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation buttons - hidden by default, shows on hover */}
          <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {canGoPrevious && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 p-0 pointer-events-auto"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {canGoNext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 p-0 pointer-events-auto"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Main content area - full screen */}
          <div 
            className="flex-1 flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
              </div>
            ) : currentOriginalUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                {(() => {
                  // Defensive type detection - check if asset should be video despite being marked as image
                  const isVideoByMime = currentAsset.metadata?.mimeType?.startsWith('video/') || currentAsset.mimeType?.startsWith('video/');
                  const isVideoByUrl = currentOriginalUrl?.match(/\.(mp4|avi|mov|wmv|webm|m4v)(\?.*)?$/i);
                  const shouldRenderAsVideo = currentAsset.type === 'video' || isVideoByMime || isVideoByUrl;
                  
                  if (shouldRenderAsVideo) {
                    return (
                      <video
                        src={currentOriginalUrl}
                        controls
                        className="w-full h-full object-contain"
                        poster={(currentAsset as any).thumbUrl || undefined}
                      />
                    );
                  } else {
                    return (
                      <img
                        src={currentOriginalUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    );
                  }
                })()}
              </div>
            ) : (
              <div className="text-white/60 text-center">
                <p>Failed to load asset</p>
              </div>
            )}
          </div>

          {/* Floating bottom actions bar - hidden by default, shows on hover */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-3">
                {/* Asset info - compact */}
                <div className="flex flex-col px-3 py-1">
                  {currentAsset.prompt && (
                    <p className="text-white/70 text-sm truncate max-w-[400px]">
                      {currentAsset.prompt}
                    </p>
                  )}
                </div>

                {/* Metadata - compact icons */}
                <div className="flex items-center gap-2 px-3 border-l border-white/10">
                  {currentAsset.modelType && (
                    <div className="flex items-center gap-1 text-white/60">
                      <Palette className="w-4 h-4" />
                      <span className="text-sm">{currentAsset.modelType}</span>
                    </div>
                  )}
                  {currentAsset.width && currentAsset.height && (
                    <div className="flex items-center gap-1 text-white/60">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">{currentAsset.width}×{currentAsset.height}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons - compact */}
                <div className="flex items-center gap-2 px-3 border-l border-white/10">
                  {actionsSlot?.(currentAsset)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Default action buttons for workspace assets - compact icons only
export const WorkspaceAssetActions: React.FC<{
  asset: SharedAsset;
  onSave?: () => void;
  onClear?: () => void;
  onDiscard?: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
}> = ({ asset, onSave, onClear, onDiscard, onDownload, onUseAsReference }) => (
  <>
    {onSave && (
      <Button size="sm" variant="secondary" onClick={onSave} className="h-7 w-7 p-0" title="Save to Library">
        <Save className="w-3 h-3" />
      </Button>
    )}
    {onClear && (
      <Button size="sm" variant="secondary" onClick={onClear} className="h-7 w-7 p-0" title="Clear (save to library then remove)">
        <ChevronRight className="w-3 h-3" />
      </Button>
    )}
    {onDiscard && (
      <Button size="sm" variant="destructive" onClick={onDiscard} className="h-7 w-7 p-0" title="Delete permanently">
        <Trash2 className="w-3 h-3" />
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="secondary" onClick={onDownload} className="h-7 w-7 p-0" title="Download">
        <Download className="w-3 h-3" />
      </Button>
    )}
    {onUseAsReference && (
      <Button size="sm" variant="secondary" onClick={onUseAsReference} className="h-7 w-7 p-0" title="Add to REF (Modify)">
        <Copy className="w-3 h-3" />
      </Button>
    )}
  </>
);

// Default action buttons for library assets - compact icons only
export const LibraryAssetActions: React.FC<{
  asset: SharedAsset;
  onDelete?: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
}> = ({ asset, onDelete, onDownload, onUseAsReference }) => (
  <>
    {onUseAsReference && (
      <Button size="sm" variant="secondary" onClick={onUseAsReference} className="h-7 w-7 p-0" title="Use as Reference">
        <Shuffle className="w-3 h-3" />
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="outline" onClick={onDownload} className="h-7 w-7 p-0" title="Download">
        <Download className="w-3 h-3" />
      </Button>
    )}
    {onDelete && (
      <Button size="sm" variant="outline" onClick={onDelete} className="h-7 w-7 p-0" title="Delete">
        <Trash2 className="w-3 h-3" />
      </Button>
    )}
  </>
);