/**
 * FrameSelector Component
 *
 * Visual slider for selecting a frame from a video clip.
 * Used for frame chaining - extracting a frame to use as reference for the next clip.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StoryboardClip } from '@/types/storyboard';
import { FrameExtractionService, ExtractedFrame } from '@/lib/services/FrameExtractionService';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, ImageIcon, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrameSelectorProps {
  clip: StoryboardClip;
  onFrameSelected: (frameUrl: string, percentage: number, timestampMs: number) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const FrameSelector: React.FC<FrameSelectorProps> = ({
  clip,
  onFrameSelected,
  onCancel,
  isLoading = false,
}) => {
  const [percentage, setPercentage] = useState(52); // Default to middle of optimal range
  const [previewFrame, setPreviewFrame] = useState<ExtractedFrame | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimalRange, setOptimalRange] = useState({ min: 45, max: 60 });

  // Calculate optimal range based on clip duration
  useEffect(() => {
    if (clip.duration_seconds) {
      const range = FrameExtractionService.getOptimalRange(clip.duration_seconds);
      setOptimalRange(range);
      setPercentage(range.default);
    }
  }, [clip.duration_seconds]);

  // Extract preview frame when percentage changes (debounced)
  const extractPreview = useCallback(async () => {
    if (!clip.video_url) return;

    setIsExtracting(true);
    setError(null);

    try {
      const frame = await FrameExtractionService.extractFrameFromVideo(
        clip.video_url,
        percentage,
        { format: 'image/jpeg', quality: 0.9 }
      );
      setPreviewFrame(frame);
    } catch (err) {
      console.error('Failed to extract preview frame:', err);
      setError('Failed to extract frame');
    } finally {
      setIsExtracting(false);
    }
  }, [clip.video_url, percentage]);

  // Debounce frame extraction
  useEffect(() => {
    const timer = setTimeout(extractPreview, 300);
    return () => clearTimeout(timer);
  }, [extractPreview]);

  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);

  // Track component mount state for safe async state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleConfirm = async () => {
    if (!previewFrame || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      console.log('📸 Uploading extracted frame...');
      // Upload the frame to storage
      const frameUrl = await FrameExtractionService.uploadExtractedFrame(
        previewFrame.blob,
        clip.id,
        percentage
      );

      console.log('✅ Frame uploaded, saving to clip...');
      // Await the parent callback to properly handle errors
      await onFrameSelected(frameUrl, percentage, previewFrame.timestampMs);
      console.log('✅ Frame saved successfully');

      // Reset isSaving on success if still mounted
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    } catch (err) {
      console.error('❌ Failed to save frame:', err);
      // Only update state if still mounted
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save frame');
        setIsSaving(false);
      }
    }
  };

  const formatTimestamp = (ms?: number) => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const frames = Math.floor((ms % 1000) / (1000 / 30)); // Assuming 30fps
    return `${seconds}:${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-200">Extract Chain Frame</h4>
        <span className="text-xs text-gray-500">
          Optimal: {optimalRange.min}-{optimalRange.max}%
        </span>
      </div>

      {/* Frame preview */}
      <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden">
        {isExtracting ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : previewFrame ? (
          <img
            src={previewFrame.dataUrl}
            alt="Frame preview"
            className="w-full h-full object-contain"
          />
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-700" />
          </div>
        )}

        {/* Timestamp overlay */}
        {previewFrame && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-gray-300">
            {formatTimestamp(previewFrame.timestampMs)}
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Position</span>
          <span className="font-mono">{percentage.toFixed(0)}%</span>
        </div>

        <div className="relative">
          {/* Optimal range indicator */}
          <div
            className="absolute h-1 bg-green-500/30 rounded top-1/2 -translate-y-1/2"
            style={{
              left: `${optimalRange.min}%`,
              width: `${optimalRange.max - optimalRange.min}%`,
            }}
          />

          <Slider
            value={[percentage]}
            onValueChange={([value]) => setPercentage(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>0%</span>
          <span className="text-green-500">Optimal Range</span>
          <span>100%</span>
        </div>
      </div>

      {/* Frame info */}
      {previewFrame && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <span className="text-gray-500 block">Size</span>
            <span className="text-gray-300">{previewFrame.width}x{previewFrame.height}</span>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <span className="text-gray-500 block">Position</span>
            <span className="text-gray-300">{percentage}%</span>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded">
            <span className="text-gray-500 block">Time</span>
            <span className="text-gray-300">{formatTimestamp(previewFrame.timestampMs)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={handleConfirm}
          disabled={!previewFrame || isLoading || isExtracting || isSaving}
        >
          {isLoading || isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {isSaving ? 'Saving...' : 'Loading...'}
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Use as Chain Frame
            </>
          )}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-[10px] text-gray-600 text-center">
        This frame will be used as the reference image for the next clip
      </p>
    </div>
  );
};

export default FrameSelector;
