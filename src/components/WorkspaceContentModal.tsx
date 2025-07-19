import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, X, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
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
  const [showInfoPanel, setShowInfoPanel] = useState(true); // Default to open
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Initialize regeneration hook
  const regeneration = useImageRegeneration(currentTile, {
    seed: details?.seed || currentTile.seed,
    negativePrompt: details?.negativePrompt
  });
  
  console.log('🎭 WORKSPACE MODAL RENDER:', {
    currentTileId: currentTile?.id,
    originalAssetId: currentTile?.originalAssetId,
    type: currentTile?.type,
    showInfoPanel,
    hasDetails: !!details
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
        if (details?.seed) {
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
  }, [currentIndex, tiles.length, showInfoPanel, details?.seed, regeneration]);

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
    console.log('🔍 LOAD DETAILS CLICKED:', {
      currentTileId: currentTile.id,
      originalAssetId: currentTile.originalAssetId,
      tileData: currentTile
    });

    if (!currentTile.originalAssetId) {
      console.error('❌ No originalAssetId available for tile:', currentTile.id);
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
                <h3 className="text-lg font-semibold text-white">Details & Edit</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfoPanel(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Prompts Section - Only for images */}
              {currentTile.type === 'image' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white/70">Prompts</h4>
                    {regeneration.state.isModified && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={regeneration.resetToOriginal}
                        className="text-orange-400 hover:text-orange-300 hover:bg-white/10 p-1 text-xs"
                        title="Reset to original"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  {/* Positive Prompt */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/60">Positive Prompt</label>
                      <span className="text-xs text-white/40">
                        {regeneration.state.positivePrompt.length}/4000
                      </span>
                    </div>
                    <Textarea
                      value={regeneration.state.positivePrompt}
                      onChange={(e) => regeneration.updatePrompts({ positivePrompt: e.target.value })}
                      placeholder="Describe what you want to see..."
                      className="min-h-[80px] text-sm bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                      maxLength={4000}
                    />
                  </div>

                  {/* Negative Prompt */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white/60">Negative Prompt</label>
                      <span className="text-xs text-white/40">
                        {regeneration.state.negativePrompt.length}/1000
                      </span>
                    </div>
                    <Textarea
                      value={regeneration.state.negativePrompt}
                      onChange={(e) => regeneration.updatePrompts({ negativePrompt: e.target.value })}
                      placeholder="Describe what you don't want to see..."
                      className="min-h-[60px] text-sm bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                      maxLength={1000}
                    />
                  </div>

                  {/* Keep Seed Toggle */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-white/60">Keep Seed</label>
                      <button
                        onClick={() => regeneration.updateSettings({ keepSeed: !regeneration.state.keepSeed })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          regeneration.state.keepSeed ? 'bg-blue-600' : 'bg-white/20'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          regeneration.state.keepSeed ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      {regeneration.state.keepSeed 
                        ? 'Will use original seed for consistent composition' 
                        : 'Will generate with random seed for new composition'
                      }
                    </p>
                  </div>

                  {/* Regenerate Button */}
                  <Button
                    onClick={regeneration.regenerateImage}
                    disabled={!regeneration.canRegenerate || regeneration.isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2"
                  >
                    {regeneration.isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate Image
                      </>
                    )}
                  </Button>

                  {regeneration.state.isModified && (
                    <p className="text-xs text-orange-400 mt-2 text-center">
                      Prompts modified • Press Ctrl+Enter to regenerate
                    </p>
                  )}
                </div>
              )}

              {/* Static Seed Field with Refresh */}
              {currentTile.type === 'image' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white/70">Seed</h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySeed}
                        className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                        title="Copy seed (or press 'c')"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {canLoadDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadDetails}
                          disabled={loading}
                          className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                          title="Refresh seed"
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white font-mono">
                    {loading ? 'Loading...' : displaySeed}
                  </p>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                {currentTile.quality && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Quality</h4>
                    <p className="text-sm text-white capitalize">{currentTile.quality}</p>
                  </div>
                )}
                
                {(currentTile.modelType || details?.modelType) && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Model</h4>
                    <p className="text-sm text-white">{details?.modelType || currentTile.modelType}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-1">Type</h4>
                  <p className="text-sm text-white capitalize">{currentTile.type}</p>
                </div>

                {details?.generationTime && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Generation Time</h4>
                    <p className="text-sm text-white">{details.generationTime.toFixed(2)}s</p>
                  </div>
                )}

                {details?.negativePrompt && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Negative Prompt</h4>
                    <p className="text-sm text-white/90 leading-relaxed">{details.negativePrompt}</p>
                  </div>
                )}

                {details?.referenceStrength && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-1">Reference Strength</h4>
                    <p className="text-sm text-white">{details.referenceStrength}</p>
                  </div>
                )}

                {/* Debug Info (only in development) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-white/5 rounded border border-white/10">
                    <h4 className="text-xs font-medium text-white/50 mb-2">Debug Info</h4>
                    <div className="text-xs text-white/40 space-y-1">
                      <div>Tile ID: {currentTile.id}</div>
                      <div>Original Asset ID: {currentTile.originalAssetId || 'None'}</div>
                      <div>Can Load Details: {canLoadDetails ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-white/50 mb-2">Keyboard Shortcuts</p>
                <div className="text-xs text-white/40 space-y-1">
                  <div>'i' - Toggle info panel</div>
                  <div>'c' - Copy seed</div>
                  <div>'←/→' - Navigate images</div>
                  <div>'Ctrl+Enter' - Regenerate</div>
                  <div>'Esc' - Close lightbox</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
