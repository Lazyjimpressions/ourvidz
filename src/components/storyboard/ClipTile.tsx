/**
 * ClipTile Component
 *
 * Compact tile for displaying a clip in the horizontal canvas.
 * Shows thumbnail, status, type badge, and duration.
 */

import React, { useState, useRef } from 'react';
import { StoryboardClip, ClipStatus, ClipType } from '@/types/storyboard';
import { CLIP_TYPE_METADATA } from '@/lib/utils/clipTypeRouting';
import {
  Play,
  Pause,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ImageIcon,
  Link,
  Zap,
  ArrowRight,
  Sliders,
  Film,
  Frame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipTileProps {
  clip: StoryboardClip;
  isSelected?: boolean;
  showConnector?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const STATUS_CONFIG: Record<ClipStatus, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'Pending' },
  generating: { icon: Loader2, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Generating' },
  completed: { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Done' },
  failed: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Failed' },
  approved: { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Approved' },
};

const CLIP_TYPE_ICONS: Record<ClipType, React.ElementType> = {
  quick: Zap,
  extended: ArrowRight,
  controlled: Sliders,
  long: Film,
  keyframed: Frame,
};

export const ClipTile: React.FC<ClipTileProps> = ({
  clip,
  isSelected = false,
  showConnector = false,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const statusConfig = STATUS_CONFIG[clip.status];
  const StatusIcon = statusConfig.icon;
  const TypeIcon = CLIP_TYPE_ICONS[clip.clip_type || 'quick'];
  const isGenerating = clip.status === 'generating';
  const hasVideo = (clip.status === 'completed' || clip.status === 'approved') && clip.video_url;

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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    return `${Math.round(seconds)}s`;
  };

  return (
    <div className="flex items-center">
      {/* Connector arrow */}
      {showConnector && (
        <div className="flex items-center px-1">
          <div className="w-4 h-0.5 bg-gray-700" />
          <ArrowRight className="w-3 h-3 text-gray-600 -ml-1" />
        </div>
      )}

      {/* Tile */}
      <div
        className={cn(
          'group relative rounded-lg overflow-hidden cursor-pointer transition-all',
          'w-32 border bg-gray-900/50',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/30'
            : 'border-gray-800 hover:border-gray-700',
          isGenerating && 'animate-pulse'
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          if (videoRef.current && isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }}
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Thumbnail / Video */}
        <div className="aspect-video bg-gray-950 relative">
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                src={clip.video_url}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                poster={clip.thumbnail_url}
              />
              {/* Play overlay */}
              {isHovered && (
                <button
                  onClick={handlePlayToggle}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
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
              {isGenerating ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : clip.status === 'failed' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : clip.reference_image_url ? (
                <img
                  src={clip.reference_image_url}
                  alt="Reference"
                  className="w-full h-full object-cover opacity-50"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-600" />
              )}
            </div>
          )}

          {/* Chain badge (top-left) */}
          {clip.reference_image_url && clip.reference_image_source === 'extracted_frame' && (
            <div className="absolute top-1 left-1 p-0.5 rounded bg-blue-500/80">
              <Link className="w-2.5 h-2.5 text-white" />
            </div>
          )}

          {/* Duration badge (bottom-right) */}
          {clip.duration_seconds && (
            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-gray-300">
              {formatDuration(clip.duration_seconds)}
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="px-1.5 py-1 space-y-0.5">
          {/* Status + Type row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StatusIcon
                className={cn(
                  'w-3 h-3',
                  statusConfig.color,
                  isGenerating && 'animate-spin'
                )}
              />
              <span className={cn('text-[9px]', statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>

            {/* Clip type badge */}
            <div className={cn(
              'flex items-center gap-0.5 px-1 py-0.5 rounded',
              'bg-gray-800 text-gray-400'
            )}>
              <TypeIcon className="w-2.5 h-2.5" />
              <span className="text-[8px] capitalize">{clip.clip_type || 'quick'}</span>
            </div>
          </div>

          {/* Prompt preview */}
          <p className="text-[9px] text-gray-500 truncate" title={clip.prompt}>
            {clip.prompt?.slice(0, 40) || 'No prompt'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClipTile;
