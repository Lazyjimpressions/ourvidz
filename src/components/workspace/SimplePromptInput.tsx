import React, { useState } from 'react';
import { Image, Video, Play, Camera, Volume2, Zap, ChevronDown, Cog, X, Palette, Copy, Edit3 } from 'lucide-react';
import { modifyOriginalPrompt } from '@/utils/promptModification';

// Compact reference upload component
const ReferenceImageUpload: React.FC<{
  file: File | null;
  onFileChange: (file: File | null) => void;
  label: string;
  imageUrl?: string | null;
  onImageUrlChange?: (url: string | null) => void;
}> = ({
  file,
  onFileChange,
  label,
  imageUrl,
  onImageUrlChange
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
            detail: { workspaceItem }
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

  return (
    <div 
      className={`border border-border/30 bg-muted/10 rounded h-9 w-12 transition-all duration-200 overflow-hidden ${
        isDragOver ? 'border-primary bg-primary/10' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {displayImage ? (
        <div className="relative w-full h-full">
          <img 
            src={displayImage} 
            alt={label} 
            className="w-full h-full object-cover" 
          />
          <button 
            onClick={clearReference} 
            className="absolute -top-0.5 -right-0.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-[10px]"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors bg-muted/20">
          <Camera className="w-2.5 h-2.5 mb-0.5" />
          <span className="text-[9px]">{label}</span>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </label>
      )}
    </div>
  );
};

interface SimplePromptInputProps {
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
  aspectRatio = '16:9',
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
  onSeedChange
}) => {
  // LTX-Style Popup States
  const [showShotTypePopup, setShowShotTypePopup] = useState(false);
  const [showAnglePopup, setShowAnglePopup] = useState(false);
  const [showStylePopup, setShowStylePopup] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating && (prompt.trim() || exactCopyMode)) {
      onGenerate();
    }
  };

  // Auto-enable exact copy when reference image is set
  const handleReferenceFileChange = (file: File | null) => {
    onReferenceImageChange(file);
    if (file) {
      onExactCopyModeChange?.(true);
      onReferenceStrengthChange(0.8); // High strength for exact copying
      onModeChange('image');
    } else {
      // Clear exact copy mode when reference is removed
      onExactCopyModeChange?.(false);
      onReferenceMetadataChange?.(null);
    }
  };

  // Handle reference image URL changes (for drag-and-drop)
  const handleReferenceUrlChange = (url: string | null) => {
    onReferenceImageUrlChange?.(url);
    if (url) {
      onExactCopyModeChange?.(true);
      onReferenceStrengthChange(0.8);
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
  };

  const handleCameraAngleToggle = () => {
    setShowAnglePopup(!showAnglePopup);
    setShowShotTypePopup(false);
    setShowStylePopup(false);
  };

  const handleStyleToggle = () => {
    setShowStylePopup(!showStylePopup);
    setShowShotTypePopup(false);
    setShowAnglePopup(false);
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
  
  // Previews for Exact Copy mode
  const originalPromptPreview = exactCopyMode ? (referenceMetadata?.originalEnhancedPrompt || null) : null;
  const finalPromptPreview = exactCopyMode
    ? (referenceMetadata?.originalEnhancedPrompt
        ? modifyOriginalPrompt(referenceMetadata.originalEnhancedPrompt, prompt.trim() || '')
        : (prompt.trim() ? `${prompt.trim()}, exact copy, high quality` : 'exact copy, high quality'))
    : null;
  return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background/80 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg px-3 py-2 relative">
          <div className="space-y-1.5">
            {/* Row 1: IMAGE button + Reference Images + Prompt Input */}
            <div className="flex items-center gap-1.5">
              {/* IMAGE Button (Stacked) */}
              <div className="flex flex-col">
                <button
                  onClick={() => onModeChange('image')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    mode === 'image'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Image size={10} />
                  IMAGE
                </button>
              </div>

              {/* Reference Images */}
              <div className="flex gap-1">
                {mode === 'image' ? (
                  <ReferenceImageUpload
                    file={referenceImage}
                    onFileChange={handleReferenceFileChange}
                    imageUrl={referenceImageUrl}
                    onImageUrlChange={handleReferenceUrlChange}
                    label="Ref"
                  />
                ) : (
                  <>
                    <ReferenceImageUpload
                      file={beginningRefImage || null}
                      onFileChange={onBeginningRefImageChange || (() => {})}
                      imageUrl={beginningRefImageUrl}
                      onImageUrlChange={onBeginningRefImageUrlChange}
                      label="Start"
                    />
                    <ReferenceImageUpload
                      file={endingRefImage || null}
                      onFileChange={onEndingRefImageChange || (() => {})}
                      imageUrl={endingRefImageUrl}
                      onImageUrlChange={onEndingRefImageUrlChange}
                      label="End"
                    />
                  </>
                )}
              </div>

              {/* Prompt Input - Wider like LTX */}
              <div className="flex-1">
                <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <textarea
                      value={prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      placeholder={exactCopyMode ? "Type modifications like 'change outfit to bikini' or leave empty to copy exactly..." : "A close-up of a woman talking on the phone..."}
                      className={`flex-1 h-16 py-2 px-3 bg-background border rounded text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none w-full ${
                        exactCopyMode ? 'border-primary/50' : 'border-input'
                      }`}
                      rows={3}
                      disabled={isGenerating}
                    />
                    {exactCopyMode && (
                      <div className="absolute top-1 right-1 flex items-center gap-1 text-xs text-primary">
                        <Copy size={10} />
                        <span className="text-[10px] font-medium">Exact Copy</span>
                      </div>
                    )}
                  </div>

                  {/* Generate Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || (!prompt.trim() && !exactCopyMode)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    ) : (
                      <Zap size={12} />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>

                  {/* Advanced Settings Button */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className={`flex items-center gap-1 px-2 py-2 rounded text-sm font-medium transition-colors ${
                      showAdvancedSettings
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Cog size={12} />
                  </button>
                </form>
              </div>
            </div>

            {/* Row 2: Control Bar */}
            <div className="flex items-center gap-1 text-xs">
              {/* Quality Toggle */}
              <button
                onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  quality === 'high'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {quality === 'high' ? 'HIGH' : 'FAST'}
              </button>

              {/* Content Type */}
              <button
                onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  contentType === 'nsfw'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
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

              {/* Shot Type */}
              <div className="relative">
                <button
                  onClick={handleShotTypeToggle}
                  className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded text-[10px] font-medium transition-colors"
                >
                  {shotType.toUpperCase()}
                  <ChevronDown size={8} />
                </button>

                {/* Shot Type Popup */}
                {showShotTypePopup && (
                  <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-24">
                    {shotTypeOptions.map((option) => (
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

                {/* Camera Angle Popup */}
                {showAnglePopup && (
                  <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-32">
                    {cameraAngleOptions.map((option) => (
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

                {/* Style Popup */}
                {showStylePopup && (
                  <div className="absolute bottom-full mb-1 left-0 bg-background border border-border rounded shadow-lg z-50 min-w-32 max-h-48 overflow-y-auto">
                    {stylePresets.map((preset) => (
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
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStyleRefUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings Modal */}
          {showAdvancedSettings && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Advanced Settings</h3>
                <button
                  onClick={() => setShowAdvancedSettings(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Batch Size */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Batch Size
                  </label>
                  <select
                    value={numImages}
                    onChange={(e) => onNumImagesChange?.(parseInt(e.target.value))}
                    className="w-full h-8 px-2 bg-background border border-input rounded text-xs"
                    disabled={mode === 'video'}
                  >
                    <option value={1}>1 Image</option>
                    <option value={3}>3 Images</option>
                    <option value={6}>6 Images</option>
                  </select>
                </div>

                {/* Steps */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Steps ({steps})
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={steps}
                    onChange={(e) => onStepsChange?.(parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Guidance Scale */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Guidance Scale ({guidanceScale})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={guidanceScale}
                    onChange={(e) => onGuidanceScaleChange?.(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Seed */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Seed (Optional)
                  </label>
                  <input
                    type="number"
                    value={seed || ''}
                    onChange={(e) => onSeedChange?.(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Random"
                    className="w-full h-8 px-2 bg-background border border-input rounded text-xs"
                    min="0"
                    max="2147483647"
                  />
                </div>

                {/* Negative Prompt */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Negative Prompt
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => onNegativePromptChange?.(e.target.value)}
                    placeholder="What to avoid in the image..."
                    className="w-full h-16 px-2 py-1 bg-background border border-input rounded text-xs resize-none"
                    rows={2}
                  />
                </div>

                {/* Compel Enhancement */}
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={compelEnabled}
                      onChange={(e) => onCompelEnabledChange?.(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Enable Compel Enhancement
                    </span>
                  </label>
                  {compelEnabled && (
                    <input
                      type="text"
                      value={compelWeights}
                      onChange={(e) => onCompelWeightsChange?.(e.target.value)}
                      placeholder="e.g., (woman:1.2), (beautiful:0.8)"
                      className="w-full h-8 px-2 mt-2 bg-background border border-input rounded text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
