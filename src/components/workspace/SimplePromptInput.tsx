
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Camera, Video, X, Upload } from 'lucide-react';

export interface SimplePromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  mode: 'image' | 'video';
  onModeChange: (newMode: 'image' | 'video') => void;
  contentType: 'sfw' | 'nsfw';
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  isGenerating: boolean;
  onGenerate: () => void;
  referenceImage: File | null;
  onReferenceImageChange: (file: File | null) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (strength: number) => void;
  beginningRefImage: File | null;
  onBeginningRefImageChange: (file: File | null) => void;
  endingRefImage: File | null;
  onEndingRefImageChange: (file: File | null) => void;
  videoDuration: number;
  onVideoDurationChange: (duration: number) => void;
  motionIntensity: number;
  onMotionIntensityChange: (intensity: number) => void;
  soundEnabled: boolean;
  onSoundToggle: (enabled: boolean) => void;
  aspectRatio: string;
  onAspectRatioChange: (aspectRatio: string) => void;
  shotType: string;
  onShotTypeChange: (shotType: string) => void;
  cameraAngle: string;
  onCameraAngleChange: (angle: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  styleRef: File | null;
  onStyleRefChange: (file: File | null) => void;
  enhancementModel: string;
  onEnhancementModelChange: (model: string) => void;
  modelType: string;
  onModelTypeChange: (model: string) => void;
  exactCopyMode: boolean;
  onExactCopyModeChange: (enabled: boolean) => void;
  useOriginalParams: boolean;
  onUseOriginalParamsChange: (enabled: boolean) => void;
  lockSeed: boolean;
  onLockSeedChange: (locked: boolean) => void;
  referenceMetadata: any;
  onReferenceMetadataChange: (metadata: any) => void;
  workspaceAssets: any[];
  numImages: number;
  onNumImagesChange: (num: number) => void;
  steps: number;
  onStepsChange: (steps: number) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (scale: number) => void;
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;
  compelEnabled: boolean;
  onCompelEnabledChange: (enabled: boolean) => void;
  compelWeights: string;
  onCompelWeightsChange: (weights: string) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
}

export const SimplePromptInput: React.FC<SimplePromptInputProps> = (props) => {
  const {
    prompt,
    onPromptChange,
    mode,
    onModeChange,
    contentType,
    onContentTypeChange,
    quality,
    onQualityChange,
    isGenerating,
    onGenerate,
    referenceImage,
    onReferenceImageChange,
    referenceStrength,
    onReferenceStrengthChange,
    aspectRatio,
    onAspectRatioChange,
    // Accept all other props but only use the main ones for now
    modelType,
    onModelTypeChange,
    seed,
    onSeedChange
  } = props;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate();
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReferenceImageChange(file);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main prompt input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={`Enter prompt for ${mode}...`}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={isGenerating}
            className="flex-1"
          />
          <Button type="submit" disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('image')}
              className="flex items-center gap-1"
            >
              <Camera className="h-3 w-3" />
              Image
            </Button>
            <Button
              type="button"
              variant={mode === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('video')}
              className="flex items-center gap-1"
            >
              <Video className="h-3 w-3" />
              Video
            </Button>
          </div>

          {/* Quality */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quality:</span>
            <Select value={quality} onValueChange={onQualityChange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Content:</span>
            <Select value={contentType} onValueChange={onContentTypeChange}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sfw">SFW</SelectItem>
                <SelectItem value="nsfw">NSFW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Aspect:</span>
            <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Image */}
          <div className="flex items-center gap-2">
            {referenceImage ? (
              <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                <span className="text-xs">{referenceImage.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onReferenceImageChange(null)}
                  className="h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Upload className="h-3 w-3" />
                  Reference
                </div>
              </label>
            )}
            
            {referenceImage && onReferenceStrengthChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Strength:</span>
                <Slider
                  value={[referenceStrength]}
                  onValueChange={(value) => onReferenceStrengthChange(value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-16"
                />
                <span className="text-xs text-muted-foreground w-8">{referenceStrength}%</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
