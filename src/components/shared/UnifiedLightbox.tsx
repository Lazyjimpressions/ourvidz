import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Info,
  Palette,
  Zap,
} from 'lucide-react';
import { PromptDetailsSlider } from '@/components/lightbox/PromptDetailsSlider';

/**
 * Generic item shape for the UnifiedLightbox.
 * Consumers map their domain objects to this shape.
 */
export interface LightboxItem {
  id: string;
  url: string; // Already-signed display URL
  type: 'image' | 'video';
  title?: string;
  prompt?: string;
  /** Original path for on-demand high-res signing */
  originalPath?: string;
  /** Arbitrary metadata bag */
  metadata?: Record<string, any>;
  /** Dimensions */
  width?: number;
  height?: number;
  /** Model display name */
  modelType?: string;
  /** MIME type hint */
  mimeType?: string;
}

export interface UnifiedLightboxProps {
  items: LightboxItem[];
  startIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  /** Signs / loads the high-res original on demand. Falls back to item.url if not provided. */
  onRequireOriginalUrl?: (item: LightboxItem) => Promise<string>;
  /** Context-specific action buttons (save, delete, regenerate, etc.) */
  actionsSlot?: (item: LightboxItem, index: number) => React.ReactNode;
  /** Bottom panel slot (e.g. Studio prompt editor) */
  bottomSlot?: (item: LightboxItem, index: number) => React.ReactNode;
  /** Header slot for extra badges/controls next to counter */
  headerSlot?: (item: LightboxItem, index: number) => React.ReactNode;
  /** Show PromptDetailsSlider info button (default true) */
  showPromptDetails?: boolean;
  /** Enable swipe-down to close (default true) */
  enableSwipeClose?: boolean;
  /** Start in fullscreen mode (default true) */
  defaultFullscreen?: boolean;
}

export const UnifiedLightbox: React.FC<UnifiedLightboxProps> = ({
  items,
  startIndex,
  onClose,
  onIndexChange,
  onRequireOriginalUrl,
  actionsSlot,
  bottomSlot,
  headerSlot,
  showPromptDetails = true,
  enableSwipeClose = true,
  defaultFullscreen = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover'>('contain');
  const [uiVisible, setUiVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);

  // Sync with external startIndex changes
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const currentItem = useMemo(() => items[currentIndex] || null, [items, currentIndex]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.max(0, prev - 1);
      onIndexChange?.(next);
      return next;
    });
  }, [onIndexChange]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(items.length - 1, prev + 1);
      onIndexChange?.(next);
      return next;
    });
  }, [items.length, onIndexChange]);

  const toggleImageFitMode = useCallback(() => {
    setImageFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  }, []);

  const toggleUiVisibility = useCallback(() => {
    setUiVisible((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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
  }, [onClose, goToPrevious, goToNext, toggleUiVisibility, toggleFullscreen]);

  // Load original URL for an item
  const loadOriginalUrl = useCallback(
    async (item: LightboxItem) => {
      if (!item || originalUrls[item.id] || loadingUrls.has(item.id)) return;
      if (!onRequireOriginalUrl) {
        // No signing callback — use item.url directly
        setOriginalUrls((prev) => ({ ...prev, [item.id]: item.url }));
        return;
      }

      setLoadingUrls((prev) => new Set(prev).add(item.id));

      try {
        const url = await onRequireOriginalUrl(item);
        setOriginalUrls((prev) => ({ ...prev, [item.id]: url }));
      } catch (error) {
        console.error('UnifiedLightbox: failed to load original URL:', error);
        // Fallback to item.url
        setOriginalUrls((prev) => ({ ...prev, [item.id]: item.url }));
      } finally {
        setLoadingUrls((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [onRequireOriginalUrl, originalUrls, loadingUrls]
  );

  // Auto-load current + adjacent
  useEffect(() => {
    if (currentItem) loadOriginalUrl(currentItem);
  }, [currentItem, loadOriginalUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const prev = items[currentIndex - 1];
      const next = items[currentIndex + 1];
      if (prev) loadOriginalUrl(prev);
      if (next) loadOriginalUrl(next);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, items, loadOriginalUrl]);

  // Touch handling
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

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe — navigation
      if (distanceX > 50 && currentIndex < items.length - 1) goToNext();
      if (distanceX < -50 && currentIndex > 0) goToPrevious();
    } else if (enableSwipeClose) {
      // Vertical swipe down — close
      if (distanceY < -80) onClose();
    }
  };

  if (!currentItem) return null;

  const displayUrl = originalUrls[currentItem.id] || currentItem.url;
  const isLoading = loadingUrls.has(currentItem.id);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  // Detect video
  const isVideo =
    currentItem.type === 'video' ||
    currentItem.mimeType?.startsWith('video/') ||
    displayUrl?.match(/\.(mp4|avi|mov|wmv|webm|m4v)(\?.*)?$/i);

  const hasBottomSlot = !!bottomSlot;

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={
          isFullscreen
            ? 'max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black border-none rounded-none sm:rounded-none'
            : 'w-auto h-auto max-w-[90vw] max-h-[90vh] p-0 bg-black border-none rounded-lg overflow-hidden'
        }
        hideClose
        fitContent={!isFullscreen}
      >
        <DialogTitle className="sr-only">Asset preview</DialogTitle>
        <DialogDescription className="sr-only">
          Use left and right arrow keys to navigate. Press Escape to close.
        </DialogDescription>

        <div className="relative flex flex-col group h-full">
          {/* ─── Header ─── */}
          <div
            className={`absolute top-0 left-0 right-0 z-20 pointer-events-none transition-opacity duration-300 ${
              uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3 pointer-events-auto">
                {items.length > 1 && (
                  <span className="text-white/70 text-sm">
                    {currentIndex + 1} of {items.length}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

                {showPromptDetails && (
                  <PromptDetailsSlider
                    assetId={currentItem.id}
                    assetType={currentItem.type}
                    jobType={currentItem.metadata?.jobType || currentItem.metadata?.format}
                    quality={currentItem.metadata?.quality || 'fast'}
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
                )}

                {/* Fit/Fill toggle for images on mobile */}
                {!isVideo && (
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

                {/* Header slot for consumer-specific badges */}
                {headerSlot?.(currentItem, currentIndex)}
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

          {/* ─── Navigation arrows ─── */}
          <div
            className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
              uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
            }`}
          >
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

          {/* ─── Main content area ─── */}
          <div
            className={`flex items-center justify-center flex-1 ${isFullscreen ? 'w-full h-[100dvh]' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={toggleUiVisibility}
            onDoubleClick={!isVideo ? toggleImageFitMode : undefined}
          >
            {isLoading && !displayUrl ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
              </div>
            ) : displayUrl ? (
              <div
                className={
                  isFullscreen
                    ? 'w-full h-full flex items-center justify-center'
                    : 'max-w-[90vw] max-h-[90vh] flex items-center justify-center'
                }
              >
                {isVideo ? (
                  <video
                    src={displayUrl}
                    controls
                    autoPlay
                    playsInline
                    className={
                      isFullscreen
                        ? 'w-full h-full object-contain'
                        : 'max-w-full max-h-full w-auto h-auto object-contain'
                    }
                  />
                ) : (
                  <img
                    src={displayUrl}
                    alt={currentItem.title || ''}
                    className={
                      isFullscreen
                        ? `w-full h-full ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`
                        : `max-w-full max-h-full w-auto h-auto ${imageFitMode === 'contain' ? 'object-contain' : 'object-cover'}`
                    }
                  />
                )}
              </div>
            ) : (
              <div className="text-white/60 text-center">
                <p>Failed to load asset</p>
              </div>
            )}
          </div>

          {/* ─── Bottom slot (e.g. Studio prompt editor) ─── */}
          {hasBottomSlot && (
            <div
              className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
                uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {bottomSlot!(currentItem, currentIndex)}
            </div>
          )}

          {/* ─── Floating action bar (when no bottomSlot) ─── */}
          {!hasBottomSlot && (actionsSlot || currentItem.prompt || currentItem.modelType) && (
            <div
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${
                uiVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
              }`}
            >
              <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  {/* Prompt preview */}
                  {currentItem.prompt && (
                    <div className="flex flex-col px-3 py-1">
                      <p className="text-white/70 text-sm truncate max-w-[60vw]">
                        {currentItem.prompt}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  {(currentItem.modelType || (currentItem.width && currentItem.height)) && (
                    <div className="flex items-center gap-2 px-3 border-l border-white/10">
                      {currentItem.modelType && (
                        <div className="flex items-center gap-1 text-white/60">
                          <Palette className="w-4 h-4" />
                          <span className="text-sm">{currentItem.modelType}</span>
                        </div>
                      )}
                      {currentItem.width && currentItem.height && (
                        <div className="flex items-center gap-1 text-white/60">
                          <Zap className="w-4 h-4" />
                          <span className="text-sm">
                            {currentItem.width}×{currentItem.height}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {actionsSlot && (
                    <div className="flex items-center gap-2 px-3 border-l border-white/10">
                      {actionsSlot(currentItem, currentIndex)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Actions in bottom slot mode (rendered inside the bottomSlot by consumer) ─── */}
          {/* When bottomSlot is used, actionsSlot buttons should be included by the consumer within their bottomSlot */}
        </div>
      </DialogContent>
    </Dialog>
  );
};
