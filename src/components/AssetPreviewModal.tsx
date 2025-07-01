
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Clock, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { UnifiedAsset } from "@/lib/services/AssetService";

interface AssetPreviewModalProps {
  asset: UnifiedAsset | null;
  open: boolean;
  onClose: () => void;
  onDownload: (asset: UnifiedAsset) => void;
}

export const AssetPreviewModal = ({
  asset,
  open,
  onClose,
  onDownload
}: AssetPreviewModalProps) => {
  if (!asset) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            {asset.type === 'image' ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <VideoIcon className="h-5 w-5" />
            )}
            <span className="truncate">{asset.title || 'Asset Preview'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview */}
          <div className="flex justify-center bg-gray-800 rounded-lg overflow-hidden">
            {asset.url && asset.status === 'completed' ? (
              asset.type === 'image' ? (
                <img
                  src={asset.url}
                  alt={asset.prompt}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              ) : (
                <video
                  src={asset.url}
                  controls
                  className="max-w-full max-h-[60vh] object-contain"
                  poster={asset.thumbnailUrl}
                >
                  Your browser does not support the video tag.
                </video>
              )
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                {asset.error ? (
                  <div className="text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <div>Failed to load {asset.type}</div>
                    <div className="text-sm text-red-400 mt-1 px-4 break-words">{asset.error}</div>
                  </div>
                ) : (
                  <div className="text-center">
                    {asset.type === 'image' ? (
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    ) : (
                      <VideoIcon className="h-12 w-12 mx-auto mb-2" />
                    )}
                    <div>Preview not available</div>
                    <div className="text-sm capitalize">Status: {asset.status}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-300 mb-1">Prompt</h3>
                <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-md max-h-32 overflow-y-auto">
                  <p className="break-words">{asset.prompt}</p>
                </div>
              </div>

              {asset.projectTitle && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-1">Project</h3>
                  <p className="text-sm text-gray-400 break-words">{asset.projectTitle}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className={`${
                    asset.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    asset.status === 'processing' || asset.status === 'queued' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {asset.status}
                </Badge>

                {asset.quality && (
                  <Badge 
                    variant="outline"
                    className={asset.quality === 'high' 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }
                  >
                    {asset.quality === 'high' ? 'High Quality' : 'Fast'}
                  </Badge>
                )}

                <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                  {asset.type}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">Created: {formatDate(asset.createdAt)}</span>
                </div>

                {asset.format && (
                  <div className="flex items-center gap-2">
                    <span className="break-words">Format: {asset.format.toUpperCase()}</span>
                  </div>
                )}

                {asset.type === 'video' && asset.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>Duration: {asset.duration}s</span>
                  </div>
                )}

                {asset.resolution && (
                  <div className="flex items-center gap-2">
                    <span>Resolution: {asset.resolution}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {asset.status === 'completed' && asset.url && (
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Button
                onClick={() => onDownload(asset)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
