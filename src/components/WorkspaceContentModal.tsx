import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2, RefreshCw, RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaTile } from "@/types/workspace";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { ImageModificationModal } from "@/components/workspace/ImageModificationModal";
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
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Only reset details when switching to a completely different image
  const [lastTileId, setLastTileId] = useState<string>("");
  useEffect(() => {
    if (currentTile?.id !== lastTileId) {
      reset();
      setLastTileId(currentTile?.id || "");
    }
  }, [currentTile?.id, lastTileId, reset]);
  
  // Only keep Escape key for closing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    if (!currentTile.originalAssetId) {
      toast.error('No original asset ID available for this image');
      return;
    }

    fetchDetails(currentTile.originalAssetId);
  };

  const handleCopySeed = () => {
    const seedValue = details?.seed || currentTile.seed || 0;
    navigator.clipboard.writeText(seedValue.toString());
    toast.success(`Seed ${seedValue} copied to clipboard`);
  };

  // Skip rendering if current tile doesn't have URL
  if (!currentTile?.url) {
    return null;
  }

  const canLoadDetails = currentTile.originalAssetId && currentTile.type === 'image';
  const displaySeed = details?.seed || currentTile.seed || 0;

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden">
          {/* Main Content Area */}
          <div className="relative w-full h-[95vh] flex">
            {/* Image/Video Area */}
            <div className={`relative flex items-center justify-center transition-all duration-300 ${
              showInfoPanel ? 'w-[70%]' : 'w-full'
            }`}>
              {/* Single Overlay Controls */}
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity duration-200">
                {/* New Modify Button - Prominent placement */}
                {currentTile.type === 'image' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowModificationModal(true)}
                    className="bg-primary/70 hover:bg-primary/80 text-white p-1.5 backdrop-blur-sm h-7 w-7"
                    title="Modify this image"
                  >
                    <Wand2 className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-7 w-7"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`p-1.5 backdrop-blur-sm h-7 w-7 ${
                    showInfoPanel 
                      ? 'bg-blue-600/70 hover:bg-blue-600/80 text-white' 
                      : 'bg-black/50 hover:bg-black/70 text-white'
                  }`}
                  title="Toggle info panel"
                >
                  <Info className="w-3 h-3" />
                </Button>
                {onRemoveFromWorkspace && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFromWorkspace(currentTile.id)}
                    className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-7 w-7"
                    title="Remove from workspace"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                )}
                {onDeleteFromLibrary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteFromLibrary(currentTile.originalAssetId)}
                    className="bg-red-600/50 hover:bg-red-600/70 text-white p-1.5 backdrop-blur-sm h-7 w-7"
                    title="Delete from library"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Position Indicator */}
              {tiles.length > 1 && (
                <div className="absolute top-2 left-2 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-9 w-9 rounded-full backdrop-blur-sm"
                    title="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-9 w-9 rounded-full backdrop-blur-sm"
                    title="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Info Panel - Simplified since modification moved to dedicated modal */}
            <div className={`absolute right-0 top-0 h-full bg-black/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 ease-in-out ${
              showInfoPanel ? 'w-[30%] translate-x-0' : 'w-[30%] translate-x-full'
            }`}>
              <div className="p-3 h-full overflow-y-auto">
                {/* Compact Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Details</h3>
                  {currentTile.type === 'image' && (
                    <Button
                      onClick={() => setShowModificationModal(true)}
                      size="sm"
                      className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Modify
                    </Button>
                  )}
                </div>

                {/* Seed Row */}
                {currentTile.type === 'image' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-xs font-medium text-white/70 mb-1">Seed</h4>
                        <p className="text-xs text-white font-mono">
                          {loading ? 'Loading...' : displaySeed}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleCopySeed}
                          className="text-white/70 hover:text-white hover:bg-white/10 p-1 h-5 w-5 rounded"
                          title="Copy seed"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {canLoadDetails && (
                          <button
                            onClick={handleLoadDetails}
                            disabled={loading}
                            className="text-white/70 hover:text-white hover:bg-white/10 p-1 h-5 w-5 rounded"
                            title="Refresh seed"
                          >
                            {loading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact Info Grid */}
                <div className="space-y-2 mb-3">
                  {/* Quality and Model Row */}
                  {(currentTile.quality || details?.modelType || currentTile.modelType) && (
                    <div className="grid grid-cols-2 gap-2">
                      {currentTile.quality && (
                        <div>
                          <h4 className="text-xs font-medium text-white/70 mb-0.5">Quality</h4>
                          <p className="text-xs text-white capitalize">{currentTile.quality}</p>
                        </div>
                      )}
                      {(details?.modelType || currentTile.modelType) && (
                        <div>
                          <h4 className="text-xs font-medium text-white/70 mb-0.5">Model</h4>
                          <p className="text-xs text-white">{details?.modelType || currentTile.modelType}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Type and Generation Time Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h4 className="text-xs font-medium text-white/70 mb-0.5">Type</h4>
                      <p className="text-xs text-white capitalize">{currentTile.type}</p>
                    </div>
                    {details?.generationTime && (
                      <div>
                        <h4 className="text-xs font-medium text-white/70 mb-0.5">Gen Time</h4>
                        <p className="text-xs text-white">{details.generationTime.toFixed(2)}s</p>
                      </div>
                    )}
                  </div>

                  {details?.referenceStrength && (
                    <div>
                      <h4 className="text-xs font-medium text-white/70 mb-0.5">Reference Strength</h4>
                      <p className="text-xs text-white">{details.referenceStrength}</p>
                    </div>
                  )}
                </div>

                {/* Original Prompt */}
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-white/70 mb-1">Original Prompt</h4>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {currentTile.prompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modification Modal */}
      {showModificationModal && currentTile.type === 'image' && (
        <ImageModificationModal
          tile={currentTile}
          originalDetails={{
            seed: details?.seed || currentTile.seed,
            negativePrompt: details?.negativePrompt || currentTile.generationParams?.negative_prompt || ''
          }}
          open={showModificationModal}
          onClose={() => setShowModificationModal(false)}
        />
      )}
    </>
  );
};
