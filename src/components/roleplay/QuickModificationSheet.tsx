import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Sparkles,
  Edit3,
  Shirt,
  Move,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntensitySelector } from './IntensitySelector';

export interface ModificationPreset {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  promptModifier: string;
  continuityPhrase: string;
  strength: number;
  category: 'clothing' | 'position' | 'intensity' | 'custom';
  nsfwOnly?: boolean;
}

const MODIFICATION_PRESETS: ModificationPreset[] = [
  {
    id: 'remove_top',
    label: 'Remove Top',
    icon: Shirt,
    promptModifier: 'topless, bare chest, removed shirt',
    continuityPhrase: 'maintain same character identity, keep same lighting',
    strength: 0.55,
    category: 'clothing',
    nsfwOnly: true
  },
  {
    id: 'remove_all',
    label: 'Remove Clothing',
    icon: Shirt,
    promptModifier: 'fully nude, no clothes, naked',
    continuityPhrase: 'maintain same character identity, keep same environment',
    strength: 0.65,
    category: 'clothing',
    nsfwOnly: true
  },
  {
    id: 'change_position',
    label: 'Change Position',
    icon: Move,
    promptModifier: 'different pose, new position',
    continuityPhrase: 'maintain same character, subtle change',
    strength: 0.50,
    category: 'position',
    nsfwOnly: false
  },
  {
    id: 'intimate_progression',
    label: 'More Intimate',
    icon: Heart,
    promptModifier: 'more intimate, closer contact',
    continuityPhrase: 'maintain same characters, keep same setting',
    strength: 0.55,
    category: 'intensity',
    nsfwOnly: true
  }
];

interface QuickModificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ModificationPreset, customStrength?: number) => void;
  onCustomEdit: () => void;
  onFreshGeneration: () => void;
  currentSceneImageUrl?: string;
  currentScenePrompt: string;
  contentMode: 'sfw' | 'nsfw';
}

export const QuickModificationSheet: React.FC<QuickModificationSheetProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onCustomEdit,
  onFreshGeneration,
  currentSceneImageUrl,
  currentScenePrompt,
  contentMode
}) => {
  const [generationMode, setGenerationMode] = useState<'modify' | 'fresh'>('modify');
  const [customStrength, setCustomStrength] = useState(0.45);
  const [isLoading, setIsLoading] = useState(false);

  // Filter presets based on content mode
  const availablePresets = MODIFICATION_PRESETS.filter(preset => {
    if (contentMode === 'sfw' && preset.nsfwOnly) {
      return false;
    }
    return true;
  });

  const handlePresetSelect = async (preset: ModificationPreset) => {
    setIsLoading(true);
    try {
      // Build full prompt with Seedream continuity phrase
      const fullPromptModifier = `${preset.promptModifier}. ${preset.continuityPhrase}`;
      await onSelectPreset({
        ...preset,
        promptModifier: fullPromptModifier
      }, customStrength);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreshGeneration = async () => {
    setIsLoading(true);
    try {
      await onFreshGeneration();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomEdit = () => {
    onClose();
    onCustomEdit();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Scene Actions</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Generation Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setGenerationMode('modify')}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                generationMode === 'modify'
                  ? "bg-purple-600/20 border-purple-500"
                  : "bg-card border-border hover:bg-accent"
              )}
            >
              <RefreshCw className={cn(
                "w-6 h-6",
                generationMode === 'modify' ? "text-purple-400" : "text-muted-foreground"
              )} />
              <div className="text-center">
                <div className="font-medium text-sm">Modify Current</div>
                <div className="text-xs text-muted-foreground">I2I Edit</div>
              </div>
            </button>

            <button
              onClick={() => setGenerationMode('fresh')}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                generationMode === 'fresh'
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-card border-border hover:bg-accent"
              )}
            >
              <Sparkles className={cn(
                "w-6 h-6",
                generationMode === 'fresh' ? "text-blue-400" : "text-muted-foreground"
              )} />
              <div className="text-center">
                <div className="font-medium text-sm">Fresh Scene</div>
                <div className="text-xs text-muted-foreground">From Character</div>
              </div>
            </button>
          </div>

          {/* Modify Mode Content */}
          {generationMode === 'modify' && (
            <>
              {/* Quick Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Quick Presets</h4>
                  {contentMode === 'nsfw' && (
                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/50">
                      NSFW
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        "bg-card border-border hover:bg-accent hover:border-purple-500/50",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <preset.icon className="w-5 h-5 text-purple-400 shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm truncate">{preset.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(preset.strength * 100)}% intensity
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Custom Edit Button */}
                  <button
                    onClick={handleCustomEdit}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      "bg-card border-border hover:bg-accent hover:border-blue-500/50",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Edit3 className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm">Custom Edit</div>
                      <div className="text-xs text-muted-foreground">Edit prompt</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Intensity Selector */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <IntensitySelector
                  value={customStrength}
                  onChange={setCustomStrength}
                  disabled={isLoading}
                  showSlider={true}
                />
              </div>

              {/* NSFW Warning for Seedream */}
              {contentMode === 'nsfw' && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Seedream has internal moderation - explicit content may be limited.
                    For fully explicit NSFW, local WAN models work better.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Fresh Mode Content */}
          {generationMode === 'fresh' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  Generate a completely new scene using the character's reference portrait.
                  The current scene will be replaced with a fresh generation.
                </p>
              </div>

              <Button
                onClick={handleFreshGeneration}
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Generate Fresh Scene
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { MODIFICATION_PRESETS };
