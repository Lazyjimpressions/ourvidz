import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, X, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2, RefreshCw, RotateCcw, Sparkles, Image } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaTile } from "@/types/workspace";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { useGeneration } from "@/hooks/useGeneration";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WorkspaceContentModalProps {
  tiles: MediaTile[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onRemoveFromWorkspace?: (tileId: string) => void;
  onDeleteFromLibrary?: (originalAssetId: string) => void;
  onUseAsReference?: (tile: MediaTile, referenceType: 'style' | 'composition' | 'character') => void;
}

export const WorkspaceContentModal = ({ 
  tiles, 
  currentIndex, 
  onClose, 
  onIndexChange, 
  onRemoveFromWorkspace, 
  onDeleteFromLibrary,
  onUseAsReference 
}: WorkspaceContentModalProps) => {
  const currentTile = tiles[currentIndex];
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Generation state
  const { generateContent, isGenerating } = useGeneration();
  
  // Editing state
  const [promptText, setPromptText] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [autoNegativePrompt, setAutoNegativePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  
  // Reference state
  const [referenceSet, setReferenceSet] = useState(false);
  
  // Seed management
  const [manualSeed, setManualSeed] = useState('');
  const [seedMode, setSeedMode] = useState<'same' | 'new' | 'manual'>('same');
  
  // Only reset details when switching to a completely different image
  const [lastTileId, setLastTileId] = useState<string>("");
  useEffect(() => {
    if (currentTile?.id !== lastTileId) {
      reset();
      setLastTileId(currentTile?.id || "");
      setPromptText(currentTile?.prompt || '');
      setNegativePrompt('');
      setEnhancedPrompt('');
      setManualSeed('');
      setSeedMode('same');
      setReferenceSet(false);
      
      // Fetch auto-generated negative prompt
      fetchAutoNegativePrompt();
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating) {
          handleGenerate();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tiles.length, showInfoPanel, isGenerating]);

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

  const fetchAutoNegativePrompt = async () => {
    try {
      // This would ideally fetch from the edge function's auto-generated negative prompt
      // For now, using the standard comprehensive negative prompt
      const standardNegative = 'blurry, distorted, low quality, worst quality, jpeg artifacts, watermark, signature, text, logo, deformed, ugly, mutated, extra limbs, bad anatomy, bad proportions, cropped, out of frame';
      setAutoNegativePrompt(standardNegative);
    } catch (error) {
      console.error('Failed to fetch auto negative prompt:', error);
      setAutoNegativePrompt('blurry, distorted, low quality, worst quality');
    }
  };

  const handleEnhancePrompt = async () => {
    if (!promptText.trim()) {
      toast.error('Please enter a prompt to enhance');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: promptText.trim(),
          jobType: currentTile.modelType || 'sdxl_image',
          quality: currentTile.quality || 'fast'
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setEnhancedPrompt(data.enhanced_prompt);
        toast.success('Prompt enhanced successfully');
      } else {
        throw new Error(data?.error || 'Enhancement failed');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUseAsReferenceType = (referenceType: 'style' | 'composition' | 'character') => {
    setReferenceSet(true);
    toast.success(`Set as ${referenceType} reference - ready to generate`);
    // Don't close modal - keep it open for generation
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      // Get the actual seed value
      const actualSeed = currentTile.generationParams?.seed || 
                        currentTile.metadata?.seed || 
                        currentTile.seed || 
                        0;

      // Determine final seed based on mode
      let finalSeed;
      if (seedMode === 'new') {
        finalSeed = undefined; // Let system generate new seed
      } else if (seedMode === 'manual' && manualSeed) {
        finalSeed = parseInt(manualSeed);
      } else {
        finalSeed = actualSeed; // Use same seed
      }

      // Combine negative prompts
      const combinedNegativePrompt = [autoNegativePrompt, negativePrompt]
        .filter(Boolean)
        .join(', ');

      const referenceMetadata = {
        model_variant: 'lustify_sdxl',
        num_images: 1,
        reference_image: referenceSet,
        reference_url: referenceSet ? currentTile.url : undefined,
        reference_type: 'character',
        reference_strength: 0.85,
        character_consistency: true,
        seed: finalSeed,
        negative_prompt: combinedNegativePrompt
      };

      const generationRequest = {
        format: 'sdxl_image_fast' as const,
        prompt: enhancedPrompt || promptText,
        referenceImageUrl: referenceSet ? currentTile.url : undefined,
        metadata: referenceMetadata
      };

      await generateContent(generationRequest);
      toast.success('Generation started! New image will appear in workspace when complete.');
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  // Simple token counting approximation for SDXL (77 token limit)
  const getTokenCount = (text: string): number => {
    if (!text) return 0;
    // Rough approximation: average English word is ~1.3 tokens
    // Split by spaces, punctuation, and common separators
    const words = text.trim().split(/[\s,.\-_!?;:"'()\[\]{}]+/).filter(Boolean);
    return Math.ceil(words.length * 1.3);
  };

  const getTokenColor = (tokenCount: number, limit: number) => {
    const ratio = tokenCount / limit;
    if (ratio <= 0.7) return 'text-green-400';
    if (ratio <= 0.9) return 'text-yellow-400';
    return 'text-red-400';
  };

  const promptTokens = getTokenCount(promptText);
  const enhancedTokens = getTokenCount(enhancedPrompt);
  const autoNegativeTokens = getTokenCount(autoNegativePrompt);
  const userNegativeTokens = getTokenCount(negativePrompt);
  const totalNegativeTokens = autoNegativeTokens + userNegativeTokens;

  // Skip rendering if current tile doesn't have URL
  if (!currentTile?.url) {
    return null;
  }

  const canLoadDetails = currentTile.originalAssetId && currentTile.type === 'image';
  
  // Get actual seed from metadata first, then fallback
  const displaySeed = currentTile.generationParams?.seed || 
                     currentTile.metadata?.seed || 
                     currentTile.seed || 
                     'Unknown';

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
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-8 w-8"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className={`p-1.5 backdrop-blur-sm h-8 w-8 ${
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
                  className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-8 w-8"
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
                  className="bg-red-600/50 hover:bg-red-600/70 text-white p-1.5 backdrop-blur-sm h-8 w-8"
                  title="Delete from library"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="bg-black/50 hover:bg-black/70 text-white p-1.5 backdrop-blur-sm h-8 w-8"
              >
                <X className="w-3 h-3" />
              </Button>
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 rounded-full backdrop-blur-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 rounded-full backdrop-blur-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {/* Info Panel */}
          <div className={`absolute right-0 top-0 h-full bg-black/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 ease-in-out ${
            showInfoPanel ? 'w-[30%] translate-x-0' : 'w-[30%] translate-x-full'
          }`}>
            <div className="p-4 h-full overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Edit & Generate</h3>
                {referenceSet && (
                  <div className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded">
                    Reference Set
                  </div>
                )}
              </div>

              {/* Reference Actions */}
              {currentTile.type === 'image' && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-white/70 mb-2">Use as Reference</h4>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleUseAsReferenceType('character')}
                      className={`text-xs border py-1 px-2 rounded transition ${
                        referenceSet 
                          ? 'border-green-500/50 bg-green-500/20 text-green-400'
                          : 'border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      Character
                    </button>
                    <button
                      onClick={() => handleUseAsReferenceType('style')}
                      className="text-xs border border-white/20 text-white hover:bg-white/10 py-1 px-2 rounded"
                    >
                      Style
                    </button>
                    <button
                      onClick={() => handleUseAsReferenceType('composition')}
                      className="text-xs border border-white/20 text-white hover:bg-white/10 py-1 px-2 rounded"
                    >
                      Layout
                    </button>
                  </div>
                </div>
              )}

              {/* Prompt Section */}
              {currentTile.type === 'image' && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-white/70 mb-2">Prompt</h4>
                  
                  {/* Current Prompt */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/60">Edit Prompt</label>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${getTokenColor(promptTokens, 77)}`}>
                          {promptTokens}/77
                        </span>
                        <button
                          onClick={handleEnhancePrompt}
                          disabled={isEnhancing || !promptText.trim()}
                          className="text-white/70 hover:text-white hover:bg-white/10 p-1 h-5 w-5 rounded"
                          title="Enhance with AI"
                        >
                          {isEnhancing ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-2.5 h-2.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Describe the changes you want to make..."
                      className="min-h-[60px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                    />
                  </div>

                  {/* Enhanced Prompt */}
                  {enhancedPrompt && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-white/60">Enhanced</label>
                        <span className={`text-xs ${getTokenColor(enhancedTokens, 77)}`}>
                          {enhancedTokens}/77
                        </span>
                      </div>
                      <Textarea
                        value={enhancedPrompt}
                        onChange={(e) => setEnhancedPrompt(e.target.value)}
                        className="min-h-[50px] text-xs bg-green-500/5 border-green-500/20 text-white resize-none"
                      />
                    </div>
                  )}

                  {/* Negative Prompt */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/60">
                        Additional Negative Prompt
                      </label>
                      <span className={`text-xs ${getTokenColor(totalNegativeTokens, 77)}`}>
                        Auto: {autoNegativeTokens} + User: {userNegativeTokens} = {totalNegativeTokens}/77
                      </span>
                    </div>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Additional things to avoid..."
                      className="min-h-[35px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
                    />
                    <div className="text-xs text-white/40 mt-1">
                      Auto-generated negatives are included automatically
                    </div>
                  </div>
                </div>
              )}

              {/* Seed Management */}
              {currentTile.type === 'image' && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-white/70 mb-2">Pose Control</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white/60">Current:</span>
                      <span className="text-white font-mono">{displaySeed}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {['same', 'new', 'manual'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setSeedMode(mode as any)}
                          className={`py-1 px-2 rounded capitalize ${
                            seedMode === mode 
                              ? 'bg-white/20 text-white' 
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {mode === 'same' ? 'Same Pose' : mode === 'new' ? 'New Pose' : 'Custom'}
                        </button>
                      ))}
                    </div>
                    
                    {seedMode === 'manual' && (
                      <Input
                        value={manualSeed}
                        onChange={(e) => setManualSeed(e.target.value)}
                        placeholder="Enter seed number..."
                        className="text-xs bg-white/5 border-white/20 text-white h-7"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              {currentTile.type === 'image' && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !promptText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate New Version'
                  )}
                </Button>
              )}

              {/* Load Details Button */}
              {canLoadDetails && (
                <div className="mt-4">
                  <Button
                    onClick={handleLoadDetails}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Info className="w-3 h-3 mr-2" />
                        Load Technical Details
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Basic Info */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-white/60">Quality:</span>
                    <span className="text-white ml-1 capitalize">{currentTile.quality}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Model:</span>
                    <span className="text-white ml-1">{currentTile.modelType}</span>
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
