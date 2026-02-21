/**
 * AssemblyPreview Component
 *
 * Sequential video player for previewing assembled storyboard clips.
 * Plays approved clips back-to-back with scene markers.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ProjectAssembly, AssemblyClip } from '@/types/storyboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssemblyPreviewProps {
  assembly: ProjectAssembly | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const AssemblyPreview: React.FC<AssemblyPreviewProps> = ({
  assembly,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const clips = assembly?.clips || [];
  const currentClip = clips[currentIndex];
  const totalDuration = assembly?.total_duration_seconds || 0;

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(false);
      setElapsed(0);
    }
  }, [isOpen]);

  // Load current clip into video
  useEffect(() => {
    if (videoRef.current && currentClip) {
      videoRef.current.src = currentClip.video_url;
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex, currentClip]);

  const handleEnded = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, clips.length]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const clipElapsed = clips.slice(0, currentIndex).reduce((s, c) => s + c.duration_seconds, 0);
    setElapsed(clipElapsed + videoRef.current.currentTime);
  }, [currentIndex, clips]);

  const togglePlay = () => {
    if (!videoRef.current || !currentClip) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentIndex(0);
    setElapsed(0);
    setIsPlaying(true);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-gray-950 border-gray-800 p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Film className="w-4 h-4" />
            {assembly?.project_title || 'Preview'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Video player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Loading assembly...</p>
                </div>
              </div>
            ) : clips.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-gray-700" />
                <p className="text-xs text-gray-500">No approved clips to preview</p>
                {assembly && assembly.missing_clips_count > 0 && (
                  <p className="text-[10px] text-amber-400">
                    {assembly.missing_clips_count} clip{assembly.missing_clips_count !== 1 ? 's' : ''} still need approval
                  </p>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  onEnded={handleEnded}
                  onTimeUpdate={handleTimeUpdate}
                />
                {/* Scene label overlay */}
                {currentClip && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-[10px] text-gray-300">
                    {currentClip.scene_title || 'Scene'} — Clip {currentIndex + 1}/{clips.length}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          {clips.length > 0 && (
            <div className="space-y-2">
              {/* Scene dots */}
              <div className="flex items-center gap-1 justify-center">
                {clips.map((clip, i) => (
                  <button
                    key={clip.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all cursor-pointer',
                      i === currentIndex
                        ? 'w-6 bg-primary'
                        : i < currentIndex
                          ? 'w-3 bg-gray-600'
                          : 'w-3 bg-gray-800'
                    )}
                    onClick={() => {
                      setCurrentIndex(i);
                      setIsPlaying(false);
                    }}
                    title={clip.scene_title || `Clip ${i + 1}`}
                  />
                ))}
              </div>

              {/* Play controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={restart}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <span className="text-xs text-gray-500 font-mono w-20 text-center">
                  {formatTime(elapsed)} / {formatTime(totalDuration)}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssemblyPreview;
