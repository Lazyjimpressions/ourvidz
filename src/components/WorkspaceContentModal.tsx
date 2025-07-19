
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaTile } from "@/types/workspace";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { useImageRegeneration } from "@/hooks/useImageRegeneration";
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
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Initialize regeneration hook with better fallback handling
  const regeneration = useImageRegeneration(currentTile, {
    seed: details?.seed || currentTile.seed,
    negativePrompt: details?.negativePrompt || currentTile.generationParams?.negative_prompt || ''
  });
  
  // Only reset details when switching to a completely different image
  const [lastTileId, setLastTileId] = useState<string>("");
  useEffect(() => {
    if (currentTile?.id !== lastTileId) {
      reset();
      setLastTileId(currentTile?.id || "");
    }
  }, [currentTile?.id, lastTileId, reset]);
  
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
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (details?.seed || currentTile.seed) {
          handleCopySeed();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (regeneration.canRegenerate && !regeneration.isGenerating) {
          regeneration.regenerateImage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tiles.length, showInfoPanel, details?.seed, currentTile.seed, regeneration]);

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
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="relative w-full h-[95vh] flex">
          {/* Image/Video Area */}
          <div className={`relative flex items-center justify-center transition-all duration-300 ${
            showInfoPanel ? 'w-[70%]' : 'w-full'
          }`}>
            {/* Single Overlay Controls - FIXED: Removed duplicate X button */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-7 w-7"
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
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-9 w-9 rounded-full backdrop-blur-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Info Panel */}
          <div className={`absolute right-0 top-0 h-full bg-black/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 ease-in-out ${
            showInfoPanel ? 'w-[30%] translate-x-0' : 'w-[30%] translate-x-full'
          }`}>
            <div className="p-3 h-full overflow-y-auto">
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Edit & Details</h3>
              </div>

              {/* Prompts Section - Only for images */}
              {currentTile.type === 'image' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-white/70">Prompts</h4>
                    {regeneration.state.isModified && (
                      <button
                        onClick={regeneration.resetToOriginal}
                        className="text-orange-400 hover:text-orange-300 text-xs px-1 py-0.5 rounded"
                        title="Reset to original"
                      >
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Reset
                      </button>
                    )}
                  </div>
                  
                  {/* Positive Prompt */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-white/60">Positive</label>
                      <span className="text-xs text-white/40">
                        {regeneration.state.positivePrompt.length}/4000
                      </span>
                    </div>
                    <Textarea
                      value={regeneration.state.positivePrompt}
                      onChange={(e) => regeneration.updatePrompts({ positivePrompt: e.target.value })}
                      className="min-h-[50px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none p-2"
                      maxLength={4000}
                    />
                  </div>

                  {/* Negative Prompt */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-white/60">Negative</label>
                      <span className="text-xs text-white/40">
                        {regeneration.state.negativePrompt.length}/1000
                      </span>
                    </div>
                    <Textarea
                      value={regeneration.state.negativePrompt}
                      onChange={(e) => regeneration.updatePrompts({ negativePrompt: e.target.value })}
                      className="min-h-[35px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none p-2"
                      maxLength={1000}
                    />
                  </div>

                  {/* Compact Controls Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white/60">Keep Seed</span>
                      <button
                        onClick={() => regeneration.updateSettings({ keepSeed: !regeneration.state.keepSeed })}
                        className={`h-3 w-5 rounded-full border transition-colors ${
                          regeneration.state.keepSeed ? 'bg-white/90 border-white/90' : 'bg-white/10 border-white/30'
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full bg-black transition-transform ${
                          regeneration.state.keepSeed ? 'translate-x-2.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>

                    <button
                      onClick={regeneration.regenerateImage}
                      disabled={!regeneration.canRegenerate || regeneration.isGenerating}
                      className="bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/20 text-white text-xs px-2 py-1 rounded"
                    >
                      {regeneration.isGenerating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
                          Gen...
                        </>
                      ) : (
                        'Regenerate'
                      )}
                    </button>
                  </div>

                  {regeneration.state.isModified && (
                    <p className="text-xs text-orange-400 mb-2 text-center">
                      Modified • Ctrl+Enter to regenerate
                    </p>
                  )}
                </div>
              )}

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

              {/* Keyboard Shortcuts */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 mb-1">Shortcuts</p>
                <div className="text-xs text-white/40 space-y-0.5">
                  <div className="grid grid-cols-2 gap-1">
                    <div>'i' - Toggle panel</div>
                    <div>'c' - Copy seed</div>
                    <div>'←/→' - Navigate</div>
                    <div>'Ctrl+Enter' - Regen</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
