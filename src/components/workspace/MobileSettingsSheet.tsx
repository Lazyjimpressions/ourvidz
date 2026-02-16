import React, { useMemo } from 'react';
import { X, Upload, Image, Copy, Settings2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  
  // Advanced Settings (local model only)
  // These will be shown based on model capabilities
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
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showWorkspaceActions, setShowWorkspaceActions] = React.useState(false);
  
  // Determine if current model is local (SDXL/WAN) for advanced settings
  const isLocalModel = useMemo(() => {
    return selectedModel?.type === 'sdxl' || 
           selectedModel?.id === 'sdxl' || 
           selectedModel?.id === 'wan';
  }, [selectedModel]);
  
  // Get model capabilities for API models
  const modelCapabilities = useMemo((): ModelCapabilities | null => {
    if (isLocalModel) return null;
    const model = imageModels.find(m => m.id === selectedModel?.id);
    return model?.capabilities || null;
  }, [selectedModel, imageModels, isLocalModel]);
  
  // Determine which advanced features to show
  const showAdvancedSettings = isLocalModel; // Only show for local models for now
  
  // Has reference image
  const hasReference = !!(referenceImage || referenceImageUrl);
  const hasStartFrame = !!(beginningRefImage || beginningRefImageUrl);
  const hasEndFrame = !!(endingRefImage || endingRefImageUrl);
  
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        {/* Header with Close Button */}
        <DrawerHeader className="flex items-center justify-between border-b pb-3">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Settings
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {/* Section: Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
              <SelectTrigger className="w-full bg-background">
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
          
          {/* Section: Quick Settings Row */}
          <div className="flex items-center gap-3">
            {/* Quality Toggle */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Quality
              </label>
              <SegmentedControl
                options={[
                  { value: 'fast', label: 'Fast' },
                  { value: 'high', label: 'High' },
                ]}
                value={quality}
                onChange={onQualityChange}
                size="sm"
                className="w-full"
              />
            </div>
            
            {/* NSFW Toggle */}
            <div className="flex flex-col items-center">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                NSFW
              </label>
              <Switch
                checked={contentType === 'nsfw'}
                onCheckedChange={(checked) => onContentTypeChange(checked ? 'nsfw' : 'sfw')}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
          
          {/* Section: Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Aspect Ratio
            </label>
            <div className="flex items-center gap-2">
              {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                <Button
                  key={ratio}
                  type="button"
                  variant={aspectRatio === ratio ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onAspectRatioChange(ratio)}
                  className={cn(
                    "flex-1 min-h-[40px]",
                    aspectRatio === ratio && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className="flex items-center justify-center">
                    {ratio === '1:1' && <span className="w-4 h-4 border-2 border-current rounded-sm" />}
                    {ratio === '16:9' && <span className="w-5 h-3 border-2 border-current rounded-sm" />}
                    {ratio === '9:16' && <span className="w-3 h-5 border-2 border-current rounded-sm" />}
                  </span>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Section: Reference Image (Image Mode) */}
          {currentMode === 'image' && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reference Image
              </label>
              
              {hasReference ? (
                <div className="space-y-3">
                  {/* Thumbnail + Info Row */}
                  <div className="flex items-center gap-3">
                    <MobileReferenceImagePreview
                      key={referenceImageUrl || referenceImage?.name || 'ref-single'}
                      file={referenceImage}
                      imageUrl={referenceImageUrl}
                      onRemove={onReferenceImageRemove}
                      sizeClass="h-12 w-12"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {referenceImage?.name || 'Reference set'}
                      </div>
                      {referenceImage && (
                        <div className="text-xs text-muted-foreground">
                          {(referenceImage.size / 1024).toFixed(0)}KB
                        </div>
                      )}
                    </div>
                    
                    {/* COPY Button - Consolidated */}
                    {onExactCopyModeChange && (
                      <Button
                        type="button"
                        variant={exactCopyMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onExactCopyModeChange(!exactCopyMode)}
                        className={cn(
                          "min-w-[70px] gap-1.5",
                          exactCopyMode && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        COPY
                      </Button>
                    )}
                  </div>
                  
                  {/* Strength Slider - Only in modify mode */}
                  {!exactCopyMode && onReferenceStrengthChange && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Variation: {Math.round((1 - referenceStrength) * 100)}%</span>
                        <span>Strength: {referenceStrength.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[referenceStrength]}
                        onValueChange={(value) => onReferenceStrengthChange(value[0])}
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        className="w-full"
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
                  className="w-full min-h-[44px] gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add Reference Image
                </Button>
              )}
            </div>
          )}
          
          {/* Section: Video Reference Frames */}
          {currentMode === 'video' && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {videoReferenceMode === 'video' ? 'Video Source' : videoReferenceMode === 'single' ? 'Reference Image' : 'Reference Frames'}
              </label>
              
              {videoReferenceMode === 'video' ? (
                // Video extend mode - show video source + extend controls
                <div className="space-y-3">
                  {hasStartFrame ? (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <Image className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">Video source set</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={onStartFrameRemove} className="text-xs text-destructive">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onStartFrameSelect}
                      className="w-full min-h-[44px] gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Add Video Source
                    </Button>
                  )}
                  
                  {/* Extend Strength */}
                  {onExtendStrengthChange && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Strength</span>
                        <span className="font-mono">{(extendStrength ?? 1.0).toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[extendStrength ?? 1.0]}
                        onValueChange={(v) => onExtendStrengthChange(v[0])}
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {/* Reverse Video */}
                  {onExtendReverseVideoChange && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Reverse Video</span>
                      <Switch
                        checked={extendReverseVideo}
                        onCheckedChange={onExtendReverseVideoChange}
                      />
                    </div>
                  )}
                </div>
              ) : videoReferenceMode === 'single' ? (
                // Single reference (WAN 2.1 i2v)
                <div className="space-y-2">
                  {hasStartFrame ? (
                    <div className="flex items-center gap-3">
                      <MobileReferenceImagePreview
                        key={beginningRefImageUrl || beginningRefImage?.name || 'ref-start'}
                        file={beginningRefImage}
                        imageUrl={beginningRefImageUrl}
                        onRemove={onStartFrameRemove}
                        sizeClass="h-12 w-12"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {beginningRefImage?.name || 'Reference set'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onStartFrameSelect}
                        className="text-xs"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onStartFrameSelect}
                      className="w-full min-h-[44px] gap-2"
                    >
                      <Image className="h-4 w-4" />
                      Add Reference Image
                    </Button>
                  )}
                </div>
              ) : (
                // Dual reference (other video models)
                <div className="flex gap-3">
                  {/* Start Frame */}
                  <div className="flex-1 space-y-1.5">
                    <span className="text-xs text-muted-foreground">Start</span>
                    {hasStartFrame ? (
                      <div className="flex items-center gap-2">
                        <MobileReferenceImagePreview
                          key={`start-${beginningRefImageUrl || beginningRefImage?.name || 'start'}`}
                          file={beginningRefImage}
                          imageUrl={beginningRefImageUrl}
                          onRemove={onStartFrameRemove}
                          sizeClass="h-10 w-10"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onStartFrameSelect}
                          className="h-8 w-8"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onStartFrameSelect}
                        className="w-full min-h-[40px]"
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* End Frame */}
                  <div className="flex-1 space-y-1.5">
                    <span className="text-xs text-muted-foreground">End</span>
                    {hasEndFrame ? (
                      <div className="flex items-center gap-2">
                        <MobileReferenceImagePreview
                          key={`end-${endingRefImageUrl || endingRefImage?.name || 'end'}`}
                          file={endingRefImage}
                          imageUrl={endingRefImageUrl}
                          onRemove={onEndFrameRemove}
                          sizeClass="h-10 w-10"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onEndFrameSelect}
                          className="h-8 w-8"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEndFrameSelect}
                        className="w-full min-h-[40px]"
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Section: Advanced Settings (Local Models Only) */}
          {showAdvancedSettings && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 px-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Advanced Settings
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {showAdvanced ? '−' : '+'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <p className="text-xs text-muted-foreground italic">
                  Advanced controls for local models (Steps, CFG, Seed, etc.) coming soon...
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Section: Workspace Actions */}
          <Collapsible open={showWorkspaceActions} onOpenChange={setShowWorkspaceActions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-10 px-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Workspace Actions
                </span>
                <span className="text-xs text-muted-foreground">
                  {showWorkspaceActions ? '−' : '+'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearWorkspace}
                className="w-full justify-start"
              >
                Clear All (Save to Library)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteAllWorkspace}
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                Delete All
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
