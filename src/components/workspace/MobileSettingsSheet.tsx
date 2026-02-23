import React, { useMemo, useState } from 'react';
import { X, Copy, Settings2, ChevronDown, Check, Plus, Lock } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
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
  imageModels?: Array<{ id: string; display_name: string; provider_name: string; tasks?: string[]; capabilities?: ModelCapabilities }>;
  videoModels?: Array<{ id: string; display_name: string; api_providers: { name: string } }>;
  modelsLoading?: boolean;
  multiRefActive?: boolean;
  
  // Quality
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  
  // Aspect Ratio
  aspectRatio: '16:9' | '1:1' | '9:16';
  onAspectRatioChange: (ratio: '16:9' | '1:1' | '9:16') => void;
  
  // Content Type
  contentType: 'sfw' | 'nsfw';
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  
  // Reference Slots (unified for image & video)
  refSlots?: Array<{ url?: string | null; label: string; role?: string }>;
  onRefSlotAdd?: (index: number) => void;
  onRefSlotRemove?: (index: number) => void;
  onRefSlotDrop?: (index: number, file: File) => void;
  onRefSlotDropUrl?: (index: number, url: string) => void;
  
  // Copy Mode (consolidated)
  exactCopyMode?: boolean;
  onExactCopyModeChange?: (mode: boolean) => void;
  
  // Reference Strength
  referenceStrength?: number;
  onReferenceStrengthChange?: (strength: number) => void;
  
  // (Video reference props removed — now unified via refSlots)
  
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
function ModelChipPopover({ currentMode, selectedModel, onModelChange, imageModels, videoModels, modelsLoading, multiRefActive }: {
  currentMode: 'image' | 'video';
  selectedModel: MobileSettingsSheetProps['selectedModel'];
  onModelChange: MobileSettingsSheetProps['onModelChange'];
  imageModels: MobileSettingsSheetProps['imageModels'];
  videoModels: MobileSettingsSheetProps['videoModels'];
  modelsLoading: boolean;
  multiRefActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filteredImageModels = multiRefActive
    ? (imageModels || []).filter(m => m.tasks?.includes('i2i_multi'))
    : (imageModels || []);
  const models = currentMode === 'image'
    ? [{ id: 'sdxl', label: 'SDXL (Local)' }, ...filteredImageModels.map(m => ({ id: m.id, label: m.display_name }))]
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
  const shortName = displayName.length > 20 ? displayName.slice(0, 20) + '…' : displayName;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors min-w-[140px]",
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
  refSlots = [],
  onRefSlotAdd,
  onRefSlotRemove,
  onRefSlotDrop,
  onRefSlotDropUrl,
  exactCopyMode = false,
  onExactCopyModeChange,
  referenceStrength = 0.8,
  onReferenceStrengthChange,
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
  multiRefActive = false,
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
  
  // Has any reference filled
  const hasAnyRef = refSlots.some(s => !!s.url);
  
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
                multiRefActive={multiRefActive}
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
              
              {/* Motion Intensity - hidden for multi model */}
              {onMotionIntensityChange && !multiRefActive && (
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

          {/* References */}
          {refSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-2">References</p>
              <div className="grid grid-cols-5 gap-2 px-2">
              {refSlots.map((slot, i) => {
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      {slot.url ? (
                        <div
                          className="relative group h-12 w-12 rounded-md overflow-hidden border border-border"
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const refData = e.dataTransfer.getData('application/x-ref-image');
                            if (refData) {
                              try {
                                const { url: droppedUrl } = JSON.parse(refData);
                                if (droppedUrl && onRefSlotDropUrl) onRefSlotDropUrl(i, droppedUrl);
                              } catch { /* ignore */ }
                              return;
                            }
                            const file = e.dataTransfer.files?.[0];
                            if (file && onRefSlotDrop) onRefSlotDrop(i, file);
                          }}
                        >
                          <img src={slot.url} alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => onRefSlotRemove?.(i)}
                            className="absolute top-0 right-0 bg-black/60 rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRefSlotAdd?.(i)}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const refData = e.dataTransfer.getData('application/x-ref-image');
                            if (refData) {
                              try {
                                const { url: droppedUrl } = JSON.parse(refData);
                                if (droppedUrl && onRefSlotDropUrl) onRefSlotDropUrl(i, droppedUrl);
                              } catch { /* ignore */ }
                              return;
                            }
                            const file = e.dataTransfer.files?.[0];
                            if (file && onRefSlotDrop) onRefSlotDrop(i, file);
                          }}
                          className="h-12 w-12 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-muted-foreground/50" />
                        </button>
                      )}
                      <span className="text-[8px] text-muted-foreground">{slot.label}</span>
                    </div>
                  );
                })}
              </div>
              {hasAnyRef && !multiRefActive && (
                <div className="space-y-2 px-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Exact Copy</span>
                    <Switch checked={exactCopyMode} onCheckedChange={onExactCopyModeChange} className="scale-75" />
                  </div>
                  {!exactCopyMode && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Strength</span>
                        <span className="text-[9px] text-muted-foreground">{Math.round(referenceStrength * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={referenceStrength}
                        onChange={(e) => onReferenceStrengthChange?.(parseFloat(e.target.value))}
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