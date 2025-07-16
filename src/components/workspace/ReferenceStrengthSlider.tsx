import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ReferenceStrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const ReferenceStrengthSlider = ({ 
  value, 
  onChange, 
  disabled = false 
}: ReferenceStrengthSliderProps) => {
  return (
    <div className="flex items-center gap-3 px-1">
      <Label htmlFor="reference-strength" className="text-xs text-muted-foreground whitespace-nowrap">
        Strength
      </Label>
      <div className="flex-1 max-w-24">
        <Slider
          id="reference-strength"
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={0}
          max={1}
          step={0.1}
          disabled={disabled}
          className="w-full"
        />
      </div>
      <span className="text-xs text-muted-foreground min-w-8 text-center">
        {value.toFixed(1)}
      </span>
    </div>
  );
};