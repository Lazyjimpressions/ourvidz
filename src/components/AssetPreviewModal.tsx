
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Clock, Image as ImageIcon, Video as VideoIcon, ChevronLeft, ChevronRight, X, Copy } from "lucide-react";
import { UnifiedAsset } from "@/lib/services/OptimizedAssetService";
import { useState, useEffect, useCallback } from "react";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { PromptScorePanel } from "@/components/PromptScorePanel";
import { toast } from "sonner";

interface AssetPreviewModalProps {
  assets: UnifiedAsset[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  onDownload: (asset: UnifiedAsset) => void;
}

export const AssetPreviewModal = ({
  assets,
  startIndex,
  open,
  onClose,
  onDownload
}: AssetPreviewModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const { fetchDetails, details } = useFetchImageDetails();

  // Update current index when startIndex changes
  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

  const currentAsset = assets[currentIndex] || null;

  // Fetch generation details when current asset changes
  useEffect(() => {
    if (currentAsset && open) {
      fetchDetails(currentAsset.id, currentAsset.type);
    }
  }, [currentAsset?.id, fetchDetails, open]);

  if (!currentAsset || assets.length === 0) return null;

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : assets.length - 1);
  }, [assets.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev < assets.length - 1 ? prev + 1 : 0);
  }, [assets.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrevious, handleNext, onClose]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] bg-gray-900 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              {currentAsset.type === 'image' ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <VideoIcon className="h-5 w-5" />
              )}
              <span className="truncate">{currentAsset.title || 'Asset Preview'}</span>
            </div>
            
            {/* Navigation Counter */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {currentIndex + 1} of {assets.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview with Navigation */}
          <div className="relative">
            <div className="flex justify-center bg-gray-800 rounded-lg overflow-hidden">
              {currentAsset.url && currentAsset.status === 'completed' ? (
                currentAsset.type === 'image' ? (
                  <img
                    src={currentAsset.url}
                    alt={currentAsset.prompt}
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <video
                    src={currentAsset.url}
                    controls
                    className="max-w-full max-h-[80vh] object-contain"
                    poster={currentAsset.thumbnailUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  {currentAsset.error ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">⚠️</div>
                      <div>Failed to load {currentAsset.type}</div>
                      <div className="text-sm text-red-400 mt-1 px-4 break-words">{currentAsset.error}</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {currentAsset.type === 'image' ? (
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      ) : (
                        <VideoIcon className="h-12 w-12 mx-auto mb-2" />
                      )}
                      <div>Preview not available</div>
                      <div className="text-sm capitalize">Status: {currentAsset.status}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {assets.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-gray-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Asset Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Full Prompt Display */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Prompt</h3>
                <div className="text-sm text-gray-300 bg-gray-800 p-4 rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
                  <p className="break-words leading-relaxed whitespace-pre-wrap">{currentAsset.prompt}</p>
                </div>
              </div>

              {currentAsset.projectTitle && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Project</h3>
                  <p className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700 break-words">{currentAsset.projectTitle}</p>
                </div>
              )}

              {/* Model and Technical Info */}
              {currentAsset.modelType && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Technical Details</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Model:</span>
                      <Badge 
                        variant="outline" 
                        className={
                          currentAsset.modelType === 'SDXL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          currentAsset.modelType === 'Enhanced-7B' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }
                      >
                        {currentAsset.modelType}
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
                      currentAsset.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      currentAsset.status === 'processing' || currentAsset.status === 'queued' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {currentAsset.status.charAt(0).toUpperCase() + currentAsset.status.slice(1)}
                  </Badge>

                  {currentAsset.quality && (
                    <Badge 
                      variant="outline"
                      className={currentAsset.quality === 'high' 
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }
                    >
                      {currentAsset.quality === 'high' ? 'High Quality' : 'Fast'}
                    </Badge>
                  )}

                  <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                    {currentAsset.type.charAt(0).toUpperCase() + currentAsset.type.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Details</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    <span>Created: {formatDate(currentAsset.createdAt)}</span>
                  </div>

                  {currentAsset.format && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Format:</span>
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded">{currentAsset.format.toUpperCase()}</code>
                    </div>
                  )}

                  {currentAsset.type === 'video' && currentAsset.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0 text-gray-500" />
                      <span>Duration: {currentAsset.duration}s</span>
                    </div>
                  )}

                  {currentAsset.resolution && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Resolution:</span>
                      <span>{currentAsset.resolution}</span>
                    </div>
                  )}

                  {/* Multi-image info for SDXL */}
                  {currentAsset.signedUrls && currentAsset.signedUrls.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Images:</span>
                      <span>{currentAsset.signedUrls.length} variations</span>
                    </div>
                  )}

                  {/* Template Name - if available */}
                  {currentAsset.tags?.find((tag: string) => tag.startsWith('tmpl:')) && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Template:</span>
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono">
                        {currentAsset.tags.find((tag: string) => tag.startsWith('tmpl:'))?.replace('tmpl:', '')}
                      </code>
                    </div>
                  )}
                </div>

                {/* Generation Details */}
                {details && (
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Generation Details</h3>
                    <div className="space-y-2 text-sm text-gray-400">
                      {details.seed && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Seed:</span>
                          <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono">{details.seed}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(details.seed?.toString() || '')}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {details.scheduler && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Scheduler:</span>
                          <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono">{details.scheduler}</code>
                        </div>
                      )}
                      
                      {details.steps && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Steps:</span>
                          <span>{details.steps}</span>
                        </div>
                      )}
                      
                      {details.guidanceScale && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">CFG Scale:</span>
                          <span>{details.guidanceScale}</span>
                        </div>
                      )}
                      
                      {details.denoiseStrength && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Denoise:</span>
                          <span>{details.denoiseStrength}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt Scoring Panel (Admin Only) */}
          <PromptScorePanel jobId={details?.jobId || null} className="mt-4" />

          {/* Actions */}
          {currentAsset.status === 'completed' && currentAsset.url && (
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Button
                onClick={() => onDownload(currentAsset)}
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
