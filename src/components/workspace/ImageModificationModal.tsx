
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MediaTile } from '@/types/workspace';
import { ImageModificationService, ModificationSettings } from '@/lib/services/ImageModificationService';
import { useGeneration } from '@/hooks/useGeneration';
import { toast } from 'sonner';
import { Loader2, Wand2, Sparkles, Palette, Camera, RotateCcw } from 'lucide-react';

interface ImageModificationModalProps {
  tile: MediaTile;
  originalDetails?: { seed?: number; negativePrompt?: string };
  open: boolean;
  onClose: () => void;
}

export const ImageModificationModal = ({ 
  tile, 
  originalDetails, 
  open, 
  onClose 
}: ImageModificationModalProps) => {
  const { isGenerating } = useGeneration();
  
  const [settings, setSettings] = useState<ModificationSettings>({
    positivePrompt: tile.prompt,
    negativePrompt: originalDetails?.negativePrompt || '',
    referenceStrength: 0.6,
    keepSeed: false,
    seed: originalDetails?.seed
  });

  const [isModified, setIsModified] = useState(false);

  // Track modifications
  useEffect(() => {
    const hasChanges = 
      settings.positivePrompt !== tile.prompt ||
      settings.negativePrompt !== (originalDetails?.negativePrompt || '') ||
      settings.referenceStrength !== 0.6 ||
      settings.keepSeed !== false;
    
    setIsModified(hasChanges);
  }, [settings, tile.prompt, originalDetails?.negativePrompt]);

  const handleModify = async () => {
    if (!settings.positivePrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      await ImageModificationService.modifyImage(tile, settings);
      toast.success('Image modification started! New version will appear in workspace.');
      onClose();
    } catch (error) {
      console.error('❌ Modification failed:', error);
      toast.error(`Failed to modify image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetToOriginal = () => {
    setSettings({
      positivePrompt: tile.prompt,
      negativePrompt: originalDetails?.negativePrompt || '',
      referenceStrength: 0.6,
      keepSeed: false,
      seed: originalDetails?.seed
    });
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

  const setStrengthPreset = (type: 'subtle' | 'moderate' | 'strong') => {
    setSettings(prev => ({
      ...prev,
      referenceStrength: ImageModificationService.getOptimalStrength(type)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-black text-white border-white/20 p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Modify Image
            </h2>
            {isModified && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToOriginal}
                className="text-orange-400 hover:text-orange-300"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Left: Original Image */}
          <div className="flex-1 p-4 border-r border-white/10">
            <div className="h-full flex flex-col">
              <h3 className="text-sm font-medium text-white/70 mb-2">Original</h3>
              <div className="flex-1 flex items-center justify-center bg-white/5 rounded-lg">
                <img
                  src={tile.url}
                  alt="Original"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
              <div className="mt-2 text-xs text-white/50 truncate">
                {tile.prompt}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-80 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">Quick Enhance</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('lighting')}
                    className="text-xs"
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    Lighting
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('style')}
                    className="text-xs"
                  >
                    <Palette className="w-3 h-3 mr-1" />
                    Style
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('quality')}
                    className="text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Quality
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('mood')}
                    className="text-xs"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Mood
                  </Button>
                </div>
              </div>

              {/* Prompt Editing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70">
                    Modified Prompt
                  </label>
                  <span className="text-xs text-white/40">
                    {settings.positivePrompt.length}/4000
                  </span>
                </div>
                <Textarea
                  value={settings.positivePrompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, positivePrompt: e.target.value }))}
                  className="min-h-24 bg-white/5 border-white/20 text-white resize-none"
                  maxLength={4000}
                />
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  Negative Prompt (Optional)
                </label>
                <Textarea
                  value={settings.negativePrompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  className="min-h-16 bg-white/5 border-white/20 text-white resize-none"
                  placeholder="What to avoid in the image..."
                  maxLength={1000}
                />
              </div>

              {/* Reference Strength */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/70">
                    Modification Strength
                  </label>
                  <span className="text-xs text-white/40">
                    {Math.round(settings.referenceStrength * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.referenceStrength]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, referenceStrength: value }))}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="mb-2"
                />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStrengthPreset('subtle')}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    Subtle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStrengthPreset('moderate')}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    Moderate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStrengthPreset('strong')}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    Strong
                  </Button>
                </div>
              </div>

              {/* Seed Control */}
              {settings.seed && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.keepSeed}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, keepSeed: checked }))}
                    />
                    <label className="text-sm text-white/70">
                      Keep Original Seed
                    </label>
                  </div>
                  <span className="text-xs text-white/50 font-mono">
                    {settings.seed}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10">
                <Button
                  onClick={handleModify}
                  disabled={!settings.positivePrompt.trim() || isGenerating}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Modifying...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Create Modified Version
                    </>
                  )}
                </Button>
                {isModified && (
                  <p className="text-xs text-center text-orange-400 mt-2">
                    Modified from original
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
