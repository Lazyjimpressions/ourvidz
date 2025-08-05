import React, { useState } from 'react';
import { Image, Video, Play, Camera, Volume2, Zap, ChevronDown } from 'lucide-react';

// Mobile reference upload component
const ReferenceImageUpload: React.FC<{
  file: File | null;
  onFileChange: (file: File | null) => void;
  label: string;
}> = ({ file, onFileChange, label }) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      onFileChange(uploadedFile);
    }
  };

  return (
    <div className="border border-gray-600 rounded overflow-hidden h-12 w-16">
      {file ? (
        <div className="relative w-full h-full">
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => onFileChange(null)}
            className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-gray-400 bg-gray-800/50">
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

interface MobileSimplePromptInputProps {
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
  referenceStrength: number;
  onReferenceStrengthChange: (strength: number) => void;
  onModeChange: (mode: 'image' | 'video') => void;
  onContentTypeChange: (type: 'sfw' | 'nsfw') => void;
  // Video-specific props
  beginningRefImage?: File | null;
  endingRefImage?: File | null;
  onBeginningRefImageChange?: (file: File | null) => void;
  onEndingRefImageChange?: (file: File | null) => void;
  videoDuration?: number;
  onVideoDurationChange?: (duration: number) => void;
  motionIntensity?: number;
  onMotionIntensityChange?: (intensity: number) => void;
  soundEnabled?: boolean;
  onSoundEnabledChange?: (enabled: boolean) => void;
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

export const MobileSimplePromptInput: React.FC<MobileSimplePromptInputProps> = ({
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
  referenceStrength,
  onReferenceStrengthChange,
  onModeChange,
  onContentTypeChange,
  beginningRefImage,
  endingRefImage,
  onBeginningRefImageChange,
  onEndingRefImageChange,
  videoDuration = 5,
  onVideoDurationChange,
  motionIntensity = 0.5,
  onMotionIntensityChange,
  soundEnabled = false,
  onSoundEnabledChange,
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
    if (!onCameraAngleChange) return;
    const angles: Array<'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye'> = 
      ['none', 'eye_level', 'low_angle', 'over_shoulder', 'overhead', 'bird_eye'];
    const currentIndex = angles.indexOf(cameraAngle);
    const nextIndex = (currentIndex + 1) % angles.length;
    onCameraAngleChange(angles[nextIndex]);
  };

  const handleStyleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (onStyleRefChange) {
      onStyleRefChange(file);
    }
  };

  return (
    <>
      {/* Mobile Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-3 w-full max-w-6xl">
          
          {/* Mode Toggle */}
          <div className="flex bg-gray-700 rounded p-1 mb-3">
            <button
              onClick={() => onModeChange('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-all ${
                mode === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300'
              }`}
            >
              <Image size={14} />
              Image
            </button>
            <button
              onClick={() => onModeChange('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-all ${
                mode === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300'
              }`}
            >
              <Video size={14} />
              Video
            </button>
          </div>

          {/* Reference Images */}
          <div className="flex justify-center gap-3 mb-3">
            {mode === 'image' ? (
              <ReferenceImageUpload
                file={referenceImage}
                onFileChange={onReferenceImageChange}
                label="Ref"
              />
            ) : (
              <>
                <ReferenceImageUpload
                  file={beginningRefImage || null}
                  onFileChange={onBeginningRefImageChange || (() => {})}
                  label="Start"
                />
                <ReferenceImageUpload
                  file={endingRefImage || null}
                  onFileChange={onEndingRefImageChange || (() => {})}
                  label="End"
                />
              </>
            )}
          </div>

          {/* Prompt Input */}
          <form onSubmit={handleSubmit} className="mb-3">
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="A close-up of a woman talking on the phone..."
              className="w-full h-16 p-3 bg-black border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isGenerating}
            />
          </form>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            
            {/* SFW Button */}
            <button
              onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                contentType === 'sfw'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              SFW
            </button>

            {/* Enhancement Model Dropdown */}
            <div className="relative">
              <select
                value={enhancementModel}
                onChange={(e) => onEnhancementModelChange?.(e.target.value as 'qwen_base' | 'qwen_instruct')}
                className="w-full py-2 px-3 bg-gray-700 text-gray-300 border border-gray-600 rounded text-sm appearance-none"
              >
                <option value="qwen_instruct">Instruct</option>
                <option value="qwen_base">Base</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Mode-specific controls */}
            {mode === 'image' ? (
              <>
                {/* Aspect Ratio */}
                <button
                  onClick={handleAspectRatioToggle}
                  className={`py-2 rounded text-sm font-medium transition-colors ${
                    aspectRatio === '16:9'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {aspectRatio}
                </button>
                
                {/* Shot Type */}
                <button
                  onClick={handleShotTypeToggle}
                  className={`py-2 rounded text-sm font-medium transition-colors capitalize ${
                    shotType !== 'wide'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {shotType}
                </button>
                
                {/* Camera Angle */}
                <button
                  onClick={handleCameraAngleToggle}
                  className={`flex items-center justify-center gap-1 py-2 rounded text-sm font-medium transition-colors ${
                    cameraAngle !== 'none'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Camera size={12} />
                  Angle
                </button>
                
                {/* Style Input */}
                <input
                  type="text"
                  value={style}
                  onChange={(e) => onStyleChange?.(e.target.value)}
                  placeholder="Style..."
                  className="py-2 px-3 bg-gray-700 text-gray-300 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                {/* Style Ref Upload */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStyleRefUpload}
                    className="hidden"
                    id="mobile-style-ref"
                  />
                  <label
                    htmlFor="mobile-style-ref"
                    className={`block w-full py-2 px-3 text-center rounded text-sm font-medium transition-colors cursor-pointer ${
                      styleRef
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Style ref
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* Video Model */}
                <div className="py-2 px-3 bg-gray-700 text-gray-300 rounded text-sm text-center">
                  LTX Turbo
                </div>
                
                {/* Aspect Ratio */}
                <button
                  onClick={handleAspectRatioToggle}
                  className={`py-2 rounded text-sm font-medium transition-colors ${
                    aspectRatio === '16:9'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {aspectRatio}
                </button>
                
                {/* Duration (Static) */}
                <div className="py-2 px-3 bg-gray-700 text-gray-300 rounded text-sm text-center">
                  5s
                </div>
                
                {/* Sound Toggle */}
                <button
                  onClick={() => onSoundEnabledChange?.(!soundEnabled)}
                  className={`flex items-center justify-center gap-1 py-2 rounded transition-colors ${
                    soundEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Volume2 size={14} />
                  Sound
                </button>
                
                {/* Motion Intensity */}
                <button
                  onClick={() => onMotionIntensityChange?.(motionIntensity === 0.5 ? 0.8 : 0.5)}
                  className={`flex items-center justify-center gap-1 py-2 rounded transition-colors ${
                    motionIntensity > 0.5
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Zap size={14} />
                  Motion
                </button>
              </>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-80" />
    </>
  );
}; 