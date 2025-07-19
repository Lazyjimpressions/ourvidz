
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye, X, Clock } from "lucide-react";

interface GenerationPreviewPanelProps {
  isGenerating: boolean;
  progress?: number;
  estimatedTime?: number;
  queuePosition?: number;
  previewUrl?: string;
  onCancel?: () => void;
  onShowPreview?: () => void;
}

export const GenerationPreviewPanel = ({
  isGenerating,
  progress = 0,
  estimatedTime,
  queuePosition,
  previewUrl,
  onCancel,
  onShowPreview
}: GenerationPreviewPanelProps) => {
  if (!isGenerating) return null;

  return (
    <div className="fixed bottom-20 right-6 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Generating Image</h4>
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-6 w-6 text-gray-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-3">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{Math.round(progress)}% complete</span>
          {estimatedTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{estimatedTime}s remaining</span>
            </div>
          )}
        </div>
      </div>

      {/* Queue Position */}
      {queuePosition && queuePosition > 1 && (
        <div className="text-xs text-gray-400 mb-3">
          Position {queuePosition} in queue
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <div className="relative aspect-square bg-gray-800 rounded overflow-hidden">
            <img
              src={previewUrl}
              alt="Generation preview"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-2 text-xs text-white/80">
              Low-res preview
            </div>
          </div>
          {onShowPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowPreview}
              className="w-full text-white hover:bg-gray-800"
            >
              <Eye className="w-3 h-3 mr-1" />
              View Full Preview
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
