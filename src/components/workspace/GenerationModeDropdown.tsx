
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-48 h-10 bg-transparent border-gray-600 text-white text-sm">
        <SelectValue>
          <span className="text-white">{currentConfig.displayName}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-600">
        {Object.entries(GENERATION_CONFIGS).map(([format, config]) => (
          <SelectItem 
            key={format} 
            value={format}
            className="hover:bg-gray-700 focus:bg-gray-700 text-white"
          >
            <div className="flex justify-between items-center w-full min-w-[200px]">
              <span>{config.displayName}</span>
              <span className="text-xs text-gray-400 ml-4">{config.estimatedTime}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
