import React, { useMemo } from 'react';
import { X, Upload, Image, Copy, Settings2, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MobileReferenceImagePreview } from './MobileReferenceImagePreview';
import { cn } from '@/lib/utils';

// Model capability types from api_models table
interface ModelCapabilities {
  steps?: boolean;
  guidance_scale?: boolean;
  seed_control?: boolean;
  negative_prompt?: boolean;
  supports_i2i?: boolean;
  reference_images?: boolean;
}

export interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  
  // Mode
  currentMode: 'image' | 'video';
  
  // Model Selection
  selectedModel: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string } | null;
  onModelChange: (model: { id: string; type: 'sdxl' | 'replicate' | 'fal'; display_name: string }) => void;
  imageModels?: Array<{ id: string; display_name: string; provider_name: string; capabilities?: ModelCapabilities }>;
  videoModels?: Array<{ id: string; display_name: string; api_providers: { name: string } }>;
  modelsLoading?: boolean;
  
  // Quality
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  
  // Aspect Ratio
  aspectRatio: '16:9' | '1:1' | '9:16';
  onAspectRatioChange: (ratio: '16:9' | '1:1' | '9:16') => void;
  
  // Content Type
  contentType: 'sfw' | 'nsfw';
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  
  // Reference Image (Image Mode)
  referenceImage?: File | null;
  referenceImageUrl?: string | null;
  onReferenceImageSelect?: () => void;
  onReferenceImageRemove?: () => void;
  
  // Copy Mode (consolidated)
  exactCopyMode?: boolean;
  onExactCopyModeChange?: (mode: boolean) => void;
  
  // Reference Strength
  referenceStrength?: number;
  onReferenceStrengthChange?: (strength: number) => void;
  
  // Video Reference Images
  beginningRefImage?: File | null;
  beginningRefImageUrl?: string | null;
  endingRefImage?: File | null;
  endingRefImageUrl?: string | null;
  onStartFrameSelect?: () => void;
  onEndFrameSelect?: () => void;
  onStartFrameRemove?: () => void;
  onEndFrameRemove?: () => void;
  
  // Video model settings
  videoReferenceMode?: 'single' | 'dual' | 'video';
  
  // Video Extend settings
  extendStrength?: number;
  onExtendStrengthChange?: (strength: number) => void;
  extendReverseVideo?: boolean;
  onExtendReverseVideoChange?: (reverse: boolean) => void;
  
  // Workspace Actions
  onClearWorkspace?: () => void;
  onDeleteAllWorkspace?: () => void;
  
  // Creative Direction (Image mode)
  shotType?: 'wide' | 'medium' | 'close';
  onShotTypeChange?: (type: 'wide' | 'medium' | 'close') => void;
  cameraAngle?: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye';
  onCameraAngleChange?: (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => void;
  style?: string;
  onStyleChange?: (style: string) => void;
  enhancementModel?: 'qwen_base' | 'qwen_instruct' | 'none';
  onEnhancementModelChange?: (model: 'qwen_base' | 'qwen_instruct' | 'none') => void;
  
  // Video Controls
  videoDuration?: number;
  onVideoDurationChange?: (duration: number) => void;
  videoDurationOptions?: number[];
  motionIntensity?: number;
  onMotionIntensityChange?: (intensity: number) => void;
}

export const MobileSettingsSheet: React.FC<MobileSettingsSheetProps> = ({
  open,
  onClose,
  currentMode,
  selectedModel,
  onModelChange,
  imageModels = [],
  videoModels = [],
  modelsLoading = false,
  quality,
  onQualityChange,
  aspectRatio,
  onAspectRatioChange,
  contentType,
  onContentTypeChange,
  referenceImage,
  referenceImageUrl,
  onReferenceImageSelect,
  onReferenceImageRemove,
  exactCopyMode = false,
  onExactCopyModeChange,
  referenceStrength = 0.8,
  onReferenceStrengthChange,
  beginningRefImage,
  beginningRefImageUrl,
  endingRefImage,
  endingRefImageUrl,
  onStartFrameSelect,
  onEndFrameSelect,
  onStartFrameRemove,
  onEndFrameRemove,
  videoReferenceMode = 'single',
  onClearWorkspace,
  onDeleteAllWorkspace,
  extendStrength = 1.0,
  onExtendStrengthChange,
  extendReverseVideo = false,
  onExtendReverseVideoChange,
  shotType = 'wide',
  onShotTypeChange,
  cameraAngle = 'eye_level',
  onCameraAngleChange,
  style = '',
  onStyleChange,
  enhancementModel = 'qwen_instruct',
  onEnhancementModelChange,
  videoDuration = 5,
  onVideoDurationChange,
  videoDurationOptions = [],
  motionIntensity = 0.5,
  onMotionIntensityChange,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  // Determine if current model is local (SDXL/WAN) for advanced settings
  const isLocalModel = useMemo(() => {
    return selectedModel?.type === 'sdxl' || 
           selectedModel?.id === 'sdxl' || 
           selectedModel?.id === 'wan';
  }, [selectedModel]);
  
  // Determine which advanced features to show
  const showAdvancedSettings = isLocalModel;
  
  // Has reference image
  const hasReference = !!(referenceImage || referenceImageUrl);
  const hasStartFrame = !!(beginningRefImage || beginningRefImageUrl);
  const hasEndFrame = !!(endingRefImage || endingRefImageUrl);
  
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        {/* Compact Header */}
        <DrawerHeader className="flex items-center justify-between border-b py-2 px-3">
          <DrawerTitle className="flex items-center gap-1.5 text-sm">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        
        {/* Scrollable Content - Compact */}
        <div className="overflow-y-auto px-3 py-2 space-y-3">
          {/* Model Selection - Compact */}
          <div className="space-y-1">
            <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
              Model
            </label>
            <Select
              value={selectedModel?.id || ''}
              onValueChange={(modelId) => {
                if (currentMode === 'image') {
                  if (modelId === 'sdxl') {
                    onModelChange({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
                  } else {
                    const apiModel = imageModels.find(m => m.id === modelId);
                    if (apiModel) {
                      onModelChange({
                        id: apiModel.id,
                        type: apiModel.provider_name as 'replicate' | 'fal',
                        display_name: apiModel.display_name
                      });
                    }
                  }
                } else {
                  if (modelId === 'wan') {
                    onModelChange({ id: 'wan', type: 'sdxl', display_name: 'WAN' });
                  } else {
                    const apiModel = videoModels.find(m => m.id === modelId);
                    if (apiModel) {
                      onModelChange({
                        id: apiModel.id,
                        type: apiModel.api_providers.name as 'replicate' | 'fal',
                        display_name: apiModel.display_name
                      });
                    }
                  }
                }
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-background">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                {currentMode === 'image' ? (
                  <>
                    <SelectItem value="sdxl">SDXL (Local)</SelectItem>
                    {!modelsLoading && imageModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.display_name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    <SelectItem value="wan">WAN (Local)</SelectItem>
                    {!modelsLoading && videoModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.display_name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Quick Settings - 2 column grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Resolution (was Quality) */}
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Resolution
              </label>
              <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
                {([
                  { value: 'fast' as const, label: 'Standard' },
                  { value: 'high' as const, label: 'HD' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onQualityChange(value)}
                    className={cn(
                      "flex-1 px-2 py-1 text-[10px] font-medium transition-colors",
                      quality === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Content Type */}
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Content
              </label>
              <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
                {(['sfw', 'nsfw'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onContentTypeChange(t)}
                    className={cn(
                      "flex-1 px-2 py-1 text-[10px] font-medium uppercase transition-colors",
                      contentType === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Aspect Ratio - Compact pills */}
          <div className="space-y-1">
            <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
              Aspect Ratio
            </label>
            <div className="flex items-center gap-1.5">
              {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onAspectRatioChange(ratio)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
                    aspectRatio === ratio
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {ratio === '1:1' && <span className="w-2.5 h-2.5 border border-current rounded-[1px]" />}
                  {ratio === '16:9' && <span className="w-3 h-2 border border-current rounded-[1px]" />}
                  {ratio === '9:16' && <span className="w-2 h-3 border border-current rounded-[1px]" />}
                  {ratio}
                </button>
              ))}
            </div>
          </div>
          
          {/* Creative Direction (Image mode only) */}
          {currentMode === 'image' && (
            <div className="space-y-2 p-2 rounded-lg border bg-muted/30">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Creative Direction
              </label>
              
              {/* Shot Type */}
              {onShotTypeChange && (
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">Shot Type</span>
                  <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
                    {([
                      { value: 'wide' as const, label: 'Wide' },
                      { value: 'medium' as const, label: 'Medium' },
                      { value: 'close' as const, label: 'Close' },
                    ]).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onShotTypeChange(value)}
                        className={cn(
                          "flex-1 px-2 py-1 text-[10px] font-medium transition-colors",
                          shotType === value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Camera Angle */}
              {onCameraAngleChange && (
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">Camera Angle</span>
                  <Select
                    value={cameraAngle}
                    onValueChange={(v) => onCameraAngleChange(v as any)}
                  >
                    <SelectTrigger className="w-full h-7 text-[10px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[100]">
                      <SelectItem value="eye_level">Eye Level</SelectItem>
                      <SelectItem value="low_angle">Low Angle</SelectItem>
                      <SelectItem value="over_shoulder">Over Shoulder</SelectItem>
                      <SelectItem value="overhead">Overhead</SelectItem>
                      <SelectItem value="bird_eye">Bird's Eye</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Style */}
              {onStyleChange && (
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">Style</span>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => onStyleChange(e.target.value)}
                    placeholder="cinematic lighting, film grain..."
                    className="w-full h-7 px-2 text-[10px] rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}
              
              {/* Enhancement */}
              {onEnhancementModelChange && (
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">Enhancement</span>
                  <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
                    {([
                      { value: 'qwen_instruct' as const, label: 'Auto' },
                      { value: 'qwen_base' as const, label: 'Base' },
                      { value: 'none' as const, label: 'None' },
                    ]).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onEnhancementModelChange(value)}
                        className={cn(
                          "flex-1 px-2 py-1 text-[10px] font-medium transition-colors",
                          enhancementModel === value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Video Controls (Video mode only) */}
          {currentMode === 'video' && (onVideoDurationChange || onMotionIntensityChange) && (
            <div className="space-y-2 p-2 rounded-lg border bg-muted/30">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Video Controls
              </label>
              
              {/* Duration */}
              {onVideoDurationChange && videoDurationOptions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Duration</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{videoDuration}s</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {videoDurationOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onVideoDurationChange(d)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-medium rounded-md border transition-colors min-w-[32px]",
                          videoDuration === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Motion Intensity */}
              {onMotionIntensityChange && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Motion Intensity</span>
                    <span className="font-mono">{motionIntensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={motionIntensity}
                    onChange={(e) => onMotionIntensityChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Reference Image (Image Mode) - Compact */}
          {currentMode === 'image' && (
            <div className="space-y-1.5 p-2 rounded-lg border bg-muted/30">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Reference Image
              </label>
              
              {hasReference ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MobileReferenceImagePreview
                      key={referenceImageUrl || referenceImage?.name || 'ref-single'}
                      file={referenceImage}
                      imageUrl={referenceImageUrl}
                      onRemove={onReferenceImageRemove}
                      sizeClass="h-10 w-10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium truncate">
                        {referenceImage?.name || 'Reference set'}
                      </div>
                      {referenceImage && (
                        <div className="text-[9px] text-muted-foreground">
                          {(referenceImage.size / 1024).toFixed(0)}KB
                        </div>
                      )}
                    </div>
                    
                    {onExactCopyModeChange && (
                      <button
                        type="button"
                        onClick={() => onExactCopyModeChange(!exactCopyMode)}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors",
                          exactCopyMode
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border"
                        )}
                      >
                        <Copy className="h-3 w-3" />
                        COPY
                      </button>
                    )}
                  </div>
                  
                  {/* Strength - Compact range input */}
                  {!exactCopyMode && onReferenceStrengthChange && (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Variation: {Math.round((1 - referenceStrength) * 100)}%</span>
                        <span className="font-mono">{referenceStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        value={referenceStrength}
                        onChange={(e) => onReferenceStrengthChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReferenceImageSelect}
                  className="w-full h-8 gap-1.5 text-[10px]"
                >
                  <Upload className="h-3 w-3" />
                  Add Reference Image
                </Button>
              )}
            </div>
          )}
          
          {/* Video Reference Frames - Compact */}
          {currentMode === 'video' && (
            <div className="space-y-1.5 p-2 rounded-lg border bg-muted/30">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                {videoReferenceMode === 'video' ? 'Video Source' : videoReferenceMode === 'single' ? 'Reference Image' : 'Reference Frames'}
              </label>
              
              {videoReferenceMode === 'video' ? (
                <div className="space-y-2">
                  {hasStartFrame ? (
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <Image className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium truncate">Video source set</div>
                      </div>
                      <button
                        type="button"
                        onClick={onStartFrameRemove}
                        className="text-[9px] text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onStartFrameSelect}
                      className="w-full h-8 gap-1.5 text-[10px]"
                    >
                      <Upload className="h-3 w-3" />
                      Add Video Source
                    </Button>
                  )}
                  
                  {/* Extend Strength - Compact */}
                  {onExtendStrengthChange && (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Strength</span>
                        <span className="font-mono">{(extendStrength ?? 1.0).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={extendStrength ?? 1.0}
                        onChange={(e) => onExtendStrengthChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Reverse Video */}
                  {onExtendReverseVideoChange && (
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Reverse Video</span>
                      <Switch
                        checked={extendReverseVideo}
                        onCheckedChange={onExtendReverseVideoChange}
                      />
                    </div>
                  )}
                </div>
              ) : videoReferenceMode === 'single' ? (
                <div className="space-y-1.5">
                  {hasStartFrame ? (
                    <div className="flex items-center gap-2">
                      <MobileReferenceImagePreview
                        key={beginningRefImageUrl || beginningRefImage?.name || 'ref-start'}
                        file={beginningRefImage}
                        imageUrl={beginningRefImageUrl}
                        onRemove={onStartFrameRemove}
                        sizeClass="h-10 w-10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium truncate">
                          {beginningRefImage?.name || 'Reference set'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onStartFrameSelect}
                        className="text-[9px] text-muted-foreground hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onStartFrameSelect}
                      className="w-full h-8 gap-1.5 text-[10px]"
                    >
                      <Image className="h-3 w-3" />
                      Add Reference Image
                    </Button>
                  )}
                </div>
              ) : (
                // Dual reference
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] text-muted-foreground">Start</span>
                    {hasStartFrame ? (
                      <div className="flex items-center gap-1.5">
                        <MobileReferenceImagePreview
                          key={`start-${beginningRefImageUrl || beginningRefImage?.name || 'start'}`}
                          file={beginningRefImage}
                          imageUrl={beginningRefImageUrl}
                          onRemove={onStartFrameRemove}
                          sizeClass="h-8 w-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onStartFrameSelect}
                          className="h-6 w-6"
                        >
                          <Upload className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onStartFrameSelect}
                        className="w-full h-8 text-[9px]"
                      >
                        <Image className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] text-muted-foreground">End</span>
                    {hasEndFrame ? (
                      <div className="flex items-center gap-1.5">
                        <MobileReferenceImagePreview
                          key={`end-${endingRefImageUrl || endingRefImage?.name || 'end'}`}
                          file={endingRefImage}
                          imageUrl={endingRefImageUrl}
                          onRemove={onEndFrameRemove}
                          sizeClass="h-8 w-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onEndFrameSelect}
                          className="h-6 w-6"
                        >
                          <Upload className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEndFrameSelect}
                        className="w-full h-8 text-[9px]"
                      >
                        <Image className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Advanced Settings (Local Models Only) */}
          {showAdvancedSettings && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-8 px-2">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                    Advanced Settings
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {showAdvanced ? '−' : '+'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 space-y-2">
                <p className="text-[9px] text-muted-foreground italic px-2">
                  Advanced controls for local models (Steps, CFG, Seed, etc.) coming soon...
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Workspace Actions - Simple text links */}
          <div className="flex items-center justify-center gap-4 pt-1 pb-2 border-t">
            {onClearWorkspace && (
              <button
                type="button"
                onClick={onClearWorkspace}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear All (Save to Library)
              </button>
            )}
            {onDeleteAllWorkspace && (
              <button
                type="button"
                onClick={onDeleteAllWorkspace}
                className="text-[10px] text-destructive/70 hover:text-destructive transition-colors"
              >
                Delete All
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};