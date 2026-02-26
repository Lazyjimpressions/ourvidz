/**
 * ClipTypeSelector Component
 *
 * Dropdown selector for choosing clip type with AI recommendations.
 * Shows type descriptions and highlights recommended option.
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClipType, CLIP_TYPE_DURATIONS } from '@/types/storyboard';
import { CLIP_TYPE_METADATA } from '@/lib/utils/clipTypeRouting';
import { Zap, ArrowRight, Sliders, Film, Frame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipTypeSelectorProps {
  value: ClipType;
  onChange: (type: ClipType) => void;
  recommended?: ClipType;
  disabled?: boolean;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Zap: Zap,
  ArrowRight: ArrowRight,
  Sliders: Sliders,
  Film: Film,
  Frame: Frame,
};

export const ClipTypeSelector: React.FC<ClipTypeSelectorProps> = ({
  value,
  onChange,
  recommended,
  disabled = false,
  compact = false,
}) => {
  const allTypes: ClipType[] = ['quick', 'extended', 'controlled', 'long', 'keyframed'];

  const getMetadata = (type: ClipType) => CLIP_TYPE_METADATA[type];

  const renderIcon = (iconName: string, className?: string) => {
    const Icon = ICON_MAP[iconName] || Zap;
    return <Icon className={cn('w-4 h-4', className)} />;
  };

  if (compact) {
    return (
      <Select value={value} onValueChange={(v) => onChange(v as ClipType)} disabled={disabled}>
        <SelectTrigger className="w-[140px] h-8 text-xs bg-gray-900 border-gray-700">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              {renderIcon(getMetadata(value).icon, 'w-3.5 h-3.5')}
              <span>{getMetadata(value).label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {allTypes.map((type) => {
            const meta = getMetadata(type);
            const isRecommended = type === recommended;

            return (
              <SelectItem
                key={type}
                value={type}
                className={cn(
                  'text-xs',
                  isRecommended && 'bg-blue-500/10'
                )}
              >
                <div className="flex items-center gap-2">
                  {renderIcon(meta.icon, 'w-3.5 h-3.5 text-gray-400')}
                  <span>{meta.label}</span>
                  {isRecommended && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500/20 text-blue-400 ml-auto">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      Best
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(v) => onChange(v as ClipType)} disabled={disabled}>
        <SelectTrigger className="w-full bg-gray-900 border-gray-700">
          <SelectValue>
            <div className="flex items-center gap-2">
              {renderIcon(getMetadata(value).icon)}
              <span>{getMetadata(value).label}</span>
              {value === recommended && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-500/20 text-blue-400 ml-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {allTypes.map((type) => {
            const meta = getMetadata(type);
            const isRecommended = type === recommended;

            return (
              <SelectItem
                key={type}
                value={type}
                className={cn(
                  isRecommended && 'bg-blue-500/10'
                )}
              >
                <div className="flex flex-col gap-0.5 py-1">
                  <div className="flex items-center gap-2">
                    {renderIcon(meta.icon, 'text-gray-400')}
                    <span className="font-medium">{meta.label}</span>
                    {isRecommended && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-500/20 text-blue-400">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Best
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 pl-6">{meta.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Current selection info */}
      <p className="text-xs text-gray-500 pl-1">
        {getMetadata(value).description}
      </p>
    </div>
  );
};

export default ClipTypeSelector;
