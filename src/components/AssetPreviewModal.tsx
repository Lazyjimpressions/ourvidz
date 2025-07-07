
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Clock, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { UnifiedAsset } from "@/lib/services/OptimizedAssetService";

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
      <DialogContent className="max-w-6xl max-h-[95vh] bg-gray-900 border-gray-700 text-white overflow-y-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Full Prompt Display */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Prompt</h3>
                <div className="text-sm text-gray-300 bg-gray-800 p-4 rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
                  <p className="break-words leading-relaxed whitespace-pre-wrap">{asset.prompt}</p>
                </div>
              </div>

              {asset.projectTitle && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Project</h3>
                  <p className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700 break-words">{asset.projectTitle}</p>
                </div>
              )}

              {/* Model and Technical Info */}
              {asset.modelType && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Technical Details</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Model:</span>
                      <Badge 
                        variant="outline" 
                        className={
                          asset.modelType === 'SDXL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          asset.modelType === 'Enhanced-7B' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }
                      >
                        {asset.modelType}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Status and Quality Badges */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${
                      asset.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      asset.status === 'processing' || asset.status === 'queued' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
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
                    {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Details</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    <span>Created: {formatDate(asset.createdAt)}</span>
                  </div>

                  {asset.format && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Format:</span>
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded">{asset.format.toUpperCase()}</code>
                    </div>
                  )}

                  {asset.type === 'video' && asset.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0 text-gray-500" />
                      <span>Duration: {asset.duration}s</span>
                    </div>
                  )}

                  {asset.resolution && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Resolution:</span>
                      <span>{asset.resolution}</span>
                    </div>
                  )}

                  {/* Multi-image info for SDXL */}
                  {asset.signedUrls && asset.signedUrls.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Images:</span>
                      <span>{asset.signedUrls.length} variations</span>
                    </div>
                  )}
                </div>
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
