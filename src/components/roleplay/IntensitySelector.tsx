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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">
          Intensity
        </label>
        <span className="text-xs text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>

      {/* Preset buttons - More Compact */}
      <div className="flex gap-1.5">
        {INTENSITY_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset === preset.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={cn(
              'flex-1 flex flex-col h-auto py-1.5 text-xs',
              activePreset === preset.label && 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            <span className="font-medium text-xs">{preset.label}</span>
            <span className="text-[10px] opacity-70">{preset.description}</span>
          </Button>
        ))}
      </div>

      {/* Fine-tune slider - More Compact */}
      {showSlider && (
        <div className="pt-1">
          <Slider
            value={[value]}
            onValueChange={(vals) => onChange(vals[0])}
            min={0.15}
            max={0.75}
            step={0.05}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Preserve</span>
            <span>Transform</span>
          </div>
        </div>
      )}
    </div>
  );
};

export { INTENSITY_PRESETS };
