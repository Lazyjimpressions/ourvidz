import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface IntensitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showSlider?: boolean;
}

const INTENSITY_PRESETS = [
  { label: 'Subtle', value: 0.30, description: 'Minor adjustments' },
  { label: 'Moderate', value: 0.45, description: 'Noticeable changes' },
  { label: 'Bold', value: 0.60, description: 'Major transformation' },
];

export const IntensitySelector: React.FC<IntensitySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showSlider = true
}) => {
  // Find which preset is closest to current value
  const getActivePreset = () => {
    const distances = INTENSITY_PRESETS.map(p => Math.abs(p.value - value));
    const minDistance = Math.min(...distances);
    // Only highlight if within 0.05 of preset
    if (minDistance <= 0.05) {
      return INTENSITY_PRESETS[distances.indexOf(minDistance)].label;
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Modification Intensity
        </label>
        <span className="text-sm text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {INTENSITY_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset === preset.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={cn(
              'flex-1 flex flex-col h-auto py-2',
              activePreset === preset.label && 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            <span className="font-medium">{preset.label}</span>
            <span className="text-xs opacity-70">{preset.description}</span>
          </Button>
        ))}
      </div>

      {/* Fine-tune slider */}
      {showSlider && (
        <div className="pt-2">
          <Slider
            value={[value]}
            onValueChange={(vals) => onChange(vals[0])}
            min={0.15}
            max={0.75}
            step={0.05}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Preserve scene</span>
            <span>Transform scene</span>
          </div>
        </div>
      )}
    </div>
  );
};

export { INTENSITY_PRESETS };
