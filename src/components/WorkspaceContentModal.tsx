import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, X, ChevronLeft, ChevronRight, Info, Trash2, Minus, Copy, Loader2, RefreshCw, RotateCcw, Sparkles, Image, ChevronDown, ChevronUp } from "lucide-react";
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
  
  // Reference state - allow multiple active types
  const [activeReferences, setActiveReferences] = useState<Set<'style' | 'composition' | 'character'>>(new Set());
  
  // Seed management
  const [manualSeed, setManualSeed] = useState('');
  const [seedMode, setSeedMode] = useState<'same' | 'new' | 'manual'>('same');
  
  // Technical details display
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
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
      setActiveReferences(new Set());
      setShowTechnicalDetails(false);
      
      // Fetch auto-generated negative prompt
      fetchAutoNegativePrompt();
    }
  }, [currentTile?.id, lastTileId, reset]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // Only allow ESC when typing, disable other shortcuts
      if (isTyping) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      // Normal shortcuts when not typing
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

  // Listen for generation complete events to refresh modal
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type } = event.detail || {};
      
      if (assetId && type === 'image') {
        toast.success('New image generated! Refreshing workspace...');
        // The workspace should handle the refresh, we just provide feedback
      }
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, []);

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

  // Show technical details when they're loaded
  useEffect(() => {
    if (details) {
      setShowTechnicalDetails(true);
    }
  }, [details]);

  const fetchAutoNegativePrompt = async () => {
    try {
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

  const handleToggleReference = (referenceType: 'style' | 'composition' | 'character') => {
    setActiveReferences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(referenceType)) {
        newSet.delete(referenceType);
        if (newSet.size === 0) {
          toast.info(`${referenceType} reference removed`);
        } else {
          toast.info(`${referenceType} reference removed - ${Array.from(newSet).join(', ')} still active`);
        }
      } else {
        newSet.add(referenceType);
        toast.success(`${referenceType} reference added - combining with ${Array.from(newSet).join(', ')}`);
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (activeReferences.size === 0) {
      toast.error('Please set at least one reference type');
      return;
    }

    try {
      // Get the actual seed value
      const actualSeed = currentTile.generationParams?.seed || 
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

      // Use the primary reference type (first one selected)
      const primaryReferenceType = Array.from(activeReferences)[0];

      const referenceMetadata = {
        model_variant: 'lustify_sdxl',
        num_images: 1,
        reference_image: true,
        reference_url: currentTile.url,
        reference_type: primaryReferenceType as 'style' | 'composition' | 'character',
        reference_strength: 0.85,
        character_consistency: activeReferences.has('character'),
        composition_consistency: activeReferences.has('composition'),
        style_consistency: activeReferences.has('style'),
        seed: finalSeed,
        negative_prompt: combinedNegativePrompt
      };

      const generationRequest = {
        format: 'sdxl_image_fast' as const,
        prompt: enhancedPrompt || promptText,
        referenceImageUrl: currentTile.url,
        metadata: referenceMetadata
      };

      await generateContent(generationRequest);
      
      const activeTypesText = Array.from(activeReferences).join(' + ');
      toast.success(`Generation started with ${activeTypesText} reference! New image will appear in workspace when complete.`);
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage);
    }
  };

  // Simple token counting approximation for SDXL (77 token limit)
  const getTokenCount = (text: string): number => {
    if (!text) return 0;
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
  
  // Get actual seed from generationParams or direct seed property
  const displaySeed = currentTile.generationParams?.seed || 
                     currentTile.seed || 
                     'Unknown';

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden">
        {/* Main Content Area - Fixed height to prevent collapse */}
        <div className="relative w-full h-[95vh] flex min-h-[600px]">
          {/* Image/Video Area */}
          <div className={`relative flex items-center justify-center transition-all duration-300 ${
            showInfoPanel ? 'w-[70%] min-w-[400px]' : 'w-full'
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

          {/* Info Panel - Fixed width and height */}
          <div className={`absolute right-0 top-0 h-full bg-black/90 backdrop-blur-md border-l border-white/10 transition-all duration-300 ease-in-out ${
            showInfoPanel ? 'w-[30%] min-w-[350px] translate-x-0' : 'w-[30%] translate-x-full'
          }`}>
            <div className="p-4 h-full overflow-y-auto min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Edit & Generate</h3>
                {activeReferences.size > 0 && (
                  <div className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded">
                    {Array.from(activeReferences).join(' + ')}
                  </div>
                )}
              </div>

              {/* Reference Actions */}
              {currentTile.type === 'image' && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-white/70 mb-2">Reference Types</h4>
                  <div className="text-xs text-white/50 mb-2">
                    Select multiple for better scene preservation
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { type: 'character' as const, desc: 'Preserves person/subject' },
                      { type: 'composition' as const, desc: 'Preserves layout/pose' },
                      { type: 'style' as const, desc: 'Preserves artistic style' }
                    ].map(({ type, desc }) => (
                      <button
                        key={type}
                        onClick={() => handleToggleReference(type)}
                        className={`text-xs border py-2 px-3 rounded transition text-left ${
                          activeReferences.has(type)
                            ? 'border-green-500/50 bg-green-500/20 text-green-400'
                            : 'border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium capitalize">{type}</div>
                        <div className="text-white/60">{desc}</div>
                      </button>
                    ))}
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
                      className="min-h-[80px] max-h-[120px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
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
                        className="min-h-[60px] max-h-[100px] text-xs bg-green-500/5 border-green-500/20 text-white resize-none"
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
                      className="min-h-[40px] max-h-[80px] text-xs bg-white/5 border-white/20 text-white placeholder:text-white/40 resize-none"
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
                  disabled={isGenerating || !promptText.trim() || activeReferences.size === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-4"
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

              {/* Technical Details Section */}
              {details && (
                <div className="mb-4 border-t border-white/10 pt-4">
                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="flex items-center justify-between w-full text-xs font-medium text-white/70 mb-2 hover:text-white"
                  >
                    <span>Technical Details</span>
                    {showTechnicalDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  
                  {showTechnicalDetails && (
                    <div className="space-y-2 text-xs">
                      {details.seed && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Original Seed:</span>
                          <span className="text-white font-mono">{details.seed}</span>
                        </div>
                      )}
                      {details.negativePrompt && (
                        <div>
                          <span className="text-white/60">Original Negative:</span>
                          <div className="text-white/80 mt-1 p-2 bg-white/5 rounded text-xs">
                            {details.negativePrompt}
                          </div>
                        </div>
                      )}
                      {details.modelType && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Model:</span>
                          <span className="text-white">{details.modelType}</span>
                        </div>
                      )}
                      {details.generationTime && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Generation Time:</span>
                          <span className="text-white">{details.generationTime}s</span>
                        </div>
                      )}
                      {details.referenceStrength && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Reference Strength:</span>
                          <span className="text-white">{details.referenceStrength}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Load Details Button */}
              {canLoadDetails && (
                <div className="mb-4">
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
              <div className="space-y-2 text-xs">
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
