
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X } from "lucide-react";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

interface WorkspaceContentModalProps {
  content: GeneratedContent;
  type: 'image' | 'video';
  onClose: () => void;
}

export const WorkspaceContentModal = ({ content, type, onClose }: WorkspaceContentModalProps) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(content.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${type}-${content.id}.${type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] bg-black border-gray-800 text-white p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-semibold text-white leading-relaxed break-words">
              {content.prompt}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
          {type === 'image' ? (
            <img
              src={content.url}
              alt="Generated content"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <video
              src={content.url}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              controls
              autoPlay
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span>
                Quality: <span className="text-white">{content.quality === 'fast' ? 'Fast' : 'High Quality'}</span>
              </span>
              <span>
                Type: <span className="text-white capitalize">{type}</span>
              </span>
            </div>
            <div>
              Generated: <span className="text-white">{content.timestamp.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
