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
    strength: 0.35, // ✅ Adjusted to match plan (was 0.55)
    category: 'clothing',
    nsfwOnly: true
  },
  {
    id: 'remove_all',
    label: 'Remove Clothing',
    icon: Shirt,
    promptModifier: 'fully nude, no clothes, naked',
    continuityPhrase: 'maintain same character identity, keep same environment',
    strength: 0.45, // ✅ Adjusted to match plan (was 0.65)
    category: 'clothing',
    nsfwOnly: true
  },
  {
    id: 'change_position',
    label: 'Change Position',
    icon: Move,
    promptModifier: 'different pose, new position',
    continuityPhrase: 'maintain same character, subtle change',
    strength: 0.40, // ✅ Adjusted to match plan (was 0.50)
    category: 'position',
    nsfwOnly: false
  },
  {
    id: 'intimate_progression',
    label: 'More Intimate',
    icon: Heart,
    promptModifier: 'more intimate, closer contact',
    continuityPhrase: 'maintain same characters, keep same setting',
    strength: 0.30, // ✅ Adjusted to match plan (was 0.55)
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
      // ✅ FIX: Use customStrength from slider if user adjusted it, otherwise use preset strength
      const strengthToUse = customStrength !== 0.45 ? customStrength : preset.strength;
      await onSelectPreset({
        ...preset,
        promptModifier: fullPromptModifier
      }, strengthToUse);
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
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left text-base">Scene Actions</SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          {/* Generation Mode Toggle - More Compact */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setGenerationMode('modify')}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                generationMode === 'modify'
                  ? "bg-purple-600/20 border-purple-500"
                  : "bg-card border-border hover:bg-accent"
              )}
            >
              <RefreshCw className={cn(
                "w-4 h-4 shrink-0",
                generationMode === 'modify' ? "text-purple-400" : "text-muted-foreground"
              )} />
              <div className="text-left min-w-0">
                <div className="font-medium text-xs">Modify</div>
                <div className="text-[10px] text-muted-foreground">I2I Edit</div>
              </div>
            </button>

            <button
              onClick={() => setGenerationMode('fresh')}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                generationMode === 'fresh'
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-card border-border hover:bg-accent"
              )}
            >
              <Sparkles className={cn(
                "w-4 h-4 shrink-0",
                generationMode === 'fresh' ? "text-blue-400" : "text-muted-foreground"
              )} />
              <div className="text-left min-w-0">
                <div className="font-medium text-xs">Fresh</div>
                <div className="text-[10px] text-muted-foreground">From Character</div>
              </div>
            </button>
          </div>

          {/* Modify Mode Content */}
          {generationMode === 'modify' && (
            <>
              {/* Quick Presets - More Compact */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium">Quick Presets</h4>
                  {contentMode === 'nsfw' && (
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/50 px-1.5 py-0">
                      NSFW
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {availablePresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-colors",
                        "bg-card border-border hover:bg-accent hover:border-purple-500/50",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <preset.icon className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{preset.label}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {Math.round(preset.strength * 100)}%
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Custom Edit Button */}
                  <button
                    onClick={handleCustomEdit}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border transition-colors",
                      "bg-card border-border hover:bg-accent hover:border-blue-500/50",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Edit3 className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-xs">Custom</div>
                      <div className="text-[10px] text-muted-foreground">Edit prompt</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Intensity Selector - More Compact */}
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <IntensitySelector
                  value={customStrength}
                  onChange={setCustomStrength}
                  disabled={isLoading}
                  showSlider={true}
                />
              </div>

              {/* NSFW Warning - More Compact */}
              {contentMode === 'nsfw' && (
                <div className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300 leading-relaxed">
                    Seedream has moderation limits. For explicit NSFW, use local WAN models.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Fresh Mode Content - More Compact */}
          {generationMode === 'fresh' && (
            <div className="space-y-2">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300 leading-relaxed">
                  Generate a new scene from character reference. Current scene will be replaced.
                </p>
              </div>

              <Button
                onClick={handleFreshGeneration}
                disabled={isLoading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
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
