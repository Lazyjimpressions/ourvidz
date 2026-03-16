/**
 * SceneStrip Component
 *
 * Horizontal scrolling strip of scene cards for navigation.
 * Includes context menu for edit/delete actions.
 * Responsive scene card widths.
 */

import React, { useRef, useEffect } from 'react';
import { StoryboardScene, SceneStatus } from '@/types/storyboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Film,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  LayoutGrid,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneStripProps {
  scenes: StoryboardScene[];
  activeSceneId?: string;
  onSceneSelect: (scene: StoryboardScene) => void;
  onAddScene: () => void;
  onSceneDelete?: (scene: StoryboardScene) => void;
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
  planned: 'text-muted-foreground',
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
  onSceneDelete,
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
    <div className="bg-muted/50 border-b border-border">
      <div className="px-3 md:px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Film className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">Scenes</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted">
            {scenes.length}
          </Badge>
        </div>

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        >
          {scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId;
            const StatusIcon = STATUS_ICONS[scene.status];
            const statusColor = STATUS_COLORS[scene.status];
            const clipCount = getClipCount(scene);

            return (
              <div key={scene.id} className="relative flex-shrink-0 group">
                <button
                  ref={isActive ? activeCardRef : undefined}
                  onClick={() => onSceneSelect(scene)}
                  className={cn(
                    'w-24 md:w-28 rounded-lg border p-2 text-left transition-all',
                    'hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50',
                    isActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      S{index + 1}
                    </span>
                    <StatusIcon
                      className={cn(
                        'w-3 h-3',
                        statusColor,
                        scene.status === 'generating' && 'animate-spin'
                      )}
                    />
                  </div>

                  <p className="text-xs font-medium text-foreground/80 truncate mb-1.5">
                    {scene.title || 'Untitled'}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      <Film className="w-2.5 h-2.5" />
                      <span>{clipCount}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDuration(scene.actual_duration_seconds || scene.target_duration_seconds)}</span>
                    </div>
                  </div>

                  {scene.target_duration_seconds && (
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          scene.status === 'approved' ? 'bg-green-500' : 'bg-primary'
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

                {/* Scene context menu */}
                {onSceneDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem
                        className="text-destructive text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneDelete(scene);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {/* Add Scene button */}
          <Button
            variant="outline"
            onClick={onAddScene}
            disabled={isAddingScene}
            className={cn(
              'flex-shrink-0 w-24 md:w-28 h-auto min-h-[76px] rounded-lg',
              'border-dashed border-border hover:border-muted-foreground/40',
              'flex flex-col items-center justify-center gap-1'
            )}
          >
            {isAddingScene ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Plus className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground">Add Scene</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SceneStrip;