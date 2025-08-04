import React, { useState } from 'react';
import { Image, Video, Play, Settings, Palette, Camera, Square, Volume2, Zap, X, Cog } from 'lucide-react';

// Inline reference upload component with LTX styling
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

    // Handle URL drops (from workspace images)
    const url = e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http') && (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg') || url.includes('.webp'))) {
      if (onImageUrlChange) {
        onImageUrlChange(url);
      }
      onFileChange(null);
      return;
    }

    // Handle custom data drops (from workspace items)
    try {
      const workspaceItem = JSON.parse(e.dataTransfer.getData('application/json'));
      if (workspaceItem.url && workspaceItem.type === 'image') {
        if (onImageUrlChange) {
          onImageUrlChange(workspaceItem.url);
        }
        onFileChange(null);
        return;
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

  // Show either file or URL image
  const displayImage = file ? URL.createObjectURL(file) : imageUrl;

  return (
    <div 
      className={`border border-gray-600 rounded-lg overflow-hidden h-14 w-20 transition-all duration-200 ${
        isDragOver ? 'border-blue-400 bg-blue-400/10 scale-105' : 'hover:border-gray-500'
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
            className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs transition-colors"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700/50">
          <Image className="w-4 h-4 mb-0.5" />
          <span className="text-xs text-center leading-tight">{label}</span>
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

// LTX-Style Advanced Controls Modal
const AdvancedControlsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mode: 'image' | 'video';
  // Image controls
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
  // Video controls
  videoDuration?: number;
  onVideoDurationChange?: (duration: number) => void;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  motionIntensity?: number;
  onMotionIntensityChange?: (intensity: number) => void;
}> = ({
  isOpen,
  onClose,
  mode,
  aspectRatio = '16:9',
  onAspectRatioChange,
  shotType = 'wide',
  onShotTypeChange,
  cameraAngle = 'none',
  onCameraAngleChange,
  style = '',
  onStyleChange,
  styleRef,
  onStyleRefChange,
  videoDuration = 3,
  onVideoDurationChange,
  soundEnabled = false,
  onSoundToggle,
  motionIntensity = 0.5,
  onMotionIntensityChange
}) => {
  if (!isOpen) return null;

  // Style presets similar to LTX Studio
  const stylePresets = [
    { name: 'None', image: null, style: '' },
    { name: 'Cinematic', image: null, style: 'cinematic lighting, film grain, dramatic composition' },
    { name: 'Vintage', image: null, style: 'vintage photography, retro aesthetic, warm tones' },
    { name: 'Low Key', image: null, style: 'low key lighting, dramatic shadows, high contrast' },
    { name: 'Indy', image: null, style: 'indie film aesthetic, natural lighting, muted colors' },
    { name: 'Y2K', image: null, style: 'Y2K aesthetic, digital glitch, cyber punk vibes' },
    { name: 'Pop', image: null, style: 'pop art style, bright colors, high saturation' },
    { name: 'Grunge', image: null, style: 'grunge aesthetic, rough textures, alternative style' },
    { name: 'Dreamy', image: null, style: 'dreamy atmosphere, soft focus, ethereal lighting' },
    { name: 'Hand Drawn', image: null, style: 'hand drawn illustration, sketch-like, artistic' },
    { name: '2D Novel', image: null, style: '2D anime style, visual novel aesthetic' },
    { name: 'Boost', image: null, style: 'enhanced details, sharp focus, vivid colors' }
  ];

  const cameraAngles = [
    { value: 'none', label: 'None', icon: '◢' },
    { value: 'eye_level', label: 'Eye level', icon: '👁️' },
    { value: 'low_angle', label: 'Low angle', icon: '⬆️' },
    { value: 'over_shoulder', label: 'Over shoulder', icon: '👤' },
    { value: 'overhead', label: 'Overhead', icon: '⬇️' },
    { value: 'bird_eye', label: 'Bird\'s eye', icon: '🦅' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Advanced Controls</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Style Section */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Style</h3>
            
            {/* Style Presets Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {stylePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onStyleChange?.(preset.style)}
                  className={`relative aspect-square rounded-lg border-2 transition-all ${
                    style === preset.style
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {preset.image ? (
                    <img 
                      src={preset.image} 
                      alt={preset.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-md flex items-center justify-center">
                      <span className="text-xs text-gray-400">{preset.name}</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 text-xs font-medium text-white bg-black/60 px-1 rounded">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Style Input */}
            <input
              type="text"
              value={style}
              onChange={(e) => onStyleChange?.(e.target.value)}
              placeholder="Custom style description..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Controls Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Aspect Ratio</label>
              <div className="flex gap-2">
                {['16:9', '1:1', '9:16'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => onAspectRatioChange?.(ratio as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Shot Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Shot Type</label>
              <div className="flex gap-2">
                {['wide', 'medium', 'close'].map((type) => (
                  <button
                    key={type}
                    onClick={() => onShotTypeChange?.(type as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      shotType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Angle */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Camera Angle</label>
              <div className="grid grid-cols-3 gap-2">
                {cameraAngles.map((angle) => (
                  <button
                    key={angle.value}
                    onClick={() => onCameraAngleChange?.(angle.value as any)}
                    className={`p-2 rounded-lg text-xs transition-colors ${
                      cameraAngle === angle.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-lg mb-1">{angle.icon}</div>
                    <div>{angle.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video-specific controls */}
            {mode === 'video' && (
              <>
                {/* Video Duration */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Duration</label>
                  <select 
                    value={videoDuration}
                    onChange={(e) => onVideoDurationChange?.(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={3}>3 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                  </select>
                </div>

                {/* Sound & Motion */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Video Settings</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Sound</span>
                      <button
                        onClick={() => onSoundToggle?.(!soundEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          soundEnabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Motion Intensity</span>
                      <button
                        onClick={() => onMotionIntensityChange?.(motionIntensity === 0.5 ? 0.8 : 0.5)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          motionIntensity > 0.5
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {motionIntensity > 0.5 ? 'High' : 'Low'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
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
  enhancementModel?: 'qwen_base' | 'qwen_instruct';
  onEnhancementModelChange?: (model: 'qwen_base' | 'qwen_instruct') => void;
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
  videoDuration = 3,
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
  onEnhancementModelChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating && prompt.trim()) {
      onGenerate();
    }
  };

  const handleEnhancementModelToggle = () => {
    if (!onEnhancementModelChange) return;
    const newModel = enhancementModel === 'qwen_instruct' ? 'qwen_base' : 'qwen_instruct';
    onEnhancementModelChange(newModel);
  };

  return (
    <>
      {/* LTX-Style Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-t-2xl px-6 py-4 w-full max-w-5xl">
          
          {/* Row 1: Mode Buttons + Reference + Prompt + Generate */}
          <div className="flex items-center gap-4 mb-3">
            
            {/* Mode Toggle - Pill Style */}
            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                onClick={() => onModeChange('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'image'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Image size={16} />
                Image
              </button>
              <button
                onClick={() => onModeChange('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'video'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Video size={16} />
                Video
              </button>
            </div>

            {/* Reference Image(s) */}
            <div className="flex items-center gap-2">
              {mode === 'image' ? (
                <ReferenceImageUpload
                  file={referenceImage}
                  onFileChange={onReferenceImageChange}
                  imageUrl={referenceImageUrl}
                  onImageUrlChange={onReferenceImageUrlChange}
                  label="Reference"
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

            {/* Prompt Input - Maintained Size */}
            <div className="flex-1">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="A close-up of a woman talking on the phone..."
                  className="flex-1 h-16 py-3 px-4 bg-black border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isGenerating}
                />
                
                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="h-16 w-16 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
                  title="Generate"
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play size={20} />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Row 2: Controls */}
          <div className="flex items-center justify-between">
            
            {/* Left Side - Model Controls */}
            <div className="flex items-center gap-2">
              {/* SFW Toggle - NSFW-first design */}
              <button
                onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  contentType === 'sfw'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Safe for Work Mode"
              >
                SFW
              </button>

              {/* Enhancement Model Selection */}
              <button
                onClick={handleEnhancementModelToggle}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  enhancementModel === 'qwen_instruct'
                    ? 'bg-purple-600 text-white'
                    : 'bg-orange-600 text-white'
                }`}
                title={`Enhancement: ${enhancementModel === 'qwen_instruct' ? 'Instruct (Creative)' : 'Base (Literal)'}`}
              >
                {enhancementModel === 'qwen_instruct' ? 'Instruct' : 'Base'}
              </button>
            </div>

            {/* Right Side - Quick Controls + Advanced */}
            <div className="flex items-center gap-2">
              
              {/* Mode-specific Quick Controls */}
              {mode === 'video' && (
                <>
                  <span className="text-xs text-gray-400">WAN 2.1</span>
                  <div className="w-px h-4 bg-gray-600" />
                  <span className="text-xs text-gray-300">{videoDuration}s</span>
                </>
              )}
              
              {/* Advanced Controls Button */}
              <button
                onClick={() => setShowAdvanced(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full text-xs font-medium hover:bg-gray-600 transition-colors"
                title="Advanced Controls"
              >
                <Cog size={12} />
                Advanced
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls Modal */}
      <AdvancedControlsModal
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        mode={mode}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange}
        shotType={shotType}
        onShotTypeChange={onShotTypeChange}
        cameraAngle={cameraAngle}
        onCameraAngleChange={onCameraAngleChange}
        style={style}
        onStyleChange={onStyleChange}
        styleRef={styleRef}
        onStyleRefChange={onStyleRefChange}
        videoDuration={videoDuration}
        onVideoDurationChange={onVideoDurationChange}
        soundEnabled={soundEnabled}
        onSoundToggle={onSoundToggle}
        motionIntensity={motionIntensity}
        onMotionIntensityChange={onMotionIntensityChange}
      />

      {/* Bottom Spacer */}
      <div className="h-24" />
    </>
  );
};