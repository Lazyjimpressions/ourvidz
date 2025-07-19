
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaTile } from "@/types/workspace";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { toast } from "sonner";

interface WorkspaceContentModalProps {
  tiles: MediaTile[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onRemoveFromWorkspace?: (tileId: string) => void;
  onDeleteFromLibrary?: (originalAssetId: string) => void;
}

export const WorkspaceContentModal = ({ tiles, currentIndex, onClose, onIndexChange, onRemoveFromWorkspace, onDeleteFromLibrary }: WorkspaceContentModalProps) => {
  const currentTile = tiles[currentIndex];
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Reset details when tile changes
  useEffect(() => {
    reset();
  }, [currentTile?.id, reset]);
  
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
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowInfoPanel(!showInfoPanel);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tiles.length, showInfoPanel]);

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

  const handleLoadDetails = () => {
    if (currentTile.originalAssetId) {
      fetchDetails(currentTile.originalAssetId);
    }
  };

  const handleCopySeed = () => {
    if (details?.seed) {
      navigator.clipboard.writeText(details.seed.toString());
      toast.success('Seed copied to clipboard');
    }
  };

  // Skip rendering if current tile doesn't have URL
  if (!currentTile?.url) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="relative w-full h-[95vh] flex">
          {/* Image/Video Area */}
          <div className={`relative flex items-center justify-center transition-all duration-300 ${
            showInfoPanel ? 'w-[70%]' : 'w-full'
          }`}>
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
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-2 backdrop-blur-sm ${
                  showInfoPanel 
                    ? 'bg-blue-600/70 hover:bg-blue-600/80 text-white' 
                    : 'bg-black/50 hover:bg-black/70 text-white'
                }`}
              >
                <Info className="w-4 h-4" />
              </Button>
              {onRemoveFromWorkspace && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFromWorkspace(currentTile.id)}
                  className="bg-black/50 hover:bg-black/70 text-white p-2 backdrop-blur-sm"
                  title="Remove from workspace"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              )}
              {onDeleteFromLibrary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteFromLibrary(currentTile.originalAssetId)}
                  className="bg-red-600/50 hover:bg-red-600/70 text-white p-2 backdrop-blur-sm"
                  title="Delete from library"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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

            {/* Media Content */}
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

          {/* Info Panel */}
          <div className={`absolute right-0 top-0 h-full bg-black/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 ease-in-out ${
            showInfoPanel ? 'w-[30%] translate-x-0' : 'w-[30%] translate-x-full'
          }`}>
            <div className="p-6 h-full overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfoPanel(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Prompt */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/70 mb-2">Prompt</h4>
                <p className="text-sm text-white leading-relaxed">{currentTile.prompt}</p>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                {currentTile.quality && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Quality</h4>
                    <p className="text-sm text-white capitalize">{currentTile.quality}</p>
                  </div>
                )}
                
                {currentTile.modelType && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Model</h4>
                    <p className="text-sm text-white">{currentTile.modelType}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-1">Type</h4>
                  <p className="text-sm text-white capitalize">{currentTile.type}</p>
                </div>
              </div>

              {/* Generation Details */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-white/70">Generation Details</h4>
                  {!details && !loading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadDetails}
                      className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Load Details
                    </Button>
                  )}
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-white/70">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading details...</span>
                  </div>
                )}

                {details && (
                  <div className="space-y-3">
                    {details.seed && (
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-medium text-white/70">Seed</h5>
                          <p className="text-sm text-white font-mono">{details.seed}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopySeed}
                          className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {details.generationTime && (
                      <div>
                        <h5 className="text-xs font-medium text-white/70">Generation Time</h5>
                        <p className="text-sm text-white">{details.generationTime.toFixed(2)}s</p>
                      </div>
                    )}
                    
                    {details.negativePrompt && (
                      <div>
                        <h5 className="text-xs font-medium text-white/70">Negative Prompt</h5>
                        <p className="text-sm text-white/90 leading-relaxed">{details.negativePrompt}</p>
                      </div>
                    )}
                    
                    {details.referenceStrength && (
                      <div>
                        <h5 className="text-xs font-medium text-white/70">Reference Strength</h5>
                        <p className="text-sm text-white">{details.referenceStrength}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Keyboard Shortcut Hint */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-white/50">Press 'i' to toggle this panel</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
