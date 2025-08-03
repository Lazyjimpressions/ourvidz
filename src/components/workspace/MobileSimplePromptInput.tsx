import React, { useState } from 'react';
import { Image, Video, Play, Settings, Palette, Camera, Square, Volume2, Zap, X } from 'lucide-react';
// Inline reference upload component (replaces deleted ReferenceImageUpload)
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
    <div className="border border-gray-600 rounded-lg p-2">
      {file ? (
        <div className="relative">
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="w-full h-12 object-cover rounded"
          />
          <button
            onClick={() => onFileChange(null)}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white h-12">
          <Image className="w-6 h-6" />
          <span className="text-sm">{label}</span>
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
  // NEW: Control parameters
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
  // NEW: Enhancement model selection
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
  videoDuration = 3,
  onVideoDurationChange,
  motionIntensity = 0.5,
  onMotionIntensityChange,
  soundEnabled = false,
  onSoundEnabledChange,
  // NEW: Control parameters with defaults
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
  // NEW: Enhancement model selection with defaults
  enhancementModel = 'qwen_instruct',
  onEnhancementModelChange
}) => {
  // State for angle popup
  const [showAnglePopup, setShowAnglePopup] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating && prompt.trim()) {
      onGenerate();
    }
  };

  // Handle aspect ratio toggle
  const handleAspectRatioToggle = () => {
    if (!onAspectRatioChange) return;
    
    const ratios: Array<'16:9' | '1:1' | '9:16'> = ['16:9', '1:1', '9:16'];
    const currentIndex = ratios.indexOf(aspectRatio);
    const nextIndex = (currentIndex + 1) % ratios.length;
    onAspectRatioChange(ratios[nextIndex]);
  };

  // Handle shot type toggle
  const handleShotTypeToggle = () => {
    if (!onShotTypeChange) return;
    
    const types: Array<'wide' | 'medium' | 'close'> = ['wide', 'medium', 'close'];
    const currentIndex = types.indexOf(shotType);
    const nextIndex = (currentIndex + 1) % types.length;
    onShotTypeChange(types[nextIndex]);
  };

  // Handle camera angle selection
  const handleCameraAngleSelect = (angle: 'none' | 'eye_level' | 'low_angle' | 'over_shoulder' | 'overhead' | 'bird_eye') => {
    if (onCameraAngleChange) {
      onCameraAngleChange(angle);
    }
    setShowAnglePopup(false);
  };

  // Handle enhancement model toggle
  const handleEnhancementModelToggle = () => {
    if (!onEnhancementModelChange) return;
    
    const newModel = enhancementModel === 'qwen_instruct' ? 'qwen_base' : 'qwen_instruct';
    onEnhancementModelChange(newModel);
  };

  // Handle style input
  const handleStyleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onStyleChange) {
      onStyleChange(e.target.value);
    }
  };

  // Handle style reference upload
  const handleStyleRefUpload = (file: File | null) => {
    if (onStyleRefChange) {
      onStyleRefChange(file);
    }
  };

  // Camera angle options with display names
  const cameraAngleOptions = [
    { value: 'none', label: 'None', icon: '◢' },
    { value: 'eye_level', label: 'Eye level', icon: '👁️' },
    { value: 'low_angle', label: 'Low angle', icon: '⬆️' },
    { value: 'over_shoulder', label: 'Over the shoulder', icon: '👤' },
    { value: 'overhead', label: 'Overhead', icon: '⬇️' },
    { value: 'bird_eye', label: 'Bird\'s eye view', icon: '🦅' }
  ];

  return (
    <>
      {/* Mobile Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-4">
        
        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="A close-up of a woman talking on the phone..."
            className="w-full h-20 p-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </form>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onModeChange('image')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'image'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Image size={16} className="mx-auto mb-1" />
            IMAGE
          </button>
          <button
            onClick={() => onModeChange('video')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'video'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Video size={16} className="mx-auto mb-1" />
            VIDEO
          </button>
        </div>

        {/* Reference Image */}
        <div className="mb-4">
          {mode === 'image' ? (
            <ReferenceImageUpload
              file={referenceImage}
              onFileChange={onReferenceImageChange}
              label="Reference Image"
            />
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="text-xs text-gray-400 block mb-1">Beginning</span>
                <ReferenceImageUpload
                  file={beginningRefImage || null}
                  onFileChange={onBeginningRefImageChange || (() => {})}
                  label="Beginning"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-400 block mb-1">Ending</span>
                <ReferenceImageUpload
                  file={endingRefImage || null}
                  onFileChange={onEndingRefImageChange || (() => {})}
                  label="Ending"
                />
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* SFW/NSFW Toggle */}
          <button
            onClick={() => onContentTypeChange(contentType === 'sfw' ? 'nsfw' : 'sfw')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              contentType === 'sfw'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {contentType.toUpperCase()}
          </button>

          {/* Enhancement Model Toggle - NEW */}
          <button
            onClick={handleEnhancementModelToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              enhancementModel === 'qwen_instruct'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
            title={`Enhancement Model: ${enhancementModel === 'qwen_instruct' ? 'Qwen Instruct' : 'Qwen Base'}`}
          >
            {enhancementModel === 'qwen_instruct' ? 'Instruct' : 'Base'}
          </button>

          {/* Mode-specific controls */}
          {mode === 'image' ? (
            <>
              {/* 16:9 Aspect Ratio */}
              <button
                onClick={handleAspectRatioToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  aspectRatio === '16:9'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {aspectRatio}
              </button>
              
              {/* Wide Button */}
              <button
                onClick={handleShotTypeToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  shotType === 'wide'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {shotType.charAt(0).toUpperCase() + shotType.slice(1)}
              </button>
              
              {/* Angle Button - NEW with popup */}
              <div className="relative">
                <button
                  onClick={() => setShowAnglePopup(!showAnglePopup)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    cameraAngle !== 'none'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                  title={`Camera Angle: ${cameraAngleOptions.find(opt => opt.value === cameraAngle)?.label || 'None'}`}
                >
                  <Camera size={14} />
                  Angle
                </button>
                
                {/* Angle Popup */}
                {showAnglePopup && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-3 min-w-[280px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-white">Angle</h3>
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
                onChange={handleStyleInput}
                placeholder="Style..."
                className="px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-24"
                disabled={isGenerating}
              />
              
              {/* Style Ref Upload */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleStyleRefUpload(e.target.files?.[0] || null)}
                  className="hidden"
                  id="mobile-style-ref-upload"
                  disabled={isGenerating}
                />
                <label
                  htmlFor="mobile-style-ref-upload"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
              {/* Video Model Selector */}
              <select className="px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>WAN 2.1</option>
              </select>
              
              {/* 16:9 Aspect Ratio */}
              <button
                onClick={handleAspectRatioToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  aspectRatio === '16:9'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {aspectRatio}
              </button>
              
              {/* Video Duration */}
              <select 
                className="px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={videoDuration}
                onChange={(e) => onVideoDurationChange?.(Number(e.target.value))}
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
              </select>
              
              {/* Sound Toggle */}
              <button
                onClick={() => onSoundEnabledChange?.(!soundEnabled)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  soundEnabled 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                }`}
              >
                <Volume2 size={16} />
              </button>
              
              {/* Motion Intensity */}
              <button
                onClick={() => onMotionIntensityChange?.(motionIntensity === 0.5 ? 0.8 : 0.5)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  motionIntensity > 0.5
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                }`}
              >
                <Zap size={16} />
              </button>
            </>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Play size={16} />
          Generate
        </button>
      </div>

      {/* Bottom Spacer */}
      <div className="h-64" />
    </>
  );
}; 