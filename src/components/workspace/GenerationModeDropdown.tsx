
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Star, Sparkles } from 'lucide-react';
import { GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';

interface GenerationModeDropdownProps {
  value: GenerationFormat;
  onChange: (value: GenerationFormat) => void;
  disabled?: boolean;
}

export const GenerationModeDropdown: React.FC<GenerationModeDropdownProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const currentConfig = GENERATION_CONFIGS[value];

  const getIcon = (format: GenerationFormat) => {
    const config = GENERATION_CONFIGS[format];
    if (config.isSDXL) {
      return <Zap className="w-5 h-5 text-yellow-400" />;
    }
    if (config.isVideo) {
      return <Star className="w-5 h-5 text-purple-400" />;
    }
    return <Sparkles className="w-5 h-5 text-blue-400" />;
  };

  const getSpeedBadge = (format: GenerationFormat) => {
    const config = GENERATION_CONFIGS[format];
    if (config.isSDXL) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 font-semibold">
          Ultra Fast
        </Badge>
      );
    }
    const isHigh = format.includes('high');
    return (
      <Badge 
        variant={isHigh ? "default" : "secondary"} 
        className={isHigh 
          ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
          : "bg-green-500/20 text-green-300 border-green-500/30"
        }
      >
        {isHigh ? 'High Quality' : 'Fast'}
      </Badge>
    );
  };

  const getModelBadge = (format: GenerationFormat) => {
    const config = GENERATION_CONFIGS[format];
    if (config.isSDXL) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-200 border-yellow-500/30 font-bold">
          SDXL
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
        WAN
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-300 block">
        Generation Model
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full h-16 bg-gray-700/50 border-gray-600/50 hover:border-gray-500/50 text-white rounded-xl transition-all duration-200">
          <SelectValue>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {getIcon(value)}
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{currentConfig.displayName}</span>
                    {getModelBadge(value)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getSpeedBadge(value)}
                    <span className="text-xs text-gray-400">{currentConfig.estimatedTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600 max-w-md">
          {Object.entries(GENERATION_CONFIGS).map(([format, config]) => (
            <SelectItem 
              key={format} 
              value={format}
              className="hover:bg-gray-700 focus:bg-gray-700 text-white p-4 rounded-lg my-1"
            >
              <div className="flex items-center justify-between w-full min-w-[400px]">
                <div className="flex items-center gap-3">
                  {getIcon(format as GenerationFormat)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{config.displayName}</span>
                      {getModelBadge(format as GenerationFormat)}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{config.description}</div>
                    <div className="flex items-center gap-2">
                      {getSpeedBadge(format as GenerationFormat)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium text-white">{config.estimatedTime}</span>
                  </div>
                  <span className="text-xs text-gray-400">{config.credits} credits</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
