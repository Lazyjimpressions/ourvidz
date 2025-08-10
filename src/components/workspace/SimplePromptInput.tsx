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

    // Handle workspace item drops
    try {
      const workspaceItem = JSON.parse(e.dataTransfer.getData('application/json'));
      if (workspaceItem.url && workspaceItem.type === 'image') {
        if (onImageUrlChange) {
          onImageUrlChange(workspaceItem.url);
        }
        onFileChange(null);
      }
    } catch (error) {
      // Not a JSON drop, ignore
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
      className={`border border-border rounded h-9 w-12 transition-all duration-200 overflow-hidden ${
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
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors bg-muted/50">
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
  onReferenceMetadataChange
}) => {
  // LTX-Style Popup States
  const [showShotTypePopup, setShowShotTypePopup] = useState(false);
  const [showAnglePopup, setShowAnglePopup] = useState(false);
  const [showStylePopup, setShowStylePopup] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating && (prompt.trim() || exactCopyMode)) {
      onGenerate();
    }
  };

  // Scenario 2: When a user uploads a reference image file, auto-enable Exact Copy with high strength
  const handleReferenceFileChange = (file: File | null) => {
    onReferenceImageChange(file);
    if (file) {
      onExactCopyModeChange?.(true);
      onReferenceStrengthChange(0.8); // High strength for exact copying
      onModeChange('image');
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

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-3 py-2">
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
                    onImageUrlChange={onReferenceImageUrlChange}
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
                     {exactCopyMode && referenceMetadata && (
                       <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                         <div className="font-medium text-foreground">Original Prompt:</div>
                         <div className="text-muted-foreground text-[10px] max-h-8 overflow-y-auto">
                           {referenceMetadata.originalEnhancedPrompt}
                         </div>
                         {prompt.trim() && (
                           <>
                             <div className="font-medium text-foreground">Final Prompt:</div>
                             <div className="text-primary text-[10px] max-h-8 overflow-y-auto">
                               {modifyOriginalPrompt(referenceMetadata.originalEnhancedPrompt, prompt.trim())}
                             </div>
                           </>
                         )}
                       </div>
                     )}
                     {exactCopyMode && !referenceMetadata && prompt.length === 0 && (
                       <div className="absolute bottom-1 left-3 text-[10px] text-muted-foreground">
                         Try: "change outfit to bikini" • "in a forest setting" • "different hairstyle"
                       </div>
                     )}
                  </div>
                  
                  {/* Generate Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || (!prompt.trim() && !exactCopyMode)}
                    className="h-16 w-16 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Row 2: VIDEO button + Controls */}
            <div className="flex items-center justify-between gap-1.5">
              
              {/* VIDEO Button (Stacked) */}
              <div className="flex flex-col">
                <button
                  onClick={() => onModeChange('video')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    mode === 'video'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Video size={10} />
                  VIDEO
                </button>
              </div>

              {/* Control Buttons - Right Side */}
              <div className="flex items-center gap-1">
                
                {/* SFW Button */}
                <button
                  onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    contentType === 'sfw'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  SFW
                </button>

                {/* Exact Copy & Params Toggles (shown when reference is set) */}
                {(referenceImage || referenceImageUrl) && (
                  <div className="flex items-center gap-2 ml-2">
                    <label className="flex items-center gap-1 text-[11px] text-foreground">
                      <input type="checkbox" checked={exactCopyMode} onChange={(e) => onExactCopyModeChange?.(e.target.checked)} />
                      Exact Copy
                    </label>
                    {referenceImageUrl !== null && (
                      <>
                        <label className="flex items-center gap-1 text-[11px] text-foreground">
                          <input type="checkbox" checked={useOriginalParams} onChange={(e) => onUseOriginalParamsChange?.(e.target.checked)} />
                          Use params
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-foreground">
                          <input type="checkbox" checked={lockSeed} onChange={(e) => onLockSeedChange?.(e.target.checked)} />
                          Lock seed
                        </label>
                      </>
                    )}
                  </div>
                )}

                {/* Enhancement Model Dropdown */}
                <div className="relative">
                  <select
                    value={enhancementModel}
                    onChange={(e) => onEnhancementModelChange?.(e.target.value as 'qwen_base' | 'qwen_instruct' | 'none')}
                    className="px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-5"
                  >
                    <option value="qwen_instruct">Instruct</option>
                    <option value="qwen_base">Base</option>
                    <option value="none">None</option>
                  </select>
                  <ChevronDown size={8} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                 {/* Mode-specific controls - Disable in exact copy mode */}
                 {mode === 'image' && !exactCopyMode ? (
                  <>
                    {/* Aspect Ratio Button */}
                    <button
                      onClick={handleAspectRatioToggle}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        aspectRatio === '16:9'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {aspectRatio}
                    </button>
                    
                    {/* Shot Type Button with Popup */}
                    <div className="relative">
                      <button
                        onClick={handleShotTypeToggle}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          shotType !== 'wide'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Camera size={8} />
                        Shot
                      </button>
                      
                      {/* Shot Type Popup */}
                      {showShotTypePopup && (
                        <div className="absolute bottom-full right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[150px] z-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-popover-foreground">Shot Type</h3>
                            <button
                              onClick={() => setShowShotTypePopup(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          
                          {/* Shot Type Options */}
                          <div className="grid grid-cols-1 gap-1">
                            {shotTypeOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleShotTypeSelect(option.value as any)}
                                className={`p-1.5 rounded text-[11px] transition-colors text-left ${
                                  shotType === option.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{option.icon}</span>
                                  <span className="capitalize">{option.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Angle Button with Popup */}
                    <div className="relative">
                      <button
                        onClick={handleCameraAngleToggle}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          cameraAngle !== 'none'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Camera size={8} />
                        Angle
                      </button>
                      
                      {/* Angle Popup */}
                      {showAnglePopup && (
                        <div className="absolute bottom-full right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px] z-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-popover-foreground">Camera Angle</h3>
                            <button
                              onClick={() => setShowAnglePopup(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          
                          {/* 2x3 Grid of Angle Options */}
                          <div className="grid grid-cols-3 gap-1">
                            {cameraAngleOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleCameraAngleSelect(option.value as any)}
                                className={`p-1.5 rounded text-[10px] transition-colors ${
                                  cameraAngle === option.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                <div className="text-sm mb-0.5">{option.icon}</div>
                                <div className="text-[10px]">{option.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Style Button with Popup */}
                    <div className="relative">
                      <button
                        onClick={handleStyleToggle}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          style
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Palette size={8} />
                        Style
                      </button>
                      
                      {/* Style Popup */}
                      {showStylePopup && (
                        <div className="absolute bottom-full right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[240px] max-w-[300px] z-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-popover-foreground">Style</h3>
                            <button
                              onClick={() => setShowStylePopup(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          
                          {/* Style Presets Grid */}
                          <div className="grid grid-cols-3 gap-1 mb-2">
                            {stylePresets.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => handleStyleSelect(preset.style)}
                                className={`p-1.5 rounded text-[10px] transition-colors ${
                                  style === preset.style
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>

                          {/* Custom Style Input */}
                          <input
                            type="text"
                            value={style}
                            onChange={(e) => onStyleChange?.(e.target.value)}
                            placeholder="Custom style..."
                            className="w-full px-1.5 py-1 bg-background border border-input rounded text-foreground placeholder-muted-foreground text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Video Model Label */}
                    <span className="text-[11px] text-muted-foreground">LTX</span>
                    
                    {/* 16:9 Button */}
                    <button
                      onClick={handleAspectRatioToggle}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        aspectRatio === '16:9'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {aspectRatio}
                    </button>
                    
                    {/* 5s Duration (Static) */}
                    <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[11px]">5s</span>
                    
                    {/* Sound Button */}
                    <button
                      onClick={() => onSoundToggle?.(!soundEnabled)}
                      className={`p-0.5 rounded transition-colors ${
                        soundEnabled
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Volume2 size={10} />
                    </button>
                    
                    {/* Motion Intensity Button */}
                      <button
                        onClick={() => onMotionIntensityChange?.(motionIntensity === 0.5 ? 0.8 : 0.5)}
                        className={`p-0.5 rounded transition-colors ${
                          motionIntensity > 0.5
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Zap size={10} />
                      </button>
                    </>
                  )}
                  {exactCopyMode && mode === 'video' && (
                    <div className="text-xs text-muted-foreground">
                      Style controls disabled in exact copy mode
                    </div>
                  )}
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
};