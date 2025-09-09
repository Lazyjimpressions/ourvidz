
import React, { useState, useEffect } from 'react';
import { Image, Video, Play, Camera, Volume2, Zap, ChevronDown, X, Palette, Copy, Edit3, Settings, Info } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { modifyOriginalPrompt } from '@/utils/promptModification';
import { useBaseNegativePrompt } from '@/hooks/useBaseNegativePrompt';
import { useImageModels } from '@/hooks/useApiModels';
import { useToast } from '@/hooks/use-toast';
import { NegativePromptPresets } from '@/components/ui/negative-prompt-presets';

// Compact reference upload component with sizing
const ReferenceImageUpload: React.FC<{
  file: File | null;
  onFileChange: (file: File | null) => void;
  label: string;
  imageUrl?: string | null;
  onImageUrlChange?: (url: string | null) => void;
  sizeClass?: string;
  exactCopyMode?: boolean;
  setExactCopyMode?: (mode: boolean) => void;
}> = ({
  file,
  onFileChange,
  label,
  imageUrl,
  onImageUrlChange,
  sizeClass = "h-16 w-16",
  exactCopyMode,
  setExactCopyMode
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      onFileChange(uploadedFile);
      if (onImageUrlChange) {
        onImageUrlChange(null);
      }
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Handle file drops
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onFileChange(files[0]);
      if (onImageUrlChange) {
        onImageUrlChange(null);
      }
      return;
    }

    // Handle URL drops
    const url = e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      if (onImageUrlChange) {
        onImageUrlChange(url);
      }
      onFileChange(null);
      return;
    }

    // Handle workspace item drops with metadata extraction
    try {
      const workspaceItem = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('🎯 DRAG-DROP: Parsed workspace item:', {
        hasUrl: !!workspaceItem.url,
        type: workspaceItem.type,
        id: workspaceItem.id,
        metadata: workspaceItem.metadata,
        enhancedPrompt: workspaceItem.enhancedPrompt
      });
      if (workspaceItem.url && workspaceItem.type === 'image') {
        if (onImageUrlChange) {
          onImageUrlChange(workspaceItem.url);
          console.log('🎯 DRAG-DROP: Set reference image URL:', workspaceItem.url);
        }
        onFileChange(null);

        // CRITICAL FIX: Extract metadata for exact copy mode on drag-drop
        console.log('🎯 DRAG-DROP: Triggering metadata extraction for workspace item:', workspaceItem.id);

        // Trigger metadata extraction event for parent component
        if (workspaceItem.id) {
          const extractMetadataEvent = new CustomEvent('drag-drop-extract-metadata', {
            detail: {
              workspaceItem
            }
          });
          window.dispatchEvent(extractMetadataEvent);
          console.log('🎯 DRAG-DROP: Dispatched metadata extraction event');
        } else {
          console.warn('⚠️ DRAG-DROP: No workspace item ID found');
        }
      } else {
        console.warn('⚠️ DRAG-DROP: Invalid workspace item - missing URL or not an image');
      }
    } catch (error) {
      console.log('🎯 DRAG-DROP: Not a JSON drop, treating as URL/text:', e.dataTransfer.getData('text/plain'));

      // Handle as URL or text drop
      const url = e.dataTransfer.getData('text/plain');
      if (url && onImageUrlChange) {
        onImageUrlChange(url);
      }
    }
  };
  const clearReference = () => {
    onFileChange(null);
    if (onImageUrlChange) {
      onImageUrlChange(null);
    }
  };
  const displayImage = file ? URL.createObjectURL(file) : imageUrl;
  return <div className={`border border-border/30 bg-muted/10 rounded ${sizeClass} transition-all duration-200 overflow-hidden ${isDragOver ? 'border-primary bg-primary/10' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {displayImage ? <div className="relative w-full h-full">
          <img src={displayImage} alt={label} className="w-full h-full object-cover" />
          <button onClick={clearReference} className="absolute -top-0.5 -right-0.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-[10px]">
            ×
          </button>
        </div> : <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors bg-muted/20">
          <Camera className="w-4 h-4 mb-1" />
          <span className="text-xs font-medium">{label}</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>}
    </div>;
};

export interface SimplePromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  mode: 'image' | 'video';
  contentType: 'sfw' | 'nsfw';
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  isGenerating: boolean;
  onGenerate: () => void;
  referenceImage: File | null;
  onReferenceImageChange: (file: File | null) => void;
  referenceImageUrl?: string | null;
  onReferenceImageUrlChange?: (url: string | null) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (strength: number) => void;
  referenceType?: 'style' | 'character' | 'composition';
  onReferenceTypeChange?: (type: 'style' | 'character' | 'composition') => void;
  onModeChange: (mode: 'image' | 'video') => void;
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  // Video-specific props
  beginningRefImage?: File | null;
  endingRefImage?: File | null;
  onBeginningRefImageChange?: (file: File | null) => void;
  onEndingRefImageChange?: (file: File | null) => void;
  beginningRefImageUrl?: string | null;
  endingRefImageUrl?: string | null;
  onBeginningRefImageUrlChange?: (url: string | null) => void;
  onEndingRefImageUrlChange?: (url: string | null) => void;
  videoDuration?: number;
  onVideoDurationChange?: (duration: number) => void;
  motionIntensity?: number;
  onMotionIntensityChange?: (intensity: number) => void;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  // Control parameters
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  shotType?: 'wide' | 'medium' | 'close';
  onShotTypeChange?: (type: 'wide' | 'medium' | 'close') => void;
  cameraAngle?: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye';
  onCameraAngleChange?: (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => void;
  style?: string;
  onStyleChange?: (style: string) => void;
  styleRef?: File | null;
  onStyleRefChange?: (file: File | null) => void;
  // Enhancement model selection
  enhancementModel?: 'qwen_base' | 'qwen_instruct' | 'none';
  onEnhancementModelChange?: (model: 'qwen_base' | 'qwen_instruct' | 'none') => void;
  // Model selection (SDXL or Replicate models from database)
  selectedModel?: { id: string; type: 'sdxl' | 'replicate'; display_name: string } | null;
  onSelectedModelChange?: (model: { id: string; type: 'sdxl' | 'replicate'; display_name: string } | null) => void;
  // Exact copy workflow
  exactCopyMode?: boolean;
  onExactCopyModeChange?: (on: boolean) => void;
  useOriginalParams?: boolean;
  onUseOriginalParamsChange?: (on: boolean) => void;
  lockSeed?: boolean;
  onLockSeedChange?: (on: boolean) => void;
  referenceMetadata?: any;
  onReferenceMetadataChange?: (metadata: any) => void;
  // Workspace assets for metadata extraction
  workspaceAssets?: any[];
  // Advanced SDXL settings
  numImages?: number;
  onNumImagesChange?: (num: number) => void;
  steps?: number;
  onStepsChange?: (steps: number) => void;
  guidanceScale?: number;
  onGuidanceScaleChange?: (scale: number) => void;
  negativePrompt?: string;
  onNegativePromptChange?: (prompt: string) => void;
  compelEnabled?: boolean;
  onCompelEnabledChange?: (enabled: boolean) => void;
  compelWeights?: string;
  onCompelWeightsChange?: (weights: string) => void;
  seed?: number | null;
  onSeedChange?: (seed: number | null) => void;
  // Debug controls
  onBypassEnhancement?: boolean;
  onBypassEnhancementChange?: (enabled: boolean) => void;
  onHardOverride?: boolean;
  onHardOverrideChange?: (enabled: boolean) => void;
  // Clothing Edit Mode
  clothingEditMode?: boolean;
  onClothingEditModeChange?: (enabled: boolean) => void;
  lockHair?: boolean;
  onLockHairChange?: (enabled: boolean) => void;
  originalClothingColor?: string;
  onOriginalClothingColorChange?: (color: string) => void;
  targetGarments?: string[];
  onTargetGarmentsChange?: (garments: string[]) => void;
}

export const SimplePromptInput: React.FC<SimplePromptInputProps> = ({
  prompt,
  onPromptChange,
  mode,
  contentType,
  quality,
  onQualityChange,
  isGenerating,
  onGenerate,
  referenceImage,
  onReferenceImageChange,
  referenceImageUrl,
  onReferenceImageUrlChange,
  referenceStrength,
  onReferenceStrengthChange,
  referenceType = 'character',
  onReferenceTypeChange,
  onModeChange,
  onContentTypeChange,
  beginningRefImage,
  endingRefImage,
  onBeginningRefImageChange,
  onEndingRefImageChange,
  beginningRefImageUrl,
  endingRefImageUrl,
  onBeginningRefImageUrlChange,
  onEndingRefImageUrlChange,
  videoDuration = 5,
  onVideoDurationChange,
  motionIntensity = 0.5,
  onMotionIntensityChange,
  soundEnabled = false,
  onSoundToggle,
  aspectRatio = '1:1',
  onAspectRatioChange,
  shotType = 'wide',
  onShotTypeChange,
  cameraAngle = 'none',
  onCameraAngleChange,
  style = '',
  onStyleChange,
  styleRef = null,
  onStyleRefChange,
  enhancementModel = 'qwen_instruct',
  onEnhancementModelChange,
  selectedModel = { id: 'sdxl', type: 'sdxl', display_name: 'SDXL' },
  onSelectedModelChange,
  exactCopyMode = false,
  onExactCopyModeChange,
  useOriginalParams = false,
  onUseOriginalParamsChange,
  lockSeed = false,
  onLockSeedChange,
  referenceMetadata = null,
  onReferenceMetadataChange,
  workspaceAssets = [],
  // Advanced SDXL settings
  numImages = 1,
  onNumImagesChange,
  steps = 25,
  onStepsChange,
  guidanceScale = 7.5,
  onGuidanceScaleChange,
  negativePrompt = '',
  onNegativePromptChange,
  compelEnabled = false,
  onCompelEnabledChange,
  compelWeights = '',
  onCompelWeightsChange,
  seed = null,
  onSeedChange,
  onBypassEnhancement,
  onBypassEnhancementChange,
  onHardOverride,
  onHardOverrideChange,
  clothingEditMode = false,
  onClothingEditModeChange,
  lockHair = false,
  onLockHairChange,
  originalClothingColor = 'black',
  onOriginalClothingColorChange,
  targetGarments = [],
  onTargetGarmentsChange
}) => {
  // Fetch available image models from API
  const { data: imageModels = [], isLoading: modelsLoading } = useImageModels();

  // Base negative prompt hook - use 'sdxl' for both model types to ensure consistency  
  const negativePromptModelType = mode === 'image' ? 'sdxl' : 'ltx';
  const { baseNegativePrompt, isLoading: loadingBaseNegative, fetchBaseNegativePrompt } = useBaseNegativePrompt(negativePromptModelType, contentType);

  const [showBaseNegative, setShowBaseNegative] = useState(false);

  // Refresh base negative prompt when contentType or mode changes
  useEffect(() => {
    if (showBaseNegative && fetchBaseNegativePrompt) {
      fetchBaseNegativePrompt();
    }
  }, [showBaseNegative, contentType, mode]);

  // LTX-Style Popup States
  const [showShotTypePopup, setShowShotTypePopup] = useState(false);
  const [showAnglePopup, setShowAnglePopup] = useState(false);
  const [showStylePopup, setShowStylePopup] = useState(false);
  const [showEnhancePopup, setShowEnhancePopup] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Require non-empty prompt for video mode to avoid queue-job 400s
    if (mode === 'video' && !prompt.trim()) {
      return;
    }
    
    // Show pre-generation summary toast
    if (referenceImage || referenceImageUrl) {
      const currentDenoise = 1 - referenceStrength;
      const summary = `${steps} Steps • CFG ${guidanceScale} • Denoise ${currentDenoise.toFixed(2)} • ${exactCopyMode ? 'COPY' : referenceType?.toUpperCase() || 'CHARACTER'}`;
      
      toast({
        title: "Generation Settings",
        description: summary,
        duration: 2000,
      });
    }
    
    if (!isGenerating && (prompt.trim() || exactCopyMode)) {
      onGenerate();
    }
  };

  // Auto-enable modify mode when reference image is set (default behavior)
  const handleReferenceFileChange = (file: File | null) => {
    onReferenceImageChange(file);
    if (file) {
      // Always default to modify mode (never auto-enable exact copy)
      onExactCopyModeChange?.(false);
      onReferenceStrengthChange(0.80); // Better default for character mode
      
      onReferenceTypeChange?.('character'); // Default to character for most use cases
      
      onModeChange('image');
    } else {
      // Clear exact copy mode when reference is removed
      onExactCopyModeChange?.(false);
      onReferenceMetadataChange?.(null);
    }
  };

  // Handle reference image URL changes (for drag-and-drop) - default to modify mode
  const handleReferenceUrlChange = (url: string | null) => {
    onReferenceImageUrlChange?.(url);
    if (url) {
      // Always default to modify mode for all references
      onReferenceStrengthChange(0.80); // Better default for character mode
      
      onReferenceTypeChange?.('character'); // Default to character for most use cases
      
      onExactCopyModeChange?.(false); // Explicitly set modify mode
      onModeChange('image');
    } else {
      // Clear exact copy mode when reference is removed
      onExactCopyModeChange?.(false);
      onReferenceMetadataChange?.(null);
    }
  };

  // LTX-Style Control Handlers
  const handleAspectRatioToggle = () => {
    const ratios: ('16:9' | '1:1' | '9:16')[] = ['16:9', '1:1', '9:16'];
    const currentIndex = ratios.indexOf(aspectRatio);
    const nextIndex = (currentIndex + 1) % ratios.length;
    onAspectRatioChange?.(ratios[nextIndex]);
  };

  const handleShotTypeToggle = () => {
    setShowShotTypePopup(!showShotTypePopup);
    setShowAnglePopup(false);
    setShowStylePopup(false);
    setShowEnhancePopup(false);
  };

  const handleCameraAngleToggle = () => {
    setShowAnglePopup(!showAnglePopup);
    setShowShotTypePopup(false);
    setShowStylePopup(false);
    setShowEnhancePopup(false);
  };

  const handleStyleToggle = () => {
    setShowStylePopup(!showStylePopup);
    setShowShotTypePopup(false);
    setShowAnglePopup(false);
    setShowEnhancePopup(false);
  };

  const handleCameraAngleSelect = (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => {
    onCameraAngleChange?.(angle);
    setShowAnglePopup(false);
  };

  const handleShotTypeSelect = (type: 'wide' | 'medium' | 'close') => {
    onShotTypeChange?.(type);
    setShowShotTypePopup(false);
  };

  const stylePresets = [
    { name: 'None', style: '' },
    { name: 'Cinematic', style: 'cinematic lighting, film grain, dramatic composition' },
    { name: 'Vintage', style: 'vintage photography, retro aesthetic, warm tones' },
    { name: 'Low Key', style: 'low key lighting, dramatic shadows, high contrast' },
    { name: 'Indy', style: 'indie film aesthetic, natural lighting, muted colors' },
    { name: 'Y2K', style: 'Y2K aesthetic, digital glitch, cyber punk vibes' },
    { name: 'Pop', style: 'pop art style, bright colors, high saturation' },
    { name: 'Grunge', style: 'grunge aesthetic, rough textures, alternative style' },
    { name: 'Dreamy', style: 'dreamy atmosphere, soft focus, ethereal lighting' },
    { name: 'Hand Drawn', style: 'hand drawn illustration, sketch-like, artistic' },
    { name: '2D Novel', style: '2D anime style, visual novel aesthetic' },
    { name: 'Boost', style: 'enhanced details, sharp focus, vivid colors' }
  ];

  const handleStyleSelect = (selectedStyle: string) => {
    onStyleChange?.(selectedStyle);
    setShowStylePopup(false);
  };

  const handleStyleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onStyleRefChange?.(file);
  };

  // LTX-Style Data
  const cameraAngleOptions = [
    { value: 'none', label: 'None', icon: '—' },
    { value: 'eye_level', label: 'Eye level', icon: '👁️' },
    { value: 'low_angle', label: 'Low angle', icon: '⬆️' },
    { value: 'over_shoulder', label: 'Over shoulder', icon: '👤' },
    { value: 'overhead', label: 'Overhead', icon: '⬇️' },
    { value: 'bird_eye', label: "Bird's eye", icon: '🦅' }
  ];

  const shotTypeOptions = [
    { value: 'wide', label: 'Wide', icon: '🔍' },
    { value: 'medium', label: 'Medium', icon: '📷' },
    { value: 'close', label: 'Close', icon: '🔬' }
  ];

  // Detect if reference strength is high in modify mode (potential near-copy)
  const isHighStrengthModify = !exactCopyMode && (referenceImage || referenceImageUrl) && referenceStrength > 0.8;
  
  // Auto-clamp high strength in modify mode (prevent near-copies)
  React.useEffect(() => {
    if (isHighStrengthModify && onReferenceStrengthChange) {
      onReferenceStrengthChange(0.75); // Better default for modify mode
    }
  }, [isHighStrengthModify, onReferenceStrengthChange]);

  // Mode toggle handler with proper defaults
  const handleModeToggle = () => {
    const newMode = !exactCopyMode;
    onExactCopyModeChange?.(newMode);
    
    if (newMode) {
      // Switching to copy mode
      onReferenceStrengthChange(0.95); // Copy mode strength (worker will clamp denoise to ≤0.05)
    } else {
      // Switching to modify mode
      onReferenceStrengthChange(0.80); // Better default for character mode
    }
  };

  // Previews for Exact Copy mode
  const originalPromptPreview = exactCopyMode ? referenceMetadata?.originalEnhancedPrompt || null : null;
  const finalPromptPreview = exactCopyMode ? referenceMetadata?.originalEnhancedPrompt ? modifyOriginalPrompt(referenceMetadata.originalEnhancedPrompt, prompt.trim() || '') : prompt.trim() ? `${prompt.trim()}, exact copy, high quality` : 'exact copy, high quality' : null;

  return <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background/80 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg px-2 py-1 relative">
          <div className="space-y-1">
            {/* Row 1: IMAGE button, Reference tiles, Prompt input, Generate button */}
            <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2">
              {/* IMAGE Button - Square, compact size */}
              <button 
                onClick={() => onModeChange('image')} 
                className={`flex flex-col items-center justify-center rounded text-xs font-medium transition-colors h-14 w-14 ${
                  mode === 'image' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Image size={14} />
                <span className="text-[10px] mt-0.5">IMAGE</span>
              </button>

               {/* Reference Images - Match row height */}
              <div className="flex gap-2 items-center">
                {mode === 'image' ? (
                   <div className="relative">
                    {/* Make REF tile clickable when image is present */}
                    <div
                      onClick={() => {
                        if (referenceImage || referenceImageUrl) {
                          setShowAdvancedSettings(true);
                        }
                      }}
                      className={`${(referenceImage || referenceImageUrl) ? 'cursor-pointer' : ''}`}
                    >
                      <ReferenceImageUpload 
                        file={referenceImage} 
                        onFileChange={handleReferenceFileChange} 
                        imageUrl={referenceImageUrl} 
                        onImageUrlChange={handleReferenceUrlChange} 
                        label="REF" 
                        sizeClass="h-14 w-14"
                        exactCopyMode={exactCopyMode}
                        setExactCopyMode={onExactCopyModeChange}
                      />
                      
                      {/* In-tile badge - visible and clickable */}
                    </div>
                    
                    {/* Mode toggle and status badges */}
                    {(referenceImage || referenceImageUrl) && (
                      <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
                        {/* High strength warning in modify mode */}
                        {isHighStrengthModify && (
                          <div className="text-[7px] px-1 bg-orange-500 text-white rounded text-center" title="High strength can cause near-copies. Auto-lowered to 0.7">
                            ⚠
                          </div>
                        )}
                        {/* Seed lock indicator in modify mode */}
                        {!exactCopyMode && lockSeed && (
                          <button
                            onClick={() => onLockSeedChange?.(false)}
                            className="text-[7px] px-1 bg-yellow-500 text-white rounded text-center hover:bg-yellow-600"
                            title="Seed locked - results may be very similar. Click to unlock."
                          >
                            🔒
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <ReferenceImageUpload 
                      file={beginningRefImage || null} 
                      onFileChange={onBeginningRefImageChange || (() => {})} 
                      imageUrl={beginningRefImageUrl} 
                      onImageUrlChange={onBeginningRefImageUrlChange} 
                      label="START" 
                      sizeClass="h-14 w-12"
                    />
                    <ReferenceImageUpload 
                      file={endingRefImage || null} 
                      onFileChange={onEndingRefImageChange || (() => {})} 
                      imageUrl={endingRefImageUrl} 
                      onImageUrlChange={onEndingRefImageUrlChange} 
                      label="END" 
                      sizeClass="h-14 w-12"
                    />
                  </>
                )}
              </div>

              {/* Prompt Input - Compact size, 3 lines */}
              <div className="relative flex-1">
                <textarea 
                  value={prompt} 
                  onChange={e => onPromptChange(e.target.value)} 
                  placeholder={exactCopyMode ? "Add modifications (optional)..." : ((referenceImage || referenceImageUrl) ? "Describe how to modify the reference..." : "Describe what you want to generate...")}
                  rows={3}
                  className={`w-full h-14 px-1 py-0 pr-6 text-sm bg-muted/20 border border-border/30 rounded resize-none leading-4 ${
                    exactCopyMode ? 'border-orange-500/50 bg-orange-50/50' : ''
                  }`}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }} 
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)} 
                        className="absolute right-0.5 top-0.5 text-muted-foreground hover:text-foreground p-0.5 rounded"
                      >
                        <Settings size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Controls
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Generate button - Compact size */}
              <button 
                onClick={handleSubmit} 
                disabled={isGenerating || (mode === 'video' ? !prompt.trim() : (!prompt.trim() && !exactCopyMode))}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded h-14 w-14 flex items-center justify-center shrink-0"
                title="Generate"
              >
                <Play size={14} fill="currentColor" />
              </button>
            </div>

            {/* Row 2: VIDEO button and Controls */}
            <div className="grid grid-cols-[auto_auto_1fr] items-end gap-2">
              {/* VIDEO Button - Square, compact size, fixed under IMAGE */}
              <button 
                onClick={() => onModeChange('video')} 
                className={`flex flex-col items-center justify-center rounded text-xs font-medium transition-colors h-14 w-14 ${
                  mode === 'video' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Video size={14} />
                <span className="text-[10px] mt-0.5">VIDEO</span>
              </button>

              <div></div> {/* Empty space to align with reference tiles */}
              <div className="flex items-end gap-1 justify-end self-end pb-0.5">
                {mode === 'image' ? (
                  /* Image mode controls */
                  <div className="flex items-center gap-1">
                    {/* Quality Toggle */}
                    <button 
                      onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')} 
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        quality === 'high' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {quality === 'high' ? 'HIGH' : 'FAST'}
                    </button>

                    {/* Model Selection */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowModelPopup(!showModelPopup);
                          setShowEnhancePopup(false);
                          setShowShotTypePopup(false);
                          setShowAnglePopup(false);
                          setShowStylePopup(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors min-w-[60px]"
                      >
                        {selectedModel?.display_name || 'SDXL'}
                        <ChevronDown size={8} />
                      </button>
                      {showModelPopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-[60] min-w-[120px] max-h-32 overflow-y-auto">
                          {/* Built-in SDXL option */}
                          <button 
                            onClick={() => {
                              onSelectedModelChange?.({ id: 'sdxl', type: 'sdxl', display_name: 'SDXL' });
                              setShowModelPopup(false);
                            }}
                            className={`w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors ${
                              selectedModel?.id === 'sdxl' ? 'bg-muted' : ''
                            }`}
                          >
                            SDXL
                          </button>
                          {/* Replicate models from database */}
                          {!modelsLoading && imageModels.map((model) => (
                            <button 
                              key={model.id}
                              onClick={() => {
                                onSelectedModelChange?.({ 
                                  id: model.id, 
                                  type: 'replicate', 
                                  display_name: model.display_name 
                                });
                                setShowModelPopup(false);
                              }}
                              className={`w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors ${
                                selectedModel?.id === model.id ? 'bg-muted' : ''
                              }`}
                            >
                              {model.display_name}
                            </button>
                          ))}
                          {modelsLoading && (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground">Loading models...</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Type */}
                    <button 
                      onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')} 
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        contentType === 'nsfw' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {contentType.toUpperCase()}
                    </button>

                    {/* Aspect Ratio */}
                    <button 
                      onClick={handleAspectRatioToggle} 
                      className="px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                    >
                      {aspectRatio}
                    </button>

                    {/* Enhancement Model Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowEnhancePopup(!showEnhancePopup);
                          setShowShotTypePopup(false);
                          setShowAnglePopup(false);
                          setShowStylePopup(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors min-w-[60px]"
                      >
                        {enhancementModel === 'qwen_instruct' ? 'INSTRUCT' : 
                         enhancementModel === 'qwen_base' ? 'BASE' : 'NONE'}
                        <ChevronDown size={8} />
                      </button>
                      {showEnhancePopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-[60] min-w-[80px]">
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('qwen_instruct');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            INSTRUCT
                          </button>
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('qwen_base');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            BASE
                          </button>
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('none');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            NONE
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Shot Type */}
                    <div className="relative">
                      <button 
                        onClick={handleShotTypeToggle} 
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                      >
                        {shotType.toUpperCase()}
                        <ChevronDown size={8} />
                      </button>
                      {showShotTypePopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-24">
                          {shotTypeOptions.map(option => (
                            <button 
                              key={option.value} 
                              onClick={() => handleShotTypeSelect(option.value as 'wide' | 'medium' | 'close')}
                              className="w-full px-2 py-1 text-left text-[10px] hover:bg-muted transition-colors flex items-center gap-1"
                            >
                              <span>{option.icon}</span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Camera Angle */}
                    <div className="relative">
                      <button 
                        onClick={handleCameraAngleToggle} 
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                      >
                        {cameraAngle === 'none' ? 'ANGLE' : cameraAngle.replace('_', ' ').toUpperCase()}
                        <ChevronDown size={8} />
                      </button>
                      {showAnglePopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-32">
                          {cameraAngleOptions.map(option => (
                            <button 
                              key={option.value} 
                              onClick={() => handleCameraAngleSelect(option.value as any)} 
                              className="w-full px-2 py-1 text-left text-[10px] hover:bg-muted transition-colors flex items-center gap-1"
                            >
                              <span>{option.icon}</span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Style */}
                    <div className="relative">
                      <button 
                        onClick={handleStyleToggle} 
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                      >
                        <Palette size={8} />
                        STYLE
                        <ChevronDown size={8} />
                      </button>
                      {showStylePopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-32 max-h-48 overflow-y-auto">
                          {stylePresets.map(preset => (
                            <button 
                              key={preset.name} 
                              onClick={() => handleStyleSelect(preset.style)} 
                              className="w-full px-2 py-1 text-left text-[10px] hover:bg-muted transition-colors"
                            >
                              {preset.name}
                            </button>
                          ))}
                          <div className="border-t border-border mt-1 pt-1">
                            <label className="block px-2 py-1 text-[10px] text-muted-foreground cursor-pointer hover:bg-muted">
                              Upload Style Ref
                              <input type="file" accept="image/*" onChange={handleStyleRefUpload} className="hidden" />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Video mode controls */
                  <div className="flex items-center gap-1">
                    {/* Model Selection */}
                    <button 
                      onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')} 
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        quality === 'high' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {quality === 'high' ? 'HIGH' : 'FAST'}
                    </button>

                    {/* Length */}
                    <button 
                      onClick={() => onVideoDurationChange?.(videoDuration === 5 ? 10 : 5)} 
                      className="px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                    >
                      {videoDuration}S
                    </button>

                    {/* Content Type */}
                    <button 
                      onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')} 
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        contentType === 'nsfw' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {contentType.toUpperCase()}
                    </button>

                    {/* Aspect Ratio */}
                    <button 
                      onClick={handleAspectRatioToggle} 
                      className="px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                    >
                      {aspectRatio}
                    </button>

                    {/* Enhancement Model Dropdown - Same as image mode */}
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowEnhancePopup(!showEnhancePopup);
                          setShowShotTypePopup(false);
                          setShowAnglePopup(false);
                          setShowStylePopup(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors min-w-[60px]"
                      >
                        {enhancementModel === 'qwen_instruct' ? 'INSTRUCT' : 
                         enhancementModel === 'qwen_base' ? 'BASE' : 'NONE'}
                        <ChevronDown size={8} />
                      </button>
                      {showEnhancePopup && (
                        <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-[60] min-w-[80px]">
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('qwen_instruct');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            INSTRUCT
                          </button>
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('qwen_base');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            BASE
                          </button>
                          <button 
                            onClick={() => {
                              onEnhancementModelChange?.('none');
                              setShowEnhancePopup(false);
                            }}
                            className="w-full text-left px-2 py-1 text-[10px] hover:bg-muted transition-colors"
                          >
                            NONE
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sound Toggle */}
                    <button 
                      onClick={() => onSoundToggle?.(!soundEnabled)} 
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                        soundEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Volume2 size={8} />
                      {soundEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings Modal */}
          {showAdvancedSettings && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-background/95 backdrop-blur-sm border border-border/30 rounded shadow-md p-3 z-50 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Controls</h3>
                <button onClick={() => setShowAdvancedSettings(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
              
              {/* Reference Type Selection and Variation - Always show at top when reference image present */}
              {(referenceImage || referenceImageUrl) && (
                <div className="mb-4 p-2 bg-muted/20 rounded border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-foreground">Reference Type</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="w-4 h-4 rounded-full bg-muted-foreground/30 flex items-center justify-center text-muted-foreground cursor-help hover:bg-muted-foreground/40">
                            <Info size={10} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-48 text-xs z-50 bg-popover border border-border shadow-lg">
                          <p><strong>Character:</strong> Preserves identity/face best</p>
                          <p><strong>Style:</strong> Transfers overall look & lighting</p>
                          <p><strong>Composition:</strong> Follows pose/framing</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Reference Type Radio Group - Pure (no auto-changes) */}
                  <RadioGroup 
                    value={referenceType} 
                    onValueChange={(value) => {
                      onReferenceTypeChange?.(value as any);
                    }}
                    className="flex gap-3 mb-3"
                  >
                    {(['character', 'style', 'composition'] as const).map((type) => (
                      <div key={type} className="flex items-center space-x-1">
                        <RadioGroupItem value={type} id={type} className="w-2.5 h-2.5 [&>*]:w-1 [&>*]:h-1" />
                        <Label 
                          htmlFor={type} 
                          className="text-[10px] font-medium capitalize cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {/* Variation Preset Chips - Segmented Style */}
                  <div className="mb-2">
                    <label className="text-[9px] text-muted-foreground mb-1 block">Variation</label>
                    <div className="flex gap-0">
                      <button
                        onClick={() => {
                          onExactCopyModeChange?.(true);
                          onReferenceStrengthChange?.(0.95);
                          onGuidanceScaleChange?.(1.0);
                          onStepsChange?.(15);
                          onLockSeedChange?.(true);
                        }}
                        className={`chip-segmented rounded-r-none border-r-0 ${exactCopyMode ? 'chip-segmented-active' : ''}`}
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => {
                          onExactCopyModeChange?.(false);
                          onReferenceStrengthChange?.(0.75);
                          onGuidanceScaleChange?.(6.5);
                          onStepsChange?.(25);
                          onLockSeedChange?.(false);
                        }}
                        className={`chip-segmented rounded-none ${!exactCopyMode && referenceStrength >= 0.7 && referenceStrength <= 0.8 ? 'chip-segmented-active' : ''}`}
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => {
                          onExactCopyModeChange?.(false);
                          onReferenceStrengthChange?.(0.40);
                          onGuidanceScaleChange?.(7.0);
                          onStepsChange?.(25);
                          onLockSeedChange?.(false);
                        }}
                        className={`chip-segmented rounded-l-none ${!exactCopyMode && referenceStrength >= 0.35 && referenceStrength <= 0.45 ? 'chip-segmented-active' : ''}`}
                      >
                        Creative
                      </button>
                    </div>
                  </div>
                  
                   {/* Clothing Changes Preset - Special chip for clothing modifications - SUGGESTION ONLY */}
                   {/\b(change|replace|swap|modify|make.*?(?:dress|shirt|top|bottom|pants|skirt|outfit|clothing|clothes|suit|jacket|coat|blue|red|green|yellow|purple|pink|black|white|brown))\b/i.test(prompt) && (
                     <div className="mb-2">
                       <div className="flex items-center gap-1 mb-1">
                         <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                         <label className="text-[9px] text-orange-600 font-medium">Suggestion: Clothing Change</label>
                       </div>
                       <button
                         onClick={() => {
                           onExactCopyModeChange?.(false);
                           // Don't auto-force composition - respect user's selection
                           // onReferenceTypeChange?.('composition');
                           onReferenceStrengthChange?.(0.30);
                           onGuidanceScaleChange?.(7.5);
                           onStepsChange?.(25);
                           onLockSeedChange?.(false);
                         }}
                         className="chip-segmented w-full border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 text-[10px] py-1"
                       >
                         🔄 Optimize for Clothing (Keep {referenceType})
                       </button>
                     </div>
                   )}
                    
                    {/* Hair Lock Toggle - Visible with tooltip */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <label className="text-[9px] text-muted-foreground font-medium">Hair Lock</label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="w-3 h-3 rounded-full bg-muted-foreground/30 flex items-center justify-center text-muted-foreground cursor-help hover:bg-muted-foreground/40">
                                  <Info size={8} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-48 text-xs z-50 bg-popover border border-border shadow-lg">
                                <p>Preserves hair color and style during generation. Useful for clothing changes while maintaining identity.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <button
                          onClick={() => onLockHairChange?.(!lockHair)}
                          className={`w-8 h-4 rounded-full transition-colors ${
                            lockHair ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 bg-white rounded-full transition-transform ${
                              lockHair ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                   
                    {/* Debug Controls */}
                    {(onBypassEnhancement !== undefined || onHardOverride !== undefined) && (
                      <div className="space-y-1 p-2 border-t border-border/50">
                        <div className="text-[8px] font-medium text-muted-foreground">Debug</div>
                        <div className="flex gap-2 text-[8px]">
                          {onBypassEnhancement !== undefined && (
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={onBypassEnhancement}
                                onChange={(e) => onBypassEnhancementChange?.(e.target.checked)}
                                className="w-3 h-3"
                              />
                              Bypass enhancement
                            </label>
                          )}
                          {onHardOverride !== undefined && (
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={onHardOverride}
                                onChange={(e) => onHardOverrideChange?.(e.target.checked)}
                                className="w-3 h-3"
                              />
                              Hard override
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                   {/* Profile Summary */}
                   <div className="text-[9px] text-muted-foreground text-center">
                     {exactCopyMode ? 'Copy' : referenceType?.charAt(0).toUpperCase() + referenceType?.slice(1)} • 
                     Strength {referenceStrength.toFixed(2)} • 
                     Denoise {(1 - referenceStrength).toFixed(2)} • 
                     CFG {guidanceScale} • 
                     Steps {steps}
                     {lockSeed && ' • Seed Locked'}
                   </div>
                </div>
              )}
              
              {/* Compact 3-column layout for reference controls with proper spacing */}
              {(referenceImage || referenceImageUrl) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 controls-compact mb-4">
                  {/* Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Steps
                      </label>
                       <input 
                         type="number" 
                         value={steps} 
                         onChange={e => onStepsChange?.(parseInt(e.target.value) || 25)} 
                         className="control-number"
                         min="10" 
                         max="50"
                       />
                    </div>
                    <Slider value={[steps]} onValueChange={value => onStepsChange?.(value[0])} min={10} max={50} step={1} size="xs" className="w-full max-w-[140px] sm:max-w-full" />
                  </div>

                  {/* Reference Strength */}
                  <div>
                     <div className="flex items-center justify-between mb-1">
                       <label className="text-[10px] font-medium text-muted-foreground">
                         Ref Strength <span className="text-[8px] text-muted-foreground/60">(Variation: {Math.round((1 - referenceStrength) * 100)}%)</span>
                       </label>
                      <input 
                        type="number" 
                        value={referenceStrength.toFixed(2)} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0.1 && val <= 0.9) {
                            onReferenceStrengthChange?.(val);
                          }
                        }} 
                        className="control-number"
                        min="0.1" 
                        max="0.9"
                        step="0.05"
                      />
                    </div>
                    <Slider 
                      value={[referenceStrength]} 
                      onValueChange={value => onReferenceStrengthChange?.(value[0])} 
                      min={0.1} 
                      max={0.9} 
                      step={0.05} 
                      size="xs"
                      className="w-full max-w-[140px] sm:max-w-full" 
                    />
                  </div>

                  {/* Guidance Scale */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        CFG
                      </label>
                       <input 
                         type="number" 
                         value={guidanceScale} 
                         onChange={e => onGuidanceScaleChange?.(parseFloat(e.target.value) || 7.5)} 
                         className="control-number"
                         min="1" 
                         max="20"
                         step="0.5"
                       />
                    </div>
                    <Slider value={[guidanceScale]} onValueChange={value => onGuidanceScaleChange?.(value[0])} min={1} max={20} step={0.5} size="xs" className="w-full max-w-[140px] sm:max-w-full" />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Batch Size - Compact Chips */}
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Batch Size
                  </label>
                  <div className="flex gap-0">
                    {[1, 3, 6].map((size) => (
                      <button
                        key={size}
                        onClick={() => onNumImagesChange?.(size)}
                        disabled={mode === 'video'}
                        className={`chip-segmented ${size === 1 ? 'rounded-r-none border-r-0' : size === 6 ? 'rounded-l-none border-l-0' : 'rounded-none'} ${
                          numImages === size ? 'chip-segmented-active' : ''
                        } ${mode === 'video' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed - Inline with Lock */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Seed
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onLockSeedChange?.(!lockSeed)}
                            className={`w-4 h-4 rounded text-[8px] font-medium transition-colors flex items-center justify-center ${
                              lockSeed 
                                ? 'bg-yellow-500 text-white' 
                                : 'bg-muted text-muted-foreground hover:bg-yellow-100 hover:text-yellow-600'
                            }`}
                          >
                            {lockSeed ? '🔒' : '🔓'}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs z-50 bg-popover border border-border shadow-lg">
                          {lockSeed ? 'Seed locked - unlock for variation' : 'Click to lock seed'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <input 
                    type="number" 
                    value={seed || ''} 
                    onChange={e => onSeedChange?.(e.target.value ? parseInt(e.target.value) : null)} 
                    placeholder="Random" 
                    className="field-xxs w-full" 
                    min="0" 
                    max="2147483647" 
                  />
                </div>

                {/* Additional Negative Prompt */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-medium text-muted-foreground">
                      Additional Negative Prompt
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showBaseNegative && !baseNegativePrompt) {
                          fetchBaseNegativePrompt();
                        }
                        setShowBaseNegative(!showBaseNegative);
                      }}
                      className="text-[9px] text-primary hover:text-primary/80"
                    >
                      {showBaseNegative ? 'Hide base' : 'View base'}
                    </button>
                  </div>
                   <div className="text-[9px] text-muted-foreground mb-1">
                     A base negative prompt for {selectedModel?.type?.toUpperCase() || 'SDXL'} {contentType.toUpperCase()} is applied automatically
                   </div>
                   {showBaseNegative && (
                     <div className="mb-2 p-1 bg-muted/20 border border-border/30 rounded text-[9px] text-muted-foreground max-h-16 overflow-y-auto">
                       {loadingBaseNegative ? 'Loading...' : baseNegativePrompt || 'No base negative prompt'}
                     </div>
                   )}
                   
                   {/* Negative Prompt Presets */}
                   <div className="mb-2">
                     <NegativePromptPresets 
                       currentPrompt={negativePrompt} 
                       onSelect={onNegativePromptChange || (() => {})} 
                     />
                   </div>
                   
                   <textarea 
                     value={negativePrompt} 
                     onChange={e => onNegativePromptChange?.(e.target.value)} 
                     placeholder="Additional negatives..." 
                     className="w-full h-12 px-2 py-1 bg-background border border-input rounded text-[10px] resize-none"
                     rows={2} 
                   />
                </div>

                {/* Compel Enhancement */}
                <div className="col-span-2">
                  <label className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={compelEnabled} onChange={e => onCompelEnabledChange?.(e.target.checked)} className="w-3 h-3" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Compel Enhancement
                    </span>
                  </label>
                  {compelEnabled && (
                    <input type="text" value={compelWeights} onChange={e => onCompelWeightsChange?.(e.target.value)} placeholder="(woman:1.2), (beautiful:0.8)" className="w-full h-7 px-2 bg-background border border-input rounded text-[10px]" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>;
};
