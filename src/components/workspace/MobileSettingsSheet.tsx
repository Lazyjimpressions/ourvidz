import React, { useMemo, useState } from 'react';
import { X, Upload, Image, Copy, Settings2, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
  onModeChange?: (mode: 'image' | 'video') => void;
  
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

const STYLE_PRESETS = [
  'Cinematic Lighting', 'Film Grain', 'Dramatic Composition', 'Soft Focus',
  'High Contrast', 'Moody', 'Natural Light', 'Shallow DOF',
];

/** Model selector popover chip */
function ModelChipPopover({ currentMode, selectedModel, onModelChange, imageModels, videoModels, modelsLoading }: {
  currentMode: 'image' | 'video';
  selectedModel: MobileSettingsSheetProps['selectedModel'];
  onModelChange: MobileSettingsSheetProps['onModelChange'];
  imageModels: MobileSettingsSheetProps['imageModels'];
  videoModels: MobileSettingsSheetProps['videoModels'];
  modelsLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const models = currentMode === 'image'
    ? [{ id: 'sdxl', label: 'SDXL (Local)' }, ...(imageModels || []).map(m => ({ id: m.id, label: m.display_name }))]
    : [{ id: 'wan', label: 'WAN (Local)' }, ...(videoModels || []).map(m => ({ id: m.id, label: m.display_name }))];

  const handleSelect = (modelId: string) => {
    if (currentMode === 'image') {
      if (modelId === 'sdxl') {
        onModelChange({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
      } else {
        const m = (imageModels || []).find(m => m.id === modelId);
        if (m) onModelChange({ id: m.id, type: m.provider_name as 'replicate' | 'fal', display_name: m.display_name });
      }
    } else {
      if (modelId === 'wan') {
        onModelChange({ id: 'wan', type: 'sdxl', display_name: 'WAN' });
      } else {
        const m = (videoModels || []).find(m => m.id === modelId);
        if (m) onModelChange({ id: m.id, type: m.api_providers.name as 'replicate' | 'fal', display_name: m.display_name });
      }
    }
    setOpen(false);
  };

  // Truncate model name for chip display
  const displayName = selectedModel?.display_name || 'Select';
  const shortName = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors",
            "bg-muted/50 text-foreground border-border hover:bg-accent"
          )}
        >
          {shortName}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[160px] max-w-[220px] p-1" align="start" sideOffset={4}>
        {modelsLoading ? (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Loading…</div>
        ) : models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleSelect(m.id)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-[11px] rounded-sm transition-colors",
              selectedModel?.id === m.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CreativeChipPopover({ label, value, options, selected, onSelect }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors",
            "bg-muted/50 text-foreground border-border hover:bg-accent"
          )}
        >
          {label ? `${label}: ${value}` : value}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[120px] p-1" align="start" sideOffset={4}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onSelect(opt.value); setOpen(false); }}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-[11px] rounded-sm transition-colors",
              selected === opt.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select popover chip for Style tags */
function StyleChipPopover({ style, onStyleChange }: { style: string; onStyleChange: (s: string) => void }) {
  const selected = useMemo(() => style ? style.split(', ').filter(Boolean) : [], [style]);
  const count = selected.length;

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag];
    onStyleChange(next.join(', '));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors",
            count > 0
              ? "bg-primary/20 text-primary border-primary/40"
              : "bg-muted/50 text-foreground border-border hover:bg-accent"
          )}
        >
          Style{count > 0 ? `: ${count}` : ''}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-1" align="start" sideOffset={4}>
        {STYLE_PRESETS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-[11px] rounded-sm transition-colors hover:bg-accent",
              selected.includes(tag) ? "text-primary" : "text-foreground"
            )}
          >
            <span className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
              selected.includes(tag)
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/40"
            )}>
              {selected.includes(tag) && <Check className="h-2.5 w-2.5" />}
            </span>
            {tag}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export const MobileSettingsSheet: React.FC<MobileSettingsSheetProps> = ({
  open,
  onClose,
  currentMode,
  onModeChange,
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
          {/* Output Settings - Single row of chip popovers */}
          <div className="space-y-1.5 p-2 rounded-lg border bg-muted/30">
            <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
              Output
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mode Chip */}
              {onModeChange && (
                <CreativeChipPopover
                  label="Mode"
                  value={currentMode === 'image' ? 'Image' : 'Video'}
                  options={[
                    { value: 'image', label: 'Image' },
                    { value: 'video', label: 'Video' },
                  ]}
                  selected={currentMode}
                  onSelect={(v) => onModeChange(v as 'image' | 'video')}
                />
              )}

              {/* Model Chip */}
              <ModelChipPopover
                currentMode={currentMode}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                imageModels={imageModels}
                videoModels={videoModels}
                modelsLoading={modelsLoading}
              />

              {/* Resolution Chip */}
              <CreativeChipPopover
                label="Res"
                value={quality === 'high' ? 'HD' : 'Std'}
                options={[
                  { value: 'fast', label: 'Standard' },
                  { value: 'high', label: 'HD' },
                ]}
                selected={quality}
                onSelect={(v) => onQualityChange(v as 'fast' | 'high')}
              />

              {/* Aspect Ratio Chip */}
              <CreativeChipPopover
                label="Ratio"
                value={aspectRatio}
                options={[
                  { value: '1:1', label: '1:1' },
                  { value: '16:9', label: '16:9' },
                  { value: '9:16', label: '9:16' },
                ]}
                selected={aspectRatio}
                onSelect={(v) => onAspectRatioChange(v as '16:9' | '1:1' | '9:16')}
              />

              {/* Content Type Chip */}
              <CreativeChipPopover
                label=""
                value={contentType.toUpperCase()}
                options={[
                  { value: 'sfw', label: 'SFW' },
                  { value: 'nsfw', label: 'NSFW' },
                ]}
                selected={contentType}
                onSelect={(v) => onContentTypeChange(v as 'sfw' | 'nsfw')}
              />
            </div>
          </div>
          {/* Creative Direction (Image mode only) */}
          {currentMode === 'image' && (
            <div className="space-y-1.5 p-2 rounded-lg border bg-muted/30">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                Creative Direction
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Shot Type Chip */}
                {onShotTypeChange && (
                  <CreativeChipPopover
                    label="Shot"
                    value={shotType === 'wide' ? 'Wide' : shotType === 'medium' ? 'Medium' : 'Close'}
                    options={[
                      { value: 'wide', label: 'Wide' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'close', label: 'Close' },
                    ]}
                    selected={shotType}
                    onSelect={(v) => onShotTypeChange(v as any)}
                  />
                )}

                {/* Camera Angle Chip */}
                {onCameraAngleChange && (
                  <CreativeChipPopover
                    label="Angle"
                    value={
                      cameraAngle === 'eye_level' ? 'Eye' :
                      cameraAngle === 'low_angle' ? 'Low' :
                      cameraAngle === 'over_shoulder' ? 'OTS' :
                      cameraAngle === 'overhead' ? 'Over' : "Bird's"
                    }
                    options={[
                      { value: 'eye_level', label: 'Eye Level' },
                      { value: 'low_angle', label: 'Low Angle' },
                      { value: 'over_shoulder', label: 'Over Shoulder' },
                      { value: 'overhead', label: 'Overhead' },
                      { value: 'bird_eye', label: "Bird's Eye" },
                    ]}
                    selected={cameraAngle}
                    onSelect={(v) => onCameraAngleChange(v as any)}
                  />
                )}

                {/* Style Chip (multi-select) */}
                {onStyleChange && (
                  <StyleChipPopover
                    style={style}
                    onStyleChange={onStyleChange}
                  />
                )}

                {/* Enhancement Chip (locked to None) */}
                <button
                  type="button"
                  disabled
                  className="px-2 py-1 text-[10px] font-medium rounded-md border border-border bg-muted/50 text-muted-foreground opacity-50 pointer-events-none"
                >
                  Enhance: None
                </button>
              </div>
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