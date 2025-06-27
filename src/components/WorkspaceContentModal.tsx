
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-4xl max-h-[90vh] bg-black border-gray-800 text-white">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white truncate flex-1">
            {content.prompt}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4">
          {type === 'image' ? (
            <img
              src={content.url}
              alt="Generated content"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : (
            <video
              src={content.url}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              controls
              autoPlay
            />
          )}
        </div>
        
        <div className="text-center text-sm text-gray-400">
          Quality: {content.quality === 'fast' ? 'Low' : 'High'} • 
          Generated: {content.timestamp.toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
