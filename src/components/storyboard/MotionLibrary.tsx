/**
 * MotionLibrary Component
 *
 * Browser for motion presets organized by category.
 * Shows video previews and allows selection for controlled clips.
 */

import React, { useState, useRef } from 'react';
import { MotionPreset, MotionCategory } from '@/types/storyboard';
import { useClipOrchestration } from '@/hooks/useClipOrchestration';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  Wind,
  RotateCcw,
  Footprints,
  Camera,
  Smile,
  Sparkles,
  Loader2,
  Check,
  Plus,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MotionLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPresetId?: string;
  onSelectPreset: (preset: MotionPreset) => void;
}

const CATEGORY_CONFIG: Record<MotionCategory, { icon: React.ElementType; label: string; color: string }> = {
  breathing: { icon: Wind, label: 'Breathing', color: 'text-cyan-400' },
  turn: { icon: RotateCcw, label: 'Turns', color: 'text-purple-400' },
  walk: { icon: Footprints, label: 'Walking', color: 'text-green-400' },
  camera: { icon: Camera, label: 'Camera', color: 'text-yellow-400' },
  expression: { icon: Smile, label: 'Expression', color: 'text-pink-400' },
  general: { icon: Sparkles, label: 'General', color: 'text-blue-400' },
};

const PresetCard: React.FC<{
  preset: MotionPreset;
  isSelected?: boolean;
  onSelect: () => void;
}> = ({ preset, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const CategoryIcon = CATEGORY_CONFIG[preset.category]?.icon || Sparkles;

  return (
    <button
      className={cn(
        'relative rounded-lg overflow-hidden border transition-all text-left',
        'hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-gray-800 bg-gray-900/50'
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (videoRef.current && isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }}
    >
      {/* Video thumbnail */}
      <div className="aspect-video bg-gray-950 relative">
        {preset.video_url ? (
          <>
            <video
              ref={videoRef}
              src={preset.video_url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              poster={preset.thumbnail_url}
            />
            {isHovered && (
              <button
                onClick={handlePlayToggle}
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon className={cn('w-6 h-6', CATEGORY_CONFIG[preset.category]?.color || 'text-gray-500')} />
          </div>
        )}

        {/* Selected check */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Built-in badge */}
        {preset.is_builtin && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-gray-900/80 text-[9px] text-gray-400">
            Built-in
          </div>
        )}

        {/* Duration */}
        {preset.duration_seconds && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-gray-300">
            {preset.duration_seconds}s
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium text-gray-200 truncate">{preset.name}</p>
        {preset.description && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{preset.description}</p>
        )}
      </div>
    </button>
  );
};

export const MotionLibrary: React.FC<MotionLibraryProps> = ({
  open,
  onOpenChange,
  selectedPresetId,
  onSelectPreset,
}) => {
  const { motionPresets, presetsByCategory, presetsLoading } = useClipOrchestration();
  const [activeCategory, setActiveCategory] = useState<MotionCategory | 'all'>('all');

  const categories = Object.keys(presetsByCategory) as MotionCategory[];
  const displayedPresets = activeCategory === 'all'
    ? motionPresets
    : presetsByCategory[activeCategory] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Motion Reference Library
          </DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
          <Button
            variant={activeCategory === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className="h-7 px-2 text-xs flex-shrink-0"
          >
            All
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
              {motionPresets.length}
            </Badge>
          </Button>

          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const count = presetsByCategory[category]?.length || 0;
            const Icon = config?.icon || Sparkles;

            return (
              <Button
                key={category}
                variant={activeCategory === category ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="h-7 px-2 text-xs flex-shrink-0"
              >
                <Icon className={cn('w-3 h-3 mr-1', config?.color)} />
                {config?.label || category}
                <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Presets grid */}
        <div className="flex-1 overflow-y-auto">
          {presetsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : displayedPresets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Sparkles className="w-8 h-8 mb-2" />
              <p className="text-sm">No presets in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 p-1">
              {displayedPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={preset.id === selectedPresetId}
                  onSelect={() => onSelectPreset(preset)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <Button variant="ghost" size="sm" className="text-xs text-gray-500">
            <Plus className="w-3 h-3 mr-1" />
            Create Custom Preset
          </Button>

          {selectedPresetId && (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              <Check className="w-4 h-4 mr-2" />
              Use Selected
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MotionLibrary;
