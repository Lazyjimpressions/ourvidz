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
  Zap,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import type { SharedAsset } from '@/lib/services/AssetMappers';
import { PromptDetailsSlider } from '@/components/lightbox/PromptDetailsSlider';

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
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover'>('contain');
  const [uiVisible, setUiVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true); // Default to fullscreen for 1-tap experience

  // Reset currentIndex when startIndex changes
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const currentAsset = useMemo(() => assets[currentIndex] || null, [assets, currentIndex]);

  // Fullscreen is now default for all assets - no need for video-specific logic

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(assets.length - 1, prev + 1));
  }, [assets.length]);

  // Toggle fit mode for images
  const toggleImageFitMode = useCallback(() => {
    setImageFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
  }, []);

  // Toggle UI visibility
  const toggleUiVisibility = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

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
        case ' ':
          e.preventDefault();
          toggleUiVisibility();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext, toggleUiVisibility]);

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

  // Touch handlers for swipe navigation (horizontal) and close (vertical)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX || !touchStartY || !touchEndY) return;
    
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;
    
    // Determine if swipe is more horizontal or vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe - navigation
      const isLeftSwipe = distanceX > 50;
      const isRightSwipe = distanceX < -50;

      if (isLeftSwipe && canGoNext) {
        goToNext();
      }
      if (isRightSwipe && canGoPrevious) {
        goToPrevious();
      }
    } else {
      // Vertical swipe - close on swipe down
      if (distanceY < -80) {
        onClose();
      }
    }
  };

    return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent 
        className={
          isFullscreen 
            ? "max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black border-none rounded-none sm:rounded-none" 
            : "w-auto h-auto max-w-[90vw] max-h-[90vh] p-0 bg-black border-none rounded-lg overflow-hidden"
        }
        hideClose
        fitContent={!isFullscreen}
      >
        <DialogTitle className="sr-only">Asset preview</DialogTitle>
        <DialogDescription className="sr-only">Use left and right arrow keys to navigate. Press Escape to close.</DialogDescription>
        <div className="relative flex flex-col group">
          {/* Header - shows on hover on desktop, toggle on mobile */}
          <div className={`absolute top-0 left-0 right-0 z-20 pointer-events-none transition-opacity duration-300 ${
            uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
          }`}>
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3 pointer-events-auto">
                <span className="text-white/70 text-sm">
                  {currentIndex + 1} of {assets.length}
                </span>
                
                 {/* Fullscreen toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                
                {/* Info button for metadata */}
                <PromptDetailsSlider
                  assetId={currentAsset.id}
                  assetType={currentAsset.type}
                  jobType={currentAsset.metadata?.jobType || currentAsset.metadata?.format}
                  quality={currentAsset.metadata?.quality || (currentAsset.metadata?.format?.toLowerCase().includes('high') ? 'high' : 'fast')}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      title="View generation details"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  }
                />
                
                {/* Fit/Fill toggle for images on mobile */}
                {currentAsset.type !== 'video' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleImageFitMode}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0 md:hidden"
                    title={imageFitMode === 'contain' ? 'Fill screen' : 'Fit to screen'}
                  >
                    {imageFitMode === 'contain' ? 'Fill' : 'Fit'}
                  </Button>
                )}
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

          {/* Navigation buttons - shows on hover on desktop, toggle on mobile */}
          <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
            uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
          }`}>
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

          {/* Main content area */}
          <div 
            className={`flex items-center justify-center ${isFullscreen ? 'w-full h-[100dvh]' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={toggleUiVisibility}
            onDoubleClick={currentAsset.type !== 'video' ? toggleImageFitMode : undefined}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
              </div>
            ) : currentOriginalUrl ? (
              <div className={isFullscreen ? "w-full h-full flex items-center justify-center" : "max-w-[90vw] max-h-[90vh] flex items-center justify-center"}>
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
                        autoPlay
                        playsInline
                        className={isFullscreen 
                          ? "w-full h-full object-contain" 
                          : "max-w-full max-h-full w-auto h-auto object-contain"
                        }
                        poster={(currentAsset as any).thumbUrl || undefined}
                      />
                    );
                  } else {
                    return (
                      <img
                        src={currentOriginalUrl}
                        alt=""
                        className={isFullscreen 
                          ? `w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`
                          : `max-w-full max-h-full w-auto h-auto ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`
                        }
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

          {/* Floating bottom actions bar - shows on hover on desktop, toggle on mobile */}
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${
            uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
          }`}>
            <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-3">
                {/* Asset info - compact */}
                <div className="flex flex-col px-3 py-1">
                  {currentAsset.prompt && (
                    <p className="text-white/70 text-sm truncate max-w-[60vw]">
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