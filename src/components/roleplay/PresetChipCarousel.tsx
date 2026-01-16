import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface PresetItem {
  icon: string;
  label: string;
  tags: string[];
}

interface PresetChipCarouselProps {
  label: string;
  presets: Record<string, PresetItem>;
  selectedKey?: string;
  onSelect: (key: string | undefined) => void;
  className?: string;
}

export const PresetChipCarousel: React.FC<PresetChipCarouselProps> = ({
  label,
  presets,
  selectedKey,
  onSelect,
  className
}) => {
  const presetEntries = Object.entries(presets);

  return (
    <div className={cn('space-y-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        <TooltipProvider delayDuration={300}>
          {presetEntries.map(([key, preset]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(selectedKey === key ? undefined : key)}
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                    'text-base transition-all duration-150 snap-start',
                    'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50',
                    selectedKey === key
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : 'bg-muted/50 text-foreground'
                  )}
                  aria-label={preset.label}
                  aria-pressed={selectedKey === key}
                >
                  {preset.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {preset.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PresetChipCarousel;
