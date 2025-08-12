import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface MobileFullScreenViewerProps {
  assets: UnifiedAsset[];
  startIndex: number;
  onClose: () => void;
  onDownload: (asset: UnifiedAsset) => void;
}

export const MobileFullScreenViewer: React.FC<MobileFullScreenViewerProps> = ({
  assets,
  startIndex,
  onClose,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef<number>(0);
  const closing = useRef(false);

  const currentAsset = assets[currentIndex];

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  // Lock body scroll while open
  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  // Preload adjacent images for smoother swipes
  useEffect(() => {
    const preload = (url?: string | null) => {
      if (!url) return;
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = url;
    };
    const prev = assets[currentIndex - 1];
    const next = assets[currentIndex + 1];
    if (prev && prev.type === 'image') preload(prev.url || undefined);
    if (next && next.type === 'image') preload(next.url || undefined);
  }, [assets, currentIndex]);

  const handleNext = () => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsLoading(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsLoading(true);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    closing.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };

  const onTouchEnd = () => {
    const delta = touchDeltaY.current;
    const swipeThreshold = 80; // navigate
    const closeThreshold = 140; // pull down to dismiss when no previous

    if (delta <= -swipeThreshold) {
      // swipe up -> next
      handleNext();
    } else if (delta >= closeThreshold && currentIndex === 0) {
      // strong pull-down on first item -> close
      closing.current = true;
      onClose();
    } else if (delta >= swipeThreshold) {
      // swipe down -> previous
      handlePrev();
    }

    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  if (!currentAsset) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background text-foreground"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
        <div className="text-sm opacity-80 px-2 py-1 rounded bg-background/70 backdrop-blur border border-border">
          {currentIndex + 1} / {assets.length}
        </div>
        <div className="flex items-center gap-2">
          {currentAsset.status === 'completed' && currentAsset.url && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => onDownload(currentAsset)}
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media area */}
      <div
        className="w-full h-full flex items-center justify-center px-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        )}

        {currentAsset.url && currentAsset.status === 'completed' ? (
          currentAsset.type === 'image' ? (
            <img
              src={currentAsset.url}
              alt={currentAsset.prompt}
              className="max-h-full max-w-full object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              loading="eager"
              decoding="async"
            />
          ) : (
            <video
              src={currentAsset.url}
              className="max-h-full max-w-full object-contain"
              poster={currentAsset.thumbnailUrl || undefined}
              controls
              playsInline
              disablePictureInPicture
              onLoadedMetadata={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          )
        ) : (
          <div className="text-sm text-muted-foreground">Preview not available</div>
        )}
      </div>

      {/* Swipe hints */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/70 border border-border rounded-full px-3 py-1">
          <ChevronUp className="h-3 w-3" />
          <span>Next</span>
          <span className="opacity-40">•</span>
          <ChevronDown className="h-3 w-3" />
          <span>Previous</span>
        </div>
      </div>
    </div>
  );
};
