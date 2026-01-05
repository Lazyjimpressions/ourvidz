/**
 * ProjectCard Component
 *
 * Compact card for displaying storyboard projects in a grid.
 * Follows UI/UX best practices: 14px body, 12px labels, muted backgrounds.
 */

import React from 'react';
import { StoryboardProject, ProjectStatus } from '@/types/storyboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Film,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Loader2,
  Archive,
  FileEdit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: StoryboardProject;
  onEdit: (project: StoryboardProject) => void;
  onDelete: (project: StoryboardProject) => void;
  onOpen: (project: StoryboardProject) => void;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: React.ReactNode; color: string }> = {
  draft: {
    label: 'Draft',
    icon: <FileEdit className="w-3 h-3" />,
    color: 'text-gray-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="w-3 h-3" />,
    color: 'text-yellow-500',
  },
  rendering: {
    label: 'Rendering',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    color: 'text-blue-500',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: 'text-green-500',
  },
  archived: {
    label: 'Archived',
    icon: <Archive className="w-3 h-3" />,
    color: 'text-gray-500',
  },
};

const ASPECT_RATIO_STYLES: Record<string, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onOpen,
}) => {
  const statusConfig = STATUS_CONFIG[project.status];
  const aspectStyle = ASPECT_RATIO_STYLES[project.aspect_ratio] || 'aspect-video';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card
      className="group border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-700 transition-all cursor-pointer overflow-hidden"
      onClick={() => onOpen(project)}
    >
      {/* Thumbnail */}
      <div className={`relative ${aspectStyle} bg-gray-950 overflow-hidden`}>
        {project.final_video_url ? (
          <img
            src={project.final_video_url}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-gray-700" />
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-8 h-8 text-white" />
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded">
          {formatDuration(project.target_duration_seconds)}
        </div>

        {/* Aspect ratio badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
          {project.aspect_ratio}
        </div>
      </div>

      <CardContent className="p-3">
        {/* Title and Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-100 truncate" title={project.title}>
              {project.title}
            </h3>
            {project.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5" title={project.description}>
                {project.description}
              </p>
            )}
          </div>

          {/* Dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(project); }}>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status and metadata row */}
        <div className="flex items-center justify-between mt-2 text-[11px]">
          {/* Status */}
          <div className={`flex items-center gap-1 ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>

          {/* Updated time */}
          <span className="text-gray-600">
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </span>
        </div>

        {/* Quality and content tier badges */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
            {project.quality_preset}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            project.content_tier === 'nsfw'
              ? 'bg-pink-900/30 text-pink-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {project.content_tier.toUpperCase()}
          </span>
          {project.ai_assistance_level !== 'none' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">
              AI
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
