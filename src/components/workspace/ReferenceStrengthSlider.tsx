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
  referenceType = 'style',
  onTypeChange
}: ReferenceStrengthSliderProps) => {
  const referenceTypes = [
    { value: 'style', label: 'Style', description: 'Transfer artistic style and visual aesthetics' },
    { value: 'composition', label: 'Composition', description: 'Match layout, positioning, and structure' },
    { value: 'character', label: 'Character', description: 'Preserve character appearance and features' }
  ];

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
                      onClick={() => onTypeChange(type.value)}
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
                <p>0.1 = Subtle influence, 1.0 = Strong influence</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 max-w-24">
            <Slider
              id="reference-strength"
              value={[value]}
              onValueChange={(values) => onChange(values[0])}
              min={0.1}
              max={1.0}
              step={0.1}
              disabled={disabled}
              className="w-full"
            />
          </div>
          <span className="text-xs text-muted-foreground min-w-8 text-center">
            {value.toFixed(1)}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
};