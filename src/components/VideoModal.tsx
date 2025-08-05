
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";

interface VideoModalProps {
  video: {
    id: string;
    url: string;
    prompt: string;
    type: 'video';
    thumbnailUrl?: string;
    duration?: number;
    timestamp: Date;
  } | null;
  open: boolean;
  onClose: () => void;
}

export const VideoModal = ({ video, open, onClose }: VideoModalProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!video) return null;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{video.prompt}</DialogTitle>
        </DialogHeader>
        
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          <video
            ref={videoRef}
            src={video.url}
            className="w-full h-full object-contain"
            poster={video.thumbnailUrl}
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted={isMuted}
            loop
          />
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play/Pause Button */}
                <button
                  onClick={handlePlayPause}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                
                {/* Mute/Unmute Button */}
                <button
                  onClick={handleToggleMute}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                
                {/* Duration */}
                {video.duration && (
                  <span className="text-white text-sm">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </div>
              
              {/* Video Info */}
              <div className="text-white text-sm opacity-80">
                {video.type === 'video' && 'Video'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Metadata */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Generated: {new Date(video.timestamp).toLocaleString()}</span>
            <span>ID: {video.id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
