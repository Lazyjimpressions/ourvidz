import React, { useState } from 'react';
import { Camera, Video, Settings, X, Plus, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface MobileQuickBarProps {
  // Mode
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  
  // Model display
  selectedModelName: string;
  
  // Settings sheet trigger
  onOpenSettings: () => void;
  
  // Dual reference slots
  ref1Url?: string | null;
  ref2Url?: string | null;
  ref1IsVideo?: boolean;
  ref2IsVideo?: boolean;
  onAddRef1?: () => void;
  onAddRef2?: () => void;
  onRemoveRef1?: () => void;
  onRemoveRef2?: () => void;
  onDropRef1?: (file: File) => void;
  onDropRef2?: (file: File) => void;
  
  // Desktop inline controls
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  batchSize?: number;
  onBatchSizeChange?: (size: number) => void;
  
  // Disabled state
  disabled?: boolean;
}

/** Single ref slot: empty = dashed +, filled = thumbnail with X. Supports drag-and-drop. */
const RefSlot: React.FC<{
  url?: string | null;
  isVideo?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onDrop?: (file: File) => void;
  onOverflowDrop?: (file: File) => void; // When dropping on a filled slot, overflow to ref2
  label: string;
  disabled?: boolean;
}> = ({ url, isVideo, onAdd, onRemove, onDrop, onOverflowDrop, label, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (url && onOverflowDrop) {
      // Slot is filled → overflow to ref2
      onOverflowDrop(file);
    } else if (onDrop) {
      onDrop(file);
    }
  };

  if (url) {
    return (
      <div
        className={cn(
          "relative h-8 w-8 rounded border overflow-hidden bg-muted/20 shrink-0",
          isDragOver ? "border-primary ring-1 ring-primary/50" : "border-border/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isVideo ? (
          videoError ? (
            // Fallback: styled placeholder with Film icon
            <div className="h-full w-full flex items-center justify-center bg-muted/40">
              <Film className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <video
              src={url}
              muted
              preload="metadata"
              className="h-full w-full object-cover"
              onError={() => setVideoError(true)}
            />
          )
        ) : (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        )}
        {isVideo && !videoError && (
          <div className="absolute bottom-0 left-0 bg-black/60 px-0.5">
            <Film className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive/80 flex items-center justify-center"
          >
            <X className="h-2 w-2 text-destructive-foreground" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "h-8 w-8 rounded border border-dashed flex items-center justify-center hover:border-primary/60 hover:bg-muted/30 transition-colors shrink-0 disabled:opacity-30",
        isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/40"
      )}
    >
      <Plus className="h-3 w-3 text-muted-foreground" />
    </button>
  );
};

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({
  currentMode,
  onModeToggle,
  selectedModelName,
  onOpenSettings,
  ref1Url,
  ref2Url,
  ref1IsVideo = false,
  ref2IsVideo = false,
  onAddRef1,
  onAddRef2,
  onRemoveRef1,
  onRemoveRef2,
  onDropRef1,
  onDropRef2,
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  batchSize = 1,
  onBatchSizeChange,
  disabled = false,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {/* Mode Toggle */}
      <SegmentedControl
        options={[
          { value: 'image', label: 'Image', icon: <Camera className="h-3.5 w-3.5" /> },
          { value: 'video', label: 'Video', icon: <Video className="h-3.5 w-3.5" /> },
        ]}
        value={currentMode}
        onChange={onModeToggle}
        size="sm"
      />
      
      {/* Ref Slots */}
      <RefSlot
        url={ref1Url}
        isVideo={ref1IsVideo}
        onAdd={onAddRef1}
        onRemove={onRemoveRef1}
        onDrop={onDropRef1}
        onOverflowDrop={onDropRef2}
        label="Ref 1"
        disabled={disabled}
      />
      <RefSlot
        url={ref2Url}
        isVideo={ref2IsVideo}
        onAdd={onAddRef2}
        onRemove={onRemoveRef2}
        onDrop={onDropRef2}
        label="Ref 2"
        disabled={disabled}
      />

      {/* Desktop-only inline controls */}
      {onContentTypeChange && (
        <div className="hidden md:flex items-center gap-1.5">
          {/* Content Type */}
          <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
            {(['sfw', 'nsfw'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onContentTypeChange(t)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium uppercase transition-colors",
                  contentType === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Aspect Ratio */}
          {onAspectRatioChange && (
            <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
              {(['1:1', '16:9', '9:16'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onAspectRatioChange(r)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors",
                    aspectRatio === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Batch Size - hidden in video mode */}
          {onBatchSizeChange && currentMode !== 'video' && (
            <div className="flex items-center rounded-md border bg-muted/50 overflow-hidden">
              {[1, 3, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onBatchSizeChange(n)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium transition-colors min-w-[24px]",
                    batchSize === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {n}×
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Model Chip */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        className="h-9 px-2 gap-1.5 text-xs font-normal max-w-[100px]"
      >
        <span className="truncate">{selectedModelName}</span>
      </Button>
      
      {/* Settings Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        className="h-9 w-9"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
};
