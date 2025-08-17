import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Download, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Video as VideoIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface LibraryLightboxProps {
  assets: UnifiedAsset[];
  startIndex: number;
  onClose: () => void;
  onDownload: (asset: UnifiedAsset) => void;
}

export const LibraryLightbox: React.FC<LibraryLightboxProps> = ({ 
  assets, 
  startIndex, 
  onClose, 
  onDownload 
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const minSwipeDistance = 50;
  const currentAsset = assets[currentIndex];

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsLoading(true);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < assets.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsLoading(true);
          }
          break;
        case 'i':
        case 'I':
          setShowDetails(!showDetails);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, assets.length, onClose, showDetails]);

  // Preload adjacent images to reduce swipe latency
  useEffect(() => {
    const preloadImage = (url?: string | null) => {
      if (!url) return;
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = url;
    };

    const prev = assets[currentIndex - 1];
    const next = assets[currentIndex + 1];

    if (prev && prev.type === 'image') preloadImage(prev.url || undefined);
    if (next && next.type === 'image') preloadImage(next.url || undefined);
  }, [assets, currentIndex]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < assets.length - 1) {
      handleNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      handlePrevious();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentAsset) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-full h-full max-h-[95vh] p-0 bg-background/95 border-border">
        <div className="relative w-full h-full flex">
          {/* Main Content Area */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Header Controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
              <div className="flex items-center gap-2 bg-background/80 rounded-lg px-3 py-2 backdrop-blur-sm">
                {currentAsset.type === 'image' ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <VideoIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium truncate max-w-[240px]">
                  {currentAsset.title || 'Asset Preview'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="bg-background/80 backdrop-blur-sm h-9 w-9 p-0"
                  aria-label="Toggle details"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="bg-background/80 backdrop-blur-sm h-9 w-9 p-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90 h-12 w-12 p-0"
                aria-label="Previous"
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
            )}

            {currentIndex < assets.length - 1 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={handleNext}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90 h-12 w-12 p-0"
                aria-label="Next"
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
            )}

            {/* Media Container */}
            <div 
              className="relative flex items-center justify-center min-h-[70vh] w-full px-6 sm:px-16"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              )}
              
              {currentAsset.url && currentAsset.status === 'completed' ? (
                currentAsset.type === 'image' ? (
                  <img
                    ref={imageRef}
                    src={currentAsset.url}
                    alt={currentAsset.prompt}
                    className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-lg"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ opacity: isLoading ? 0 : 1 }}
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <video
                    src={currentAsset.url}
                    controls
                    className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-lg"
                    poster={currentAsset.thumbnailUrl}
                    onLoadedData={handleImageLoad}
                    onError={handleImageError}
                    style={{ opacity: isLoading ? 0 : 1 }}
                    playsInline
                    disablePictureInPicture
                  >
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  {currentAsset.error ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">⚠️</div>
                      <div>Failed to load {currentAsset.type}</div>
                      <div className="text-sm text-destructive mt-1 px-4 break-words">{currentAsset.error}</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {currentAsset.type === 'image' ? (
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      ) : (
                        <VideoIcon className="h-12 w-12 mx-auto mb-2" />
                      )}
                      <div>Preview not available</div>
                      <div className="text-sm capitalize">Status: {currentAsset.status}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-4">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium">
                {currentIndex + 1} of {assets.length}
              </div>
              
              {currentAsset.status === 'completed' && currentAsset.url && (
                <Button
                  onClick={() => onDownload(currentAsset)}
                  size="sm"
                  className="bg-primary/90 hover:bg-primary h-9 px-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>

          {/* Details Sidebar */}
          <div className={`
            absolute top-0 right-0 h-full w-80 bg-background/95 border-l border-border backdrop-blur-sm
            transform transition-transform duration-300 ease-in-out z-30
            ${showDetails ? 'translate-x-0' : 'translate-x-full'}
          `}>
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Asset Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="text-muted-foreground h-8 w-8 p-0"
                  aria-label="Close details"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Status and Quality */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${
                        currentAsset.status === 'completed' ? 'border-green-500/20 text-green-400' :
                        currentAsset.status === 'processing' || currentAsset.status === 'queued' ? 'border-yellow-500/20 text-yellow-400' :
                        'border-red-500/20 text-red-400'
                      }`}
                    >
                      {currentAsset.status.charAt(0).toUpperCase() + currentAsset.status.slice(1)}
                    </Badge>

                    {currentAsset.quality && (
                      <Badge 
                        variant="outline"
                        className={currentAsset.quality === 'high' 
                          ? 'border-purple-500/20 text-purple-400'
                          : 'border-blue-500/20 text-blue-400'
                        }
                      >
                        {currentAsset.quality === 'high' ? 'High Quality' : 'Fast'}
                      </Badge>
                    )}

                    <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">
                      {currentAsset.type.charAt(0).toUpperCase() + currentAsset.type.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Prompt</h4>
                  <div className="text-sm bg-muted/50 p-3 rounded-lg border max-h-32 overflow-y-auto">
                    <p className="break-words leading-relaxed whitespace-pre-wrap">{currentAsset.prompt}</p>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Technical Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(currentAsset.createdAt)}</span>
                    </div>

                    {currentAsset.format && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Format:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{currentAsset.format.toUpperCase()}</code>
                      </div>
                    )}

                    {currentAsset.type === 'video' && currentAsset.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Duration: {currentAsset.duration}s</span>
                      </div>
                    )}

                    {currentAsset.resolution && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Resolution:</span>
                        <span>{currentAsset.resolution}</span>
                      </div>
                    )}

                    {currentAsset.signedUrls && currentAsset.signedUrls.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Images:</span>
                        <span>{currentAsset.signedUrls.length} variations</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Type */}
                {currentAsset.modelType && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">Model</h4>
                    <Badge 
                      variant="outline" 
                      className={
                        currentAsset.modelType === 'SDXL' ? 'border-purple-500/20 text-purple-400' :
                        currentAsset.modelType === 'Enhanced-7B' ? 'border-emerald-500/20 text-emerald-400' :
                        'border-blue-500/20 text-blue-400'
                      }
                    >
                      {currentAsset.modelType}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};