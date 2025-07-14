import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Video as VideoIcon,
} from 'lucide-react';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface LibraryLightboxStaticProps {
  assets: UnifiedAsset[];
  startIndex: number;
  onClose: () => void;
  onDownload: (asset: UnifiedAsset) => void;
}

export const LibraryLightboxStatic: React.FC<LibraryLightboxStaticProps> = ({ 
  assets, 
  startIndex, 
  onClose, 
  onDownload 
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isLoading, setIsLoading] = useState(true);
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, assets.length, onClose]);

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
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <div className="flex items-center gap-2 bg-background/80 rounded-lg px-3 py-2 backdrop-blur-sm">
              <span className="text-sm font-medium">Asset Preview</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="bg-background/80 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex items-center justify-center relative pb-48">
            {/* Navigation Arrows */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {currentIndex < assets.length - 1 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={handleNext}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Media Container */}
            <div 
              className="relative flex items-center justify-center min-h-[50vh] w-full px-16"
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
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ opacity: isLoading ? 0 : 1 }}
                  />
                ) : (
                  <video
                    src={currentAsset.url}
                    controls
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                    poster={currentAsset.thumbnailUrl}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ opacity: isLoading ? 0 : 1 }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    {currentAsset.type === 'image' ? (
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    ) : (
                      <VideoIcon className="h-12 w-12 mx-auto mb-2" />
                    )}
                    <div>Preview not available</div>
                    <div className="text-sm capitalize">Status: {currentAsset.status}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Static Bottom Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/95 border-t border-border backdrop-blur-sm">
            <div className="p-6 space-y-4">
              {/* Top Row: Prompt and Status */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Prompt</p>
                  <p className="text-sm leading-relaxed">{currentAsset.prompt}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={
                      currentAsset.status === 'completed' ? 'border-green-500/20 text-green-400' :
                      currentAsset.status === 'processing' || currentAsset.status === 'queued' ? 'border-yellow-500/20 text-yellow-400' :
                      'border-red-500/20 text-red-400'
                    }
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
                      {currentAsset.quality === 'high' ? 'High' : 'Fast'}
                    </Badge>
                  )}

                  <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">
                    {currentAsset.type === 'image' ? (
                      <ImageIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <VideoIcon className="h-3 w-3 mr-1" />
                    )}
                    {currentAsset.type.charAt(0).toUpperCase() + currentAsset.type.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Bottom Row: Details and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(currentAsset.createdAt)}</span>
                  </div>
                  
                  {currentAsset.type === 'video' && currentAsset.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{currentAsset.duration}s</span>
                    </div>
                  )}
                  
                  <div className="text-xs">
                    {currentIndex + 1} of {assets.length}
                  </div>
                </div>
                
                {currentAsset.status === 'completed' && currentAsset.url && (
                  <Button
                    onClick={() => onDownload(currentAsset)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};