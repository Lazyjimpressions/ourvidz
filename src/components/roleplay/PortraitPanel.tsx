import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Sparkles, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresetChipCarousel } from './PresetChipCarousel';
import { 
  POSE_PRESETS, 
  EXPRESSION_PRESETS, 
  OUTFIT_PRESETS,
  type SelectedPresets 
} from '@/data/characterPresets';

interface ModelOption {
  value: string;
  label: string;
  capabilities?: {
    supports_i2i?: boolean;
  };
}

interface PortraitPanelProps {
  imageUrl?: string;
  isGenerating?: boolean;
  isUploading?: boolean;
  presets: SelectedPresets;
  onPresetsChange: (presets: SelectedPresets) => void;
  onGenerate: () => void;
  onUpload: () => void;
  onSelectFromLibrary?: () => void;
  hasReferenceImage?: boolean;
  modelId?: string;
  onModelChange?: (modelId: string) => void;
  modelOptions?: ModelOption[];
  className?: string;
}

export const PortraitPanel: React.FC<PortraitPanelProps> = ({
  imageUrl,
  isGenerating = false,
  isUploading = false,
  presets,
  onPresetsChange,
  onGenerate,
  onUpload,
  onSelectFromLibrary,
  hasReferenceImage = false,
  modelId,
  onModelChange,
  modelOptions = [],
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
        
        {(isGenerating || isUploading) && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                {isUploading ? 'Uploading...' : 'Generating...'}
              </span>
            </div>
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
          disabled={isUploading || isGenerating}
          className="h-8 text-xs gap-1.5"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating || isUploading}
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
            disabled={isGenerating || isUploading}
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

      {/* Model Selector */}
      {modelOptions.length > 0 && onModelChange && (
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Image Model
          </label>
          <Select value={modelId} onValueChange={onModelChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map(model => (
                <SelectItem key={model.value} value={model.value} className="text-xs">
                  {model.label}
                  {model.capabilities?.supports_i2i && ' (I2I)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
