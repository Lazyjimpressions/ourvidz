import React, { useState } from 'react';
import { Camera, Video, Settings, X, Plus, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface RefSlotData {
  url?: string | null;
  isVideo?: boolean;
  role?: 'character' | 'pose';
  label?: string;
}

/** Fixed slot definitions for image mode */
export const FIXED_IMAGE_SLOTS: { role: 'character' | 'pose'; label: string }[] = [
  { role: 'character', label: 'Char 1' },
  { role: 'character', label: 'Char 2' },
  { role: 'character', label: 'Char 3' },
  { role: 'pose', label: 'Pose' },
];

export interface MobileQuickBarProps {
  // Mode
  currentMode: 'image' | 'video';
  onModeToggle: (mode: 'image' | 'video') => void;
  
  // Model display
  selectedModelName: string;
  
  // Settings sheet trigger
  onOpenSettings: () => void;
  
  // Dynamic ref slots (used in video mode)
  refSlots: RefSlotData[];
  maxSlots: number;
  onAddRef: (index: number) => void;
  onRemoveRef: (index: number) => void;
  onDropRef: (index: number, file: File) => void;
  onAddSlot: () => void;
  
  // Fixed image slots (used in image mode)
  fixedSlots?: RefSlotData[];
  onFixedSlotAdd?: (index: number) => void;
  onFixedSlotRemove?: (index: number) => void;
  onFixedSlotDrop?: (index: number, file: File) => void;
  
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

/** Single ref slot with optional label underneath */
const RefSlot: React.FC<{
  url?: string | null;
  isVideo?: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onDrop: (file: File) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}> = ({ url, isVideo, onAdd, onRemove, onDrop, label, disabled, showLabel = false }) => {
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

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onDrop(file);
  };

  const slotSize = showLabel ? 'h-10 w-10' : 'h-8 w-8';

  if (url) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            `relative ${slotSize} rounded border overflow-hidden bg-muted/20`,
            isDragOver ? "border-primary ring-1 ring-primary/50" : "border-border/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropEvent}
        >
          {isVideo ? (
            videoError ? (
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive/80 flex items-center justify-center"
          >
            <X className="h-2 w-2 text-destructive-foreground" />
          </button>
        </div>
        {showLabel && (
          <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{label}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center shrink-0">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
        className={cn(
          `${slotSize} rounded border border-dashed flex items-center justify-center hover:border-primary/60 hover:bg-muted/30 transition-colors disabled:opacity-30`,
          isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/40"
        )}
      >
        <Plus className="h-3 w-3 text-muted-foreground" />
      </button>
      {showLabel && (
        <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">{label}</span>
      )}
    </div>
  );
};

/** "+" button to add more ref slots (video mode only) */
const AddSlotButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 rounded-full border border-dashed border-primary/40 flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors shrink-0 disabled:opacity-30"
    title="Add reference slot"
  >
    <Plus className="h-3.5 w-3.5 text-primary/70" />
  </button>
);

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({
  currentMode,
  onModeToggle,
  selectedModelName,
  onOpenSettings,
  refSlots,
  maxSlots,
  onAddRef,
  onRemoveRef,
  onDropRef,
  onAddSlot,
  fixedSlots = [],
  onFixedSlotAdd,
  onFixedSlotRemove,
  onFixedSlotDrop,
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  batchSize = 1,
  onBatchSizeChange,
  disabled = false,
}) => {
  const allFilled = refSlots.length > 0 && refSlots.every(s => !!s.url);
  const canAddMore = refSlots.length < maxSlots;

  // Use fixed slots in image mode, dynamic slots in video mode
  const useFixedSlots = currentMode === 'image' && onFixedSlotAdd && onFixedSlotRemove && onFixedSlotDrop;

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
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {useFixedSlots ? (
          /* Fixed 4 labeled slots for image mode */
          FIXED_IMAGE_SLOTS.map((slotDef, i) => (
            <RefSlot
              key={`fixed-${i}`}
              url={fixedSlots[i]?.url}
              isVideo={fixedSlots[i]?.isVideo}
              onAdd={() => onFixedSlotAdd!(i)}
              onRemove={() => onFixedSlotRemove!(i)}
              onDrop={(file) => onFixedSlotDrop!(i, file)}
              label={slotDef.label}
              disabled={disabled}
              showLabel
            />
          ))
        ) : (
          /* Dynamic slots for video mode */
          <>
            {refSlots.map((slot, i) => (
              <RefSlot
                key={i}
                url={slot.url}
                isVideo={slot.isVideo}
                onAdd={() => onAddRef(i)}
                onRemove={() => onRemoveRef(i)}
                onDrop={(file) => onDropRef(i, file)}
                label={`Ref ${i + 1}`}
                disabled={disabled}
              />
            ))}
            {allFilled && canAddMore && (
              <AddSlotButton onClick={onAddSlot} disabled={disabled} />
            )}
          </>
        )}
      </div>

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
