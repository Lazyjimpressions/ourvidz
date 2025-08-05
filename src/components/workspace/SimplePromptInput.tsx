import React, { useState } from 'react';
import { Image, Video, Play, Camera, Volume2, Zap, ChevronDown, Cog, X } from 'lucide-react';

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
      className={`border border-gray-600 rounded h-12 w-16 transition-all duration-200 overflow-hidden ${
        isDragOver ? 'border-blue-400 bg-blue-400/10' : ''
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
            className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-white transition-colors bg-gray-800/50">
          <Camera className="w-3 h-3 mb-0.5" />
          <span className="text-xs">{label}</span>
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
  onEnhancementModelChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAnglePopup, setShowAnglePopup] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating && prompt.trim()) {
      onGenerate();
    }
  };

  const handleAspectRatioToggle = () => {
    if (!onAspectRatioChange) return;
    const ratios: Array<'16:9' | '1:1' | '9:16'> = ['16:9', '1:1', '9:16'];
    const currentIndex = ratios.indexOf(aspectRatio);
    const nextIndex = (currentIndex + 1) % ratios.length;
    onAspectRatioChange(ratios[nextIndex]);
  };

  const handleShotTypeToggle = () => {
    if (!onShotTypeChange) return;
    const types: Array<'wide' | 'medium' | 'close'> = ['wide', 'medium', 'close'];
    const currentIndex = types.indexOf(shotType);
    const nextIndex = (currentIndex + 1) % types.length;
    onShotTypeChange(types[nextIndex]);
  };

  const handleCameraAngleToggle = () => {
    setShowAnglePopup(!showAnglePopup);
  };

  const handleCameraAngleSelect = (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => {
    if (onCameraAngleChange) {
      onCameraAngleChange(angle);
    }
    setShowAnglePopup(false);
  };

  // Camera angle options
  const cameraAngleOptions = [
    { value: 'none', label: 'None', icon: '◢' },
    { value: 'eye_level', label: 'Eye level', icon: '👁️' },
    { value: 'low_angle', label: 'Low angle', icon: '⬆️' },
    { value: 'over_shoulder', label: 'Over shoulder', icon: '👤' },
    { value: 'overhead', label: 'Overhead', icon: '⬇️' },
    { value: 'bird_eye', label: 'Bird\'s eye', icon: '🦅' }
  ];

  const handleStyleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (onStyleRefChange) {
      onStyleRefChange(file);
    }
  };

  return (
    <>
      {/* Bottom Control Bar - Fixed Width Like LTX */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-t-2xl px-4 py-3 w-[1040px]">
          
          {/* Row 1: IMAGE button + Reference + Prompt + Generate */}
          <div className="flex items-center gap-3 mb-2">
            
            {/* IMAGE Button (Stacked Mode Toggle) */}
            <div className="flex flex-col">
              <button
                onClick={() => onModeChange('image')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === 'image'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Image size={12} />
                IMAGE
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
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="A close-up of a woman talking on the phone..."
                  className="flex-1 h-12 py-2 px-3 bg-black border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={2}
                  disabled={isGenerating}
                />
                
                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="h-12 w-12 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Row 2: VIDEO button + Controls */}
          <div className="flex items-center justify-between gap-3">
            
            {/* VIDEO Button (Stacked) */}
            <div className="flex flex-col">
              <button
                onClick={() => onModeChange('video')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === 'video'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Video size={12} />
                VIDEO
              </button>
            </div>

            {/* Control Buttons - Right Side */}
            <div className="flex items-center gap-2">
              
              {/* SFW Button */}
              <button
                onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  contentType === 'sfw'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                SFW
              </button>

              {/* Enhancement Model Dropdown */}
              <div className="relative">
                <select
                  value={enhancementModel}
                  onChange={(e) => onEnhancementModelChange?.(e.target.value as 'qwen_base' | 'qwen_instruct')}
                  className="px-2 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6"
                >
                  <option value="qwen_instruct">Instruct</option>
                  <option value="qwen_base">Base</option>
                </select>
                <ChevronDown size={10} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Mode-specific controls */}
              {mode === 'image' ? (
                <>
                  {/* 16:9 Button */}
                  <button
                    onClick={handleAspectRatioToggle}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      aspectRatio === '16:9'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {aspectRatio}
                  </button>
                  
                  {/* Shot Type Button */}
                  <button
                    onClick={handleShotTypeToggle}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      shotType !== 'wide'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Shot Type
                  </button>
                  
                  {/* Angle Button with Popup */}
                  <div className="relative">
                    <button
                      onClick={handleCameraAngleToggle}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        cameraAngle !== 'none'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <Camera size={10} />
                      Angle
                    </button>
                    
                    {/* Angle Popup */}
                    {showAnglePopup && (
                      <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-3 min-w-[280px] z-50">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-white">Camera Angle</h3>
                          <button
                            onClick={() => setShowAnglePopup(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        {/* 2x3 Grid of Angle Options */}
                        <div className="grid grid-cols-3 gap-2">
                          {cameraAngleOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleCameraAngleSelect(option.value as any)}
                              className={`p-2 rounded text-xs transition-colors ${
                                cameraAngle === option.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <div className="text-lg mb-1">{option.icon}</div>
                              <div className="text-xs">{option.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Style Input */}
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => onStyleChange?.(e.target.value)}
                    placeholder="Style"
                    className="px-2 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
                  />
                  
                  {/* Style Ref Upload */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStyleRefUpload}
                      className="hidden"
                      id="style-ref-upload"
                    />
                    <label
                      htmlFor="style-ref-upload"
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        styleRef
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Style ref
                    </label>
                  </div>
                  
                  {/* Advanced Controls Button for Image Mode */}
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium hover:bg-gray-600 transition-colors"
                    title="Advanced Controls"
                  >
                    <Cog size={10} />
                    Advanced
                  </button>
                </>
              ) : (
                <>
                  {/* Video Model Label */}
                  <span className="text-xs text-gray-400">LTX Turbo</span>
                  
                  {/* 16:9 Button */}
                  <button
                    onClick={handleAspectRatioToggle}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      aspectRatio === '16:9'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {aspectRatio}
                  </button>
                  
                  {/* 5s Duration (Static) */}
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">5s</span>
                  
                  {/* Sound Button */}
                  <button
                    onClick={() => onSoundToggle?.(!soundEnabled)}
                    className={`p-1 rounded transition-colors ${
                      soundEnabled
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Volume2 size={12} />
                  </button>
                  
                  {/* Motion Intensity Button */}
                  <button
                    onClick={() => onMotionIntensityChange?.(motionIntensity === 0.5 ? 0.8 : 0.5)}
                    className={`p-1 rounded transition-colors ${
                      motionIntensity > 0.5
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Zap size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-20" />

      {/* Advanced Controls Modal for Image Mode */}
      {showAdvanced && mode === 'image' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Advanced Controls</h2>
              <button
                onClick={() => setShowAdvanced(false)}
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
                  {[
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
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => onStyleChange?.(preset.style)}
                      className={`relative aspect-square rounded-lg border-2 transition-all ${
                        style === preset.style
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="w-full h-full bg-gray-800 rounded-md flex items-center justify-center">
                        <span className="text-xs text-gray-400">{preset.name}</span>
                      </div>
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

              {/* Advanced Parameters */}
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

                {/* Reference Strength */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Reference Strength</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={referenceStrength}
                    onChange={(e) => onReferenceStrengthChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">{referenceStrength.toFixed(1)}</div>
                </div>

                {/* Style Reference Upload */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Style Reference</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onStyleRefChange?.(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};