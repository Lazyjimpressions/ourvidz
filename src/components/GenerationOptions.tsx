
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Sparkles } from 'lucide-react';
import type { GenerationFormat, GenerationQuality } from '@/types/generation';
import { GENERATION_CONFIGS } from '@/types/generation';

interface GenerationOptionsProps {
  selectedFormat: GenerationFormat;
  selectedQuality: GenerationQuality;
  onFormatChange: (format: GenerationFormat) => void;
  onQualityChange: (quality: GenerationQuality) => void;
}

export const GenerationOptions: React.FC<GenerationOptionsProps> = ({
  selectedFormat,
  selectedQuality,
  onFormatChange,
  onQualityChange
}) => {
  const currentConfig = GENERATION_CONFIGS[`${selectedFormat}_${selectedQuality}`];

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Choose Format</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onFormatChange('image')}
            className={`p-4 rounded-lg border transition-all ${
              selectedFormat === 'image'
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
            }`}
          >
            <div className="text-center">
              <div className="text-xl mb-2">🖼️</div>
              <div className="font-medium">Image</div>
              <div className="text-sm opacity-75">Static image generation</div>
            </div>
          </button>
          
          <button
            onClick={() => onFormatChange('video')}
            className={`p-4 rounded-lg border transition-all ${
              selectedFormat === 'video'
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
            }`}
          >
            <div className="text-center">
              <div className="text-xl mb-2">🎬</div>
              <div className="font-medium">Video</div>
              <div className="text-sm opacity-75">Animated video generation</div>
            </div>
          </button>
        </div>
      </div>

      {/* Quality Selection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Choose Quality</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onQualityChange('fast')}
            className={`p-4 rounded-lg border transition-all ${
              selectedQuality === 'fast'
                ? 'border-green-500 bg-green-500/10 text-green-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Zap className="w-5 h-5" />
                <Badge variant="secondary" className="text-xs">
                  {GENERATION_CONFIGS[`${selectedFormat}_fast`].credits} credits
                </Badge>
              </div>
              <div className="font-medium">Fast</div>
              <div className="text-sm opacity-75">Quick generation</div>
              <div className="flex items-center text-xs opacity-60">
                <Clock className="w-3 h-3 mr-1" />
                {GENERATION_CONFIGS[`${selectedFormat}_fast`].estimatedTime}
              </div>
            </div>
          </button>
          
          <button
            onClick={() => onQualityChange('high')}
            className={`p-4 rounded-lg border transition-all ${
              selectedQuality === 'high'
                ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Sparkles className="w-5 h-5" />
                <Badge variant="secondary" className="text-xs">
                  {GENERATION_CONFIGS[`${selectedFormat}_high`].credits} credits
                </Badge>
              </div>
              <div className="font-medium">High Quality</div>
              <div className="text-sm opacity-75">Enhanced details</div>
              <div className="flex items-center text-xs opacity-60">
                <Clock className="w-3 h-3 mr-1" />
                {GENERATION_CONFIGS[`${selectedFormat}_high`].estimatedTime}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Current Selection Summary */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-300">Current Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Format:</span>
            <span className="text-white capitalize">{selectedFormat}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Quality:</span>
            <span className="text-white capitalize">{selectedQuality}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Resolution:</span>
            <span className="text-white">{currentConfig.resolution}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Credits:</span>
            <span className="text-white">{currentConfig.credits}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estimated Time:</span>
            <span className="text-white">{currentConfig.estimatedTime}</span>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-400">{currentConfig.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
