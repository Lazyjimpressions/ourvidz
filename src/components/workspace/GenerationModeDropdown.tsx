
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Star } from 'lucide-react';
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
      return <Zap className="w-4 h-4 text-yellow-500" />;
    }
    if (config.isVideo) {
      return <Star className="w-4 h-4 text-purple-500" />;
    }
    return <Clock className="w-4 h-4 text-blue-500" />;
  };

  const getQualityBadge = (format: GenerationFormat) => {
    const config = GENERATION_CONFIGS[format];
    const isHigh = format.includes('high');
    return (
      <Badge variant={isHigh ? "default" : "secondary"} className="ml-2">
        {isHigh ? 'High' : 'Fast'}
      </Badge>
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Generation Mode
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {getIcon(value)}
                <span className="ml-2">{currentConfig.displayName}</span>
                {getQualityBadge(value)}
              </div>
              <span className="text-sm text-gray-500">{currentConfig.estimatedTime}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(GENERATION_CONFIGS).map(([format, config]) => (
            <SelectItem key={format} value={format}>
              <div className="flex items-center justify-between w-full min-w-[300px]">
                <div className="flex items-center">
                  {getIcon(format as GenerationFormat)}
                  <div className="ml-2">
                    <div className="flex items-center">
                      <span className="font-medium">{config.displayName}</span>
                      {getQualityBadge(format as GenerationFormat)}
                    </div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end ml-4">
                  <span className="text-sm font-medium">{config.estimatedTime}</span>
                  <span className="text-xs text-gray-500">{config.credits} credits</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
