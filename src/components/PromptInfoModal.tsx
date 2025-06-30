
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import type { GenerationQuality } from "@/types/generation";

interface PromptInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  quality: GenerationQuality;
  mode: 'image' | 'video';
  timestamp: Date;
  contentCount: number;
}

export const PromptInfoModal = ({ 
  isOpen, 
  onClose, 
  prompt, 
  quality, 
  mode, 
  timestamp, 
  contentCount 
}: PromptInfoModalProps) => {
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast.error('Failed to copy prompt');
    }
  };

  const getQualityColor = (quality: GenerationQuality) => {
    return quality === 'fast' ? 'bg-blue-600' : 'bg-purple-600';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Generation Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Prompt</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-white leading-relaxed whitespace-pre-wrap break-words">
                {prompt}
              </p>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Generation Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Quality:</span>
                  <Badge className={`${getQualityColor(quality)} text-white text-xs`}>
                    {quality === 'fast' ? 'Fast' : 'High Quality'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Type:</span>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                    {contentCount} {mode === 'image' ? 'image' : 'video'}{contentCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-400">Generated:</span>
                </div>
                <p className="text-sm text-white pl-5">
                  {formatTimestamp(timestamp)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
