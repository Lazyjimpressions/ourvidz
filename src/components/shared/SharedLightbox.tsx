import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95">
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                {currentAsset.type === 'video' ? 'Video' : 'Image'}
              </Badge>
              <span className="text-white/80 text-sm">
                {currentIndex + 1} of {assets.length}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation buttons */}
          {canGoPrevious && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {canGoNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}

          {/* Main content area */}
          <div className="flex-1 flex items-center justify-center p-16">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full" />
              </div>
            ) : currentOriginalUrl ? (
              <div className="max-w-full max-h-full">
                {currentAsset.type === 'video' ? (
                  <video
                    src={currentOriginalUrl}
                    controls
                    className="max-w-full max-h-full"
                    poster={(currentAsset as any).thumbUrl || undefined}
                  />
                ) : (
                  <img
                    src={currentOriginalUrl}
                    alt={currentAsset.title || 'Asset'}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="text-white/60 text-center">
                <p>Failed to load asset</p>
              </div>
            )}
          </div>

          {/* Bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Asset details */}
              <div className="flex-1 space-y-2">
                <h3 className="text-white font-medium text-lg">
                  {currentAsset.title}
                </h3>
                
                {currentAsset.prompt && (
                  <p className="text-white/80 text-sm line-clamp-3">
                    {currentAsset.prompt}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 text-xs text-white/60">
                  {currentAsset.modelType && (
                    <div className="flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      {currentAsset.modelType}
                    </div>
                  )}
                  {currentAsset.width && currentAsset.height && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {currentAsset.width}×{currentAsset.height}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {currentAsset.createdAt.toLocaleDateString()}
                  </div>
                  {currentAsset.metadata?.seed && (
                    <div className="flex items-center gap-1">
                      <Copy className="w-3 h-3" />
                      Seed: {currentAsset.metadata.seed}
                    </div>
                  )}
                </div>

                {/* Custom details slot */}
                {detailsSlot?.(currentAsset)}
              </div>

              {/* Action buttons */}
              <div className="flex items-end gap-2">
                {actionsSlot?.(currentAsset)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Default action buttons for workspace assets
export const WorkspaceAssetActions: React.FC<{
  asset: SharedAsset;
  onSave?: () => void;
  onDiscard?: () => void;
  onDownload?: () => void;
}> = ({ asset, onSave, onDiscard, onDownload }) => (
  <>
    {onSave && (
      <Button size="sm" variant="secondary" onClick={onSave} className="gap-2">
        <Save className="w-4 h-4" />
        Save to Library
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="outline" onClick={onDownload} className="gap-2">
        <Download className="w-4 h-4" />
        Download
      </Button>
    )}
    {onDiscard && (
      <Button size="sm" variant="outline" onClick={onDiscard} className="gap-2">
        <Trash2 className="w-4 h-4" />
        Discard
      </Button>
    )}
  </>
);

// Default action buttons for library assets
export const LibraryAssetActions: React.FC<{
  asset: SharedAsset;
  onDelete?: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
}> = ({ asset, onDelete, onDownload, onUseAsReference }) => (
  <>
    {onUseAsReference && (
      <Button size="sm" variant="secondary" onClick={onUseAsReference} className="gap-2">
        <Shuffle className="w-4 h-4" />
        Use as Reference
      </Button>
    )}
    {onDownload && (
      <Button size="sm" variant="outline" onClick={onDownload} className="gap-2">
        <Download className="w-4 h-4" />
        Download
      </Button>
    )}
    {onDelete && (
      <Button size="sm" variant="outline" onClick={onDelete} className="gap-2">
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>
    )}
  </>
);