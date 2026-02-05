import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Pose presets for quick character iteration
const POSE_PRESETS = [
  { key: 'standing', label: 'Standing', prompt: 'standing pose, front view' },
  { key: 'profile', label: 'Profile', prompt: 'profile view, side angle' },
  { key: 'back', label: 'Back', prompt: 'back view, from behind' },
  { key: 'sitting', label: 'Sitting', prompt: 'sitting pose' },
  { key: 'lying', label: 'Lying', prompt: 'lying down pose' },
  { key: 'closeup', label: 'Close-up', prompt: 'close-up portrait, face focus' },
] as const;

interface PosePresetsProps {
  onSelect: (posePrompt: string) => void;
  selectedPose?: string;
  className?: string;
  compact?: boolean;
}

export function PosePresets({
  onSelect,
  selectedPose,
  className,
  compact = false
}: PosePresetsProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {!compact && (
        <span className="text-xs text-muted-foreground">Quick Poses</span>
      )}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-1">
          {POSE_PRESETS.map((pose) => {
            const isSelected = selectedPose === pose.key;
            return (
              <button
                key={pose.key}
                type="button"
                onClick={() => onSelect(pose.prompt)}
                className={cn(
                  'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
                  'transition-all duration-150',
                  'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                )}
              >
                {pose.label}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}

export { POSE_PRESETS };
