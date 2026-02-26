/**
 * SceneStrip Component
 *
 * Horizontal scrolling strip of scene cards for navigation.
 * Shows scene title, duration, and clip count with active state.
 */

import React, { useRef, useEffect } from 'react';
import { StoryboardScene, SceneStatus } from '@/types/storyboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Film,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneStripProps {
  scenes: StoryboardScene[];
  activeSceneId?: string;
  onSceneSelect: (scene: StoryboardScene) => void;
  onAddScene: () => void;
  isAddingScene?: boolean;
}

const STATUS_ICONS: Record<SceneStatus, React.ElementType> = {
  planned: LayoutGrid,
  generating: Loader2,
  has_clips: Film,
  approved: CheckCircle,
  failed: AlertCircle,
};

const STATUS_COLORS: Record<SceneStatus, string> = {
  planned: 'text-gray-400',
  generating: 'text-blue-400',
  has_clips: 'text-yellow-400',
  approved: 'text-green-400',
  failed: 'text-red-400',
};

export const SceneStrip: React.FC<SceneStripProps> = ({
  scenes,
  activeSceneId,
  onSceneSelect,
  onAddScene,
  isAddingScene = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLButtonElement>(null);

  // Scroll active scene into view
  useEffect(() => {
    if (activeCardRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const card = activeCardRef.current;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;

      // Check if card is outside visible area
      if (cardLeft < scrollLeft || cardLeft + cardWidth > scrollLeft + containerWidth) {
        container.scrollTo({
          left: cardLeft - containerWidth / 2 + cardWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeSceneId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  const getClipCount = (scene: StoryboardScene) => {
    return scene.clips?.length || 0;
  };

  return (
    <div className="bg-gray-900/50 border-b border-gray-800">
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Film className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Scenes</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-800">
            {scenes.length}
          </Badge>
        </div>

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        >
          {scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId;
            const StatusIcon = STATUS_ICONS[scene.status];
            const statusColor = STATUS_COLORS[scene.status];
            const clipCount = getClipCount(scene);

            return (
              <button
                key={scene.id}
                ref={isActive ? activeCardRef : undefined}
                onClick={() => onSceneSelect(scene)}
                className={cn(
                  'flex-shrink-0 w-28 rounded-lg border p-2 text-left transition-all',
                  'hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                  isActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 bg-gray-900/50'
                )}
              >
                {/* Scene number */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-500">
                    Scene {index + 1}
                  </span>
                  <StatusIcon
                    className={cn(
                      'w-3 h-3',
                      statusColor,
                      scene.status === 'generating' && 'animate-spin'
                    )}
                  />
                </div>

                {/* Title */}
                <p className="text-xs font-medium text-gray-200 truncate mb-1.5">
                  {scene.title || 'Untitled'}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <div className="flex items-center gap-0.5">
                    <Film className="w-2.5 h-2.5" />
                    <span>{clipCount}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatDuration(scene.actual_duration_seconds || scene.target_duration_seconds)}</span>
                  </div>
                </div>

                {/* Progress bar (visual only) */}
                {scene.target_duration_seconds && (
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        scene.status === 'approved' ? 'bg-green-500' : 'bg-blue-500'
                      )}
                      style={{
                        width: `${Math.min(
                          ((scene.actual_duration_seconds || 0) / scene.target_duration_seconds) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          {/* Add Scene button */}
          <Button
            variant="outline"
            onClick={onAddScene}
            disabled={isAddingScene}
            className={cn(
              'flex-shrink-0 w-28 h-auto min-h-[76px] rounded-lg',
              'border-dashed border-gray-700 hover:border-gray-600',
              'flex flex-col items-center justify-center gap-1'
            )}
          >
            {isAddingScene ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <Plus className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-[10px] text-gray-500">Add Scene</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SceneStrip;
