
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, X } from "lucide-react";
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

interface WorkspaceVideoDisplayProps {
  video: GeneratedVideo;
  onRemove: () => void;
  onRegenerateItem: (itemId: string) => void;
}

export const WorkspaceVideoDisplay = ({ video, onRemove, onRegenerateItem }: WorkspaceVideoDisplayProps) => {
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);

  const handleDownload = async (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleRegenerate = (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerateItem(video.id);
  };

  return (
    <>
      <div className="text-center">
        {/* Video Display */}
        <div className="mb-6">
          <div
            className="relative group cursor-pointer bg-gray-900 rounded-lg overflow-hidden max-w-2xl mx-auto"
            onClick={() => setSelectedVideo(video)}
          >
            <video
              src={video.url}
              className="w-full h-80 object-cover"
              controls
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Hover Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none">
              {/* Download Button - Upper Right */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2 pointer-events-auto"
                onClick={(e) => handleDownload(video, e)}
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Regenerate Button - Lower Right */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2 pointer-events-auto"
                onClick={(e) => handleRegenerate(video, e)}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          onClick={onRemove}
          className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Modal for Full Resolution */}
      {selectedVideo && (
        <WorkspaceContentModal
          content={selectedVideo}
          type="video"
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  );
};
