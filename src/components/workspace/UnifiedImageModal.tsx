
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MediaTile } from '@/types/workspace';
import { ImageModificationService, ModificationSettings } from '@/lib/services/ImageModificationService';
import { useGeneration } from '@/hooks/useGeneration';
import { useFetchImageDetails } from '@/hooks/useFetchImageDetails';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Wand2, 
  Sparkles, 
  Palette, 
  Camera, 
  Download,
  Trash2,
  Minus,
  Copy,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface UnifiedImageModalProps {
  tiles: MediaTile[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onRemoveFromWorkspace?: (tileId: string) => void;
  onDeleteFromLibrary?: (originalAssetId: string) => void;
}

export const UnifiedImageModal = ({
  tiles,
  currentIndex,
  open,
  onClose,
  onIndexChange,
  onRemoveFromWorkspace,
  onDeleteFromLibrary
}: UnifiedImageModalProps) => {
  const currentTile = tiles[currentIndex];
  const { isGenerating } = useGeneration();
  const { fetchDetails, loading, details, reset } = useFetchImageDetails();
  
  // Modification state
  const [isModifying, setIsModifying] = useState(false);
  const [settings, setSettings] = useState<ModificationSettings>({
    positivePrompt: currentTile?.prompt || '',
    negativePrompt: '',
    referenceStrength: 0.6,
    keepSeed: false,
    seed: undefined
  });

  // Reset when tile changes
  useEffect(() => {
    if (currentTile) {
      setSettings({
        positivePrompt: currentTile.prompt,
        negativePrompt: '',
        referenceStrength: 0.6,
        keepSeed: false,
        seed: details?.seed || currentTile.seed
      });
      setIsModifying(false);
    }
  }, [currentTile?.id, details?.seed]);

  // Navigation
  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : tiles.length - 1;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < tiles.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  };

  // Actions
  const handleDownload = async () => {
    try {
      const response = await fetch(currentTile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${currentTile.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const handleModify = async () => {
    if (!settings.positivePrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      await ImageModificationService.modifyImage(currentTile, settings);
      toast.success('Modification started! New version will appear in workspace.');
      setIsModifying(false);
    } catch (error) {
      console.error('❌ Modification failed:', error);
      toast.error(`Failed to modify image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadDetails = () => {
    if (!currentTile.originalAssetId) {
      toast.error('No original asset ID available');
      return;
    }
    fetchDetails(currentTile.originalAssetId);
  };

  const applyPreset = (presetKey: string) => {
    const presets = ImageModificationService.getPresetPromptModifications();
    const preset = presets[presetKey as keyof typeof presets];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        positivePrompt: prev.positivePrompt + preset.prompt
      }));
    }
  };

  if (!currentTile?.url) return null;

  const displaySeed = details?.seed || currentTile.seed || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-black border-none text-white p-0 overflow-hidden">
        <div className="relative w-full h-[95vh] flex">
          {/* Main Image Area - 80% */}
          <div className="flex-1 relative flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Navigation */}
            {tiles.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Position indicator */}
            {tiles.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                {currentIndex + 1} of {tiles.length}
              </div>
            )}

            {/* Image */}
            <img
              src={currentTile.url}
              alt="Generated content"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Control Panel - 20% */}
          <div className="w-80 bg-black/90 border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Image Controls</h3>
                <Button
                  onClick={() => setIsModifying(!isModifying)}
                  size="sm"
                  variant={isModifying ? "default" : "outline"}
                  className="text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {isModifying ? 'Cancel' : 'Modify'}
                </Button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={handleDownload} className="flex-1 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Save
                </Button>
                {onRemoveFromWorkspace && (
                  <Button size="sm" variant="ghost" onClick={() => onRemoveFromWorkspace(currentTile.id)} className="text-xs">
                    <Minus className="w-3 h-3" />
                  </Button>
                )}
                {onDeleteFromLibrary && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onDeleteFromLibrary(currentTile.originalAssetId)}
                    className="text-xs text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isModifying ? (
                <>
                  {/* Quick presets */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Quick Enhance</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <Button variant="outline" size="sm" onClick={() => applyPreset('lighting')} className="text-xs">
                        <Camera className="w-3 h-3 mr-1" />
                        Light
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => applyPreset('style')} className="text-xs">
                        <Palette className="w-3 h-3 mr-1" />
                        Style
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => applyPreset('quality')} className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Quality
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => applyPreset('mood')} className="text-xs">
                        <Wand2 className="w-3 h-3 mr-1" />
                        Mood
                      </Button>
                    </div>
                  </div>

                  {/* Prompt editing */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Modified Prompt</label>
                    <Textarea
                      value={settings.positivePrompt}
                      onChange={(e) => setSettings(prev => ({ ...prev, positivePrompt: e.target.value }))}
                      className="min-h-20 bg-white/5 border-white/20 text-white text-sm"
                      maxLength={4000}
                    />
                  </div>

                  {/* Strength */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">Strength</label>
                      <span className="text-xs text-white/60">{Math.round(settings.referenceStrength * 100)}%</span>
                    </div>
                    <Slider
                      value={[settings.referenceStrength]}
                      onValueChange={([value]) => setSettings(prev => ({ ...prev, referenceStrength: value }))}
                      max={1}
                      min={0.1}
                      step={0.1}
                    />
                  </div>

                  {/* Seed control */}
                  {settings.seed && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.keepSeed}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, keepSeed: checked }))}
                        />
                        <label className="text-sm">Keep Seed</label>
                      </div>
                      <span className="text-xs font-mono">{settings.seed}</span>
                    </div>
                  )}

                  {/* Apply button */}
                  <Button
                    onClick={handleModify}
                    disabled={!settings.positivePrompt.trim() || isGenerating}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Create Modified Version
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Image details */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Seed</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(displaySeed.toString());
                            toast.success(`Seed ${displaySeed} copied`);
                          }}
                          className="text-white/70 hover:text-white p-1 rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {currentTile.originalAssetId && (
                          <button
                            onClick={handleLoadDetails}
                            disabled={loading}
                            className="text-white/70 hover:text-white p-1 rounded"
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
                    <p className="text-sm text-white/80 font-mono">{displaySeed}</p>
                  </div>

                  {/* Quality and model */}
                  <div className="grid grid-cols-2 gap-4">
                    {currentTile.quality && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Quality</h4>
                        <p className="text-sm text-white/80 capitalize">{currentTile.quality}</p>
                      </div>
                    )}
                    {(details?.modelType || currentTile.modelType) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Model</h4>
                        <p className="text-sm text-white/80">{details?.modelType || currentTile.modelType}</p>
                      </div>
                    )}
                  </div>

                  {/* Original prompt */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Original Prompt</h4>
                    <p className="text-sm text-white/70 leading-relaxed">{currentTile.prompt}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
