
import { useState, useEffect } from "react";
import { Download, Play, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getVideoThumbnailUrl } from "@/lib/storage";

interface VideoCardProps {
  video: {
    id: string;
    thumbnail: string;
    prompt: string;
    createdAt: Date;
  };
  onPlay: () => void;
  onDelete: () => void;
}

export const VideoCard = ({ video, onPlay, onDelete }: VideoCardProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  useEffect(() => {
    const loadThumbnail = async () => {
      if (video.thumbnail && video.thumbnail !== "/placeholder.svg") {
        setIsLoadingThumbnail(true);
        try {
          const url = await getVideoThumbnailUrl(video.thumbnail);
          setThumbnailUrl(url);
        } catch (error) {
          console.error('Failed to load thumbnail:', error);
          setThumbnailUrl(video.thumbnail); // Fallback to original URL
        } finally {
          setIsLoadingThumbnail(false);
        }
      } else {
        setThumbnailUrl(video.thumbnail);
      }
    };

    loadThumbnail();
  }, [video.thumbnail]);

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-video">
          {isLoadingThumbnail ? (
            <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={video.prompt}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          )}
          <Button
            size="icon"
            className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onPlay}
          >
            <Play className="w-6 h-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <HoverCard>
            <HoverCardTrigger asChild>
              <h3 className="font-medium line-clamp-2 cursor-help">
                {video.prompt}
              </h3>
            </HoverCardTrigger>
            <HoverCardContent>
              {video.prompt}
            </HoverCardContent>
          </HoverCard>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Generated {formatDistanceToNow(video.createdAt)} ago
            </span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost">
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
