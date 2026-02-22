import React, { useState } from 'react';
import { Camera, Video, Settings, X, Plus, Film, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface RefSlotData {
  url?: string | null;
  isVideo?: boolean;
  role?: 'character' | 'pose';
  label?: string;
}

/** Fixed slot definitions for image mode (10 slots for multi-ref support) */
export const FIXED_IMAGE_SLOTS: { role: 'character' | 'pose'; label: string }[] = [
  { role: 'character', label: 'Char 1' },
  { role: 'character', label: 'Char 2' },
  { role: 'character', label: 'Char 3' },
  { role: 'pose', label: 'Pose' },
  { role: 'character', label: 'Ref 5' },
  { role: 'character', label: 'Ref 6' },
  { role: 'character', label: 'Ref 7' },
  { role: 'character', label: 'Ref 8' },
  { role: 'character', label: 'Ref 9' },
  { role: 'character', label: 'Ref 10' },
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
  /** Handle URL-based drops (from grid tile drag) — no upload needed */
  onFixedSlotDropUrl?: (index: number, url: string) => void;
  
  // Desktop inline controls
  contentType?: 'sfw' | 'nsfw';
  onContentTypeChange?: (type: 'sfw' | 'nsfw') => void;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  onAspectRatioChange?: (ratio: '16:9' | '1:1' | '9:16') => void;
  batchSize?: number;
  onBatchSizeChange?: (size: number) => void;
  
  // Model selector dropdown
  selectedModel?: { id: string; type: string; display_name: string } | null;
  onModelChange?: (model: { id: string; type: string; display_name: string }) => void;
  imageModels?: Array<{ id: string; display_name: string; provider_name: string }>;
  videoModels?: Array<{ id: string; display_name: string; api_providers?: { name: string } }>;
  modelsLoading?: boolean;
  
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
  onDropUrl?: (url: string) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}> = ({ url, isVideo, onAdd, onRemove, onDrop, onDropUrl, label, disabled, showLabel = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [justDropped, setJustDropped] = useState(false);
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

    // Check for custom ref-image MIME (from grid tile drag) first
    const refData = e.dataTransfer.getData('application/x-ref-image');
    if (refData && onDropUrl) {
      try {
        const { url: droppedUrl } = JSON.parse(refData);
        if (droppedUrl) {
          onDropUrl(droppedUrl);
          // Brief green flash feedback
          setJustDropped(true);
          setTimeout(() => setJustDropped(false), 400);
          return;
        }
      } catch { /* fall through to file drop */ }
    }

    // Fallback: OS file drop
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDrop(file);
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 400);
    }
  };

  const slotSize = showLabel ? 'h-10 w-10' : 'h-8 w-8';

  if (url) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            `relative ${slotSize} rounded border overflow-hidden bg-muted/20 transition-all duration-200`,
            isDragOver
              ? "border-primary ring-2 ring-primary/50 scale-110 bg-primary/20"
              : justDropped
                ? "border-green-500 ring-2 ring-green-500/50 scale-105"
                : "border-border/50"
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
          `${slotSize} rounded border border-dashed flex items-center justify-center hover:border-primary/60 hover:bg-muted/30 transition-all duration-200 disabled:opacity-30`,
          isDragOver
            ? "border-primary bg-primary/20 scale-110 ring-2 ring-primary/50"
            : justDropped
              ? "border-green-500 ring-2 ring-green-500/50 scale-105"
              : "border-muted-foreground/40"
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

/** Single item in the model dropdown */
const ModelDropdownItem: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-left",
      selected
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-accent"
    )}
  >
    <Check className={cn("h-3 w-3 shrink-0", selected ? "opacity-100" : "opacity-0")} />
    <span className="truncate">{label}</span>
  </button>
);

/** Compact popover that shows current value and reveals options on click */
function CompactPopover<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  renderLabel,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  renderLabel?: (v: T) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 px-2 gap-1 text-[10px] font-medium rounded border bg-muted/50 flex items-center transition-colors hover:bg-muted",
            className
          )}
        >
          <span>{label}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="min-w-[80px] w-auto p-1 z-[100] bg-popover border border-border shadow-lg"
      >
        <div className="space-y-0.5">
          {options.map((opt) => (
            <ModelDropdownItem
              key={String(opt)}
              label={renderLabel ? renderLabel(opt) : String(opt)}
              selected={value === opt}
              onClick={() => { onSelect(opt); setOpen(false); }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  onFixedSlotDropUrl,
  contentType = 'nsfw',
  onContentTypeChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  batchSize = 1,
  onBatchSizeChange,
  selectedModel,
  onModelChange,
  imageModels = [],
  videoModels = [],
  modelsLoading = false,
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
              onDropUrl={onFixedSlotDropUrl ? (url) => onFixedSlotDropUrl(i, url) : undefined}
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

      {/* Desktop-only compact popover controls */}
      {onContentTypeChange && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={contentType.toUpperCase()}
          options={['sfw', 'nsfw']}
          value={contentType}
          onSelect={(v) => onContentTypeChange(v as 'sfw' | 'nsfw')}
          renderLabel={(v) => v.toUpperCase()}
        />
      )}
      {onAspectRatioChange && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={aspectRatio}
          options={['1:1', '16:9', '9:16'] as const}
          value={aspectRatio}
          onSelect={(v) => onAspectRatioChange(v as '16:9' | '1:1' | '9:16')}
        />
      )}
      {onBatchSizeChange && currentMode !== 'video' && (
        <CompactPopover
          className="hidden md:inline-flex"
          label={`${batchSize}×`}
          options={[1, 3, 6]}
          value={batchSize}
          onSelect={(v) => onBatchSizeChange(v as number)}
          renderLabel={(v) => `${v}×`}
        />
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Model Selector Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 gap-1 text-xs font-normal max-w-[140px]"
          >
            <span className="truncate">{selectedModelName}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="min-w-[180px] max-w-[240px] p-1.5 z-[100] bg-popover border border-border shadow-lg"
        >
          {modelsLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-0.5">
              {/* Local model option */}
              {currentMode === 'image' && (
                <ModelDropdownItem
                  label="SDXL (Local)"
                  selected={selectedModel?.type === 'sdxl'}
                  onClick={() => onModelChange?.({ id: 'local-sdxl', type: 'sdxl', display_name: 'SDXL (Local)' })}
                />
              )}
              {currentMode === 'video' && (
                <ModelDropdownItem
                  label="WAN (Local)"
                  selected={selectedModel?.id === 'local-wan'}
                  onClick={() => onModelChange?.({ id: 'local-wan', type: 'sdxl', display_name: 'WAN (Local)' })}
                />
              )}
              {/* API models */}
              {(currentMode === 'image' ? imageModels : videoModels).map((m) => (
                <ModelDropdownItem
                  key={m.id}
                  label={m.display_name}
                  selected={selectedModel?.id === m.id}
                  onClick={() => onModelChange?.({
                    id: m.id,
                    type: ('provider_name' in m ? m.provider_name : (m as any).api_providers?.name) || 'fal',
                    display_name: m.display_name,
                  })}
                />
              ))}
              {(currentMode === 'image' ? imageModels : videoModels).length === 0 && !modelsLoading && (
                <p className="text-[10px] text-muted-foreground text-center py-2">No models available</p>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      
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
