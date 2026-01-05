/**
 * ClipCard Component
 *
 * Compact card for displaying a video clip in the storyboard.
 * Shows thumbnail, status, duration, and frame chain indicator.
 */

import React, { useState } from 'react';
import { StoryboardClip, ClipStatus } from '@/types/storyboard';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Loader2,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Trash2,
  Link,
  ImageIcon,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipCardProps {
  clip: StoryboardClip;
  isSelected?: boolean;
  showChainIndicator?: boolean;
  hasChainFrame?: boolean;
  onClick?: () => void;
  onRetry?: () => void;
  onDelete?: () => void;
  onExtractFrame?: () => void;
}

const STATUS_CONFIG: Record<ClipStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-400', label: 'Pending' },
  generating: { icon: Loader2, color: 'text-blue-400', label: 'Generating' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
  approved: { icon: CheckCircle, color: 'text-emerald-400', label: 'Approved' },
};

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  isSelected = false,
  showChainIndicator = false,
  hasChainFrame = false,
  onClick,
  onRetry,
  onDelete,
  onExtractFrame,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const statusConfig = STATUS_CONFIG[clip.status];
  const StatusIcon = statusConfig.icon;
  const isGenerating = clip.status === 'generating';
  const hasVideo = clip.status === 'completed' && clip.video_url;

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

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer transition-all',
        'border bg-gray-900/50',
        isSelected
          ? 'border-blue-500 ring-1 ring-blue-500/50'
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
              onEnded={handleVideoEnded}
            />
            {/* Play/Pause overlay */}
            {isHovered && (
              <button
                onClick={handlePlayToggle}
                className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white" />
                )}
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isGenerating ? (
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            ) : clip.status === 'failed' ? (
              <AlertCircle className="w-6 h-6 text-red-400" />
            ) : clip.reference_image_url ? (
              <img
                src={clip.reference_image_url}
                alt="Reference"
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-600" />
            )}
          </div>
        )}

        {/* Chain indicator badge */}
        {showChainIndicator && clip.reference_image_url && (
          <div className="absolute top-1 left-1 p-1 rounded bg-blue-500/80">
            <Link className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Extracted frame indicator */}
        {hasChainFrame && (
          <div className="absolute top-1 right-1 p-1 rounded bg-green-500/80">
            <ImageIcon className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Duration badge */}
        {clip.duration_seconds && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-gray-300">
            {formatDuration(clip.duration_seconds)}
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="px-2 py-1.5 space-y-1">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StatusIcon
              className={cn(
                'w-3 h-3',
                statusConfig.color,
                isGenerating && 'animate-spin'
              )}
            />
            <span className="text-[10px] text-gray-400">{statusConfig.label}</span>
          </div>

          {/* Order badge */}
          <span className="text-[10px] text-gray-500">#{clip.clip_order + 1}</span>
        </div>

        {/* Prompt preview */}
        <p className="text-[10px] text-gray-500 truncate" title={clip.prompt}>
          {clip.prompt.slice(0, 50)}...
        </p>

        {/* Action buttons (show on hover) */}
        {isHovered && (
          <div className="flex items-center gap-1 pt-1">
            {clip.status === 'failed' && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}

            {hasVideo && onExtractFrame && !hasChainFrame && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-green-400 hover:text-green-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onExtractFrame();
                }}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Extract
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipCard;
