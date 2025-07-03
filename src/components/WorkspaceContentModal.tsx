
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface MediaTile {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface WorkspaceContentModalProps {
  tiles: MediaTile[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export const WorkspaceContentModal = ({ tiles, currentIndex, onClose, onIndexChange }: WorkspaceContentModalProps) => {
  const currentTile = tiles[currentIndex];
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tiles.length]);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : tiles.length - 1;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < tiles.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  };
  const handleDownload = async () => {
    try {
      const response = await fetch(currentTile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${currentTile.type}-${currentTile.id}.${currentTile.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden group">
        {/* Content Area - Full Screen */}
        <div className="relative w-full h-[95vh] flex items-center justify-center">
          {/* Overlay Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white p-2 backdrop-blur-sm"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white p-2 backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Position Indicator */}
          {tiles.length > 1 && (
            <div className="absolute top-4 left-4 z-20 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
              {currentIndex + 1} of {tiles.length}
            </div>
          )}
          {currentTile.type === 'image' ? (
            <img
              src={currentTile.url}
              alt="Generated content"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-200"
            />
          ) : (
            <video
              src={currentTile.url}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-200"
              controls
              autoPlay
              key={currentTile.id}
            />
          )}
          
          {/* Navigation Arrows */}
          {tiles.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-12 w-12 rounded-full backdrop-blur-sm"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-12 w-12 rounded-full backdrop-blur-sm"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
        
      </DialogContent>
    </Dialog>
  );
};
