import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresetChipCarousel } from './PresetChipCarousel';
import { 
  POSE_PRESETS, 
  EXPRESSION_PRESETS, 
  OUTFIT_PRESETS,
  type SelectedPresets 
} from '@/data/characterPresets';

interface PortraitPanelProps {
  imageUrl?: string;
  isGenerating?: boolean;
  presets: SelectedPresets;
  onPresetsChange: (presets: SelectedPresets) => void;
  onGenerate: () => void;
  onUpload: () => void;
  onSelectFromLibrary?: () => void;
  hasReferenceImage?: boolean;
  className?: string;
}

export const PortraitPanel: React.FC<PortraitPanelProps> = ({
  imageUrl,
  isGenerating = false,
  presets,
  onPresetsChange,
  onGenerate,
  onUpload,
  onSelectFromLibrary,
  hasReferenceImage = false,
  className
}) => {
  const handlePresetChange = (type: keyof SelectedPresets, value: string | undefined) => {
    onPresetsChange({ ...presets, [type]: value });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Portrait Preview */}
      <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-lg overflow-hidden bg-muted/30 border border-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Character portrait"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        
        {isGenerating && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUpload}
          className="h-8 text-xs gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="h-8 text-xs gap-1.5"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Generate
        </Button>
        {onSelectFromLibrary && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelectFromLibrary}
            className="h-8 text-xs gap-1.5"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Library
          </Button>
        )}
      </div>

      {/* Mode Indicator */}
      {hasReferenceImage && (
        <p className="text-xs text-center text-muted-foreground">
          Using reference image for consistency (I2I mode)
        </p>
      )}

      {/* Visual Presets */}
      <div className="space-y-2 pt-2 border-t border-border">
        <PresetChipCarousel
          label="Pose"
          presets={POSE_PRESETS}
          selectedKey={presets.pose}
          onSelect={(key) => handlePresetChange('pose', key)}
        />
        <PresetChipCarousel
          label="Expression"
          presets={EXPRESSION_PRESETS}
          selectedKey={presets.expression}
          onSelect={(key) => handlePresetChange('expression', key)}
        />
        <PresetChipCarousel
          label="Outfit"
          presets={OUTFIT_PRESETS}
          selectedKey={presets.outfit}
          onSelect={(key) => handlePresetChange('outfit', key)}
        />
      </div>
    </div>
  );
};

export default PortraitPanel;
