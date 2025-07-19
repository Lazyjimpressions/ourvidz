
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Maximize } from "lucide-react";

interface ReferencePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceUrl: string;
  generatedUrl?: string;
  title?: string;
}

export const ReferencePreviewModal = ({
  isOpen,
  onClose,
  referenceUrl,
  generatedUrl,
  title = "Reference Comparison"
}: ReferencePreviewModalProps) => {
  const [viewMode, setViewMode] = React.useState<'side-by-side' | 'overlay'>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = React.useState(0.5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-black border-gray-800 text-white p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'side-by-side' ? 'overlay' : 'side-by-side')}
              className="text-white hover:bg-gray-800"
            >
              {viewMode === 'side-by-side' ? 'Overlay' : 'Side by Side'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Reference Image */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Reference</h4>
                <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={referenceUrl}
                    alt="Reference"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Generated Image */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Generated</h4>
                <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
                  {generatedUrl ? (
                    <img
                      src={generatedUrl}
                      alt="Generated"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No generated image yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Overlay Mode */
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">Overlay Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="flex-1 max-w-xs"
                />
                <span className="text-sm text-gray-400">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              
              <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden max-w-2xl mx-auto">
                <img
                  src={referenceUrl}
                  alt="Reference"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {generatedUrl && (
                  <img
                    src={generatedUrl}
                    alt="Generated overlay"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: overlayOpacity }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
