
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface ReferenceStrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  referenceType?: string;
  onTypeChange?: (type: string) => void;
}

export const ReferenceStrengthSlider = ({ 
  value, 
  onChange, 
  disabled = false,
  referenceType = 'character',
  onTypeChange
}: ReferenceStrengthSliderProps) => {
  const referenceTypes = [
    { value: 'style', label: 'Style', description: 'Transfer artistic style and visual aesthetics' },
    { value: 'composition', label: 'Composition', description: 'Match layout, positioning, and structure' },
    { value: 'character', label: 'Character', description: 'Preserve character appearance and features' }
  ];

  // Get optimal strength range based on reference type
  const getOptimalRange = (type: string) => {
    switch (type) {
      case 'character':
        return { min: 0.700, max: 1.000, optimal: 0.900, presets: [0.850, 0.900, 0.950] };
      case 'style':
        return { min: 0.300, max: 0.800, optimal: 0.600, presets: [0.500, 0.600, 0.700] };
      case 'composition':
        return { min: 0.400, max: 0.900, optimal: 0.700, presets: [0.600, 0.700, 0.800] };
      default:
        return { min: 0.100, max: 1.000, optimal: 0.900, presets: [0.700, 0.850, 0.950] };
    }
  };

  const range = getOptimalRange(referenceType);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Reference Type Selection */}
        {onTypeChange && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Type</Label>
            <div className="flex gap-1">
              {referenceTypes.map((type) => (
                <Tooltip key={type.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={referenceType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onTypeChange(type.value);
                        // Auto-adjust strength to optimal value for the type
                        const newRange = getOptimalRange(type.value);
                        onChange(newRange.optimal);
                      }}
                      disabled={disabled}
                      className="px-2 py-1 h-6 text-xs"
                    >
                      {type.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{type.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Strength Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Label htmlFor="reference-strength" className="text-xs text-muted-foreground whitespace-nowrap">
              Strength
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>Character: 0.700-1.000 (optimal: 0.900)</p>
                  <p>Style: 0.300-0.800 (optimal: 0.600)</p>
                  <p>Composition: 0.400-0.900 (optimal: 0.700)</p>
                  <p className="text-xs text-muted-foreground">Higher = stronger influence</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 max-w-24">
            <Slider
              id="reference-strength"
              value={[value]}
              onValueChange={(values) => onChange(values[0])}
              min={range.min}
              max={range.max}
              step={0.001}
              disabled={disabled}
              className="w-full"
            />
          </div>
          <span className={`text-xs min-w-14 text-center font-mono ${
            Math.abs(value - range.optimal) <= 0.050 ? 'text-green-500' : 'text-muted-foreground'
          }`}>
            {value.toFixed(3)}
          </span>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Presets:</span>
          <div className="flex gap-1">
            {range.presets.map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                size="sm"
                onClick={() => onChange(preset)}
                className="h-5 px-2 text-xs font-mono"
                disabled={disabled}
              >
                {preset.toFixed(3)}
              </Button>
            ))}
          </div>
        </div>

        {/* Optimal indicator */}
        {Math.abs(value - range.optimal) > 0.050 && (
          <div className="text-xs text-amber-500 flex items-center gap-1">
            <InfoIcon className="w-3 h-3" />
            <span>Optimal for {referenceType}: {range.optimal.toFixed(3)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(range.optimal)}
              className="h-4 px-1 text-xs text-amber-500 hover:text-amber-400"
            >
              Set
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
